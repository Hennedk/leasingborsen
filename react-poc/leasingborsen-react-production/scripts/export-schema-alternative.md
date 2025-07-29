# Alternative Schema Export Methods

Since we encountered authentication issues with `supabase db pull`, here are alternative methods to export your production schema:

## Method 1: Supabase Dashboard Export (Recommended)

1. **Log into Supabase Dashboard**
   - Go to: https://app.supabase.com/project/hqqouszbgskteivjoems

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Export Schema Using SQL**
   ```sql
   -- Run this query to get all table definitions
   SELECT 
     'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || 
     array_to_string(
       array_agg(
         '"' || column_name || '" ' || data_type || 
         CASE 
           WHEN character_maximum_length IS NOT NULL 
           THEN '(' || character_maximum_length || ')'
           ELSE ''
         END ||
         CASE 
           WHEN is_nullable = 'NO' THEN ' NOT NULL'
           ELSE ''
         END
       ), ', '
     ) || ');' as create_statement
   FROM information_schema.columns
   WHERE table_schema IN ('public', 'auth')
   GROUP BY schemaname, tablename
   ORDER BY schemaname, tablename;
   ```

4. **Export Functions and Views**
   - Use the "Schema Visualizer" tab
   - Click "Export" button
   - Save the complete SQL file

## Method 2: pg_dump via Connection String

If you have the database password:

```bash
# Export schema only (no data)
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.hqqouszbgskteivjoems.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  > supabase/migrations/20250101000000_initial_schema.sql
```

## Method 3: Supabase CLI with Service Role Key

```bash
# Set environment variable
export SUPABASE_DB_PASSWORD="your-database-password"

# Pull schema
supabase db pull --db-url "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.hqqouszbgskteivjoems.supabase.co:5432/postgres"
```

## Method 4: Manual Recreation

Since you have access to the codebase and migrations, you can:

1. **Check existing migrations**
   ```bash
   ls -la supabase/migrations/
   ```

2. **Combine all migrations into one file**
   ```bash
   cat supabase/migrations/*.sql > supabase/migrations/combined_schema.sql
   ```

3. **Apply to staging**
   ```bash
   supabase db push
   ```

## Recommended Approach for Free Tier

Given the constraints:

1. **Use Method 1** (Dashboard Export) - Most reliable
2. **Create staging project** first
3. **Apply schema** using `supabase db push`
4. **Deploy Edge Functions** individually

## Schema Components to Export

Make sure to include:
- ✅ All tables (listings, sellers, makes, models, etc.)
- ✅ Views (full_listing_view, extraction_session_summary)
- ✅ Functions (all 15 database functions)
- ✅ RLS policies
- ✅ Indexes
- ✅ Triggers

## After Export

1. Save the schema file as:
   ```
   supabase/migrations/20250101000000_initial_schema.sql
   ```

2. Review and clean the file:
   - Remove any Supabase-specific system tables
   - Remove any auth schema modifications
   - Keep only application-specific schema

3. Apply to staging:
   ```bash
   supabase link --project-ref [your-staging-ref]
   supabase db push
   ```