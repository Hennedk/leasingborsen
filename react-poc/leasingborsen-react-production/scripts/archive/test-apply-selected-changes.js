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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testApplySelectedChanges() {
  console.log('🧪 Testing apply_selected_extraction_changes function\n');
  
  const sessionId = '37eb7e68-9bc1-4cb3-9179-06e1db74be00';
  
  // First, let's check the session details
  console.log('📋 Checking session details...');
  const { data: session, error: sessionError } = await supabase
    .from('extraction_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
    
  if (sessionError) {
    console.error('❌ Error fetching session:', sessionError);
    return;
  }
  
  console.log('✅ Session found:', {
    id: session.id,
    status: session.status,
    session_name: session.session_name,
    seller_id: session.seller_id
  });
  
  // Check the pending changes
  console.log('\n📋 Checking pending changes...');
  const { data: changes, error: changesError } = await supabase
    .from('extraction_listing_changes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('change_status', 'pending');
    
  if (changesError) {
    console.error('❌ Error fetching changes:', changesError);
    return;
  }
  
  console.log(`✅ Found ${changes.length} pending changes`);
  
  // Display the changes
  changes.forEach((change, index) => {
    console.log(`\nChange ${index + 1}:`);
    console.log(`  ID: ${change.id}`);
    console.log(`  Type: ${change.change_type}`);
    console.log(`  Summary: ${change.change_summary}`);
    console.log(`  Existing Listing ID: ${change.existing_listing_id || 'N/A'}`);
    if (change.extracted_data) {
      console.log('  Extracted Data:');
      console.log(`    Make: ${change.extracted_data.make}`);
      console.log(`    Model: ${change.extracted_data.model}`);
      console.log(`    Variant: ${change.extracted_data.variant}`);
      if (change.extracted_data.offers && change.extracted_data.offers.length > 0) {
        console.log(`    Offers: ${change.extracted_data.offers.length} offer(s)`);
        const firstOffer = change.extracted_data.offers[0];
        console.log(`      - ${firstOffer.monthly_price} kr/md, ${firstOffer.period_months} months`);
      }
    }
  });
  
  // Test applying the first pending change
  if (changes.length > 0) {
    const changeToApply = changes[0];
    console.log(`\n🚀 Testing apply_selected_extraction_changes with change ID: ${changeToApply.id}`);
    
    const { data, error } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [changeToApply.id],
        p_applied_by: 'test-script'
      });
      
    if (error) {
      console.error('❌ Error applying changes:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Check if it's a column reference error
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.log('\n⚠️  Column reference error detected!');
        console.log('This suggests the database function is referencing non-existent columns.');
        console.log('The migration needs to be applied to fix this issue.');
      }
    } else {
      console.log('✅ Success! Result:', data);
    }
  }
}

testApplySelectedChanges().catch(console.error);