# Edge Function Deployment Guide

## Quick Fix for CORS Error

The CORS error you're experiencing is likely because the Edge Function hasn't been deployed yet. Here's how to fix it:

### 1. Deploy the Edge Function

```bash
# First, make sure you're logged in to Supabase CLI
supabase login

# Link to your project (if not already linked)
supabase link --project-ref hqqouszbgskteivjoems

# Deploy the process-pdf function
supabase functions deploy process-pdf

# Or use the npm script
npm run pdf:deploy
```

### 2. Set Environment Variables

After deployment, set the required environment variables in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions → process-pdf → Settings
3. Add these environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key for AI extraction

### 3. Test the Deployment

```bash
# Test the health endpoint
curl -L -X GET 'https://hqqouszbgskteivjoems.supabase.co/functions/v1/process-pdf/health' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'

# Should return:
# {"status":"healthy","service":"process-pdf","version":"1.0.0","timestamp":"..."}
```

### 4. Alternative: Local Development

If you want to test locally before deploying:

```bash
# Serve the function locally
supabase functions serve process-pdf --env-file .env.local

# The function will be available at:
# http://localhost:54321/functions/v1/process-pdf
```

Then update your frontend to use the local URL:

```javascript
// In GenericBatchUploadDialog.tsx, temporarily change:
const functionUrl = import.meta.env.DEV 
  ? 'http://localhost:54321/functions/v1/process-pdf'
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf`
```

### 5. Common Issues and Solutions

#### Issue: "Failed to load resource: net::ERR_FAILED"
- **Cause**: Edge Function not deployed
- **Solution**: Deploy using `supabase functions deploy process-pdf`

#### Issue: "CORS policy: It does not have HTTP ok status"
- **Cause**: Edge Function is throwing an error before sending CORS headers
- **Solution**: Check Edge Function logs: `supabase functions logs process-pdf`

#### Issue: "401 Unauthorized"
- **Cause**: Missing or incorrect anon key
- **Solution**: Verify your `VITE_SUPABASE_ANON_KEY` in `.env.local`

### 6. Debug Checklist

1. ✅ Edge Function deployed: `supabase functions list`
2. ✅ Database migrations applied: `supabase db push`
3. ✅ Dealer configs loaded: `npm run pdf:load-configs`
4. ✅ Storage bucket exists: Check "batch-imports" bucket in Supabase dashboard
5. ✅ Environment variables set: OpenAI API key in Edge Function settings

### 7. Quick Test After Deployment

```bash
# Run the Toyota test
npm run pdf:test-toyota

# This will test:
# - Edge Function connectivity
# - CORS headers
# - PDF processing
# - Dealer detection
```

## Production Deployment

For production deployment:

1. **Set proper CORS origin** (instead of '*'):
   ```typescript
   // In _shared/cors.ts
   export const corsHeaders = {
     'Access-Control-Allow-Origin': 'https://your-production-domain.com',
     // ... rest of headers
   }
   ```

2. **Enable RLS policies** on all tables
3. **Set up monitoring** and alerts
4. **Configure rate limiting** if needed

---

Once deployed, the CORS error should be resolved and you'll be able to upload Toyota PDFs through the UI!