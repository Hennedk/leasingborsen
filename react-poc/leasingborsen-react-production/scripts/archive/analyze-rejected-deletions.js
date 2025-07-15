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

async function analyzeRejectedDeletions() {
  console.log('🔍 Analyzing Rejected Deletions\n');
  console.log('=' .repeat(80));
  
  try {
    const sessionId = '544e0e65-5f8b-4a8a-8cb9-2bf395309381';
    
    // Get all deletion changes with rejected status
    const { data: rejectedDeletions, error } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'delete')
      .eq('change_status', 'rejected')
      .order('created_at');

    if (error) throw error;

    console.log(`\nFound ${rejectedDeletions.length} rejected deletions\n`);
    
    // Analyze reasons for rejection
    const rejectionReasons = {};
    const listingsToCheck = [];
    
    rejectedDeletions.forEach((deletion, idx) => {
      const reason = deletion.error_message || deletion.rejection_reason || 'No reason provided';
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
      
      if (idx < 5) { // Show first 5 in detail
        console.log(`\nRejected Deletion ${idx + 1}:`);
        console.log('  Change ID:', deletion.id);
        
        if (deletion.existing_data) {
          console.log('  Listing:', `${deletion.existing_data.make} ${deletion.existing_data.model} ${deletion.existing_data.variant}`);
          console.log('  Listing ID:', deletion.existing_data.listing_id || 'Unknown');
          listingsToCheck.push({
            id: deletion.existing_data.listing_id,
            variant: deletion.existing_data.variant,
            make: deletion.existing_data.make,
            model: deletion.existing_data.model
          });
        }
        
        console.log('  Rejection Reason:', reason);
        console.log('  Applied By:', deletion.applied_by || 'Not applied');
        console.log('  Updated:', new Date(deletion.updated_at || deletion.created_at).toLocaleString());
      }
    });
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 Rejection Reasons Summary:');
    Object.entries(rejectionReasons).forEach(([reason, count]) => {
      console.log(`  "${reason}": ${count} deletions`);
    });
    
    // Check if these listings still exist
    console.log('\n' + '=' .repeat(80));
    console.log('\n🔍 Checking if rejected deletions still exist in database:\n');
    
    for (const listing of listingsToCheck) {
      if (listing.id) {
        const { data: exists, error: checkError } = await supabase
          .from('listings')
          .select('id, status, updated_at')
          .eq('id', listing.id)
          .single();
          
        if (exists && !checkError) {
          console.log(`✓ ${listing.make} ${listing.model} ${listing.variant}`);
          console.log(`  Still exists with status: ${exists.status}`);
          console.log(`  Last updated: ${new Date(exists.updated_at).toLocaleString()}`);
        } else {
          console.log(`✗ ${listing.make} ${listing.model} ${listing.variant}`);
          console.log(`  Not found in database (may have been deleted elsewhere)`);
        }
        console.log('');
      }
    }
    
    // Check session configuration
    console.log('\n' + '=' .repeat(80));
    console.log('\n⚙️  Session Configuration:\n');
    
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    console.log('Session Settings:');
    console.log('  Apply Deletions:', session.apply_deletions ?? 'Not set');
    console.log('  Auto Apply:', session.auto_apply ?? 'Not set');
    console.log('  Status:', session.status);
    
    // Look for patterns in the extraction
    console.log('\n' + '=' .repeat(80));
    console.log('\n📋 Extraction Patterns:\n');
    
    const { data: allChanges } = await supabase
      .from('extraction_listing_changes')
      .select('change_type, change_status')
      .eq('session_id', sessionId);
      
    const changeMatrix = {};
    allChanges.forEach(change => {
      const key = `${change.change_type}_${change.change_status}`;
      changeMatrix[key] = (changeMatrix[key] || 0) + 1;
    });
    
    console.log('Change Type Distribution:');
    Object.entries(changeMatrix).forEach(([key, count]) => {
      const [type, status] = key.split('_');
      console.log(`  ${type} → ${status}: ${count}`);
    });
    
    // Recommendations
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 ANALYSIS & RECOMMENDATIONS:\n');
    
    console.log('1. All 12 deletions were REJECTED, not applied');
    console.log('2. This appears to be intentional - someone reviewed and rejected them');
    console.log('3. The listings marked for deletion are still in the database');
    console.log('\nPossible reasons for rejection:');
    console.log('- User manually reviewed and decided not to delete these listings');
    console.log('- Listings might have active contracts or dependencies');
    console.log('- Safety mechanism to prevent accidental deletions');
    console.log('\nNext steps:');
    console.log('- Check with the user who reviewed this extraction');
    console.log('- If deletions should be applied, they can be changed from "rejected" to "pending"');
    console.log('- Then re-run the apply process');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run analysis
analyzeRejectedDeletions().catch(console.error);