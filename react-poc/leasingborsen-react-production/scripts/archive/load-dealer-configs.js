#!/usr/bin/env node

/**
 * Script to load dealer configurations into Supabase
 * Run with: node scripts/load-dealer-configs.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadDealerConfig(dealerId) {
  try {
    console.log(`\n📄 Loading ${dealerId} configuration...`);
    
    // Read the configuration file
    const configPath = join(__dirname, '../supabase/functions/process-pdf/config/dealers', `${dealerId}.json`);
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Prepare the database record
    const dealerConfig = {
      id: dealerId,
      name: config.name,
      version: config.version,
      config: config,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Upsert into database
    const { data, error } = await supabase
      .from('dealer_configs')
      .upsert(dealerConfig, {
        onConflict: 'id'
      })
      .select();
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Successfully loaded ${config.name} configuration (v${config.version})`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to load ${dealerId} configuration:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Dealer Configuration Loader');
  console.log('==============================');
  
  // Check if dealer_configs table exists
  try {
    const { error } = await supabase
      .from('dealer_configs')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database table "dealer_configs" not found.');
      console.error('   Please run database migrations first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
  
  // Load configurations
  const dealers = ['volkswagen', 'toyota'];
  let successCount = 0;
  
  for (const dealer of dealers) {
    const success = await loadDealerConfig(dealer);
    if (success) successCount++;
  }
  
  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`✅ Successfully loaded ${successCount}/${dealers.length} configurations`);
  
  // List all active configurations
  const { data: configs, error } = await supabase
    .from('dealer_configs')
    .select('id, name, version, active')
    .eq('active', true)
    .order('name');
  
  if (!error && configs.length > 0) {
    console.log('\n📋 Active Dealer Configurations:');
    configs.forEach(config => {
      console.log(`   - ${config.name} (${config.id}) v${config.version}`);
    });
  }
  
  console.log('\n✨ Done! Dealer configurations are ready for use.');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});