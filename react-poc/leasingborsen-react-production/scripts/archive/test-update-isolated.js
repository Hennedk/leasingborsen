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

async function testUpdateIsolated() {
  const listingId = '16bfb19a-c9a1-48b4-ad2d-a51f055c8d73';
  const changeId = 'c108a388-dce3-4cac-9ba8-f8b1d8a63065';
  
  console.log('🧪 Testing UPDATE logic in isolation\n');
  
  // Get the change data
  const { data: change } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('id', changeId)
    .single();
    
  if (!change) {
    console.error('Change not found');
    return;
  }
  
  console.log('📋 Extracted data has:');
  console.log('  Offers:', change.extracted_data.offers?.length || 0);
  
  // Step 1: Try to delete existing pricing
  console.log('\n1️⃣ Attempting to delete existing pricing...');
  const { error: deleteError, count: deleteCount } = await supabase
    .from('lease_pricing')
    .delete()
    .eq('listing_id', listingId);
    
  if (deleteError) {
    console.error('❌ Delete error:', deleteError);
    return;
  }
  
  console.log(`✅ Deleted ${deleteCount || 'all'} existing pricing records`);
  
  // Step 2: Try to insert new pricing
  console.log('\n2️⃣ Attempting to insert new pricing...');
  
  // Prepare the data for insertion
  const newPricing = change.extracted_data.offers.map(offer => ({
    listing_id: listingId,
    monthly_price: offer.monthly_price,
    first_payment: offer.first_payment || null,
    period_months: offer.period_months || null,
    mileage_per_year: offer.mileage_per_year || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  console.log(`  Inserting ${newPricing.length} new pricing records`);
  console.log('  First record:', newPricing[0]);
  
  const { error: insertError, data: insertedData } = await supabase
    .from('lease_pricing')
    .insert(newPricing)
    .select();
    
  if (insertError) {
    console.error('❌ Insert error:', insertError);
    
    // Try inserting just the first record to see if it's a specific record issue
    console.log('\n  Trying to insert just the first record...');
    const { error: singleError } = await supabase
      .from('lease_pricing')
      .insert(newPricing[0]);
      
    if (singleError) {
      console.error('  ❌ Single insert also failed:', singleError);
    } else {
      console.log('  ✅ Single insert succeeded - issue might be with bulk insert or constraints');
    }
  } else {
    console.log(`✅ Successfully inserted ${insertedData?.length || 0} pricing records`);
  }
  
  // Step 3: Verify the results
  console.log('\n3️⃣ Verifying results...');
  const { data: finalPricing } = await supabase
    .from('lease_pricing')
    .select('monthly_price, period_months, mileage_per_year')
    .eq('listing_id', listingId)
    .order('monthly_price')
    .limit(5);
    
  if (finalPricing && finalPricing.length > 0) {
    console.log('Current pricing:');
    finalPricing.forEach(p => {
      console.log(`  ${p.monthly_price} kr/md, ${p.period_months} months, ${p.mileage_per_year} km/year`);
    });
    
    // Check if 4995 exists
    const has4995 = finalPricing.some(p => p.monthly_price === 4995);
    console.log(`\n✅ Price 4995 found: ${has4995 ? 'YES' : 'NO'}`);
  }
}

testUpdateIsolated().catch(console.error);