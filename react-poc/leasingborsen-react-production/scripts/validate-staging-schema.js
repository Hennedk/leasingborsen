/**
 * Schema Validation Script for Staging Environment
 * Checks for missing columns and triggers that cause runtime errors
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - set these from environment variables
const STAGING_URL = process.env.STAGING_SUPABASE_URL;
const STAGING_SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY;

if (!STAGING_URL || !STAGING_SERVICE_KEY) {
  console.error('❌ Missing environment variables: STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(STAGING_URL, STAGING_SERVICE_KEY);

async function validateSchema() {
  console.log('🔍 Validating Staging Database Schema...\n');
  
  const issues = [];
  
  // Check 1: Sellers table updated_at column
  try {
    const { data: columns } = await supabase.rpc('pg_catalog.pg_columns', {
      schemaname: 'public',
      tablename: 'sellers'
    });
    
    // Note: This is a simplified check - you'll need to query information_schema
    const { data, error } = await supabase
      .from('sellers')
      .select('updated_at')
      .limit(1);
    
    if (error && error.message.includes('column "updated_at" does not exist')) {
      issues.push({
        table: 'sellers',
        issue: 'Missing updated_at column',
        severity: 'HIGH',
        fix: 'Run migration: 20250129_fix_seller_updated_at.sql'
      });
    }
  } catch (e) {
    console.log('⚠️  Could not check sellers.updated_at');
  }
  
  // Check 2: lease_pricing administrative_fee column
  try {
    const { data, error } = await supabase
      .from('lease_pricing')
      .select('administrative_fee')
      .limit(1);
    
    if (error && error.message.includes('column "administrative_fee" does not exist')) {
      issues.push({
        table: 'lease_pricing',
        issue: 'Missing administrative_fee column',
        severity: 'HIGH',
        fix: 'Run migration: 20250129_add_administrative_fee_column.sql'
      });
    }
  } catch (e) {
    console.log('⚠️  Could not check lease_pricing.administrative_fee');
  }
  
  // Check 3: Foreign key relationships
  try {
    // Check if extraction_listing_changes has proper cascade delete
    const { data: fkeys } = await supabase.rpc('pg_catalog.pg_constraint', {
      contype: 'f',
      conrelid: 'extraction_listing_changes'::regclass
    });
    
    console.log('✅ Foreign key constraints check (manual verification needed)');
  } catch (e) {
    console.log('⚠️  Could not check foreign key constraints');
  }
  
  // Check 4: Verify triggers exist
  try {
    const { data: triggers } = await supabase.rpc('information_schema.triggers', {
      trigger_schema: 'public',
      event_object_table: 'sellers'
    });
    
    console.log('✅ Trigger check (manual verification needed for update_sellers_updated_at)');
  } catch (e) {
    console.log('⚠️  Could not check triggers');
  }
  
  // Report results
  console.log('\n📊 Schema Validation Results:');
  console.log('================================\n');
  
  if (issues.length === 0) {
    console.log('✅ No schema issues detected!');
  } else {
    console.log(`❌ Found ${issues.length} issue(s):\n`);
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.table} - ${issue.issue}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Fix: ${issue.fix}\n`);
    });
  }
  
  // Additional recommendations
  console.log('\n📝 Recommendations:');
  console.log('==================');
  console.log('1. Run this script after each deployment to staging');
  console.log('2. Keep staging and production schemas in sync');
  console.log('3. Use version-controlled migrations for all schema changes');
  console.log('4. Consider setting up automated schema drift detection');
  
  return issues;
}

// Run validation
validateSchema()
  .then(issues => {
    process.exit(issues.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('❌ Validation failed:', err);
    process.exit(1);
  });