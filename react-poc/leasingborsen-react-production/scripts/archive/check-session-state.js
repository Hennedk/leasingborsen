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

async function checkSessionState() {
  const sessionId = '37eb7e68-9bc1-4cb3-9179-06e1db74be00';
  
  console.log('🔍 Checking session state:', sessionId);
  
  // Get all changes and their statuses
  const { data: changes } = await supabase
    .from('extraction_listing_changes')
    .select('id, change_type, change_status, change_summary, existing_listing_id')
    .eq('session_id', sessionId)
    .order('change_status');

  // Group by status
  const byStatus = {};
  changes?.forEach(c => {
    if (!byStatus[c.change_status]) byStatus[c.change_status] = [];
    byStatus[c.change_status].push(c);
  });

  console.log('\n📊 Change status summary:');
  Object.entries(byStatus).forEach(([status, items]) => {
    console.log(`\n${status.toUpperCase()}: ${items.length} changes`);
    
    if (status === 'applied') {
      console.log('Applied changes:');
      items.forEach(c => {
        console.log(` - ${c.change_type}: ${c.change_summary}`);
        console.log(`   ID: ${c.id}`);
        if (c.existing_listing_id) {
          console.log(`   Listing: ${c.existing_listing_id}`);
        }
      });
    }
  });

  // Check the specific changes mentioned
  const checkChanges = [
    { id: 'c108a388-dce3-4cac-9ba8-f8b1d8a63065', desc: 'UPDATE (Ioniq 6 price)' },
    { id: 'e3c40808-e757-40aa-9358-606848705112', desc: 'UPDATE (variant change)' }
  ];

  console.log('\n🔍 Specific changes:');
  checkChanges.forEach(({ id, desc }) => {
    const change = changes?.find(c => c.id === id);
    if (change) {
      console.log(` - ${desc}: ${change.change_status}`);
    }
  });

  // Check if any changes are still pending
  const pendingCount = byStatus['pending']?.length || 0;
  if (pendingCount > 0) {
    console.log(`\n⚠️  ${pendingCount} changes are still pending`);
  } else {
    console.log('\n✅ No pending changes - all have been processed');
  }
}

checkSessionState().catch(console.error);