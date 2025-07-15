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

async function analyzeEquipmentExtraction() {
  const sessionId = '55787495-a921-4e9b-8171-4ac7ca2e5723';
  
  console.log('🔍 Analyzing Equipment Extraction Pattern\n');
  
  // Get a few examples
  const { data: changes } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('session_id', sessionId)
    .like('extracted_data->>variant', '% - %')
    .limit(3);
    
  console.log('Sample Equipment Variants:\n');
  
  changes?.forEach((change, idx) => {
    const data = change.extracted_data;
    console.log(`Example ${idx + 1}:`);
    console.log(`Make: ${data.make}`);
    console.log(`Model: ${data.model}`);
    console.log(`Full Variant String: "${data.variant}"`);
    console.log(`Horsepower: ${data.horsepower}`);
    console.log(`Fuel Type: ${data.fuel_type}`);
    console.log('');
  });
  
  // Now let's check if this pattern is correct
  console.log('Analysis:\n');
  console.log('The AI appears to be splitting variants like this:');
  console.log('- Base: "77.4 kWh"');
  console.log('- Equipment: "229 HK RWD Advanced"');
  console.log('');
  console.log('This is NOT the intended behavior. The correct split should be:');
  console.log('- Base: "77.4 kWh 229 HK RWD Advanced"');
  console.log('- Equipment: "20\\" alufælge, soltag" (if present)');
  console.log('');
  
  // Check for actual equipment terms
  const { data: realEquipment } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('session_id', sessionId)
    .or('extracted_data->>variant.ilike.%alufælge%,extracted_data->>variant.ilike.%soltag%,extracted_data->>variant.ilike.%sidespejle%');
    
  console.log(`\nActual equipment variants found: ${realEquipment?.length || 0}`);
  
  if (realEquipment && realEquipment.length > 0) {
    console.log('\nReal equipment examples:');
    realEquipment.slice(0, 3).forEach(r => {
      console.log(`- ${r.extracted_data.variant}`);
    });
  }
}

analyzeEquipmentExtraction().catch(console.error);