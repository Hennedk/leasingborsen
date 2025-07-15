#!/usr/bin/env node

/**
 * Quick test to verify prompt manager works with your OpenAI API
 * 
 * Usage:
 * 1. Get your OPENAI_API_KEY from: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/functions/secrets
 * 2. Run: OPENAI_API_KEY=sk-... npm run prompts:test
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'

// Load from .env.local if it exists
config({ path: '.env.local' })

// Check multiple sources for API key
const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY

if (!apiKey) {
  console.log('🔐 OpenAI API Key Setup Required\n')
  console.log('Option 1: Get key from Supabase and run with environment variable:')
  console.log('  1. Go to: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/functions/secrets')
  console.log('  2. Copy the OPENAI_API_KEY value')
  console.log('  3. Run: OPENAI_API_KEY=sk-... npm run prompts:test\n')
  
  console.log('Option 2: Save to .env.local (recommended for development):')
  console.log('  1. Create/edit .env.local file')
  console.log('  2. Add: OPENAI_API_KEY=sk-...')
  console.log('  3. Run: npm run prompts:test\n')
  
  console.log('Option 3: Check if key exists in Edge Function environment:')
  console.log('  Run: supabase secrets list')
  
  process.exit(1)
}

// Key is available, run the actual test
console.log('✅ OpenAI API key found!\n')
console.log('🚀 Running prompt manager test...\n')

// Set the key for the test script
process.env.OPENAI_API_KEY = apiKey

// Import and run the test
import('./test-with-openai').then(module => {
  // Test will run automatically
}).catch(error => {
  console.error('❌ Error running test:', error.message)
  process.exit(1)
})