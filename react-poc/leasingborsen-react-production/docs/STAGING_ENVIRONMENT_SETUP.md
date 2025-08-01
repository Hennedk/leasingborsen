# Staging Environment Setup Guide

Based on official Supabase documentation, this guide outlines how to properly set up staging environments.

## Architecture Overview

Supabase recommends creating **separate projects** for each environment:

- **Local Development**: Docker-based Supabase instance
- **Staging**: Dedicated Supabase project
- **Production**: Current production project

## Setup Steps

### 1. Create Staging Project

1. Log in to [app.supabase.com](https://app.supabase.com)
2. Create new project: `leasingborsen-staging`
3. Save credentials:
   - Project URL: `https://[staging-ref].supabase.co`
   - Anon Key: `eyJ...`
   - Service Role Key: `eyJ...` (for Edge Functions)

### 2. Initialize Local Development

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Initialize local project
supabase init

# Start local Supabase
supabase start

# Link to production for pulling schema
supabase link --project-ref hqqouszbgskteivjoems
```

### 3. Pull Production Schema

```bash
# Generate migration from current production schema
supabase db pull

# This creates a migration file in supabase/migrations/
```

### 4. Apply Schema to Staging

```bash
# Link to staging project
supabase link --project-ref [staging-ref]

# Push schema to staging
supabase db push
```

### 5. Configure Environment Files

Create `.env.staging`:
```env
VITE_SUPABASE_URL=https://[staging-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[staging-anon-key]

# Services
VITE_PDF_SERVICE_URL=https://leasingborsen-staging.up.railway.app
VITE_AI_EXTRACTION_ENABLED=true
VITE_DEBUG_MODE=true
```

### 6. Deploy Edge Functions to Staging

```bash
# Deploy all Edge Functions to staging
supabase functions deploy --project-ref [staging-ref]
```

### 7. Set Up GitHub Actions

Create `.github/workflows/staging-deploy.yml`:
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_STAGING_PROJECT_ID: ${{ secrets.SUPABASE_STAGING_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Deploy Database Migrations
        run: |
          supabase link --project-ref $SUPABASE_STAGING_PROJECT_ID
          supabase db push
          
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --project-ref $SUPABASE_STAGING_PROJECT_ID
```

## Migration Workflow

### Development → Staging → Production

1. **Local Development**
   ```bash
   # Make schema changes locally
   supabase migration new feature_name
   
   # Test locally
   supabase db reset
   ```

2. **Deploy to Staging**
   ```bash
   # Push to staging branch
   git push origin develop
   
   # GitHub Actions automatically deploys to staging
   ```

3. **Test in Staging**
   - Verify schema changes
   - Test Edge Functions
   - Run integration tests

4. **Deploy to Production**
   ```bash
   # Merge to main
   git checkout main
   git merge develop
   git push origin main
   
   # Apply to production
   supabase link --project-ref hqqouszbgskteivjoems
   supabase db push
   ```

## Environment Verification

### Check Current Environment
```bash
npm run env:check
```

### Verify Staging Connection
```bash
VITE_SUPABASE_URL=[staging-url] \
VITE_SUPABASE_ANON_KEY=[staging-key] \
npm run env:check
```

## Cost Considerations

- **Free Tier**: 2 projects (can use for staging + production)
- **Pro Plan**: $25/month per project (for additional features)
- **Team Plan**: $599/month (includes branching feature)

## Current Status

✅ **Local Environment**: Ready (mocking configured)
❌ **Staging Project**: Not created yet
✅ **Production Project**: Active (hqqouszbgskteivjoems)

## Next Steps

1. Create staging Supabase project
2. Pull production schema
3. Apply to staging
4. Update environment files
5. Deploy Edge Functions
6. Configure CI/CD

## Security Notes

- Never commit `.env.staging` with real credentials
- Use GitHub Secrets for CI/CD
- Separate service role keys for each environment
- Enable RLS on all tables in staging

## Testing Strategy

### Unit Tests (Local)
- Use mocks and factories
- No database connection needed

### Integration Tests (Staging)
- Real database operations
- Edge Function testing
- End-to-end workflows

### Smoke Tests (Production)
- Read-only verification
- Health checks
- Performance monitoring