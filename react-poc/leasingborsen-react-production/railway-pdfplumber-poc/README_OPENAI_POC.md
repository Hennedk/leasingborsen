# OpenAI PDF Leasing Extractor POC

This POC demonstrates using OpenAI's GPT-4 to extract structured leasing data from PDF documents.

## 🎯 Overview

The extractor uses a two-step approach:
1. **OCR Text Extraction**: Convert PDF to text using `pdf2image` + `pytesseract`
2. **AI Processing**: Send text to OpenAI GPT-4 for intelligent data extraction

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

**Note**: You'll also need system dependencies:
- **Tesseract OCR**: `sudo apt-get install tesseract-ocr tesseract-ocr-dan` (Linux)
- **Poppler**: `sudo apt-get install poppler-utils` (Linux)

### 2. Set Up OpenAI API Key

```bash
# Option 1: Environment variable
export OPENAI_API_KEY="your-openai-api-key-here"

# Option 2: Create .env file
cp .env.example .env
# Edit .env and add your API key
```

### 3. Test with a PDF

```bash
python test_openai_extractor.py
```

The script will:
- Find PDF files in the current directory
- Let you select which one to process
- Extract leasing data using OpenAI
- Save results to `filename_extracted.json`

## 📁 Files

- **`openai_pdf_extractor.py`** - Main extractor class
- **`test_openai_extractor.py`** - Interactive test script
- **`openai_fastapi_integration.py`** - FastAPI integration example
- **`.env.example`** - Environment variables template

## 🔧 Usage Examples

### Basic Usage

```python
from openai_pdf_extractor import OpenAI_PDF_Extractor

# Initialize
extractor = OpenAI_PDF_Extractor("your-api-key")

# Extract from PDF bytes
with open("leasing.pdf", "rb") as f:
    pdf_data = f.read()

result = extractor.extract_car_leasing_data(pdf_data)

if result['status'] == 'success':
    print(f"Found {len(result['data']['vehicles'])} models")
    # Process result['data']
else:
    print(f"Error: {result['error']}")
```

### FastAPI Integration

```bash
# Start the API server
python openai_fastapi_integration.py

# Test with curl
curl -X POST "http://localhost:8000/extract-pdf" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@your-leasing.pdf"
```

### Expected Output Structure

```json
{
  "document_info": {
    "brand": "Toyota",
    "document_date": "2025-05-27",
    "currency": "DKK",
    "language": "da",
    "document_type": "private_leasing"
  },
  "vehicles": [
    {
      "model": "AYGO X",
      "category": "Crossover",
      "lease_period_months": 36,
      "powertrain_type": "gasoline",
      "variants": [
        {
          "variant_name": "Active",
          "engine_specification": "1.0 benzin 72 hk",
          "transmission": "manual",
          "pricing": {
            "monthly_payment": 2699,
            "first_payment": 4999,
            "total_cost": 102163,
            "annual_kilometers": 15000,
            "co2_tax_biannual": 590
          },
          "specifications": {
            "fuel_consumption_kmpl": 20.83,
            "co2_emissions_gkm": 110,
            "energy_label": "A++",
            "electric_range_km": null,
            "battery_capacity_kwh": null
          }
        }
      ]
    }
  ],
  "accessories": [
    {
      "package_name": "Vinterhjulsæt (V1)",
      "description": "17\" stålfælge med Falkendæk uden montering",
      "monthly_cost": 265,
      "category": "wheels",
      "package_code": "V1"
    }
  ]
}
```

## 🎛️ Configuration

### Model Settings

Adjust in `openai_pdf_extractor.py`:

```python
response = self.client.chat.completions.create(
    model="gpt-4-1106-preview",  # Model choice
    temperature=0.1,             # Consistency (0.0-1.0)
    max_tokens=4000,             # Response length limit
    response_format={"type": "json_object"}  # Force JSON
)
```

### OCR Settings

Adjust in `_extract_pdf_content()`:

```python
page_text = pytesseract.image_to_string(
    image, 
    lang='dan+eng',  # Danish + English
    config='--psm 6'  # Page segmentation mode
)
```

## 🔍 Troubleshooting

### Missing Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-dan poppler-utils

# macOS
brew install tesseract tesseract-lang poppler

# Windows
# Download Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
# Download Poppler from: https://github.com/oschwartz10612/poppler-windows
```

### API Key Issues

```bash
# Verify key is set
echo $OPENAI_API_KEY

# Test API access
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

### OCR Quality Issues

1. **Increase DPI**: Change `dpi=300` to `dpi=600` in `convert_from_bytes()`
2. **Try different PSM modes**: Change `--psm 6` to `--psm 3` or `--psm 1`
3. **Add image preprocessing**: Enhance contrast/brightness before OCR

## 💰 Cost Estimation

**OpenAI GPT-4 Pricing** (as of 2025):
- Input: ~$0.01 per 1K tokens
- Output: ~$0.03 per 1K tokens

**Typical PDF Processing**:
- OCR text: ~2,000-4,000 tokens
- JSON response: ~1,000-2,000 tokens
- **Cost per PDF**: ~$0.05-$0.15

## 🔄 Integration with Existing System

### With Your Supabase Edge Function

```typescript
// In your edge function
import { OpenAI_PDF_Extractor } from './openai_pdf_extractor.py'

export async function handler(req: Request) {
  const formData = await req.formData()
  const pdfFile = formData.get('pdf') as File
  
  if (!pdfFile) {
    return new Response('No PDF file provided', { status: 400 })
  }
  
  const pdfBytes = await pdfFile.arrayBuffer()
  
  // Use OpenAI extractor
  const extractor = new OpenAI_PDF_Extractor(OPENAI_API_KEY)
  const result = await extractor.extract_car_leasing_data(new Uint8Array(pdfBytes))
  
  if (result.status === 'success') {
    // Store in Supabase
    const { data, error } = await supabase
      .from('extracted_listings')
      .insert(result.data)
    
    return Response.json({ success: true, data })
  } else {
    return Response.json({ success: false, error: result.error }, { status: 422 })
  }
}
```

## 🧪 Performance & Reliability

### Strengths
- ✅ **High accuracy** for structured documents
- ✅ **Language flexibility** (Danish/English)
- ✅ **Format adaptability** (different PDF layouts)
- ✅ **Rich data extraction** (specifications, pricing, accessories)

### Limitations
- ⚠️ **API dependency** (requires internet + OpenAI access)
- ⚠️ **Processing time** (~10-30 seconds per PDF)
- ⚠️ **Cost per operation** (~$0.05-$0.15 per PDF)
- ⚠️ **OCR quality dependent** on PDF scan quality

### Recommended Use Cases
- **Low-medium volume** processing (< 1000 PDFs/day)
- **High accuracy requirements**
- **Complex document layouts**
- **Multi-language support needed**

## 🎯 Next Steps

1. **Test with your actual Toyota PDFs**
2. **Fine-tune extraction prompts** for your specific format
3. **Implement error handling and retries**
4. **Add batch processing capabilities**
5. **Set up monitoring and logging**
6. **Consider caching for repeated documents**