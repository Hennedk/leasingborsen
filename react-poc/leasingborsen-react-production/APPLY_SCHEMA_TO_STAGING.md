# Apply Schema to Staging - Manual Steps

Since we need the database password for CLI operations, here's how to apply the schema manually:

## Step 1: Open Staging SQL Editor

Go to: https://supabase.com/dashboard/project/lpbtgtpgbnybjqcpsrrf/sql/new

## Step 2: Apply the Schema

1. Open the file: `supabase/migrations/20250129000000_staging_schema.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click "Run" to execute

## Step 3: Verify Tables Created

Run this query to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- api_call_logs
- batch_import_items
- batch_imports
- body_type_mapping
- body_types
- colours
- dealers
- extraction_listing_changes
- extraction_sessions
- fuel_types
- input_schemas
- lease_pricing
- listings
- makes
- models
- processing_jobs
- responses_api_configs
- sellers
- text_format_configs
- transmissions

## Step 4: Verify Views Created

```sql
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public';
```

Expected views:
- full_listing_view
- extraction_session_summary

## Step 5: Next Steps

After schema is applied:

1. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy --project-ref lpbtgtpgbnybjqcpsrrf
   ```

2. **Seed Test Data**:
   ```bash
   npm run staging:seed
   ```

3. **Test Connection**:
   ```bash
   npm run staging:test
   ```

## Alternative: Reset Database Password

If you want to use CLI commands:

1. Go to: https://supabase.com/dashboard/project/lpbtgtpgbnybjqcpsrrf/settings/database
2. Click "Reset database password"
3. Save the new password
4. Run: `supabase db push --linked`