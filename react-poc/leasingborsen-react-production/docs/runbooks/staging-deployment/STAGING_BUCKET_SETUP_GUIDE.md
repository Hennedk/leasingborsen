# Staging Environment Storage Bucket Setup Guide

## Problem
The staging environment (lpbtgtpgbnybjqcpsrrf) is missing the `images` storage bucket required for the auto-crop feature to work.

## Solution Options

### Option 1: Quick Manual Setup (Recommended) 🚀

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/project/lpbtgtpgbnybjqcpsrrf/storage/buckets
   
2. **Create New Bucket**
   - Click "New bucket" button
   - Configure as follows:
     - **Bucket name**: `images`
     - **Public bucket**: Toggle ON ✅
     - **File size limit**: 50 MB
     - **Allowed MIME types**: 
       - image/jpeg
       - image/jpg
       - image/png
       - image/webp
       - image/gif
   - Click "Save"

3. **That's it!** The bucket is created with default RLS policies.

### Option 2: SQL Script Method

1. **Open SQL Editor**
   - Go to: https://app.supabase.com/project/lpbtgtpgbnybjqcpsrrf/sql/new

2. **Run the SQL**
   ```sql
   -- Create the images bucket
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'images', 
     'images', 
     true,
     52428800,  -- 50MB
     ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
   )
   ON CONFLICT (id) DO NOTHING;
   ```

3. **Click "Run"**

### Option 3: API Method (Advanced)

If you have a Supabase access token:

```bash
# Get token from: https://app.supabase.com/account/tokens
SUPABASE_ACCESS_TOKEN="your-token" \
STAGING_SERVICE_ROLE_KEY="get-from-settings-api" \
node setup-staging-bucket-admin.js
```

## Verification

After creating the bucket, test it:

```bash
# Test the auto-crop feature
node test-remove-bg.js test-car.jpg
```

You should see:
```
✅ Background removal successful!
```

## Next Steps

1. **Update your .env.local** to use staging:
   ```bash
   cp .env.staging .env.local
   ```

2. **Restart dev server**:
   ```bash
   npm run dev
   ```

3. **Test in Admin UI**:
   - Go to http://localhost:5173/admin/listings
   - Upload an image with background removal
   - Check console for "Auto-crop applied" message

## Expected Results

- Background removal works
- Auto-crop removes 60-80% whitespace
- Processing time < 200ms
- Images stored in staging environment

## Troubleshooting

If you still get "Bucket not found":
1. Make sure bucket name is exactly `images` (lowercase)
2. Ensure it's set as public
3. Try logging out and back into Supabase dashboard
4. Check the bucket appears in Storage > Buckets list

## Quick Links

- [Staging Storage Buckets](https://app.supabase.com/project/lpbtgtpgbnybjqcpsrrf/storage/buckets)
- [Staging SQL Editor](https://app.supabase.com/project/lpbtgtpgbnybjqcpsrrf/sql/new)
- [Staging Project Settings](https://app.supabase.com/project/lpbtgtpgbnybjqcpsrrf/settings/general)