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

async function debugDeletionError() {
  console.log('🔍 Debugging Deletion Error\n');
  console.log('=' .repeat(80));
  
  const sessionId = 'c917ee3c-e08a-4bb7-968d-1ad21cf4e60a';
  
  try {
    // Get deletion changes
    const { data: deletions, error: fetchError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'delete')
      .order('id');
      
    if (fetchError) {
      console.error('Error fetching deletions:', fetchError);
      return;
    }
    
    console.log(`Found ${deletions.length} deletions\n`);
    
    // Check status of deletions
    const statusCounts = {};
    deletions.forEach(d => {
      statusCounts[d.change_status] = (statusCounts[d.change_status] || 0) + 1;
    });
    
    console.log('Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Get IDs of pending deletions
    const pendingDeletionIds = deletions
      .filter(d => d.change_status === 'pending' || d.change_status === 'discarded')
      .map(d => d.id);
      
    console.log(`\nPending/Discarded deletion IDs: ${pendingDeletionIds.length}`);
    
    if (pendingDeletionIds.length === 0) {
      console.log('No pending deletions to test');
      return;
    }
    
    // Test the function with just one deletion first
    console.log('\n' + '=' .repeat(80));
    console.log('\nTesting with single deletion...');
    
    const { data: testResult, error: testError } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [pendingDeletionIds[0]],
        p_applied_by: 'debug_test'
      });
      
    if (testError) {
      console.error('\n❌ RPC Error:', testError);
      console.error('Error details:', JSON.stringify(testError, null, 2));
      
      // Check if it's a foreign key issue
      if (testError.message?.includes('foreign key')) {
        console.log('\n⚠️  Foreign key constraint issue detected');
        
        // Check what references this listing
        const deletion = deletions.find(d => d.id === pendingDeletionIds[0]);
        if (deletion?.existing_listing_id) {
          console.log(`\nChecking references for listing: ${deletion.existing_listing_id}`);
          
          // Check extraction_listing_changes
          const { data: refs } = await supabase
            .from('extraction_listing_changes')
            .select('id, session_id, change_type')
            .eq('existing_listing_id', deletion.existing_listing_id);
            
          if (refs && refs.length > 0) {
            console.log(`Found ${refs.length} references in extraction_listing_changes`);
          }
        }
      }
    } else {
      console.log('\n✅ Single deletion test succeeded:', testResult);
    }
    
    // Reset any test changes
    if (testResult?.applied_deletes > 0) {
      console.log('\nResetting test changes...');
      await supabase
        .from('extraction_listing_changes')
        .update({ 
          change_status: 'pending',
          applied_by: null,
          reviewed_at: null
        })
        .eq('id', pendingDeletionIds[0]);
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run debug
debugDeletionError().catch(console.error);