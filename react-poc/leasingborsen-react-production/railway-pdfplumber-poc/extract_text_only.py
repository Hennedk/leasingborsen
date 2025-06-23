#!/usr/bin/env python3
"""
Extract text from PDF without OpenAI - for troubleshooting
"""

import os
from pdf2image import convert_from_bytes
import pytesseract
import json

def extract_text_from_pdf(pdf_file_path):
    """Extract text from PDF using OCR only"""
    
    if not os.path.exists(pdf_file_path):
        print(f"❌ PDF file not found: {pdf_file_path}")
        return None
    
    try:
        # Read PDF file
        with open(pdf_file_path, 'rb') as f:
            pdf_data = f.read()
        
        print(f"🚀 Extracting text from: {pdf_file_path}")
        print(f"📏 File size: {len(pdf_data):,} bytes")
        
        # Convert PDF to images
        print("📄 Converting PDF to images...")
        images = convert_from_bytes(pdf_data, dpi=300)
        print(f"   Converted to {len(images)} pages")
        
        # Extract text using OCR
        full_text = ""
        for i, image in enumerate(images):
            print(f"   Processing page {i+1}/{len(images)}...")
            try:
                page_text = pytesseract.image_to_string(
                    image, 
                    lang='dan+eng',
                    config='--psm 6'
                )
                full_text += f"\n=== PAGE {i+1} ===\n{page_text}\n"
            except Exception as e:
                print(f"   OCR failed for page {i+1}: {str(e)}")
                full_text += f"\n=== PAGE {i+1} ===\n[OCR_FAILED]\n"
        
        # Save extracted text
        output_file = f"{pdf_file_path}_extracted_text.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(full_text)
        
        print(f"✅ Text extraction complete!")
        print(f"📄 Total text length: {len(full_text):,} characters")
        print(f"💾 Text saved to: {output_file}")
        
        # Show sample of extracted text
        print("\n" + "="*60)
        print("📝 SAMPLE OF EXTRACTED TEXT (first 1000 chars)")
        print("="*60)
        print(full_text[:1000])
        if len(full_text) > 1000:
            print("...")
        
        return full_text
        
    except Exception as e:
        print(f"❌ Text extraction failed: {str(e)}")
        return None

def create_manual_extraction_template(text_content):
    """Create a template for manual extraction"""
    
    template = f"""
# Manual Extraction Template

Use this extracted text with ChatGPT, Claude, or another AI service to extract structured data.

## Prompt to use:

```
Extract all car leasing information from this Toyota document. The text is in Danish.

DOCUMENT TEXT:
{text_content[:8000]}

Extract and return a JSON object with this structure:
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
      "variants": [
        {{
          "variant_name": "Base/Active/Sport",
          "pricing": {{
            "monthly_payment": 2699,
            "first_payment": 4999,
            "total_cost": 102163
          }}
        }}
      ]
    }}
  ]
}}

Instructions:
1. Find ALL vehicle models in the document
2. Extract ALL variants and pricing
3. Convert Danish numbers: "2.699" → 2699
4. Return only valid JSON
```

## Full Extracted Text:

{text_content}
"""
    
    template_file = "manual_extraction_template.md"
    with open(template_file, 'w', encoding='utf-8') as f:
        f.write(template)
    
    print(f"📋 Manual extraction template saved to: {template_file}")
    print("   You can copy the prompt and text to use with ChatGPT or Claude")

if __name__ == "__main__":
    pdf_file = "Privatleasing_priser.pdf"
    
    if os.path.exists(pdf_file):
        extracted_text = extract_text_from_pdf(pdf_file)
        
        if extracted_text:
            create_manual_extraction_template(extracted_text)
            
            print("\n" + "="*60)
            print("🎯 NEXT STEPS")
            print("="*60)
            print("1. Check the extracted text file to see if OCR worked well")
            print("2. Use the manual_extraction_template.md with ChatGPT/Claude")
            print("3. Or fix the OpenAI connection issue and retry the automatic extraction")
    else:
        print(f"❌ PDF file not found: {pdf_file}")
        print("   Place a PDF file named 'Privatleasing_priser.pdf' in this directory")