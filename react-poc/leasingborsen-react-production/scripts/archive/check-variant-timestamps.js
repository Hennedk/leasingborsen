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

async function checkVariantTimestamps() {
  console.log('🔍 Checking Variant Creation/Update Times\n');
  console.log('=' .repeat(80));
  
  try {
    // Get seller ID
    const sessionId = 'da2976c3-5cf4-4c25-bb0b-89cd76ff78d3';
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('seller_id')
      .eq('id', sessionId)
      .single();
      
    const sellerId = session.seller_id;
    
    // Check specific variants mentioned in the extraction
    const variantsToCheck = [
      'Ultimate 4WD 325 HK – 20" alufælge, soltag',
      'Ultimate 4WD 325 HK – 20" alufælge, soltag, digitale sidespejle',
      'Advanced 229 HK',
      'Ultimate 4WD 325 HK'
    ];
    
    console.log('Checking specific variants:\n');
    
    for (const variant of variantsToCheck) {
      console.log(`\n📋 Variant: "${variant}"`);
      console.log('-'.repeat(60));
      
      const { data: listings, error } = await supabase
        .from('listings')
        .select('id, created_at, updated_at')
        .eq('seller_id', sellerId)
        .eq('variant', variant)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.log('  ❌ Error querying:', error.message);
        continue;
      }
      
      if (!listings || listings.length === 0) {
        console.log('  ❌ Not found in database');
        continue;
      }
      
      console.log(`  ✅ Found ${listings.length} listing(s)`);
      
      // Show the most recent one
      const mostRecent = listings[0];
      const created = new Date(mostRecent.created_at);
      const updated = new Date(mostRecent.updated_at);
      const isNew = created.getTime() === updated.getTime();
      
      console.log(`  Most Recent ID: ${mostRecent.id}`);
      console.log(`  Created: ${created.toLocaleString()}`);
      console.log(`  Updated: ${updated.toLocaleString()}`);
      console.log(`  Status: ${isNew ? 'NEWLY CREATED' : 'UPDATED'}`);
      
      // Check how recent this is
      const now = new Date();
      const hoursSinceUpdate = (now - updated) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 1) {
        console.log(`  ⏰ Updated ${Math.round(hoursSinceUpdate * 60)} minutes ago`);
      } else if (hoursSinceUpdate < 24) {
        console.log(`  ⏰ Updated ${Math.round(hoursSinceUpdate)} hours ago`);
      } else {
        console.log(`  ⏰ Updated ${Math.round(hoursSinceUpdate / 24)} days ago`);
      }
    }
    
    // Also check when the extraction changes were marked as applied
    console.log('\n\n' + '=' .repeat(80));
    console.log('\nExtraction Change Records:\n');
    
    const { data: changes } = await supabase
      .from('extraction_listing_changes')
      .select('change_type, change_status, created_at, extracted_data')
      .eq('session_id', sessionId)
      .eq('change_status', 'applied')
      .order('created_at');
      
    if (changes) {
      changes.forEach((change, idx) => {
        const variant = change.extracted_data?.variant;
        console.log(`${idx + 1}. ${change.change_type.toUpperCase()}: ${variant || 'Unknown'}`);
        console.log(`   Applied: ${new Date(change.created_at).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run check
checkVariantTimestamps().catch(console.error);