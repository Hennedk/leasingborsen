#!/usr/bin/env node

// Script to apply the missing SQL function to Supabase database
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
  console.error('Make sure you have a .env.local file with these variables')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

async function applySqlFunction() {
  try {
    console.log('🔗 Connecting to Supabase...')
    
    // Read the SQL file
    const sqlPath = join(__dirname, 'create-apply-selected-function.sql')
    const sqlContent = readFileSync(sqlPath, 'utf8')
    
    console.log('📜 Executing SQL function creation...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec', { sql: sqlContent })
    
    if (error) {
      console.error('❌ Error executing SQL:', error)
      
      // Try alternative approach using direct query
      console.log('🔄 Trying alternative approach...')
      const { data: altData, error: altError } = await supabase
        .from('extraction_listing_changes')
        .select('count', { count: 'exact', head: true })
      
      if (altError) {
        console.error('❌ Database connection failed:', altError)
        console.error('💡 Make sure your Supabase credentials are correct and you have database access')
        process.exit(1)
      } else {
        console.log('✅ Database connection works, but function creation failed')
        console.log('💡 You may need to create this function manually in the Supabase SQL editor')
        console.log('📋 Copy the SQL from: scripts/create-apply-selected-function.sql')
      }
    } else {
      console.log('✅ Function created successfully!')
      console.log('📊 Result:', data)
    }
    
  } catch (err) {
    console.error('❌ Script error:', err.message)
    console.log('💡 You may need to create the function manually in Supabase SQL editor')
    console.log('📋 SQL file location: scripts/create-apply-selected-function.sql')
  }
}

applySqlFunction()