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

async function testApplySelectedFix() {
  const sessionId = 'ab47ea71-46ed-4f52-b24c-7f1286110b53';
  const listingId = '5a7ae866-d1f1-4ec3-8ceb-bdffc66c6aa5';
  
  console.log('🧪 Testing fixed apply_selected_extraction_changes function');
  console.log(`📋 Session: ${sessionId}`);
  console.log(`🚗 Listing: ${listingId}`);
  
  // 1. Check current price
  console.log('\n1️⃣ Current listing price:');
  const { data: currentListing, error: listingError } = await supabase
    .from('full_listing_view')
    .select('make, model, variant, monthly_price')
    .eq('listing_id', listingId)
    .single();
    
  if (listingError || !currentListing) {
    // Try direct listing table
    const { data: directListing } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .single();
      
    if (!directListing) {
      console.error('❌ Listing not found in database');
      return;
    }
    console.log('   Listing exists but not in full_listing_view');
    
    // Get pricing directly
    const { data: pricing } = await supabase
      .from('lease_pricing')
      .select('monthly_price')
      .eq('listing_id', listingId)
      .order('monthly_price')
      .limit(1);
      
    console.log(`   Current price: ${pricing?.[0]?.monthly_price || 'No pricing'} kr/md`);
  } else {
    console.log(`   ${currentListing.make} ${currentListing.model} ${currentListing.variant}`);
    console.log(`   Current price: ${currentListing.monthly_price} kr/md`);
  }
  
  // 2. Get the UPDATE change for this listing
  console.log('\n2️⃣ Finding UPDATE change:');
  const { data: changes } = await supabase
    .from('extraction_listing_changes')
    .select('id, change_type, change_summary, extracted_data, change_status')
    .eq('session_id', sessionId)
    .eq('existing_listing_id', listingId)
    .eq('change_type', 'update');
    
  if (!changes || changes.length === 0) {
    console.error('❌ No UPDATE change found for this listing');
    return;
  }
  
  const change = changes[0];
  console.log(`   Change ID: ${change.id}`);
  console.log(`   Status: ${change.change_status}`);
  console.log(`   Summary: ${change.change_summary}`);
  
  // Check the extracted offers
  const offers = change.extracted_data.offers || [];
  console.log(`\n   Extracted offers: ${offers.length}`);
  const has2795 = offers.some(o => o.monthly_price === 2795);
  console.log(`   Has price 2795: ${has2795 ? '✅ YES' : '❌ NO'}`);
  
  // If already applied, reset it first
  if (change.change_status === 'applied') {
    console.log('\n⚠️  Change already marked as applied, resetting to pending...');
    await supabase
      .from('extraction_listing_changes')
      .update({ change_status: 'pending', reviewed_at: null })
      .eq('id', change.id);
  }
  
  // 3. Apply the change using the fixed function
  console.log('\n3️⃣ Applying the change with fixed function...');
  const { data: result, error } = await supabase
    .rpc('apply_selected_extraction_changes', {
      p_session_id: sessionId,
      p_selected_change_ids: [change.id],
      p_applied_by: 'test-script'
    });
    
  if (error) {
    console.error('❌ RPC Error:', error);
    return;
  }
  
  console.log('\n📊 Function result:');
  console.log(`   Applied updates: ${result.applied_updates}`);
  console.log(`   Total processed: ${result.total_processed}`);
  console.log(`   Error count: ${result.error_count || 0}`);
  
  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    result.errors.forEach(err => {
      console.log(`   - ${err.change_type} for ${err.listing_id}: ${err.error}`);
    });
  }
  
  // 4. Verify the price was updated
  console.log('\n4️⃣ Verifying price update:');
  const { data: updatedListing } = await supabase
    .from('full_listing_view')
    .select('monthly_price')
    .eq('listing_id', listingId)
    .single();
    
  const newPrice = updatedListing?.monthly_price || null;
  if (newPrice) {
    console.log(`   New price: ${newPrice} kr/md`);
  } else {
    // Check pricing directly
    const { data: directPricing } = await supabase
      .from('lease_pricing')
      .select('monthly_price')
      .eq('listing_id', listingId)
      .eq('monthly_price', 2795)
      .single();
      
    if (directPricing) {
      console.log(`   Price 2795 found in lease_pricing table`);
    }
  }
  
  if (newPrice === 2795 || (directPricing && directPricing.monthly_price === 2795)) {
    console.log('\n✅ SUCCESS! Price was updated to 2795');
  } else {
    console.log(`\n❌ FAILED! Price is ${newPrice || 'not found'}, expected 2795`);
    
    // Check lease_pricing directly
    console.log('\n   Checking lease_pricing table directly:');
    const { data: pricing } = await supabase
      .from('lease_pricing')
      .select('monthly_price, period_months, mileage_per_year')
      .eq('listing_id', listingId)
      .order('monthly_price')
      .limit(5);
      
    if (pricing && pricing.length > 0) {
      console.log('   Current pricing records:');
      pricing.forEach(p => {
        console.log(`     ${p.monthly_price} kr/md, ${p.period_months} months, ${p.mileage_per_year} km/year`);
      });
    }
  }
}

testApplySelectedFix().catch(console.error);