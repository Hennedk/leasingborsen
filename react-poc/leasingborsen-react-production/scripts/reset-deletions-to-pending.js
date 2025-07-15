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

async function resetDeletionsToPending() {
  console.log('🔄 Resetting Deletions to Pending\n');
  console.log('=' .repeat(80));
  
  const sessionId = 'c917ee3c-e08a-4bb7-968d-1ad21cf4e60a';
  
  try {
    // Reset all rejected deletions to pending
    const { data, error } = await supabase
      .from('extraction_listing_changes')
      .update({
        change_status: 'pending',
        applied_by: null,
        reviewed_at: null
      })
      .eq('session_id', sessionId)
      .eq('change_type', 'delete')
      .eq('change_status', 'rejected')
      .select();
      
    if (error) {
      console.error('Error resetting deletions:', error);
      return;
    }
    
    console.log(`✅ Reset ${data.length} deletions to pending status`);
    
    // Show the listings that will be deleted
    console.log('\nListings to be deleted:');
    data.forEach((change, idx) => {
      const extracted = change.extracted_data || {};
      console.log(`${idx + 1}. ${extracted.make} ${extracted.model} ${extracted.variant || ''}`);
      console.log(`   Listing ID: ${change.existing_listing_id}`);
    });
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 Next Steps:');
    console.log('1. Go back to the extraction session review');
    console.log('2. The 12 deletions should now appear in the "Pending" tab');
    console.log('3. Select them with the checkboxes');
    console.log('4. Click "Anvend valgte" to apply the deletions');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run reset
resetDeletionsToPending().catch(console.error);