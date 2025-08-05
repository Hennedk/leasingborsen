# Edge Functions Update Handover - 2025-08-05

## Context
We successfully implemented a Python image processing service on Railway to replace the buggy imagescript implementation in Edge Functions. The service is fully operational and tested with real car images.

## Current Status

### ✅ Completed
- Python image processing service deployed at: https://leasingborsen-production.up.railway.app/
- Fixed RapidAPI integration to use cars-image-background-removal API
- All features working: background removal, auto-crop, shadow, multiple sizes
- Tested with real car images (477KB) - processing time ~7.5 seconds
- Created .gitignore to prevent future venv commits

### ⚠️ Issues
- Git history contains massive commit with venv directory (low priority)
- RapidAPI key was exposed in conversation (user should rotate)
- Edge Functions still using buggy imagescript implementation (HIGH PRIORITY)

## Next Session Objectives

### 1. Identify Edge Functions Using imagescript
Run these commands to find all Edge Functions with image processing:
```bash
# Search for imagescript imports
grep -r "imagescript" supabase/functions/

# Search for image processing functions
grep -r "autoCrop\|removeBackground\|processImage" supabase/functions/

# Check these specific functions:
# - admin-image-operations
# - admin-listing-operations  
# - remove-bg
```

### 2. Update Edge Functions to Use Python Service

Replace imagescript code with HTTP calls to the Python service:

```typescript
// OLD imagescript code
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts'
const image = await Image.decode(imageData)
// ... image processing ...

// NEW Python service code
const response = await fetch('https://leasingborsen-production.up.railway.app/process-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_base64: base64Image,
    filename: 'image.jpg',
    options: {
      remove_background: true,
      auto_crop: true,
      add_shadow: true,
      create_sizes: true,
      padding_percent: 0.1
    },
    mode: 'car'
  })
})
const result = await response.json()
// result.processed = base64 processed image
// result.sizes = { grid, detail, full }
// result.metadata = processing details
```

### 3. Python Service API Reference

**Endpoint**: `POST https://leasingborsen-production.up.railway.app/process-image`

**Request Body**:
```typescript
{
  image_base64: string,      // Required: Base64 encoded image
  filename: string,          // Required: Original filename
  options: {                 // Optional: Processing options
    remove_background: boolean,    // Default: true
    auto_crop: boolean,           // Default: true  
    add_shadow: boolean,          // Default: true
    create_sizes: boolean,        // Default: true
    padding_percent?: number,     // Default: 0.05 (5%)
    shadow_offset?: [number, number], // Default: [10, 10]
    shadow_blur?: number,         // Default: 20
    quality?: number,             // Default: 85
    format?: string               // Default: "WEBP"
  },
  mode?: "car" | "product" | "auto"  // Default: "car"
}
```

**Response**:
```typescript
{
  success: boolean,
  processed?: string,        // Base64 processed image
  sizes?: {                  // Multiple sizes if requested
    grid: string,           // 400x300
    detail: string,         // 800x600
    full: string            // 1200x900
  },
  metadata?: {
    original_size: [width, height],
    final_size: [width, height],
    has_background_removed: boolean,
    has_shadow: boolean,
    was_cropped: boolean,
    processing_time_ms: number,
    format: string
  },
  error?: string            // Error message if failed
}
```

### 4. Testing Strategy

1. **Unit Test Each Edge Function**:
   - Test with small test image first
   - Verify response structure
   - Check error handling

2. **Integration Test**:
   - Upload real car image via admin interface
   - Verify all processing steps work
   - Check Supabase storage integration

3. **Performance Test**:
   - Monitor Railway logs for processing times
   - Check cache hit rates
   - Verify no memory leaks

### 5. Implementation Order

1. **Start with `remove-bg`** - Simplest, dedicated function
2. **Then `admin-image-operations`** - Main image processing function
3. **Finally `admin-listing-operations`** - May have embedded image processing

### 6. Key Files to Review

- `/supabase/functions/remove-bg/index.ts` - Current implementation with imagescript
- `/supabase/functions/admin-image-operations/index.ts` - Main image operations
- `/railway-pdfplumber-poc/app.py` - Python service implementation
- `/railway-pdfplumber-poc/image_processing/*.py` - Processing modules

### 7. Environment Variables

Ensure these are set in Supabase Edge Functions if needed:
- `RAILWAY_SERVICE_URL`: https://leasingborsen-production.up.railway.app

### 8. Rollback Plan

If issues arise:
1. Keep original imagescript code commented
2. Add feature flag to switch between implementations
3. Monitor error rates closely
4. Railway service has built-in retry logic

## Important Notes

1. **Cache Behavior**: The Python service caches processed images. Use unique filenames for testing.
2. **Timeout**: Set appropriate timeouts (30-60s) for large images
3. **Error Handling**: The service returns `{ success: false, error: "message" }` on failure
4. **CORS**: The service allows all origins for now (POC mode)

## Quick Test Script

Create this to quickly test the Python service:
```javascript
const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

const response = await fetch('https://leasingborsen-production.up.railway.app/process-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_base64: testImage,
    filename: 'test.png',
    options: { remove_background: true }
  })
})

console.log(await response.json())
```

## Success Criteria

- [ ] All Edge Functions updated to use Python service
- [ ] No more imagescript errors in logs
- [ ] Auto-crop working for all car images
- [ ] Performance acceptable (<10s for typical images)
- [ ] All tests passing

Good luck with the Edge Functions update!