#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAppliedUpdates() {
  console.log('🔍 Checking Applied Updates\n');
  
  try {
    const sessionId = 'da2976c3-5cf4-4c25-bb0b-89cd76ff78d3';
    
    // Get all update changes
    const { data: updates, error } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'update')
      .eq('change_status', 'applied');

    if (error) throw error;

    console.log(`Found ${updates.length} update changes:\n`);
    
    updates.forEach((update, idx) => {
      console.log(`Update ${idx + 1}:`);
      console.log('  Change ID:', update.id);
      console.log('  Has existing_data:', !!update.existing_data);
      console.log('  Has new_data:', !!update.new_data);
      console.log('  Has extracted_data:', !!update.extracted_data);
      
      if (update.existing_data) {
        console.log('\n  Existing Data:');
        console.log('    Keys:', Object.keys(update.existing_data).join(', '));
        if (update.existing_data.variant) {
          console.log('    Variant:', update.existing_data.variant);
        }
      }
      
      const newData = update.new_data || update.extracted_data;
      if (newData) {
        console.log('\n  New Data:');
        console.log('    Keys:', Object.keys(newData).join(', '));
        if (newData.variant) {
          console.log('    Variant:', newData.variant);
        }
        if (newData.make && newData.model) {
          console.log('    Make/Model:', newData.make, newData.model);
        }
      }
      
      console.log('\n' + '-'.repeat(60) + '\n');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAppliedUpdates().catch(console.error);