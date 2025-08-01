#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config()

// Use service role to execute SQL
const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

async function deployFunctionFix() {
  console.log('🚀 Deploying corrected PostgreSQL function...')
  console.log('Note: This requires manual execution via Supabase Dashboard SQL Editor')
  
  try {
    const sqlContent = readFileSync('fix-deletion-complete.sql', 'utf-8')
    console.log('\n📋 SQL to execute in Supabase Dashboard:')
    console.log('=' + '='.repeat(80))
    console.log(sqlContent)
    console.log('=' + '='.repeat(80))
    
    console.log('\n📝 Instructions:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Paste the above SQL and execute it')
    console.log('3. Run the test again to verify the fix')
    
  } catch (err) {
    console.log('❌ Error reading file:', err.message)
  }
}

deployFunctionFix().catch(console.error)