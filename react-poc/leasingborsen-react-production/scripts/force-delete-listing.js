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

async function forceDeleteListing() {
  const listingId = 'e5841862-1d46-4450-9710-6f7c037741ba';
  
  console.log('🔨 FORCE DELETING LISTING');
  console.log('=' .repeat(80));
  console.log(`Listing ID: ${listingId}`);
  console.log('=' .repeat(80));

  try {
    // 1. Delete ALL extraction_listing_changes references
    console.log('\n1️⃣ Deleting ALL extraction_listing_changes references...');
    
    const { data: refs, error: refError } = await supabase
      .from('extraction_listing_changes')
      .delete()
      .eq('existing_listing_id', listingId)
      .select();
      
    if (refError) {
      console.error('Error deleting references:', refError);
    } else {
      console.log(`✅ Deleted ${refs?.length || 0} extraction_listing_changes records`);
    }
    
    // 2. Delete lease_pricing
    console.log('\n2️⃣ Deleting lease_pricing...');
    
    const { data: lp, error: lpError } = await supabase
      .from('lease_pricing')
      .delete()
      .eq('listing_id', listingId)
      .select();
      
    if (lpError) {
      console.error('Error deleting lease_pricing:', lpError);
    } else {
      console.log(`✅ Deleted ${lp?.length || 0} lease_pricing records`);
    }
    
    // 3. Delete price_change_log
    console.log('\n3️⃣ Deleting price_change_log...');
    
    const { data: pcl, error: pclError } = await supabase
      .from('price_change_log')
      .delete()
      .eq('listing_id', listingId)
      .select();
      
    if (pclError && pclError.code !== '42P01') {
      console.error('Error deleting price_change_log:', pclError);
    } else {
      console.log(`✅ Deleted ${pcl?.length || 0} price_change_log records`);
    }
    
    // 4. Finally, delete the listing
    console.log('\n4️⃣ Deleting the listing...');
    
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
      .select();
      
    if (listingError) {
      console.error('❌ Error deleting listing:', listingError);
      
      // If still failing, check what's blocking it
      console.log('\n🔍 Checking what\'s still blocking deletion...');
      
      const { data: checkRefs } = await supabase
        .from('extraction_listing_changes')
        .select('id, session_id, change_type, change_status')
        .eq('existing_listing_id', listingId);
        
      if (checkRefs && checkRefs.length > 0) {
        console.log(`Still found ${checkRefs.length} references:`);
        checkRefs.forEach(ref => {
          console.log(`  - ${ref.id} (${ref.change_type}, ${ref.change_status})`);
        });
      }
    } else {
      console.log('✅ Listing deleted successfully!');
    }
    
    // 5. Verify deletion
    console.log('\n5️⃣ Verifying deletion...');
    
    const { data: verify } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .single();
      
    if (!verify) {
      console.log('\n🎉 SUCCESS: Listing has been completely deleted!');
    } else {
      console.log('\n⚠️  WARNING: Listing still exists in database');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run
forceDeleteListing().catch(console.error);