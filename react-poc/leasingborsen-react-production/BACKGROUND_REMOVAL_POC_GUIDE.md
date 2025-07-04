# Background Removal POC - Setup Guide

## Overview
A simple proof-of-concept for testing API4.ai's car background removal service integrated with the existing Supabase setup.

## What's Been Implemented

### 1. Supabase Edge Function
- **Location**: `supabase/functions/remove-bg/index.ts`
- **Functionality**: Handles image upload, calls API4.ai, stores results in Supabase Storage
- **Endpoints**: Accessible via Supabase Functions

### 2. React POC Page
- **Location**: `src/pages/BackgroundRemovalPOC.tsx`
- **URL**: `/background-removal-poc`
- **Features**: Upload → Preview → Confirm → Process → Results

### 3. Storage Buckets Required
Create these buckets in Supabase Dashboard → Storage:
- `poc-originals` (public)
- `poc-processed` (public)

### 4. Environment Setup
Add to your `.env` file:
```
API4AI_KEY=your_api4ai_key_here
```

## Setup Steps

### 1. Get API4.ai Key
1. Sign up at https://api4.ai
2. Get your API key from dashboard
3. Add to `.env` file

### 2. Create Storage Buckets
1. Go to Supabase Dashboard → Storage
2. Create bucket: `poc-originals` (make public)
3. Create bucket: `poc-processed` (make public)

### 3. Deploy Edge Function
```bash
supabase functions deploy remove-bg
```

### 4. Test the POC
1. Start the development server: `npm run dev`
2. Navigate to: `http://localhost:5173/background-removal-poc`
3. Upload a car image
4. Click "Confirm Transformation"
5. View before/after results

## User Flow
1. **Upload**: Select car image (JPG, PNG, WebP, max 10MB)
2. **Preview**: Image preview is shown
3. **Confirm**: Click "Confirm Transformation" button
4. **Processing**: Loading state (10-15 seconds)
5. **Results**: Before/after comparison with download option

## Cost Information
- API4.ai free tier: 25 requests for testing
- Each request costs approximately $0.0025
- Results include confidence scores when available

## Troubleshooting

### Common Issues:
1. **Storage bucket not found**: Ensure buckets are created and public
2. **API key error**: Check API4AI_KEY in environment
3. **Function not deployed**: Run `supabase functions deploy remove-bg`
4. **CORS errors**: Edge function includes proper CORS headers

### Debug Steps:
1. Check Supabase Function logs
2. Verify API key is valid
3. Test with different image formats
4. Check network requests in browser dev tools

## File Structure
```
src/pages/BackgroundRemovalPOC.tsx     # Main POC page
supabase/functions/remove-bg/index.ts  # Edge function
.env                                   # Environment variables
```

## Next Steps (Future)
Once POC is validated, you can:
1. Integrate with admin listing forms
2. Add batch processing
3. Implement automatic background removal for uploads
4. Add image optimization and resizing