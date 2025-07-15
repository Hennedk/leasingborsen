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

async function debugEquipmentVariants() {
  console.log('🔍 Debugging Equipment Variant Extraction\n');
  
  // First, let's find the most recent session with equipment variants
  const { data: recentSessions } = await supabase
    .from('extraction_sessions')
    .select('id, session_name, created_at, api_version')
    .order('created_at', { ascending: false })
    .limit(10);
    
  for (const session of recentSessions || []) {
    // Check if this session has equipment variants
    const { data: sample } = await supabase
      .from('extraction_listing_changes')
      .select('extracted_data')
      .eq('session_id', session.id)
      .limit(5);
      
    const hasEquipment = sample?.some(s => 
      s.extracted_data?.variant?.includes(' - ') &&
      (s.extracted_data.variant.includes('alufælge') ||
       s.extracted_data.variant.includes('soltag') ||
       s.extracted_data.variant.includes('sidespejle'))
    );
    
    if (hasEquipment) {
      console.log(`✅ Found session with equipment variants!`);
      console.log(`   ID: ${session.id}`);
      console.log(`   Name: ${session.session_name}`);
      console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`);
      console.log(`   API Version: ${session.api_version}\n`);
      
      // Get all equipment variants from this session
      const { data: equipmentVariants } = await supabase
        .from('extraction_listing_changes')
        .select('extracted_data, change_type')
        .eq('session_id', session.id)
        .like('extracted_data->>variant', '% - %');
        
      console.log(`Equipment Variants Found: ${equipmentVariants?.length || 0}\n`);
      
      if (equipmentVariants && equipmentVariants.length > 0) {
        // Group by base variant
        const groups = {};
        
        equipmentVariants.forEach(ev => {
          const variant = ev.extracted_data.variant;
          const [base, equipment] = variant.split(' - ');
          const key = `${ev.extracted_data.make} ${ev.extracted_data.model} ${base}`;
          
          if (!groups[key]) {
            groups[key] = [];
          }
          
          groups[key].push({
            equipment: equipment || 'None',
            fullVariant: variant,
            offersCount: ev.extracted_data.offers?.length || 0
          });
        });
        
        // Display grouped results
        Object.entries(groups).forEach(([baseKey, variants]) => {
          console.log(`📦 ${baseKey}`);
          console.log(`   Equipment Packages: ${variants.length}`);
          
          variants.forEach((v, idx) => {
            console.log(`   ${idx + 1}. Equipment: ${v.equipment}`);
            console.log(`      Offers: ${v.offersCount}`);
          });
          
          console.log('');
        });
      }
      
      break; // Only show first session with equipment
    }
  }
  
  // Also check if prompt v12 is being used
  console.log('\n🔍 Checking Edge Function logs for prompt version...');
  console.log('Run this command to check logs:');
  console.log('supabase functions logs ai-extract-vehicles --limit 50 | grep -E "(prompt|version|equipment)"');
}

debugEquipmentVariants().catch(console.error);