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

async function checkAppliedChange() {
  const changeId = '8c3b4214-8892-4ff9-82cf-858ae525272f';
  
  console.log(`🔍 Checking status of change ${changeId}\n`);
  
  const { data: change, error } = await supabase
    .from('extraction_listing_changes')
    .select('*')
    .eq('id', changeId)
    .single();
    
  if (error) {
    console.error('❌ Error fetching change:', error);
    return;
  }
  
  if (!change) {
    console.log('⚠️  Change not found - it may have been deleted during the apply process');
    console.log('This is expected for DELETE changes as the function removes the record after processing');
  } else {
    console.log('Change details:');
    console.log(`  Status: ${change.change_status}`);
    console.log(`  Type: ${change.change_type}`);
    console.log(`  Summary: ${change.change_summary}`);
  }
  
  // Check if the listing was actually deleted
  const listingId = 'd457e86e-86c4-44da-b676-b32359c866c9';
  console.log(`\n🔍 Checking if listing ${listingId} was deleted...`);
  
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .single();
    
  if (listingError && listingError.code === 'PGRST116') {
    console.log('✅ Listing was successfully deleted');
  } else if (listing) {
    console.log('❌ Listing still exists - deletion may have failed');
  } else if (listingError) {
    console.log('❌ Error checking listing:', listingError);
  }
}

checkAppliedChange().catch(console.error);