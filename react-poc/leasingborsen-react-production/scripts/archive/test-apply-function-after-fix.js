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

async function testApplyAfterFix() {
  console.log('🧪 Testing apply_selected_extraction_changes after fixing status constraint...\n');

  // Get the most recent completed session
  const { data: sessions, error: sessionError } = await supabase
    .from('extraction_sessions')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (sessionError || !sessions?.length) {
    console.error('❌ Error fetching sessions or no completed sessions found:', sessionError);
    return;
  }

  const session = sessions[0];
  console.log('📋 Using session:', {
    id: session.id,
    name: session.session_name,
    status: session.status,
    created_at: session.created_at
  });

  // Get some changes from this session
  const { data: changes, error: changesError } = await supabase
    .from('extraction_listing_changes')
    .select('*')
    .eq('session_id', session.id)
    .eq('change_status', 'pending')
    .limit(5);

  if (changesError || !changes?.length) {
    console.error('❌ No pending changes found for this session');
    return;
  }

  console.log(`\n📝 Found ${changes.length} pending changes`);
  const selectedIds = changes.slice(0, 2).map(c => c.id); // Select first 2 changes
  
  console.log('\n🚀 Applying selected changes:', selectedIds);

  // Test the apply function
  const { data, error } = await supabase
    .rpc('apply_selected_extraction_changes', {
      p_session_id: session.id,
      p_selected_change_ids: selectedIds,
      p_applied_by: 'test-after-fix'
    });

  if (error) {
    console.error('\n❌ Error applying changes:', error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return;
  }

  console.log('\n✅ Function executed successfully!');
  console.log('Result:', JSON.stringify(data, null, 2));

  // Verify the session status
  const { data: updatedSession, error: verifyError } = await supabase
    .from('extraction_sessions')
    .select('status, applied_at')
    .eq('id', session.id)
    .single();

  if (!verifyError && updatedSession) {
    console.log('\n📊 Session status after apply:', {
      status: updatedSession.status,
      applied_at: updatedSession.applied_at
    });
  }
}

testApplyAfterFix().catch(console.error);