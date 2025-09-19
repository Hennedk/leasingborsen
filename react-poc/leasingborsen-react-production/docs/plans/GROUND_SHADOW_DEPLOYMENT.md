# Ground Shadow Deployment Instructions

## Overview
The Python image processing service has been updated to support realistic ground shadows for car images.

## Changes Made

### 1. Shadow Types Available
- **drop**: Traditional drop shadow (original)
- **ground**: Single elliptical shadow beneath car (NEW DEFAULT)
- **dual_ground**: Two elliptical shadows under wheels

### 2. Ground Shadow Features
- Elliptical shape positioned at car's base
- Minimal offset (0, 3) - shadow directly below
- Higher blur (35px) for soft, realistic edges
- Radial gradient opacity (70% center → 0% edge)
- Automatically detects car's bottom edge

### 3. Files Modified
- `image_processing/shadow.py` - Added ground shadow functions
- `image_processing/__init__.py` - Exported new functions
- `models.py` - Added ShadowType enum and parameters
- `app.py` - Updated shadow application logic
- `supabase/functions/remove-bg/index.ts` - Default to ground shadow

## Deployment Steps

### 1. Deploy to Railway
```bash
cd railway-pdfplumber-poc
git push
```
Railway will automatically deploy from the main branch.

### 2. Monitor Deployment
- Check Railway dashboard for build status
- View logs for any deployment issues
- Typical deployment time: 2-3 minutes

### 3. Test Deployment
Run the test script to verify shadows:
```bash
python test-ground-shadow.py
```

Or test via curl:
```bash
curl -X POST https://leasingborsen-production.up.railway.app/process-image \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "YOUR_BASE64_IMAGE",
    "filename": "test.jpg",
    "options": {
      "shadow_type": "ground"
    }
  }'
```

### 4. Deploy Edge Function
```bash
# Deploy to production
supabase functions deploy remove-bg --project-ref hqqouszbgskteivjoems
```

## Visual Comparison

### Before (Drop Shadow)
- Shadow offset to the side (10, 10)
- Uses car's full silhouette
- Creates "floating" effect

### After (Ground Shadow)
- Shadow beneath car (0, 3)
- Elliptical shape
- Creates "grounded" effect
- More realistic for car images

## Rollback Plan
If issues arise:
1. Revert to previous commit
2. Change `shadow_type: 'drop'` in Edge Function
3. Redeploy both services

## Parameters (Adjustable)

### Ground Shadow
- `shadow_height_ratio`: 0.15 (15% of car height)
- `shadow_width_ratio`: 0.9 (90% of car width)
- `shadow_opacity_center`: 0.7 (70% opacity)
- `blur_radius`: 35 (soft edges)

### Dual Ground Shadow
- `wheel_spacing_ratio`: 0.6 (60% of car width)
- `shadow_size_ratio`: 0.25 (25% of car width per shadow)

## Success Verification
- Check processed images have ground shadow
- Verify shadow appears beneath car, not to the side
- Confirm soft, realistic appearance
- No imagescript errors in logs