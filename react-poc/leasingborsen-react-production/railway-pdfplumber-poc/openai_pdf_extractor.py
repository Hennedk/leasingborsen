import openai
import base64
import json
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image
import io
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class OpenAI_PDF_Extractor:
    def __init__(self, api_key=None):
        """Initialize with OpenAI API key"""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass it directly.")
        
        self.client = openai.OpenAI(api_key=self.api_key)
    
    def extract_car_leasing_data(self, pdf_data):
        """
        Main extraction function using AI approach
        
        Args:
            pdf_data: PDF file as bytes
            
        Returns:
            dict: Structured car leasing data
        """
        try:
            print("📄 Converting PDF to text...")
            content = self._extract_pdf_content(pdf_data)
            
            print("🤖 Processing with OpenAI...")
            structured_data = self._process_with_openai(content)
            
            print("✅ Validating extraction...")
            validated_data = self._validate_extraction(structured_data)
            
            return {
                "status": "success",
                "data": validated_data,
                "metadata": {
                    "extraction_method": "openai_gpt4",
                    "pages_processed": content['metadata']['total_pages']
                }
            }
            
        except Exception as e:
            print(f"❌ Extraction failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "data": None
            }
    
    def _extract_pdf_content(self, pdf_data):
        """Extract text content from PDF using OCR"""
        content = {
            'text': '',
            'metadata': {}
        }
        
        # Convert PDF to images
        try:
            images = convert_from_bytes(pdf_data, dpi=300)
            print(f"   Converted to {len(images)} pages")
        except Exception as e:
            raise Exception(f"PDF conversion failed: {str(e)}")
        
        # Extract text using OCR (supports Danish)
        full_text = ""
        for i, image in enumerate(images):
            try:
                print(f"   Processing page {i+1}/{len(images)}...")
                # OCR with Danish + English language support
                page_text = pytesseract.image_to_string(
                    image, 
                    lang='dan+eng',
                    config='--psm 6'  # Uniform block of text
                )
                full_text += f"\n=== PAGE {i+1} ===\n{page_text}\n"
            except Exception as e:
                print(f"   OCR failed for page {i+1}: {str(e)}")
                full_text += f"\n=== PAGE {i+1} ===\n[OCR_FAILED]\n"
        
        content['text'] = full_text
        content['metadata'] = {
            'total_pages': len(images),
            'extraction_method': 'ocr'
        }
        
        return content
    
    def _process_with_openai(self, content):
        """Send content to OpenAI for intelligent extraction"""
        
        prompt = self._create_extraction_prompt(content['text'])
        
        try:
            # Add timeout and retry logic
            import time
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"   Attempt {attempt + 1}/{max_retries} - Sending to OpenAI...")
                    response = self.client.chat.completions.create(
                        model="gpt-4-1106-preview",  # Use GPT-4 Turbo for better reasoning
                        messages=[
                            {
                                "role": "system", 
                                "content": "You are an expert at extracting structured data from car leasing documents. Always return valid JSON."
                            },
                            {
                                "role": "user", 
                                "content": prompt
                            }
                        ],
                        temperature=0.1,  # Low temperature for consistent extraction
                        max_tokens=4000,
                        response_format={"type": "json_object"},  # Force JSON response
                        timeout=120  # 120 second timeout
                    )
                    
                    response_text = response.choices[0].message.content
                    print(f"   ✅ Received response from OpenAI ({len(response_text)} chars)")
                    return json.loads(response_text)
                    
                except Exception as e:
                    error_details = str(e)
                    print(f"   ❌ Attempt {attempt + 1} failed: {error_details}")
                    
                    # Print more detailed error info
                    if hasattr(e, '__class__'):
                        print(f"   Error type: {e.__class__.__name__}")
                    if hasattr(e, 'response'):
                        print(f"   Response: {e.response}")
                    
                    if attempt < max_retries - 1:
                        print(f"   Retrying in 5 seconds...")
                        time.sleep(5)
                    else:
                        raise e
            
        except Exception as e:
            raise Exception(f"OpenAI API error after {max_retries} attempts: {str(e)}")
    
    def _create_extraction_prompt(self, text_content):
        """Create optimized prompt for car leasing extraction"""
        
        return f"""
Extract all car leasing information from this document. The text may be in Danish.

DOCUMENT TEXT:
{text_content[:8000]}  # Limit to avoid token limits and timeouts

Extract and return a JSON object with this EXACT structure:

{{
  "document_info": {{
    "brand": "Toyota",
    "document_date": "2025-01-01",
    "currency": "DKK",
    "language": "da",
    "document_type": "private_leasing"
  }},
  "vehicles": [
    {{
      "model": "Model Name",
      "category": "Category",
      "lease_period_months": 36,
      "powertrain_type": "gasoline",
      "variants": [
        {{
          "variant_name": "Base/Active/Sport",
          "engine_specification": "1.0 benzin 72 hk",
          "transmission": "manual",
          "pricing": {{
            "monthly_payment": 2699,
            "first_payment": 4999,
            "total_cost": 102163,
            "annual_kilometers": 15000,
            "co2_tax_biannual": 590
          }},
          "specifications": {{
            "fuel_consumption_kmpl": 20.83,
            "co2_emissions_gkm": 110,
            "energy_label": "A++",
            "electric_range_km": null,
            "battery_capacity_kwh": null
          }}
        }}
      ]
    }}
  ],
  "accessories": [
    {{
      "package_name": "Package Name",
      "description": "Description",
      "monthly_cost": 265,
      "category": "wheels",
      "package_code": "V1"
    }}
  ]
}}

EXTRACTION INSTRUCTIONS:
1. Find ALL vehicle models in the document
2. For each model, extract ALL variants and their pricing
3. Convert Danish numbers: "2.699" → 2699, "102.163" → 102163
4. Parse dates appropriately
5. Identify powertrain types:
   - "benzin" = gasoline
   - "Hybrid" = hybrid  
   - "elbil" or "KWh" = electric
6. Extract monthly payments, down payments, total costs
7. Find accessory packages with monthly costs
8. Set appropriate transmission types
9. Extract fuel consumption and CO2 emissions

CRITICAL: Return ONLY the JSON object, no other text. Ensure all numbers are integers (not strings).
"""
    
    def _validate_extraction(self, data):
        """Validate extracted data quality"""
        if not isinstance(data, dict):
            raise ValueError("Response must be a dictionary")
        
        if 'vehicles' not in data:
            raise ValueError("No vehicles section found")
        
        vehicles = data['vehicles']
        if not vehicles or len(vehicles) == 0:
            raise ValueError("No vehicles extracted")
        
        # Validate each vehicle has required fields
        for vehicle in vehicles:
            if 'model' not in vehicle:
                raise ValueError("Vehicle missing model name")
            
            if 'variants' not in vehicle or len(vehicle['variants']) == 0:
                raise ValueError(f"No variants found for {vehicle.get('model', 'unknown')}")
            
            # Validate pricing data
            for variant in vehicle['variants']:
                if 'pricing' not in variant:
                    print(f"⚠️  Warning: No pricing for variant {variant.get('variant_name')}")
                    continue
                
                pricing = variant['pricing']
                if pricing.get('monthly_payment', 0) <= 0:
                    print(f"⚠️  Warning: Invalid monthly payment for {variant.get('variant_name')}")
        
        return data