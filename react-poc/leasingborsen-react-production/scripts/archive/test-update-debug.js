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

async function debugUpdate() {
  const updateChangeId = 'c108a388-dce3-4cac-9ba8-f8b1d8a63065';
  
  // Get the full change record
  const { data: change, error } = await supabase
    .from('extraction_listing_changes')
    .select('*')
    .eq('id', updateChangeId)
    .single();
    
  if (error) {
    console.error('Error fetching change:', error);
    return;
  }
  
  console.log('📋 Change Record:');
  console.log('  ID:', change.id);
  console.log('  Type:', change.change_type);
  console.log('  Status:', change.change_status);
  console.log('  Existing Listing ID:', change.existing_listing_id);
  console.log('  Session ID:', change.session_id);
  
  console.log('\n🔍 Debugging UPDATE logic:');
  console.log('  change_type === "update"?', change.change_type === 'update');
  console.log('  existing_listing_id is not null?', change.existing_listing_id !== null);
  console.log('  Both conditions met?', change.change_type === 'update' && change.existing_listing_id !== null);
  
  if (change.extracted_data) {
    console.log('\n📊 Extracted Data:');
    console.log('  Make:', change.extracted_data.make);
    console.log('  Model:', change.extracted_data.model);
    console.log('  Variant:', change.extracted_data.variant);
    console.log('  Offers count:', change.extracted_data.offers?.length || 0);
  }
  
  // Check if the listing exists
  if (change.existing_listing_id) {
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, make_id, model_id, variant')
      .eq('id', change.existing_listing_id)
      .single();
      
    if (listingError) {
      console.log('\n❌ Error fetching listing:', listingError);
    } else if (listing) {
      console.log('\n✅ Listing exists:');
      console.log('  ID:', listing.id);
      console.log('  Make ID:', listing.make_id);
      console.log('  Model ID:', listing.model_id);
      console.log('  Variant:', listing.variant);
    }
  }
  
  // Try to manually test the UPDATE logic conditions
  console.log('\n🧪 Testing UPDATE conditions:');
  const shouldProcess = change.change_type === 'update' && change.existing_listing_id !== null;
  console.log('  Should process UPDATE:', shouldProcess);
  
  if (!shouldProcess) {
    console.log('  ❌ UPDATE conditions not met!');
    if (change.change_type !== 'update') {
      console.log('     - change_type is not "update"');
    }
    if (change.existing_listing_id === null) {
      console.log('     - existing_listing_id is null');
    }
  }
}

debugUpdate().catch(console.error);