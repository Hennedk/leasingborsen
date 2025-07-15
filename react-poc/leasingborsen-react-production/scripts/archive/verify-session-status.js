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

async function verifySessionStatus() {
  const sessionId = '37eb7e68-9bc1-4cb3-9179-06e1db74be00';
  
  console.log('🔍 Verifying session status after applying changes\n');
  
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
  
  console.log('📋 Session Status:');
  console.log(`  Status: ${session.status}`);
  console.log(`  Applied At: ${session.applied_at || 'Not set'}`);
  console.log(`  Applied By: ${session.applied_by || 'Not set'}`);
  
  // Check change statuses
  console.log('\n📊 Change Status Summary:');
  const { data: statusCounts, error: countError } = await supabase
    .from('extraction_listing_changes')
    .select('change_status')
    .eq('session_id', sessionId);
    
  if (!countError && statusCounts) {
    const counts = statusCounts.reduce((acc, item) => {
      acc[item.change_status] = (acc[item.change_status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }
  
  // Check the specific applied change
  console.log('\n✅ Applied Changes:');
  const { data: appliedChanges, error: appliedError } = await supabase
    .from('extraction_listing_changes')
    .select('id, change_type, change_summary, change_status')
    .eq('session_id', sessionId)
    .eq('change_status', 'applied');
    
  if (!appliedError && appliedChanges) {
    appliedChanges.forEach(change => {
      console.log(`  - ${change.change_summary} (${change.id})`);
    });
  }
}

verifySessionStatus().catch(console.error);