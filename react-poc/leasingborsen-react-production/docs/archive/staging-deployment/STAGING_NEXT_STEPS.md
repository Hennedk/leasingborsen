# Next Steps for Staging Setup

Your staging project is created: `lpbtgtpgbnybjqcpsrrf`

## 1. Get Your Credentials

Go to: https://supabase.com/dashboard/project/lpbtgtpgbnybjqcpsrrf/settings/api

Copy these values:
- **Project URL**: `https://lpbtgtpgbnybjqcpsrrf.supabase.co` ✓
- **anon public key**: (starts with `eyJ...`)
- **service_role key**: (for Edge Functions - keep secure!)

## 2. Run Setup Script

```bash
npm run staging:setup
```

When prompted, enter:
- Project Reference: `lpbtgtpgbnybjqcpsrrf`
- Anon Key: [paste your anon key]

## 3. Export Production Schema

Since the template created some tables, we need to export your production schema:

### Option A: Via Dashboard (Easiest)
1. Go to production: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/editor
2. Click "Schema Visualizer" tab
3. Click "Export"
4. Uncheck "Include data"
5. Save as: `supabase/migrations/20250129000000_production_schema.sql`

### Option B: Manual Export
1. Go to production SQL Editor
2. Run the schema export query from the guide
3. Save the output

## 4. Clean Template & Apply Schema

```bash
# Link to staging
supabase link --project-ref lpbtgtpgbnybjqcpsrrf

# Check current tables (will show template tables)
supabase db diff

# Apply your production schema
supabase db push

# If needed, reset first:
# supabase db reset --linked
```

## 5. Deploy Edge Functions

```bash
# Deploy all functions to staging
supabase functions deploy --project-ref lpbtgtpgbnybjqcpsrrf
```

## 6. Seed Test Data

```bash
npm run staging:seed
```

## 7. Test Connection

```bash
npm run staging:test
npm run staging:dev
```

## Current Status

✅ Staging project created: lpbtgtpgbnybjqcpsrrf
⏳ Waiting for: Anon key to complete setup
⏳ Need to: Export production schema
⏳ Need to: Apply schema to staging
⏳ Need to: Deploy Edge Functions