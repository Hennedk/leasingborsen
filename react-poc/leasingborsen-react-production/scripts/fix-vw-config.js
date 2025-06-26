#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function updateVwConfig() {
  try {
    console.log('🔧 Updating Volkswagen config with enabled=true...');
    
    const { data, error } = await supabase
      .from('dealer_configs')
      .update({ enabled: true })
      .eq('id', 'volkswagen')
      .select();
    
    if (error) {
      console.error('❌ Failed to update VW config:', error.message);
      return;
    }
    
    console.log('✅ Successfully updated VW config');
    
    // Verify all configurations
    const { data: allConfigs, error: listError } = await supabase
      .from('dealer_configs')
      .select('id, name, version, enabled')
      .eq('enabled', true);
    
    if (!listError && allConfigs) {
      console.log('📋 All enabled configurations:');
      allConfigs.forEach(config => {
        console.log(`   - ${config.name} (${config.id}) v${config.version} - enabled: ${config.enabled}`);
      });
    }
    
  } catch (error) {
    console.error('Update failed:', error.message);
  }
}

updateVwConfig();