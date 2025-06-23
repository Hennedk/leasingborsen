#!/usr/bin/env python3
"""
Fast test with GPT-3.5-turbo for quicker processing
"""

import os
import json
from openai_pdf_extractor import OpenAI_PDF_Extractor

class FastOpenAI_PDF_Extractor(OpenAI_PDF_Extractor):
    """Fast version using GPT-3.5-turbo"""
    
    def _process_with_openai(self, content):
        """Send content to OpenAI using faster model"""
        
        prompt = self._create_extraction_prompt(content['text'])
        
        try:
            # Add timeout and retry logic
            import time
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"   Attempt {attempt + 1}/{max_retries} - Sending to OpenAI (GPT-3.5-turbo)...")
                    response = self.client.chat.completions.create(
                        model="gpt-3.5-turbo",  # Faster model
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
                        temperature=0.1,
                        max_tokens=3000,  # Reduced for faster processing
                        timeout=60  # Shorter timeout
                    )
                    
                    response_text = response.choices[0].message.content
                    print(f"   ✅ Received response from OpenAI ({len(response_text)} chars)")
                    
                    # Try to parse as JSON
                    try:
                        return json.loads(response_text)
                    except json.JSONDecodeError:
                        # If not valid JSON, try to extract JSON from response
                        import re
                        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                        if json_match:
                            return json.loads(json_match.group())
                        else:
                            raise ValueError("No valid JSON found in response")
                    
                except Exception as e:
                    error_details = str(e)
                    print(f"   ❌ Attempt {attempt + 1} failed: {error_details}")
                    
                    if attempt < max_retries - 1:
                        print(f"   Retrying in 3 seconds...")
                        time.sleep(3)
                    else:
                        raise e
            
        except Exception as e:
            raise Exception(f"OpenAI API error after {max_retries} attempts: {str(e)}")
    
    def _create_extraction_prompt(self, text_content):
        """Create simplified prompt for faster processing"""
        
        return f"""
Extract car leasing data from this Toyota document (Danish text).

TEXT (first 6000 chars):
{text_content[:6000]}

Return ONLY a JSON object with this structure:
{{
  "vehicles": [
    {{
      "model": "AYGO X",
      "variants": [
        {{
          "variant_name": "Active",
          "monthly_payment": 2699,
          "first_payment": 4999,
          "total_cost": 102163
        }}
      ]
    }}
  ]
}}

Find ALL models and variants. Convert Danish numbers: "2.699" → 2699.
Return ONLY valid JSON, no explanations.
"""

def test_fast_extraction():
    """Test with the faster extractor"""
    
    pdf_file = "Privatleasing_priser.pdf"
    
    if not os.path.exists(pdf_file):
        print(f"❌ PDF file not found: {pdf_file}")
        return
    
    try:
        print("🚀 Testing FAST extraction with GPT-3.5-turbo...")
        extractor = FastOpenAI_PDF_Extractor()
        
        # Read PDF file
        with open(pdf_file, 'rb') as f:
            pdf_data = f.read()
        
        # Extract data
        result = extractor.extract_car_leasing_data(pdf_data)
        
        if result['status'] == 'success':
            print("\n✅ FAST extraction successful!")
            print(f"🚗 Models found: {len(result['data']['vehicles'])}")
            
            # Count total variants
            total_variants = sum(len(v['variants']) for v in result['data']['vehicles'])
            print(f"🔧 Total variants: {total_variants}")
            
            # Save results
            output_file = f"{pdf_file}_fast_extracted.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result['data'], f, indent=2, ensure_ascii=False)
            print(f"💾 Results saved to: {output_file}")
            
            # Show sample
            print("\n📋 Sample extracted data:")
            for vehicle in result['data']['vehicles'][:2]:  # First 2 models
                print(f"  🚗 {vehicle['model']}: {len(vehicle['variants'])} variants")
                for variant in vehicle['variants'][:2]:  # First 2 variants
                    monthly = variant.get('monthly_payment', 0)
                    print(f"    • {variant['variant_name']}: {monthly:,} kr/md")
            
            return result['data']
        else:
            print("❌ FAST extraction failed!")
            print(f"Error: {result['error']}")
            return None
            
    except Exception as e:
        print(f"❌ FAST test failed: {str(e)}")
        return None

if __name__ == "__main__":
    test_fast_extraction()