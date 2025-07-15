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

async function testFinalFix() {
  const sessionId = 'ab47ea71-46ed-4f52-b24c-7f1286110b53';
  const listingId = '5a7ae866-d1f1-4ec3-8ceb-bdffc66c6aa5';
  
  console.log('🧪 Testing FINAL fixed apply_selected_extraction_changes function');
  console.log(`📋 Session: ${sessionId}`);
  console.log(`🚗 Listing: ${listingId}`);
  
  // 1. Reset the change to pending
  console.log('\n1️⃣ Resetting change to pending...');
  const { data: changes } = await supabase
    .from('extraction_listing_changes')
    .select('id, change_type, change_status')
    .eq('session_id', sessionId)
    .eq('existing_listing_id', listingId)
    .eq('change_type', 'update');
    
  if (!changes || changes.length === 0) {
    console.error('❌ No UPDATE change found');
    return;
  }
  
  const change = changes[0];
  
  // Reset to pending
  await supabase
    .from('extraction_listing_changes')
    .update({ 
      change_status: 'pending', 
      reviewed_at: null,
      review_notes: null
    })
    .eq('id', change.id);
    
  console.log(`   Reset change ${change.id} to pending`);
  
  // 2. Check current price
  console.log('\n2️⃣ Checking current price...');
  const { data: currentPricing } = await supabase
    .from('lease_pricing')
    .select('monthly_price')
    .eq('listing_id', listingId)
    .order('monthly_price')
    .limit(3);
    
  if (currentPricing && currentPricing.length > 0) {
    console.log('   Current prices:');
    currentPricing.forEach(p => console.log(`     ${p.monthly_price} kr/md`));
  } else {
    console.log('   No current pricing found');
  }
  
  // 3. Apply the change
  console.log('\n3️⃣ Applying the change...');
  const { data: result, error } = await supabase
    .rpc('apply_selected_extraction_changes', {
      p_session_id: sessionId,
      p_selected_change_ids: [change.id],
      p_applied_by: 'test-final'
    });
    
  if (error) {
    console.error('❌ RPC Error:', error);
    return;
  }
  
  console.log('\n📊 Function result:');
  console.log(`   Applied updates: ${result.applied_updates}`);
  console.log(`   Total processed: ${result.total_processed}`);
  console.log(`   Error count: ${result.error_count || 0}`);
  
  if (result.error_count > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(err => {
      console.log(`   - ${err.error}`);
    });
  }
  
  // 4. Verify the update
  console.log('\n4️⃣ Verifying update...');
  const { data: newPricing } = await supabase
    .from('lease_pricing')
    .select('monthly_price')
    .eq('listing_id', listingId)
    .eq('monthly_price', 2795)
    .single();
    
  if (newPricing) {
    console.log('\n✅ SUCCESS! Price 2795 is now in the database!');
    
    // Check all prices
    const { data: allPrices } = await supabase
      .from('lease_pricing')
      .select('monthly_price')
      .eq('listing_id', listingId)
      .order('monthly_price')
      .limit(5);
      
    console.log('\n   All prices for this listing:');
    allPrices.forEach(p => console.log(`     ${p.monthly_price} kr/md`));
  } else {
    console.log('\n❌ FAILED! Price 2795 was not added');
  }
  
  // 5. Check change status
  console.log('\n5️⃣ Checking change status...');
  const { data: finalChange } = await supabase
    .from('extraction_listing_changes')
    .select('change_status, review_notes')
    .eq('id', change.id)
    .single();
    
  console.log(`   Change status: ${finalChange.change_status}`);
  if (finalChange.review_notes) {
    console.log(`   Notes: ${finalChange.review_notes}`);
  }
}

testFinalFix().catch(console.error);