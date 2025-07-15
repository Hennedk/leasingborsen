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

async function checkNewExtractionError() {
  console.log('🔍 Checking New Extraction Error\n');
  console.log('=' .repeat(80));
  
  try {
    // Get the latest session
    const { data: sessions, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return;
    }
    
    if (!sessions || sessions.length === 0) {
      console.log('No sessions found');
      return;
    }
    
    const session = sessions[0];
    console.log('Latest Session:');
    console.log('  ID:', session.id);
    console.log('  Name:', session.session_name);
    console.log('  Status:', session.status);
    console.log('  Created:', new Date(session.created_at).toLocaleString());
    
    // Get deletion changes for this session
    const { data: deletions, error: deletionError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', session.id)
      .eq('change_type', 'delete');
      
    if (deletionError) {
      console.error('Error fetching deletions:', deletionError);
      return;
    }
    
    console.log(`\nFound ${deletions.length} deletions`);
    
    // Check status breakdown
    const statusCounts = {};
    deletions.forEach(d => {
      statusCounts[d.change_status] = (statusCounts[d.change_status] || 0) + 1;
    });
    
    console.log('\nStatus breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Get one deletion to test
    const testDeletion = deletions.find(d => d.change_status === 'pending');
    
    if (!testDeletion) {
      console.log('\nNo pending deletions to test');
      return;
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('\nTesting with single deletion...');
    console.log('  Change ID:', testDeletion.id);
    console.log('  Listing ID:', testDeletion.existing_listing_id);
    
    // Try to apply just this one deletion
    const { data: result, error: applyError } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: session.id,
        p_selected_change_ids: [testDeletion.id],
        p_applied_by: 'debug_test'
      });
      
    if (applyError) {
      console.error('\n❌ RPC Error:', applyError);
      console.error('Error details:', JSON.stringify(applyError, null, 2));
      
      // Check if the listing exists
      if (testDeletion.existing_listing_id) {
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('id, make_id, model_id')
          .eq('id', testDeletion.existing_listing_id)
          .single();
          
        if (listingError) {
          console.log('\n⚠️  Listing not found:', testDeletion.existing_listing_id);
        } else {
          console.log('\n✅ Listing exists:', listing);
          
          // Check for foreign key references
          const { data: leaseRefs } = await supabase
            .from('lease_pricing')
            .select('id')
            .eq('listing_id', testDeletion.existing_listing_id);
            
          console.log(`  Lease pricing records: ${leaseRefs?.length || 0}`);
        }
      }
    } else {
      console.log('\n✅ Test succeeded:', result);
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run check
checkNewExtractionError().catch(console.error);