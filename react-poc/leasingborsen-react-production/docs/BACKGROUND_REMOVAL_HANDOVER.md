# Background Removal - Session Handover

## Current Status: 95% Complete
Background removal is working but images don't persist after save.

## What's Working ✅
1. **API Integration**: API4.ai service is functioning correctly (24 credits remaining)
2. **Image Processing**: Background removal processes successfully
3. **Storage**: Images are stored in correct 'images' bucket under `background-removal/` subdirectories
4. **UI Flow**: Preview dialog shows original and processed images correctly
5. **Edge Functions**: Both `admin-image-operations` and `remove-bg` deployed and working

## The Remaining Issue ❌
**Problem**: Background-removed images disappear after page refresh
- User uploads image → Background removed → Accepts in modal → Image shows in form
- But after saving and refreshing, the image is gone
- Example listing: `1f773bdf-2a60-4c85-a739-513dedf035cb`

## Console Output Analysis
```javascript
// Successful processing:
Background removed: {
  processed: 'https://hqqouszbgskteivjoems.supabase.co/storage/v1/object/public/images/background-removal/detail/...',
  original: 'blob:https://leasingborsen-react-production.vercel.app/...',
  gridUrl: 'https://hqqouszbgskteivjoems.supabase.co/storage/v1/object/public/images/background-removal/grid/...',
  detailUrl: 'https://hqqouszbgskteivjoems.supabase.co/storage/v1/object/public/images/background-removal/detail/...'
}
```

## Investigation Path
1. **Check Form Submission**:
   - Look at `AdminListingFormNew.tsx` to see how images are saved
   - Verify if `updateListingImages` is called during form submission
   - Check if the images array includes the processed URLs

2. **Database Update**:
   - Confirm if `admin-listing-operations` Edge Function is receiving the correct image URLs
   - Check if the database `listings.images` field is being updated
   - Verify the image URLs are in the correct format

3. **Possible Causes**:
   - Form might be resetting images array before save
   - Auto-save might be interfering with manual save
   - Processed URLs might not be properly added to form state

## Code Locations
- **Form Component**: `src/components/admin/listings/forms/AdminListingFormNew.tsx`
- **Media Section**: `src/components/admin/listings/forms/form-sections/MediaSectionWithBackgroundRemoval.tsx`
- **Image Upload Hook**: `src/hooks/useAdminImageUpload.ts`
- **Admin Operations**: `supabase/functions/admin-listing-operations/index.ts`

## Quick Test
1. Upload image with background removal
2. Open browser DevTools Network tab
3. Save the listing
4. Look for `admin-listing-operations` request
5. Check the payload to see if images array contains the processed URLs

## Fix Strategy
Once you identify where images are lost:
1. Ensure processed URLs are added to form's images array
2. Verify updateListingImages is called with all URLs
3. Check if there's a race condition between auto-save and manual save
4. Consider adding debug logging to trace the full save flow