#!/usr/bin/env node
/**
 * Load Dealer Configurations Script
 * 
 * Loads dealer configuration files into the Supabase database.
 * Run with: npx tsx scripts/load-dealer-configs.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('- VITE_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function loadDealerConfig(configPath: string): Promise<boolean> {
  try {
    console.log(`📋 Loading config from: ${configPath}`)
    
    // Read and parse configuration file
    const configContent = readFileSync(configPath, 'utf8')
    const config = JSON.parse(configContent)
    
    // Validate required fields
    if (!config.id || !config.name || !config.version) {
      throw new Error('Config missing required fields: id, name, version')
    }
    
    console.log(`📋 Processing config: ${config.name} (${config.id}) v${config.version}`)
    
    // Prepare database record
    const { id, name, version, ...configData } = config
    
    const dbRecord = {
      id,
      name,
      version,
      config_data: configData,
      is_active: true
    }
    
    // Insert/update in database
    const { error } = await supabase
      .from('dealer_configs')
      .upsert(dbRecord)
    
    if (error) {
      console.error(`❌ Database error for ${id}:`, error)
      return false
    }
    
    console.log(`✅ Successfully loaded config: ${name} (${id}) v${version}`)
    return true
    
  } catch (error) {
    console.error(`❌ Failed to load config from ${configPath}:`, error)
    return false
  }
}

async function main() {
  console.log('🚀 Starting dealer configuration load...')
  
  const configFiles = [
    'supabase/functions/process-pdf/config/dealers/volkswagen.json'
  ]
  
  let successCount = 0
  let totalCount = configFiles.length
  
  for (const configFile of configFiles) {
    const configPath = join(process.cwd(), configFile)
    const success = await loadDealerConfig(configPath)
    if (success) successCount++
  }
  
  console.log(`\n📊 Configuration Load Summary:`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${totalCount - successCount}`)
  console.log(`📋 Total: ${totalCount}`)
  
  if (successCount === totalCount) {
    console.log('\n🎉 All configurations loaded successfully!')
  } else {
    console.log('\n⚠️ Some configurations failed to load. Check errors above.')
    process.exit(1)
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})