# Complete Staging Environment Setup Guide (Free Tier)

This guide provides step-by-step instructions for setting up a staging environment on Supabase's free tier.

## 📋 Prerequisites

- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Node.js 18+ installed
- Access to production Supabase dashboard
- Git repository access

## 🚀 Step 1: Create Staging Project

1. **Log into Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Click "New Project"

2. **Configure Project**
   - Name: `leasingborsen-staging`
   - Database Password: Generate a strong password (save it!)
   - Region: Same as production (eu-central-1)
   - Plan: Free tier

3. **Save Credentials**
   After creation, save these from Settings > API:
   - Project URL: `https://[PROJECT-REF].supabase.co`
   - Anon Key: `eyJ...` (long JWT token)
   - Service Role Key: `eyJ...` (for Edge Functions)

## 🔧 Step 2: Run Setup Script

```bash
# Make setup script executable
chmod +x scripts/setup-staging.sh

# Run the setup wizard
npm run staging:setup
```

The script will:
- Check prerequisites
- Create `.env.staging` file
- Link to your staging project
- Provide next steps

## 📊 Step 3: Export Production Schema

Since we're on free tier, we need to manually export the schema.

### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Production Project**
   ```
   https://app.supabase.com/project/hqqouszbgskteivjoems/editor
   ```

2. **Export Schema**
   - Click "Schema Visualizer" tab
   - Click "Export" button
   - Choose "Include data: No"
   - Save as: `supabase/migrations/20250101000000_initial_schema.sql`

### Option B: Via SQL Editor

1. **Go to SQL Editor** in production
2. **Run this query** to export table definitions:

```sql
-- Get all table definitions
WITH table_ddl AS (
  SELECT 
    'CREATE TABLE IF NOT EXISTS ' || schemaname || '.' || tablename || ' (' || chr(10) ||
    string_agg(
      '  ' || column_name || ' ' || 
      CASE 
        WHEN data_type = 'character varying' THEN 'varchar(' || character_maximum_length || ')'
        WHEN data_type = 'numeric' THEN 'numeric(' || numeric_precision || ',' || numeric_scale || ')'
        ELSE data_type
      END ||
      CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
      CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
      ',' || chr(10)
    ) || chr(10) || ');' as ddl
  FROM information_schema.columns
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
)
SELECT string_agg(ddl, chr(10) || chr(10)) as schema_export
FROM table_ddl;
```

3. **Export Views and Functions**
   - Use Schema Visualizer for complete export
   - Include: Views, Functions, Triggers, RLS Policies

## 🚀 Step 4: Apply Schema to Staging

```bash
# Link to staging (if not already done)
supabase link --project-ref [YOUR-STAGING-REF]

# Apply the schema
supabase db push

# If you have existing migrations
supabase migration repair --status applied
```

## 🔌 Step 5: Deploy Edge Functions

```bash
# Deploy all Edge Functions to staging
STAGING_PROJECT_REF=[YOUR-REF] npm run staging:deploy-all

# Or deploy individually
supabase functions deploy admin-listing-operations --project-ref [YOUR-REF]
supabase functions deploy ai-extract-vehicles --project-ref [YOUR-REF]
# ... repeat for all functions
```

### Edge Functions to Deploy:
- `admin-listing-operations`
- `admin-seller-operations`
- `admin-image-operations`
- `admin-reference-operations`
- `ai-extract-vehicles`
- `apply-extraction-changes`
- `compare-extracted-listings`
- `calculate-lease-score`
- `batch-calculate-lease-scores`
- `pdf-proxy`
- `manage-prompts`
- `remove-bg`

## 🌱 Step 6: Seed Test Data

```bash
# Run the seeding script
npm run staging:seed
```

This will create:
- Reference data (makes, models, body types, etc.)
- Test sellers and dealers
- Sample car listings with pricing

## ✅ Step 7: Verify Staging Setup

```bash
# Test staging connection
npm run staging:test

# Run app with staging database
npm run staging:dev
```

## 🔐 Step 8: Configure Environment Variables

### For Local Development with Staging

Create/update `.env.staging`:
```env
# Staging Supabase
VITE_SUPABASE_URL=https://[YOUR-STAGING-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-STAGING-ANON-KEY]

# Feature Flags
VITE_AI_EXTRACTION_ENABLED=true
VITE_BATCH_PROCESSING_ENABLED=true
VITE_MOBILE_FILTERS_ENABLED=true
VITE_DEBUG_MODE=true

# Services
VITE_PDF_SERVICE_URL=https://leasingborsen-staging.up.railway.app
```

### For Vercel Deployment

Add these to Vercel environment variables:
- `VITE_SUPABASE_STAGING_URL`
- `VITE_SUPABASE_STAGING_ANON_KEY`

## 📝 Usage Patterns

### Running with Staging Database

```bash
# Development server with staging DB
npm run staging:dev

# Run specific commands against staging
NODE_ENV=staging npm run [command]
```

### Switching Between Environments

```javascript
// The app automatically detects environment from:
// 1. NODE_ENV=staging
// 2. VITE_ENVIRONMENT=staging
// 3. URL pattern (if contains 'staging')
```

## 🚧 Limitations on Free Tier

- **2 Projects Max**: Production + Staging only
- **No Branching**: Must use separate projects
- **500MB Database**: Should be sufficient for staging
- **No Point-in-Time Recovery**: Use manual backups
- **Rate Limits**: Lower than Pro plan

## 🔄 Migration Workflow

1. **Develop Locally**
   ```bash
   supabase migration new feature_name
   supabase db reset  # Test migration
   ```

2. **Test in Staging**
   ```bash
   supabase link --project-ref [STAGING-REF]
   supabase db push
   ```

3. **Deploy to Production**
   ```bash
   supabase link --project-ref hqqouszbgskteivjoems
   supabase db push
   ```

## 🛠️ Troubleshooting

### "Database password required" Error
- Use Schema Visualizer export instead of CLI
- Or provide password: `supabase db pull --db-url "postgresql://..."`

### Edge Functions Not Working
- Check service role key is set in Vercel
- Verify functions deployed: `supabase functions list`

### Connection Issues
- Verify `.env.staging` is loaded
- Check `npm run staging:test` output
- Ensure correct project linked: `supabase projects list`

## 📚 Next Steps

1. **Set up CI/CD** for automated staging deployments
2. **Configure monitoring** for staging environment
3. **Create staging-specific test data**
4. **Document staging-specific workflows**

## 🔐 Security Notes

- Never commit `.env.staging` to git
- Use different service role keys per environment
- Enable RLS on all staging tables
- Regularly rotate staging credentials

---

## Quick Reference

```bash
# Setup
npm run staging:setup          # Initial setup wizard

# Database
npm run staging:db-push        # Apply migrations
npm run staging:seed           # Seed test data

# Development
npm run staging:dev            # Run with staging DB
npm run staging:test           # Test connection

# Deployment
npm run staging:deploy-all     # Deploy all Edge Functions
```

## Support

- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- Internal team: #dev-staging channel