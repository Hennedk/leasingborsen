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

async function verifyEquipmentDifferentiation() {
  const sessionId = '55787495-a921-4e9b-8171-4ac7ca2e5723';
  
  console.log('🔍 Verifying Equipment Differentiation Implementation\n');
  
  // Get session details
  const { data: session } = await supabase
    .from('extraction_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
    
  console.log(`Session: ${session.session_name}`);
  console.log(`Created: ${new Date(session.created_at).toLocaleString()}`);
  console.log(`API Version: ${session.api_version}\n`);
  
  // Get changes with equipment in variant name
  const { data: equipmentChanges } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data, change_type, match_details')
    .eq('session_id', sessionId)
    .like('extracted_data->variant', '% - %');
    
  console.log(`Found ${equipmentChanges?.length || 0} variants with equipment differentiation:\n`);
  
  if (equipmentChanges && equipmentChanges.length > 0) {
    equipmentChanges.forEach((change, idx) => {
      const data = change.extracted_data;
      console.log(`${idx + 1}. ${data.make} ${data.model}`);
      console.log(`   Full Variant: "${data.variant}"`);
      
      // Parse base variant and equipment
      const parts = data.variant.split(' - ');
      console.log(`   Base: "${parts[0]}"`);
      console.log(`   Equipment: "${parts[1] || 'None'}"`);
      console.log(`   Change Type: ${change.change_type}`);
      
      if (change.match_details?.variantSource) {
        console.log(`   Variant Source: ${change.match_details.variantSource}`);
      }
      
      console.log('');
    });
  }
  
  // Also check for variants that should have equipment but don't
  console.log('\n🔍 Checking all 4WD Ultimate variants (should have equipment):\n');
  
  const { data: allChanges } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('session_id', sessionId)
    .like('extracted_data->variant', '%4WD Ultimate%');
    
  const ultimateGroups = {};
  allChanges.forEach(change => {
    const variant = change.extracted_data.variant;
    const key = variant.includes(' - ') ? 'With Equipment' : 'Without Equipment';
    
    if (!ultimateGroups[key]) {
      ultimateGroups[key] = [];
    }
    ultimateGroups[key].push(variant);
  });
  
  Object.entries(ultimateGroups).forEach(([key, variants]) => {
    console.log(`${key}: ${variants.length} variants`);
    variants.slice(0, 3).forEach(v => console.log(`  - ${v}`));
    if (variants.length > 3) console.log(`  ... and ${variants.length - 3} more`);
  });
}

verifyEquipmentDifferentiation().catch(console.error);