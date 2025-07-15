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

async function debugExtractionSession() {
  const sessionId = '37eb7e68-9bc1-4cb3-9179-06e1db74be00';
  
  console.log('🔍 Debugging extraction session:', sessionId);
  
  // Check session status
  const { data: session, error: sessionError } = await supabase
    .from('extraction_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
    
  if (sessionError) {
    console.error('❌ Error fetching session:', sessionError);
    return;
  }
  
  console.log('\n📋 Session Details:');
  console.log('  Status:', session.status);
  console.log('  Applied At:', session.applied_at);
  console.log('  Applied By:', session.applied_by || 'N/A');
  
  // Check all changes for this session
  const { data: allChanges, error: allChangesError } = await supabase
    .from('extraction_listing_changes')
    .select('id, change_type, change_status, existing_listing_id, change_summary')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
    
  if (allChangesError) {
    console.error('❌ Error fetching changes:', allChangesError);
    return;
  }
  
  console.log('\n📊 All Changes in Session:');
  const statusCounts = {};
  allChanges.forEach((change, idx) => {
    statusCounts[change.change_status] = (statusCounts[change.change_status] || 0) + 1;
    if (idx < 5) {  // Show first 5 changes
      console.log(`  ${idx + 1}. ${change.change_type} - ${change.change_status} - ${change.change_summary}`);
    }
  });
  
  if (allChanges.length > 5) {
    console.log(`  ... and ${allChanges.length - 5} more changes`);
  }
  
  console.log('\n📈 Status Summary:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // Check if there are still pending changes
  const pendingCount = statusCounts['pending'] || 0;
  if (pendingCount > 0) {
    console.log(`\n⚠️  There are still ${pendingCount} pending changes in this session`);
    
    // Show the first pending change details
    const { data: firstPending } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_status', 'pending')
      .limit(1)
      .single();
      
    if (firstPending) {
      console.log('\n🔍 First Pending Change:');
      console.log('  ID:', firstPending.id);
      console.log('  Type:', firstPending.change_type);
      console.log('  Summary:', firstPending.change_summary);
      if (firstPending.extracted_data) {
        console.log('  Extracted Data:', JSON.stringify(firstPending.extracted_data, null, 2).substring(0, 200) + '...');
      }
    }
  }
  
  // Check if the UPDATE change was actually applied
  const updateChangeId = 'c108a388-dce3-4cac-9ba8-f8b1d8a63065';
  console.log(`\n🔍 Checking specific UPDATE change: ${updateChangeId}`);
  
  const { data: updateChange, error: updateChangeError } = await supabase
    .from('extraction_listing_changes')
    .select('*')
    .eq('id', updateChangeId)
    .single();
    
  if (updateChangeError && updateChangeError.code === 'PGRST116') {
    console.log('  ⚠️  Change record not found - may have been deleted during processing');
  } else if (updateChange) {
    console.log('  Status:', updateChange.change_status);
    console.log('  Summary:', updateChange.change_summary);
    console.log('  Existing Listing ID:', updateChange.existing_listing_id);
    
    // Check if the listing was updated
    if (updateChange.existing_listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('id, variant, updated_at')
        .eq('id', updateChange.existing_listing_id)
        .single();
        
      if (listing) {
        console.log('\n  📦 Listing Details:');
        console.log('    Variant:', listing.variant);
        console.log('    Updated At:', listing.updated_at);
        
        // Check lease pricing
        const { data: pricing } = await supabase
          .from('lease_pricing')
          .select('monthly_price, period_months, mileage_per_year')
          .eq('listing_id', listing.id)
          .order('monthly_price', { ascending: true })
          .limit(3);
          
        if (pricing && pricing.length > 0) {
          console.log('    Pricing:', pricing.map(p => `${p.monthly_price} kr/md`).join(', '));
        }
      }
    }
  }
}

debugExtractionSession().catch(console.error);