# PDF Processing Edge Function

This Supabase Edge Function provides a generic, configuration-driven PDF processing system for extracting vehicle lease pricing information from dealer price lists.

## Architecture

### Core Components

1. **GenericPDFProcessor** - Main processing engine that handles:
   - PDF text extraction using pdfjs-serverless
   - Pattern-based extraction using regex configurations
   - AI-based extraction with budget controls
   - Hybrid extraction combining both approaches
   - Result caching and validation

2. **ConfigLoader** - Manages dealer-specific configurations:
   - Loads from database or JSON files
   - In-memory caching with expiry
   - Configuration validation
   - Version management

3. **ProgressTracker** - Real-time progress updates:
   - Updates processing job status in database
   - Tracks extraction method and confidence
   - Monitors AI costs and token usage

4. **ErrorHandler** - Standardized error handling:
   - Consistent error response format
   - Specialized error types
   - CORS header management

## Processing Flow

1. **Request Validation**
   - Validate required fields (batchId, fileUrl, dealerId)
   - Create processing job record

2. **Configuration Loading**
   - Load dealer-specific configuration
   - Validate patterns and settings

3. **PDF Processing**
   - Download PDF from Supabase Storage
   - Extract text using pdfjs-serverless
   - Check cache for existing results

4. **Data Extraction**
   - **Pattern-based**: Apply regex patterns from configuration
   - **AI-based**: Use configured AI prompts (if pattern confidence is low)
   - **Hybrid**: Combine both methods for best accuracy

5. **Result Storage**
   - Store extracted vehicles in batch_import_items
   - Update job status with final metrics
   - Cache successful extractions

## Configuration Structure

Dealer configurations are stored as JSON files in `config/dealers/` or in the database:

```json
{
  "id": "dealer_id",
  "name": "Dealer Name",
  "version": "v1.0",
  "extraction": {
    "patterns": {
      "modelHeader": [...],      // Regex patterns for model identification
      "variantLine": [...],      // Patterns for variant extraction
      "pricingLine": [...],      // Patterns for pricing data
      "co2Specs": [...],         // Environmental data patterns
      "electricSpecs": [...]     // Electric vehicle patterns
    },
    "aiPrompt": {
      "systemRole": "...",       // AI system prompt
      "userPromptTemplate": "...", // User prompt template
      "model": "gpt-3.5-turbo",
      "temperature": 0.1
    },
    "confidence": {
      "usePatternOnly": 0.85,    // Skip AI if pattern confidence >= this
      "requireReview": 0.6,      // Flag for review if below this
      "minimumAcceptable": 0.4,  // Reject if below this
      "cacheResults": 0.7        // Cache if above this
    }
  },
  "validation": {
    "priceRange": { "min": 1000, "max": 15000 },
    "requiredFields": ["model", "variant", "monthly_price"],
    "modelWhitelist": ["Model1", "Model2", ...]
  },
  "optimization": {
    "cacheEnabled": true,
    "maxAICostPerPDF": 0.50,
    "cacheExpiryHours": 24
  }
}
```

## API Usage

### Request

```http
POST /process-pdf
Content-Type: application/json

{
  "batchId": "uuid",
  "fileUrl": "batch-imports/file.pdf",
  "dealerId": "volkswagen",
  "configVersion": "v1.0"  // Optional, defaults to "v1.0"
}
```

### Response

```json
{
  "success": true,
  "jobId": "job-uuid",
  "message": "PDF processing completed successfully",
  "estimatedCompletion": "2025-01-22T15:00:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2025-01-22T15:00:00Z"
}
```

## Database Tables

### processing_jobs
- Tracks job status and progress
- Updated in real-time during processing
- Contains extraction metrics and AI costs

### batch_import_items
- Stores extracted vehicle data
- Links to batch via batch_id
- Contains parsed_data with all vehicle details

### extraction_cache
- Caches successful extractions by PDF hash
- Reduces AI costs for repeated PDFs
- Expires based on configuration

## Adding New Dealers

1. Create a configuration JSON file in `config/dealers/`
2. Define extraction patterns specific to the dealer's PDF format
3. Configure AI prompts and confidence thresholds
4. Set validation rules and pricing ranges
5. Test with sample PDFs

## Development

### Local Testing

```bash
# Serve the function locally
supabase functions serve process-pdf --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/process-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "test-batch",
    "fileUrl": "test.pdf",
    "dealerId": "volkswagen"
  }'
```

### Environment Variables

Required in `.env.local`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Deployment

```bash
supabase functions deploy process-pdf
```

## Performance Considerations

1. **Caching**: Extraction results are cached by PDF hash to avoid reprocessing
2. **Pattern-first**: Regex patterns are tried first (fast and free)
3. **AI Fallback**: AI is only used when pattern confidence is low
4. **Budget Controls**: Daily AI spending limits prevent runaway costs
5. **Progress Tracking**: Real-time updates keep users informed

## Security

- Service role key for database operations
- CORS headers for browser compatibility
- Input validation on all requests
- PDF size limits enforced
- AI budget controls per dealer

## Monitoring

- Check `processing_jobs` table for job status
- Monitor `ai_cost` and `ai_tokens_used` fields
- Review `extraction_method` to optimize patterns
- Track cache hit rates in logs