# Edge Function Deployment Instructions

## Overview
The remove-bg Edge Function has been updated to use the Python image processing service instead of the buggy imagescript library.

## Changes Made
1. **remove-bg** - Completely replaced imagescript with Python service calls
2. **admin-image-operations** - No changes needed (it calls remove-bg)
3. **admin-listing-operations** - No image processing found, no changes needed

## Files Modified
- `/supabase/functions/remove-bg/index.ts` - Updated to use Python service
- `/supabase/functions/remove-bg/index.ts.backup` - Original version backup

## Deployment Steps

### 1. Set Environment Variable (Optional)
If you want to override the default Python service URL:
```bash
supabase secrets set RAILWAY_SERVICE_URL=https://leasingborsen-production.up.railway.app
```

### 2. Deploy the Updated Edge Function
```bash
# Deploy remove-bg function
supabase functions deploy remove-bg

# Verify deployment
supabase functions list
```

### 3. Test the Deployed Function
```bash
# Run the test script against deployed function
EDGE_FUNCTION_URL=https://[PROJECT_ID].supabase.co/functions/v1/remove-bg \
SUPABASE_ANON_KEY=[YOUR_ANON_KEY] \
deno run --allow-net --allow-env test-edge-function.ts
```

### 4. Monitor Logs
```bash
# Watch function logs
supabase functions logs remove-bg --tail

# Check for any imagescript errors (should be none)
supabase functions logs remove-bg | grep -i imagescript
```

### 5. Verify in Admin Interface
1. Go to `/admin/listings`
2. Upload a new car image
3. Check that background removal works correctly
4. Verify auto-crop is functioning

## Rollback Plan
If issues arise:
```bash
# Restore original version
cp supabase/functions/remove-bg/index.ts.backup supabase/functions/remove-bg/index.ts

# Redeploy
supabase functions deploy remove-bg
```

## Benefits of the Update
- ✅ No more imagescript errors
- ✅ Reliable auto-crop functionality
- ✅ Better performance (~7.5s for typical car images)
- ✅ Multiple size generation (grid, detail, full)
- ✅ Proper shadow effects
- ✅ WebP format for smaller file sizes

## Python Service Details
- **URL**: https://leasingborsen-production.up.railway.app/
- **Endpoint**: POST /process-image
- **Features**: Background removal, auto-crop, shadow, multiple sizes
- **Cache**: 15-minute cache for processed images

## Monitoring
After deployment:
1. Check Railway logs for processing times
2. Monitor Supabase Edge Function logs
3. Verify no imagescript errors appear
4. Test with various car images

## Success Criteria
- [ ] Edge Function deployed successfully
- [ ] No imagescript errors in logs
- [ ] Auto-crop working for all images
- [ ] Background removal functioning correctly
- [ ] Admin interface image upload working