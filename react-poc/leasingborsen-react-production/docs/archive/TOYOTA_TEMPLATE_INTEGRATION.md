# Toyota Template Integration Guide

## Overview
Complete template-based PDF extraction system for Toyota accessories using PDFPlumber on Railway.

## Components Created

### 1. Database Schema (`supabase/migrations/20250622_create_template_system.sql`)
- `pdf_templates` - Template configurations and metadata
- `dealer_templates` - Links dealers to specific templates  
- `template_test_results` - Testing and validation tracking

### 2. Template Configuration (`toyota-template-config.json`)
Production-ready Toyota accessories template with:
- PDFPlumber table extraction settings optimized for Toyota PDFs
- Danish price pattern matching (`\d{1,4}\s*kr\./md\.`)
- Item name detection strategies (column-based, row-based)
- Validation rules for data quality
- Post-processing for categorization and deduplication

### 3. Extraction Engine (`extract_with_template.py`)
- `TemplateExtractor` class for template-based extraction
- Comprehensive validation and error handling
- Confidence scoring and metadata tracking
- Post-processing pipeline for data normalization

### 4. Railway API Integration (`app.py`)
Added `/extract/template` endpoint that:
- Loads Toyota template configuration
- Processes PDF using template-based extraction
- Returns structured results with metadata

### 5. Test Interface (`test-client.html`)
Added "Test Template Extraction" button for validating template performance.

## Usage

### Deploy to Railway
```bash
cd railway-pdfplumber-poc
git add .
git commit -m "Add Toyota template-based extraction system"
git push
```

### Test Template Extraction
1. Upload Toyota PDF to test client
2. Click "🎯 Test Template Extraction"
3. Compare results with previous extraction methods

### Expected Results
- **Car models extracted**: 5-15 Toyota models (YARIS, COROLLA, RAV4, etc.)
- **Variants per model**: 2-5 variants (Active, Style, Style Comfort, etc.)
- **Data fields captured**: 
  - Model name (required)
  - Variant name (optional)
  - Monthly price (required)
  - First payment (optional)
  - Lease duration in months (optional)
  - Annual mileage (optional)
- **Processing time**: <8 seconds
- **Accuracy**: 90%+ with validation
- **Price range**: 1,000-15,000 DKK/month

## Integration Path

### Phase 1: Template Management
1. Deploy database migration
2. Create admin UI for template management
3. Add template testing workflow

### Phase 2: Edge Function Integration
1. Connect Railway service to Supabase Edge Functions
2. Add template selection logic for dealers
3. Implement fallback to existing extraction

### Phase 3: Production Deployment
1. Add monitoring and alerting
2. Performance optimization
3. Scale to additional dealers

## Next Steps
The template system is ready for integration with the main application. The logical next step would be to deploy the database migration and create the template management interface in the admin panel.