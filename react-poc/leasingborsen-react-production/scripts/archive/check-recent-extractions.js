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

async function checkRecentExtractions() {
  console.log('🔍 Checking recent extraction sessions...\n');
  
  // Get recent extraction sessions
  const { data: sessions, error } = await supabase
    .from('extraction_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error fetching sessions:', error);
    return;
  }
  
  console.log(`Found ${sessions.length} recent extraction sessions:\n`);
  
  for (const session of sessions) {
    console.log(`📄 Session: ${session.id}`);
    console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`);
    console.log(`   Seller: ${session.seller_id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   API Version: ${session.api_version || 'unknown'}`);
    
    // Check for equipment differentiation in extracted data
    const { data: changes } = await supabase
      .from('extraction_listing_changes')
      .select('extracted_data, change_type')
      .eq('session_id', session.id)
      .limit(10);
      
    if (changes && changes.length > 0) {
      const equipmentVariants = changes.filter(c => 
        c.extracted_data?.variant?.includes(' - ') && 
        (c.extracted_data.variant.includes('alufælge') || 
         c.extracted_data.variant.includes('soltag') || 
         c.extracted_data.variant.includes('sidespejle') ||
         c.extracted_data.variant.includes('custom colour'))
      );
      
      if (equipmentVariants.length > 0) {
        console.log(`   ✅ Found ${equipmentVariants.length} equipment-differentiated variants:`);
        equipmentVariants.slice(0, 3).forEach(ev => {
          console.log(`      - ${ev.extracted_data.variant}`);
        });
      } else {
        console.log(`   ⚠️  No equipment-differentiated variants found`);
      }
    }
    
    console.log('');
  }
  
  // Check for duplicate constraint violations in recent sessions
  console.log('\n🔍 Checking for duplicate constraint issues...\n');
  
  const { data: recentErrors } = await supabase
    .from('extraction_listing_changes')
    .select('session_id, review_notes')
    .like('review_notes', '%duplicate key%')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentErrors && recentErrors.length > 0) {
    console.log(`⚠️  Found ${recentErrors.length} recent duplicate key errors:`);
    const uniqueSessions = [...new Set(recentErrors.map(e => e.session_id))];
    uniqueSessions.forEach(sessionId => {
      console.log(`   - Session: ${sessionId}`);
    });
  } else {
    console.log('✅ No recent duplicate key errors found');
  }
}

checkRecentExtractions().catch(console.error);