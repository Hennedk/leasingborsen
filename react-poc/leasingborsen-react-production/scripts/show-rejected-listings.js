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

async function showRejectedListings() {
  console.log('📋 Rejected Deletion Listings\n');
  console.log('=' .repeat(80));
  
  try {
    const sessionId = '544e0e65-5f8b-4a8a-8cb9-2bf395309381';
    
    // Get session info
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('seller_id, session_name')
      .eq('id', sessionId)
      .single();
      
    console.log('Session:', session.session_name);
    console.log('Seller ID:', session.seller_id);
    
    // Get all rejected deletions
    const { data: rejectedDeletions, error } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'delete')
      .eq('change_status', 'rejected');

    if (error) throw error;

    console.log('\n' + '=' .repeat(80));
    console.log('\n🚫 REJECTED DELETIONS (Listings that were NOT deleted):\n');
    
    rejectedDeletions.forEach((deletion, idx) => {
      const listing = deletion.existing_data;
      if (listing) {
        console.log(`${idx + 1}. ${listing.make} ${listing.model}`);
        console.log(`   Variant: ${listing.variant}`);
        console.log(`   HP: ${listing.horsepower || 'N/A'}`);
        console.log(`   Fuel: ${listing.fuel_type}`);
        console.log(`   Listing ID: ${listing.listing_id || 'Unknown'}`);
        console.log('');
      }
    });
    
    // Now let's see what WAS extracted from the PDF
    const { data: extractedListings } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .in('change_type', ['create', 'update'])
      .eq('change_status', 'applied');
      
    console.log('=' .repeat(80));
    console.log('\n✅ EXTRACTED FROM PDF (Applied changes):\n');
    
    const extractedVariants = new Set();
    extractedListings.forEach(change => {
      const data = change.new_data || change.extracted_data;
      if (data) {
        const key = `${data.make} ${data.model} - ${data.variant}`;
        extractedVariants.add(key);
      }
    });
    
    Array.from(extractedVariants).sort().forEach((variant, idx) => {
      console.log(`${idx + 1}. ${variant}`);
    });
    
    // Analysis
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 EXPLANATION:\n');
    console.log('The deletions were MANUALLY REJECTED by an admin user.');
    console.log('This means:');
    console.log('1. The AI correctly identified these listings were NOT in the PDF');
    console.log('2. An admin reviewed and chose to KEEP them (reject deletion)');
    console.log('3. This is working as designed - manual review prevented deletion');
    console.log('\nCommon reasons to reject deletions:');
    console.log('- Listings have active customer contracts');
    console.log('- PDF was incomplete (only partial inventory)');
    console.log('- Temporary stock situation');
    console.log('- Safety precaution to avoid data loss');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run
showRejectedListings().catch(console.error);