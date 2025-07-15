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

async function checkDeletionStatus() {
  console.log('🔍 Checking Deletion Status\n');
  console.log('=' .repeat(80));
  
  try {
    // Get all deletion changes from the latest session
    const { data: sessions } = await supabase
      .from('extraction_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (!sessions || sessions.length === 0) {
      console.log('No sessions found');
      return;
    }
    
    const session = sessions[0];
    console.log('Session:', session.id);
    console.log('Name:', session.session_name);
    console.log('Status:', session.status);
    console.log('Applied at:', session.applied_at ? new Date(session.applied_at).toLocaleString() : 'Not applied');
    
    // Get all deletions for this session
    const { data: deletions } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', session.id)
      .eq('change_type', 'delete')
      .order('change_status');
      
    console.log(`\nFound ${deletions.length} deletion changes`);
    
    // Group by status
    const statusGroups = {};
    deletions.forEach(d => {
      statusGroups[d.change_status] = (statusGroups[d.change_status] || 0) + 1;
    });
    
    console.log('\nStatus breakdown:');
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Show details for each deletion
    console.log('\n' + '=' .repeat(80));
    console.log('\nDeletion Details:');
    deletions.forEach((del, idx) => {
      console.log(`\n${idx + 1}. ${del.change_summary || 'No summary'}`);
      console.log(`   Status: ${del.change_status}`);
      console.log(`   Listing ID: ${del.existing_listing_id}`);
      if (del.applied_by) {
        console.log(`   Applied by: ${del.applied_by}`);
      }
      if (del.review_notes) {
        console.log(`   Notes: ${del.review_notes}`);
      }
    });
    
    // Check if we can test any
    const pendingDeletions = deletions.filter(d => d.change_status === 'pending');
    if (pendingDeletions.length > 0) {
      console.log('\n' + '=' .repeat(80));
      console.log(`\n✅ Found ${pendingDeletions.length} pending deletions that can be tested`);
      console.log('Run the extraction session review in the UI to test the new features!');
    } else {
      console.log('\n' + '=' .repeat(80));
      console.log('\n⚠️  No pending deletions available for testing');
      console.log('All deletions have been processed already.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run check
checkDeletionStatus().catch(console.error);