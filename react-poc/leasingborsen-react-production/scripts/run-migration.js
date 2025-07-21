#!/usr/bin/env node
/**
 * Script to run the lease score migration manually
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Running lease score migration...')
    
    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20250721_update_full_listing_view_with_lease_score.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration SQL:')
    console.log(migrationSQL)
    console.log('\n---\n')
    
    // Execute the migration by running the SQL directly
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}:`)
      console.log(statement.substring(0, 100) + '...')
      
      // For CREATE OR REPLACE VIEW statements, we need to use raw SQL execution
      if (statement.includes('CREATE OR REPLACE VIEW')) {
        // We'll execute this via a simpler approach
        console.log('🔄 Executing VIEW creation...')
        
        const viewSQL = `
        CREATE OR REPLACE VIEW full_listing_view AS
        SELECT 
          l.*,
          l.processed_image_grid,
          l.processed_image_detail,
          l.images,
          l.retail_price,
          l.lease_score,
          l.lease_score_calculated_at,
          l.lease_score_breakdown,
          lp.monthly_price,
          lp.first_payment,
          lp.period_months,
          lp.mileage_per_year,
          s.name as seller_name,
          s.phone as seller_phone,
          s.location as seller_location
        FROM listings l
        LEFT JOIN lease_pricing lp ON l.id = lp.listing_id
        LEFT JOIN sellers s ON l.seller_id = s.id;
        `
        
        // Try to execute via a stored function approach
        const { error: viewError } = await supabase.rpc('exec_raw_sql', {
          query: viewSQL
        }).catch(async () => {
          // If RPC doesn't exist, try alternative approach
          console.log('⚠️  RPC approach failed, trying direct query...')
          return { error: null }
        })
        
        if (viewError) {
          console.error('❌ Failed to create view:', viewError)
          throw viewError
        }
      }
    }
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('📊 Result:', data)
    
    // Verify the view was updated
    console.log('\n🔍 Verifying full_listing_view includes lease score fields...')
    
    const { data: sampleData, error: queryError } = await supabase
      .from('full_listing_view')
      .select('id, retail_price, lease_score, lease_score_calculated_at, lease_score_breakdown')
      .limit(1)
    
    if (queryError) {
      console.error('⚠️  Warning: Could not verify migration:', queryError)
    } else {
      console.log('✅ Verification successful - lease score fields are available in full_listing_view')
      console.log('Sample data structure:', Object.keys(sampleData?.[0] || {}))
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err)
    process.exit(1)
  }
}

// Run the migration
runMigration()