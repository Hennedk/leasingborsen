# Staging and Production Environment Setup & Workflow

## Overview
This document outlines the complete staging and production environment setup, including Supabase database branches, Vercel preview deployments, and the development workflow that prevents production issues.

## Environment Architecture

### Current Setup
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Local Dev     │────▶│  Staging Branch │     │ Production Main │
│  (Your Machine) │     │   (Supabase)    │     │   (Supabase)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       ▲                        ▲
         │                       │                        │
         │              ┌─────────────────┐      ┌─────────────────┐
         └─────────────▶│ Vercel Preview  │      │  Vercel Prod    │
                        │  (test/staging) │      │     (main)      │
                        └─────────────────┘      └─────────────────┘
```

## Supabase Configuration

### Production Environment
- **Project**: Main Supabase project
- **Branch**: Main (default)
- **Environment Variables**:
  ```bash
  VITE_SUPABASE_URL=https://[PROD-PROJECT-REF].supabase.co
  VITE_SUPABASE_ANON_KEY=[PROD-ANON-KEY]
  ```

### Staging Environment
- **Project**: Same Supabase project
- **Branch**: staging (database branch)
- **Environment Variables**:
  ```bash
  VITE_SUPABASE_URL=https://[STAGING-PROJECT-REF].supabase.co
  VITE_SUPABASE_ANON_KEY=[STAGING-ANON-KEY]
  ```

### Key Configuration Files

#### AI Prompt Configuration
Both environments use the same prompt management system:
- **Table**: `responses_api_configs`
- **Current Version**: v29 (as of July 2025)
- **Prompt ID**: `pmpt_68677b2c8ebc819584c1af3875e5af5f0bd2f952f3e39828`

To update prompt version:
```sql
-- Check current version
SELECT name, openai_prompt_version, model, active 
FROM responses_api_configs 
WHERE name = 'vehicle-extraction';

-- Update to new version
UPDATE responses_api_configs 
SET 
  openai_prompt_version = '29',
  model = 'gpt-4.1',
  updated_at = NOW()
WHERE name = 'vehicle-extraction' AND active = true;
```

## Vercel Setup

### Preview Deployments (Staging)
1. **Branch**: `test/staging`
2. **Environment Variables** (Set as Preview + Development):
   ```
   VITE_SUPABASE_URL=[STAGING-URL]
   VITE_SUPABASE_ANON_KEY=[STAGING-KEY]
   VITE_AI_EXTRACTION_ENABLED=true
   ```
3. **Deployment URL**: `https://leasingborsen-react-production-[HASH].vercel.app`

### Production Deployments
1. **Branch**: `main`
2. **Environment Variables** (Set as Production):
   ```
   VITE_SUPABASE_URL=[PROD-URL]
   VITE_SUPABASE_ANON_KEY=[PROD-KEY]
   VITE_AI_EXTRACTION_ENABLED=true
   ```
3. **Deployment URL**: Production domain

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Develop and test locally
npm run dev

# Run tests
npm run test
npm run test:comparison  # Run comparison engine tests
```

### 2. Testing in Staging
```bash
# Push to test/staging branch
git checkout test/staging
git merge feature/your-feature-name
git push origin test/staging

# Vercel automatically deploys preview
# Test at: https://leasingborsen-react-production-[HASH].vercel.app
```

### 3. Edge Function Deployment

#### Deploy to Staging First
```bash
# Set staging project
export SUPABASE_PROJECT_REF=[STAGING-PROJECT-REF]

# Deploy all Edge Functions to staging
supabase functions deploy apply-extraction-changes --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy compare-extracted-listings --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy ai-extract-vehicles --project-ref $SUPABASE_PROJECT_REF
# ... deploy other functions as needed
```

#### Deploy to Production (After Testing)
```bash
# Set production project
export SUPABASE_PROJECT_REF=[PROD-PROJECT-REF]

# Deploy all Edge Functions to production
supabase functions deploy apply-extraction-changes --project-ref $SUPABASE_PROJECT_REF
supabase functions deploy compare-extracted-listings --project-ref $SUPABASE_PROJECT_REF
# ... deploy other functions
```

### 4. Database Migrations

#### Apply to Staging
```bash
# Switch to staging branch
supabase db push --branch staging

# Or apply specific migration
psql $STAGING_DATABASE_URL -f migration.sql
```

#### Apply to Production (After Testing)
```bash
# Switch to main branch
supabase db push

# Or apply specific migration
psql $PRODUCTION_DATABASE_URL -f migration.sql
```

## Testing Checklist

### Before Deploying to Staging
- [ ] Run unit tests: `npm run test`
- [ ] Run comparison tests: `npm run test:comparison`
- [ ] Check TypeScript: `npm run build`
- [ ] Verify environment variables

### Testing in Staging
- [ ] Test AI extraction with sample PDFs
- [ ] Verify comparison logic (create/update/delete)
- [ ] Test applying extraction changes
- [ ] Check staging banner is visible
- [ ] Verify correct database (staging data only)

### Before Deploying to Production
- [ ] All staging tests pass
- [ ] Edge Functions work correctly
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Rollback plan ready

## Common Issues & Solutions

### Issue: Extraction Failing with Wrong Prompt Version
**Symptom**: "Prompt with id 'pmpt_vehicle_extraction_v17' not found"

**Solution**:
```sql
-- Update staging
UPDATE responses_api_configs 
SET openai_prompt_version = '29'
WHERE name = 'vehicle-extraction' AND active = true;

-- Update production (after testing)
-- Same query on production database
```

### Issue: Comparison Logic Creating Duplicates
**Symptom**: System suggests creating new listings for existing vehicles with different transmissions

**Solution**: 
- Fixed by including transmission in matching key
- Deployed fix to both staging and production Edge Functions

### Issue: Edge Functions Using Old Logic
**Symptom**: Bug persists after database function update

**Solution**:
```bash
# Redeploy Edge Functions to clear cache
supabase functions deploy [function-name] --project-ref $PROJECT_REF
```

### Issue: Apply Changes Failing
**Symptom**: "column reference is ambiguous" or similar database errors

**Solution**:
- Update database functions with explicit table references
- Redeploy Edge Functions that call these functions

## Staging Environment Features

### Visual Indicators
The staging environment shows an orange banner with debug information:
- Environment name (staging)
- Supabase URL confirmation
- Current date/time
- Database connection status

### Test Data
Staging should contain:
- Test dealers (prefixed with TEST_)
- Sample listings for testing
- Extraction sessions for verification

### Isolation
- Completely separate database branch
- No production data access
- Safe for destructive testing

## Production Deployment Process

### 1. Create Pull Request
```bash
git checkout main
git pull origin main
git checkout -b release/v1.2.3
git merge test/staging
git push origin release/v1.2.3
```

### 2. Review Checklist
- [ ] All tests passing
- [ ] Staging testing complete
- [ ] Database migrations reviewed
- [ ] Edge Functions tested
- [ ] Rollback plan documented

### 3. Deploy
```bash
# Merge to main
git checkout main
git merge release/v1.2.3
git push origin main

# Vercel auto-deploys to production
# Monitor deployment at vercel.com
```

### 4. Post-Deployment
- [ ] Verify production deployment
- [ ] Test critical paths
- [ ] Monitor error logs
- [ ] Check performance metrics

## Monitoring & Debugging

### Staging Logs
```bash
# View Edge Function logs
supabase functions logs [function-name] --project-ref [STAGING-REF]

# View database logs
supabase db logs --project-ref [STAGING-REF]
```

### Production Logs
```bash
# View Edge Function logs (be careful!)
supabase functions logs [function-name] --project-ref [PROD-REF]

# Monitor via Supabase Dashboard
# Dashboard > Logs > Edge Functions
```

### Debug Workflow
1. Reproduce issue in staging
2. Add logging to Edge Functions
3. Deploy to staging only
4. Fix and verify in staging
5. Deploy fix to production

## Best Practices

### DO's
- ✅ Always test in staging first
- ✅ Deploy Edge Functions to both environments
- ✅ Keep staging data separate from production
- ✅ Use environment-specific API keys
- ✅ Document all configuration changes
- ✅ Run comparison tests before deployment

### DON'Ts
- ❌ Never test with production data locally
- ❌ Don't skip staging deployment
- ❌ Avoid direct production database modifications
- ❌ Don't share staging URLs publicly
- ❌ Never commit environment variables

## Emergency Procedures

### Rollback Edge Function
```bash
# List function versions
supabase functions list-versions [function-name]

# Deploy previous version
supabase functions deploy [function-name] --version [previous-version]
```

### Rollback Database Changes
```sql
-- Always keep rollback scripts
-- Example: Revert prompt version
UPDATE responses_api_configs 
SET openai_prompt_version = '28'  -- Previous version
WHERE name = 'vehicle-extraction';
```

### Quick Fixes
1. **Disable AI Extraction**: Set `VITE_AI_EXTRACTION_ENABLED=false`
2. **Rate Limit Issues**: Increase limits in Edge Function middleware
3. **Database Locks**: Check active queries in Supabase Dashboard

## Appendix: Quick Commands

### Check Environment
```bash
# Staging
curl https://[STAGING-URL]/rest/v1/sellers \
  -H "apikey: [STAGING-ANON-KEY]"

# Production (be careful!)
curl https://[PROD-URL]/rest/v1/sellers \
  -H "apikey: [PROD-ANON-KEY]"
```

### Deploy All Edge Functions
```bash
# Script to deploy all functions
for func in apply-extraction-changes compare-extracted-listings ai-extract-vehicles; do
  supabase functions deploy $func --project-ref $SUPABASE_PROJECT_REF
done
```

### Sync Prompt Versions
```sql
-- Compare prompt versions between environments
-- Run on both staging and production
SELECT 
  name,
  openai_prompt_version,
  model,
  updated_at,
  active
FROM responses_api_configs
WHERE name = 'vehicle-extraction'
ORDER BY updated_at DESC;
```

This workflow ensures safe development and deployment practices, preventing production issues through proper staging validation.