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

async function verifyPromptContent() {
  console.log('🔍 Verifying AI Prompt Content\n');
  console.log('=' .repeat(50));
  
  // Check a recent extraction session to see the actual prompt
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Get the most recent extraction session
  const { data: sessions } = await supabase
    .from('extraction_sessions')
    .select('id, created_at, metadata, api_version')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\nRecent extraction sessions:');
  sessions?.forEach((session, idx) => {
    console.log(`\n${idx + 1}. Session ${session.id}`);
    console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`);
    console.log(`   API Version: ${session.api_version || 'unknown'}`);
    
    // Check if metadata contains indicators of proper reference data
    if (session.metadata) {
      const meta = session.metadata;
      
      // Check prompt size as indicator
      if (meta.promptLength) {
        console.log(`   Prompt Length: ${meta.promptLength} chars`);
        if (meta.promptLength > 10000) {
          console.log(`   ✅ Large prompt indicates reference data included`);
        } else if (meta.promptLength < 2000) {
          console.log(`   ⚠️  Small prompt might indicate missing reference data`);
        }
      }
      
      // Check for reference data indicators
      if (meta.referenceDataIncluded !== undefined) {
        console.log(`   Reference Data: ${meta.referenceDataIncluded ? '✅ Included' : '❌ Missing'}`);
      }
      
      // Check for existing listings
      if (meta.existingListingsCount !== undefined) {
        console.log(`   Existing Listings: ${meta.existingListingsCount}`);
      }
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log('\n💡 To see the actual prompt content:');
  console.log('1. Add logging to the Edge Function to capture prompt snippets');
  console.log('2. Check Edge Function logs in Supabase dashboard');
  console.log('3. Or use the test scripts to make a new extraction and verify');
}

verifyPromptContent().catch(console.error);