# Multi-Dealer PDF Processing System

This Edge Function processes PDF files from multiple car dealers with automatic dealer detection and configuration loading.

## Features

### 🤖 Automatic Dealer Detection
- **Content Analysis**: Scans PDF text for brand keywords, model names, and format patterns
- **Confidence Scoring**: Provides percentage confidence in detection accuracy
- **Fallback Logic**: Uses default configuration when detection confidence is low
- **Extensible Patterns**: Easy to add new dealers by updating detection patterns

### 🏷️ Supported Dealers
- **VW Group**: Volkswagen, Audi, SKODA, SEAT, CUPRA
- **Toyota**: Toyota, Lexus
- **Unknown**: Fallback to default configuration

### 📊 Detection Strategies

#### 1. Brand Keyword Detection
- Searches for dealer-specific terms (e.g., "volkswagen", "das auto", "toyota financial services")
- **Weight**: 10 points per keyword match

#### 2. Model Name Detection  
- Identifies car models specific to brands (e.g., "Golf", "A4", "RAV4", "Yaris")
- **Weight**: 15 points per model match (stronger indicator)

#### 3. Format Fingerprinting
- Recognizes document structure patterns and dealer-specific terminology
- **Weight**: 5 points per format match

#### 4. Filename Analysis
- Extracts hints from PDF filename
- Combined with content analysis for better accuracy

## API Usage

### Request Format
```json
{
  "batchId": "uuid",
  "fileUrl": "batch-imports/path/to/file.pdf",
  "dealerId": "volkswagen", // Optional - can be auto-detected
  "configVersion": "v1.0",
  "detectionHints": { // Optional detection hints
    "brand": "Toyota",
    "userHint": "Toyota dealership PDF",
    "forceDealerType": "toyota" // Force specific dealer type
  }
}
```

### Response Format
```json
{
  "success": true,
  "jobId": "uuid",
  "message": "PDF processing completed successfully",
  "estimatedCompletion": "2025-01-22T14:30:00Z",
  "dealerDetection": {
    "detectedType": "vw_group",
    "confidence": 87,
    "method": "auto-detected", // 'forced' | 'provided' | 'auto-detected'
    "fallbackUsed": false
  }
}
```

### Detection Methods

#### 1. Forced Detection
```json
{
  "detectionHints": {
    "forceDealerType": "toyota"
  }
}
```
- Bypasses automatic detection
- Uses specified dealer type with 100% confidence

#### 2. Provided Dealer ID
```json
{
  "dealerId": "volkswagen"
}
```
- Maps dealer ID to dealer type
- Uses 95% confidence for known dealers

#### 3. Automatic Detection
```json
{
  "fileUrl": "batch-imports/toyota_rav4_2025.pdf"
}
```
- Analyzes PDF content and filename
- Returns actual confidence percentage
- Uses fallback if confidence < 30%

## Configuration

### Confidence Thresholds
- **Minimum for Auto-Detection**: 30%
- **Fallback Dealer**: VW Group (most common)
- **Pattern Learning**: Future feature for improving detection

### Detection Patterns
Located in `utils/DealerDetector.ts`:

```typescript
vw_group: {
  keywords: ['volkswagen', 'vw', 'audi', 'skoda', 'seat', 'cupra'],
  models: ['golf', 'passat', 'tiguan', 'a3', 'a4', 'octavia'],
  formats: [/erhvervsleasing\\s*tilbud/i],
  weight: 1.0
}
```

## Extending the System

### Adding a New Dealer

#### 1. Update Type Definition
In `types/DealerConfig.ts`:
```typescript
export type DealerType = 'vw_group' | 'toyota' | 'bmw' | 'unknown'
```

#### 2. Add Detection Patterns
In `utils/DealerDetector.ts`:
```typescript
bmw: {
  keywords: ['bmw', 'mini', 'bmw group', 'bmw financial services'],
  models: ['x1', 'x3', 'x5', 'i3', 'i4', 'ix', 'mini cooper'],
  formats: [/bmw\\s*financial\\s*services/i],
  weight: 1.0
}
```

#### 3. Update Dealer Mapping
In `index.ts`:
```typescript
const dealerTypeToId: Record<DealerType, string> = {
  'vw_group': 'volkswagen',
  'toyota': 'toyota',
  'bmw': 'bmw',
  'unknown': 'volkswagen'
}
```

#### 4. Create Dealer Configuration
Create configuration file for the new dealer with extraction patterns and AI prompts.

## Testing

### Manual Testing
```bash
# Test with VW PDF
curl -X POST /functions/v1/process-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "test-123",
    "fileUrl": "batch-imports/vw_golf_2025.pdf"
  }'

# Test with forced dealer type
curl -X POST /functions/v1/process-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "test-123",
    "fileUrl": "batch-imports/unknown_car.pdf",
    "detectionHints": {
      "forceDealerType": "toyota"
    }
  }'
```

### Test Script
Run the test script to verify detection patterns:
```bash
deno run --allow-all scripts/test-dealer-detection.ts
```

## Logging and Debugging

### Detection Logging
The system logs detailed detection information:
```
[DealerDetector] Auto-detection for vw_golf_2025.pdf: {
  dealer: 'Volkswagen Group',
  confidence: '87%',
  matches: {
    keywords: 3,
    models: 2,
    formats: 1
  },
  details: {
    keywords: ['volkswagen', 'vw', 'golf'],
    models: ['golf', 'gti'],
    formats: ['erhvervsleasing\\s*tilbud']
  }
}
```

### Progress Tracking
Detection progress is tracked in the processing job:
```sql
SELECT 
  dealer_id,
  detection_confidence,
  detection_method,
  fallback_used
FROM processing_jobs 
WHERE id = 'job-uuid';
```

## Best Practices

### 1. Use Detection Hints
Provide brand or user hints when available:
```json
{
  "detectionHints": {
    "brand": "Toyota",
    "userHint": "PDF from Toyota dealer website"
  }
}
```

### 2. Monitor Confidence Scores
- **> 70%**: High confidence, reliable detection
- **30-70%**: Medium confidence, monitor results
- **< 30%**: Low confidence, fallback used

### 3. Filename Conventions
Use descriptive filenames for better detection:
- ✅ `toyota_rav4_hybrid_2025.pdf`
- ✅ `vw_golf_gti_leasing.pdf`
- ❌ `document1.pdf`

### 4. Review Fallback Cases
Monitor jobs where `fallbackUsed: true` to identify:
- Missing detection patterns
- New dealer types
- Unusual PDF formats

## Error Handling

### Detection Failures
- **Low Confidence**: Automatically uses fallback dealer
- **No Patterns Match**: Returns 'unknown' dealer type
- **Invalid Hints**: Ignores invalid detection hints

### Graceful Degradation
- Processing continues even if detection fails
- Fallback configuration ensures PDFs are still processed
- Error details logged for improvement

## Performance

### Optimization Features
- **Text Sampling**: Only analyzes first 50KB for detection
- **Pattern Caching**: Compiled regex patterns cached
- **Early Exit**: Stops detection when high confidence reached

### Detection Speed
- **Average**: < 100ms for detection
- **Text Extraction**: Minimal overhead
- **Memory Usage**: < 10MB for detection analysis

## Future Enhancements

### Planned Features
1. **Machine Learning**: Train models on historical detection data
2. **Pattern Learning**: Automatically improve patterns from AI results
3. **Multi-language Support**: Detection in multiple languages
4. **Visual Analysis**: Logo and layout detection from PDF rendering
5. **Confidence Calibration**: Improve confidence scoring accuracy

### Integration Opportunities
1. **User Feedback**: Allow users to correct detection results
2. **Analytics**: Track detection accuracy over time
3. **A/B Testing**: Test different detection strategies
4. **Configuration UI**: Admin interface for managing patterns