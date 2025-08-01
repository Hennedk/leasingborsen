# Staging Environment Setup Status

## ✅ Completed

1. **Created Staging Project**
   - Project: `leasingborsen-staging`
   - Project ID: `lpbtgtpgbnybjqcpsrrf`
   - URL: https://lpbtgtpgbnybjqcpsrrf.supabase.co

2. **Environment Configuration**
   - Created `.env.staging` with correct credentials
   - Updated environment detection to support staging
   - Fixed verify script to load staging env file

3. **Edge Functions Deployed**
   - ✅ admin-listing-operations
   - ✅ admin-seller-operations
   - ✅ admin-image-operations
   - ✅ admin-reference-operations
   - ✅ ai-extract-vehicles
   - ✅ apply-extraction-changes
   - ✅ compare-extracted-listings
   - ✅ pdf-proxy
   - ✅ calculate-lease-score
   - ✅ batch-calculate-lease-scores
   - ✅ manage-prompts
   - ✅ remove-bg (fixed syntax errors)

4. **Scripts Ready**
   - Setup script: `npm run staging:setup`
   - Test script: `npm run staging:test`
   - Seed script: `npm run staging:seed`
   - Dev with staging: `npm run staging:dev`

## ⏳ Pending - Manual Step Required

### Apply Database Schema

1. **Go to SQL Editor**:
   https://supabase.com/dashboard/project/lpbtgtpgbnybjqcpsrrf/sql/new

2. **Copy Schema**:
   Open file: `supabase/migrations/20250129000000_staging_schema.sql`

3. **Paste & Run**:
   - Paste the entire contents into SQL Editor
   - Click "Run" button
   - Wait for completion (may take 30-60 seconds)

4. **Verify Tables**:
   ```sql
   SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public';
   -- Should return 22 tables
   ```

## 🚀 After Schema Applied

1. **Seed Test Data**:
   ```bash
   npm run staging:seed
   ```

2. **Test Connection Again**:
   ```bash
   npm run staging:test
   ```

3. **Run App with Staging**:
   ```bash
   npm run staging:dev
   ```

## 📝 Important Notes

- Schema includes all tables, views, and functions from production
- Edge Functions are deployed and ready
- API keys need to be set in Supabase project settings for AI features
- Staging uses separate database - no production data risk

## 🔐 Required Secrets (Set in Supabase Dashboard)

Go to: https://supabase.com/dashboard/project/lpbtgtpgbnybjqcpsrrf/settings/vault

Add these secrets:
- `OPENAI_API_KEY` - For AI extraction
- `ANTHROPIC_API_KEY` - For Claude support
- `API4AI_KEY` - For background removal

## Status Summary

✅ Staging Supabase project created
✅ Environment configuration complete
✅ All Edge Functions deployed
✅ Complete schema exported from production
⏳ Schema needs to be applied manually (SQL Editor)
⏳ Test data needs to be seeded (after schema)
⏳ API keys need to be added to Vault