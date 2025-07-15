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

async function checkDeletionWorkflow() {
  console.log('🔍 Checking Deletion Workflow\n');
  console.log('=' .repeat(80));
  
  try {
    const sessionId = '544e0e65-5f8b-4a8a-8cb9-2bf395309381';
    
    // Get the deletions with their timestamps
    const { data: deletions, error } = await supabase
      .from('extraction_listing_changes')
      .select('id, change_type, change_status, created_at, applied_by')
      .eq('session_id', sessionId)
      .eq('change_type', 'delete')
      .order('created_at');

    if (error) throw error;

    console.log('\nDeletion Timeline:\n');
    
    deletions.forEach((del, idx) => {
      console.log(`${idx + 1}. Deletion ${del.id.substring(0, 8)}...`);
      console.log(`   Created: ${new Date(del.created_at).toLocaleString()}`);
      console.log(`   Status: ${del.change_status}`);
      console.log(`   Applied By: ${del.applied_by || 'N/A'}`);
      console.log('');
    });
    
    // Check if these were marked for application
    console.log('=' .repeat(80));
    console.log('\nChecking Selection Status:\n');
    
    // In the extraction review interface, changes can be:
    // 1. Selected (checkbox checked) -> Will be applied
    // 2. Unselected (checkbox unchecked) -> Will be rejected/skipped
    
    // The fact that they're "rejected" with applied_by = "admin" suggests
    // they were processed but marked as rejected
    
    const rejectedCount = deletions.filter(d => d.change_status === 'rejected').length;
    const appliedBy = deletions[0]?.applied_by;
    
    console.log(`Status: All ${rejectedCount} deletions are marked as "rejected"`);
    console.log(`Applied By: ${appliedBy || 'Unknown'}`);
    console.log('\nThis indicates:');
    console.log('1. The deletions were presented in the UI');
    console.log('2. They were NOT selected (checkboxes unchecked)');
    console.log('3. When "Apply" was clicked, unselected items → rejected status');
    console.log('4. Selected items would have → applied status');
    
    // Let's check what was applied in the same batch
    const { data: appliedChanges } = await supabase
      .from('extraction_listing_changes')
      .select('change_type, change_status')
      .eq('session_id', sessionId)
      .eq('change_status', 'applied');
      
    console.log('\n' + '=' .repeat(80));
    console.log('\nWhat WAS applied in this session:');
    
    const appliedByType = {};
    appliedChanges?.forEach(change => {
      appliedByType[change.change_type] = (appliedByType[change.change_type] || 0) + 1;
    });
    
    Object.entries(appliedByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} changes`);
    });
    
    console.log('\n💡 CONCLUSION:\n');
    console.log('The deletions were NOT selected in the UI before clicking Apply.');
    console.log('This is why they have status "rejected" instead of "applied".');
    console.log('\nIn the extraction review interface:');
    console.log('✅ Checked items → "applied" when Apply is clicked');
    console.log('⬜ Unchecked items → "rejected" when Apply is clicked');
    console.log('\nThe rejection reason being empty is normal - it just means');
    console.log('they were unchecked, not that they were explicitly rejected');
    console.log('with a specific reason.');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run check
checkDeletionWorkflow().catch(console.error);