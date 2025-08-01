-- Complete Schema Export Script
-- Run each section in Supabase SQL Editor and combine results

-- 1. TABLES (you already have this)

-- 2. VIEWS - CRITICAL!
SELECT 
  'CREATE OR REPLACE VIEW ' || viewname || ' AS ' || chr(10) || definition 
FROM pg_views 
WHERE schemaname = 'public';

-- 3. FUNCTIONS
SELECT 
  'CREATE OR REPLACE FUNCTION ' || p.proname || '(' || 
  pg_get_function_identity_arguments(p.oid) || ') RETURNS ' ||
  pg_get_function_result(p.oid) || ' AS $$' || chr(10) ||
  p.prosrc || chr(10) || 
  '$$ LANGUAGE ' || l.lanname || ';'
FROM pg_proc p
JOIN pg_language l ON p.prolang = l.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 4. INDEXES
SELECT 
  pg_get_indexdef(indexrelid) || ';' AS index_definition
FROM pg_index i
JOIN pg_class c ON i.indrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND NOT i.indisprimary;

-- 5. TRIGGERS
SELECT 
  'CREATE TRIGGER ' || t.tgname || ' ' ||
  CASE 
    WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END || ' ' ||
  CASE 
    WHEN t.tgtype & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
  END || ' ON ' ||
  n.nspname || '.' || c.relname || ' FOR EACH ROW EXECUTE FUNCTION ' ||
  np.nspname || '.' || p.proname || '();'
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace np ON p.pronamespace = np.oid
WHERE n.nspname = 'public'
AND NOT t.tgisinternal;

-- 6. RLS POLICIES
SELECT 
  'CREATE POLICY ' || p.polname || ' ON ' || 
  n.nspname || '.' || c.relname || ' FOR ' ||
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE 'ALL'
  END || ' TO ' ||
  CASE 
    WHEN p.polroles = '{0}' THEN 'public'
    ELSE array_to_string(ARRAY(
      SELECT r.rolname 
      FROM pg_roles r 
      WHERE r.oid = ANY(p.polroles)
    ), ', ')
  END ||
  CASE 
    WHEN p.polqual IS NOT NULL THEN ' USING (' || pg_get_expr(p.polqual, p.polrelid) || ')'
    ELSE ''
  END ||
  CASE 
    WHEN p.polwithcheck IS NOT NULL THEN ' WITH CHECK (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')'
    ELSE ''
  END || ';'
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public';

-- 7. ENABLE RLS ON TABLES
SELECT 
  'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;'
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;