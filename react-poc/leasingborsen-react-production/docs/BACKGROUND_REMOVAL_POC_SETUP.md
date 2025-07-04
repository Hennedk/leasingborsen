# Background Removal POC - Complete Setup Guide

## Overview

A proof-of-concept implementation for car background removal using API4.ai's Cars Image Background Removal service through RapidAPI, integrated with the existing React + Supabase infrastructure.

## Features

- **Upload → Preview → Process → Download** workflow
- **Real-time processing** with loading states and progress feedback
- **Transparency visualization** with checkered background pattern
- **Error handling** with detailed user feedback
- **File validation** (format, size limits)
- **Storage management** via Supabase Storage buckets
- **Standalone POC page** outside main application menu

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React POC     │───▶│  Supabase Edge   │───▶│   RapidAPI      │
│     Page        │    │    Function      │    │  (Cars BG API)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Upload   │    │  Image Storage   │    │ Background      │
│   & Preview     │    │   (Originals +   │    │ Removal         │
│                 │    │   Processed)     │    │ Processing      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Accounts & Services
1. **RapidAPI Account** with subscription to Cars Image Background Removal API
2. **Supabase Project** with Edge Functions enabled
3. **Node.js 18+** for local development
4. **Supabase CLI** for deployment

### API Subscription
- **Service**: [Cars Image Background Removal API](https://rapidapi.com/api4ai-api4ai-default/api/cars-image-background-removal)
- **Provider**: api4ai-api4ai-default
- **Pricing**: Free tier available (25 requests)
- **Rate Limits**: 25 requests/month on free tier

## Setup Instructions

### 1. Environment Configuration

Add to your `.env` file:
```bash
# API4.ai Background Removal Service (for Supabase Edge Functions)
API4AI_KEY=your_rapidapi_key_here
```

**API Key Format**: Should be 45-50 characters starting with random characters, e.g.:
```
fdc0a541c0mshfe8ce716802e5bfp10165djsnd1b1f8786d29
```

### 2. Supabase Storage Setup

Create the required storage buckets in Supabase Dashboard → Storage:

```bash
# Option 1: Via Supabase Dashboard
1. Go to Storage section
2. Create bucket: "poc-originals" (public: true)
3. Create bucket: "poc-processed" (public: true)

# Option 2: Via Supabase CLI
supabase storage create poc-originals --public
supabase storage create poc-processed --public
```

**Bucket Configuration**:
- **poc-originals**: Stores uploaded images before processing
- **poc-processed**: Stores images after background removal
- **Public Access**: Required for image display in POC interface

### 3. Supabase Edge Function Setup

Set the API key in Supabase secrets:
```bash
supabase secrets set API4AI_KEY=your_rapidapi_key_here
```

Deploy the Edge Function:
```bash
supabase functions deploy remove-bg
```

**Function Details**:
- **Location**: `supabase/functions/remove-bg/index.ts`
- **Endpoint**: `/functions/v1/remove-bg`
- **Method**: POST
- **Runtime**: Deno with Edge Runtime

### 4. Application Integration

The POC is integrated as a standalone route:

**Route**: `/background-removal-poc`
**Component**: `src/pages/BackgroundRemovalPOC.tsx`
**Navigation**: Accessed directly via URL (not in main menu)

## File Structure

```
src/
├── pages/
│   └── BackgroundRemovalPOC.tsx          # Main POC page component
├── App.tsx                               # Route configuration
supabase/
├── functions/
│   └── remove-bg/
│       └── index.ts                      # Edge Function for API processing
docs/
└── BACKGROUND_REMOVAL_POC_SETUP.md       # This documentation
.env                                      # Environment variables
```

## API Integration Details

### RapidAPI Endpoint Configuration
```typescript
const endpoint = 'https://cars-image-background-removal.p.rapidapi.com/v1/results'
const headers = {
  'X-RapidAPI-Key': api4aiKey,
  'X-RapidAPI-Host': 'cars-image-background-removal.p.rapidapi.com'
}
```

### Request Format
```typescript
const formData = new FormData()
formData.append('image', blob, fileName)
// Additional parameters like 'shadow', 'crop' can be added but are not documented
```

### Response Format
```json
{
  "results": [{
    "status": {"code": "ok", "message": "Success"},
    "name": "filename.jpg",
    "width": 1920,
    "height": 1080,
    "entities": [{
      "kind": "image",
      "name": "RemBgKind.cars-RemBgMode.image",
      "image": "base64_processed_image_data",
      "format": "PNG",
      "representation": "base64"
    }]
  }]
}
```

## User Workflow

### Step-by-Step Process
1. **Access POC**: Navigate to `/background-removal-poc`
2. **Upload Image**: Select car image (JPG, PNG, WebP, max 10MB)
3. **Preview**: Review uploaded image
4. **Confirm**: Click "Confirm Transformation"
5. **Processing**: Wait 10-15 seconds for API processing
6. **Results**: View before/after comparison
7. **Download**: Save processed image with transparent background

### File Limitations
- **Supported Formats**: JPG, JPEG, PNG, WebP
- **Max File Size**: 10MB (client-side validation)
- **Max Resolution**: 4096x4096 (API limitation)
- **Max Request Size**: 16MB (API limitation)

## Technical Implementation

### Image Format Handling
```typescript
// Auto-detect image format from base64
const imageTypeMatch = imageData.match(/^data:image\/([a-z]+);base64,/)
const imageType = imageTypeMatch ? imageTypeMatch[1] : 'jpeg'
const contentType = `image/${imageType}`
```

### Error Handling
- **Client-side validation**: File type and size checks
- **API error handling**: Rate limits, subscription status, processing failures
- **Network error handling**: Timeout, connection issues
- **User feedback**: Danish error messages with retry options

### Transparency Visualization
```css
/* Checkered pattern to show transparency */
background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mN8/5+hnoEIwDiqkL4KAcT9GO0U4BxoAAAAAElFTkSuQmCC) repeat
```

## Monitoring & Debugging

### Available Logs
```bash
# View Edge Function logs (Supabase Dashboard → Functions → Logs)
- Request details (file size, type, dimensions)
- API response status and headers
- Processing time and success rates
- Error details with stack traces
```

### Rate Limit Monitoring
```bash
# Check API usage via response headers
X-RateLimit-Credits-Remaining: 23
X-RateLimit-Credits-Limit: 25
X-RateLimit-Credits-Reset: 2675859
```

### Common Debug Steps
1. **Check API key subscription** in RapidAPI dashboard
2. **Verify storage bucket permissions** in Supabase
3. **Monitor Edge Function logs** for processing errors
4. **Test with different image formats** and sizes
5. **Check network requests** in browser dev tools

## Cost Management

### API Pricing (as of setup)
- **Free Tier**: 25 requests/month
- **Processing Time**: ~10-15 seconds per image
- **Cost per Request**: ~$0.0025 (paid tiers)

### Usage Optimization
- **Client-side validation** prevents unnecessary API calls
- **Image format preservation** reduces processing overhead
- **Error handling** prevents retry loops
- **File size limits** prevent oversized requests

## Security Considerations

### API Key Management
- **Environment Variables**: API key stored in `.env` and Supabase secrets
- **No Client Exposure**: Key only accessible in Edge Function environment
- **Rotation Support**: Easy key updates via environment configuration

### File Handling
- **Validation**: Type and size checks before processing
- **Temporary Storage**: Images stored in public buckets (consider security implications)
- **No Persistence**: POC images can be manually cleaned up

## Future Enhancements

### Potential Improvements
1. **Auto-cropping**: Crop to car bounds with configurable padding
2. **Canvas positioning**: Center cars in standard canvas sizes
3. **Batch processing**: Handle multiple images at once
4. **Format options**: Export in different sizes/formats
5. **Integration**: Connect with main listing upload workflow

### API Feature Exploration
- **Shadow effects**: Add realistic shadows under cars
- **License plate blurring**: Privacy compliance features
- **Multiple output modes**: Mask-only or different representation formats

## Troubleshooting

### Common Issues

#### 1. "You are not subscribed to this API" (403 Error)
**Solution**: Subscribe to the Cars Image Background Removal API on RapidAPI

#### 2. Edge Function 500 Error
**Causes**:
- Missing API key in Supabase secrets
- Invalid API key format
- Storage bucket permissions
**Solution**: Verify environment setup and redeploy function

#### 3. Images Not Displaying
**Causes**:
- Storage buckets not public
- CORS issues
- Invalid file format
**Solution**: Check bucket permissions and file validation

#### 4. Processing Timeout
**Causes**:
- Large image files
- API rate limiting
- Network issues
**Solution**: Reduce image size, check rate limits, retry

### Debug Commands
```bash
# Check environment setup
supabase secrets list

# View function logs
# (Use Supabase Dashboard → Functions → Logs)

# Test API key directly
node test-api-key.js  # (create temporary test script)

# Redeploy function
supabase functions deploy remove-bg

# Check storage buckets
# (Use Supabase Dashboard → Storage)
```

## Success Metrics

### POC Validation Criteria
- ✅ **Functional Upload**: Successfully upload and preview images
- ✅ **API Integration**: Connect to RapidAPI endpoint without errors
- ✅ **Background Removal**: Process car images with transparent backgrounds
- ✅ **Download Capability**: Export processed images
- ✅ **Error Handling**: Graceful handling of edge cases
- ✅ **Performance**: Process within reasonable time limits (10-15s)

### Technical Validation
- ✅ **Image Format Support**: Handle JPG, PNG, WebP correctly
- ✅ **Size Preservation**: Maintain original image dimensions
- ✅ **Quality Preservation**: Minimize compression artifacts
- ✅ **Transparency Display**: Proper visualization of removed backgrounds
- ✅ **Storage Integration**: Successful upload/download from Supabase Storage

## Conclusion

This POC demonstrates successful integration of AI-powered background removal for car images within the existing React + Supabase architecture. The implementation provides a foundation for potential integration into the main application's listing management workflow.

**Key Achievements**:
- Working end-to-end background removal pipeline
- Proper error handling and user feedback
- Integration with existing infrastructure
- Scalable architecture for future enhancements

**Next Steps**:
- Evaluate POC results and user feedback
- Consider integration with main application
- Explore additional API features (shadows, license plate blurring)
- Implement batch processing capabilities