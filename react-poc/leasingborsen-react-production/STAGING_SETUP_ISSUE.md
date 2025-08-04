# Staging Environment Setup Issue

## Problem
The staging environment is missing the required storage bucket configuration for image uploads and background removal functionality.

### Error Encountered
When trying to upload images with background removal:
```
Failed to upload original image: Bucket not found
```

## Root Cause
The staging Supabase project (lpbtgtpgbnybjqcpsrrf) does not have the `images` storage bucket configured.

## Solution

### 1. Create Storage Bucket via Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select the staging project (lpbtgtpgbnybjqcpsrrf)
3. Navigate to Storage → Buckets
4. Click "New Bucket"
5. Configure:
   - Name: `images`
   - Public: Yes (toggle on)
   - File size limit: 50MB
   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif

### 2. Alternative: Run SQL Script

Execute the SQL script in `setup-staging-storage.sql` in the Supabase dashboard:
1. Go to SQL Editor in Supabase Dashboard
2. Copy and paste the contents of `setup-staging-storage.sql`
3. Run the script

### 3. Verify Setup

Run the verification script:
```bash
node check-staging-buckets.js
```

You should see:
```
Found buckets:
- images (public)
```

## Testing After Fix

1. Test background removal directly:
   ```bash
   node test-remove-bg.js test-car.jpg
   ```

2. Test via the admin interface:
   - Go to http://localhost:5173/admin/listings
   - Upload an image with background removal enabled

## Additional Notes

- The production environment already has this bucket configured
- Edge Functions are deployed and API keys are set in staging
- The auto-crop feature is integrated and will work once the bucket is created