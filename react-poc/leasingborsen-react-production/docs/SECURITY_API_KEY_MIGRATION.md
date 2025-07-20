# Security: API Key Migration to Supabase Secrets

## Overview
As part of P0 security fixes, the API4AI_KEY has been moved from the `.env` file to Supabase project secrets for enhanced security.

## Migration Steps Required

### 1. Add API4AI_KEY to Supabase Project Secrets

**Navigate to Supabase Dashboard:**
1. Go to your Supabase project: https://supabase.com/dashboard/project/hqqouszbgskteivjoems
2. Click on "Settings" in the left sidebar
3. Click on "Edge Functions" under Settings
4. Scroll down to "Secrets" section
5. Click "Add new secret"

**Add the secret:**
- **Name**: `API4AI_KEY`
- **Value**: `fdc0a541c0mshfe8ce716802e5bfp10165djsnd1b1f8786d29`

**Click "Save" to add the secret**

### 2. Verification

The following Edge Functions will automatically have access to this secret:
- `remove-bg` (background removal service)

No code changes are required - Edge Functions already use `Deno.env.get('API4AI_KEY')` which will access the Supabase secret.

### 3. Security Benefits

✅ **Before**: API key stored in `.env` file (accessible in frontend repository)  
✅ **After**: API key stored in Supabase secrets (server-side only, encrypted)

- API key is no longer accessible in frontend code
- Key is encrypted and managed by Supabase infrastructure
- Better access control and audit logging
- Prevents accidental exposure in repository

### 4. Testing

After adding the secret to Supabase:
1. Test the remove-bg Edge Function to ensure it can access the API key
2. Verify no errors occur when processing images
3. Check Supabase logs for any environment variable errors

## Important Notes

- **Do not commit the API4AI_KEY to any repository**
- **The .env file has been cleaned and no longer contains sensitive keys**
- **All other environment variables remain unchanged**
- **Edge Functions automatically inherit Supabase project secrets**

## Emergency Rollback

If issues occur, you can temporarily add the key back to `.env` file for local development while troubleshooting:

```bash
# Temporary local development only
API4AI_KEY=fdc0a541c0mshfe8ce716802e5bfp10165djsnd1b1f8786d29
```

**Remove immediately after fixing the Supabase secret configuration.**