/**
 * Supabase Environment Comparison Script
 * Compares staging and production environments for schema consistency
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const STAGING_URL = process.env.STAGING_SUPABASE_URL || 'https://lpbtgtpgbnybjqcpsrrf.supabase.co';
const STAGING_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY;

const PRODUCTION_URL = process.env.PRODUCTION_SUPABASE_URL || 'https://hqqouszbgskteivjoems.supabase.co';
const PRODUCTION_KEY = process.env.PRODUCTION_SUPABASE_SERVICE_KEY;

if (!STAGING_KEY || !PRODUCTION_KEY) {
  console.error('❌ Missing environment variables: STAGING_SUPABASE_SERVICE_KEY and PRODUCTION_SUPABASE_SERVICE_KEY');
  console.log('Please set these environment variables to run the comparison.');
  process.exit(1);
}

const stagingClient = createClient(STAGING_URL, STAGING_KEY);
const productionClient = createClient(PRODUCTION_URL, PRODUCTION_KEY);

// Comparison results
const results = {
  tables: { staging: [], production: [], differences: [] },
  columns: { differences: [] },
  views: { staging: [], production: [], differences: [] },
  functions: { staging: [], production: [], differences: [] },
  triggers: { staging: [], production: [], differences: [] },
  policies: { differences: [] },
  indexes: { differences: [] },
  edgeFunctions: { staging: [], production: [], differences: [] }
};

// Helper function to execute SQL
async function executeSQL(client, query, environment) {
  try {
    const { data, error } = await client.rpc('query', { query });
    if (error) {
      console.error(`Error in ${environment}:`, error);
      return null;
    }
    return data;
  } catch (err) {
    // Fallback to direct query if RPC not available
    try {
      const response = await fetch(`${client.supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'apikey': client.supabaseKey,
          'Authorization': `Bearer ${client.supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(`Fallback error in ${environment}:`, e);
      return null;
    }
  }
}

// Compare tables
async function compareTables() {
  console.log('\n📊 Comparing Tables...');
  
  const tableQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  // Note: We'll need to use a different approach since we can't execute raw SQL directly
  // Let's use the schema inspection approach instead
  
  console.log('  ⚠️  Table comparison requires direct database access.');
  console.log('  Please run the following queries manually in each environment:');
  console.log('  ```sql');
  console.log(tableQuery);
  console.log('  ```');
}

// Compare Edge Functions
async function compareEdgeFunctions() {
  console.log('\n🚀 Comparing Edge Functions...');
  
  // Get functions from each environment using the management API
  // Note: This requires management API access which might not be available
  console.log('  ⚠️  Edge Function comparison requires Supabase Management API access.');
  console.log('  Please check the Supabase dashboard for both environments.');
}

// Generate comparison queries
function generateComparisonQueries() {
  return {
    // Tables and basic structure
    tables: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `,
    
    // Columns for all tables
    columns: `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `,
    
    // Views
    views: `
      SELECT 
        table_name as view_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `,
    
    // Functions
    functions: `
      SELECT 
        routine_name,
        routine_type,
        data_type as return_type,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `,
    
    // Triggers
    triggers: `
      SELECT 
        trigger_name,
        event_object_table,
        event_manipulation,
        action_timing,
        action_orientation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name;
    `,
    
    // Indexes
    indexes: `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `,
    
    // RLS Policies
    policies: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `,
    
    // Foreign Keys
    foreignKeys: `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `,
    
    // Check constraints
    checkConstraints: `
      SELECT
        tc.table_name,
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.constraint_schema = cc.constraint_schema
      WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `,
    
    // Unique constraints
    uniqueConstraints: `
      SELECT
        tc.table_name,
        tc.constraint_name,
        string_agg(kcu.column_name, ', ') as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
      GROUP BY tc.table_name, tc.constraint_name
      ORDER BY tc.table_name, tc.constraint_name;
    `
  };
}

// Generate report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 SUPABASE ENVIRONMENT COMPARISON REPORT');
  console.log('='.repeat(80));
  console.log(`Staging:    ${STAGING_URL}`);
  console.log(`Production: ${PRODUCTION_URL}`);
  console.log(`Date:       ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  const queries = generateComparisonQueries();
  
  console.log('\n🔍 Manual Comparison Queries\n');
  console.log('Run these queries in both environments and compare the results:\n');
  
  for (const [name, query] of Object.entries(queries)) {
    console.log(`\n-- ${name.toUpperCase()}`);
    console.log('-'.repeat(40));
    console.log(query);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📌 RECOMMENDED ACTIONS');
  console.log('='.repeat(80));
  console.log(`
1. Run each query above in both staging and production SQL editors
2. Compare the results to identify differences
3. Document any discrepancies found
4. Create migrations to sync environments if needed
5. Consider setting up automated schema comparison in CI/CD

Note: Pay special attention to:
- Missing tables or columns (like we found with lease_pricing)
- Different column types or constraints
- Missing or different indexes (performance impact)
- RLS policy differences (security impact)
- Missing triggers or functions (functionality impact)
`);
}

// Main execution
async function main() {
  console.log('🔄 Starting Supabase Environment Comparison...\n');
  
  // Note: Due to Supabase client limitations, we can't execute raw SQL queries
  // directly. Instead, we'll generate the queries for manual execution.
  
  await compareTables();
  await compareEdgeFunctions();
  generateReport();
}

// Run the comparison
main().catch(console.error);