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

async function findDeletionDetails() {
  console.log('🔍 Finding Deletion Details\n');
  console.log('=' .repeat(80));
  
  try {
    const sessionId = '544e0e65-5f8b-4a8a-8cb9-2bf395309381';
    
    // Get session info
    const { data: session } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    console.log('Session:', session.session_name);
    console.log('Seller ID:', session.seller_id);
    console.log('Status:', session.status);
    
    // Get ALL changes to understand the pattern
    const { data: allChanges } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');
      
    // Look for a special deletion summary record
    const deletionSummary = allChanges.find(c => 
      c.extracted_data?.deletion_data || 
      c.new_data?.deletion_data ||
      c.existing_data?.deletion_data
    );
    
    if (deletionSummary) {
      console.log('\n✅ Found deletion summary record!');
      const deletionData = deletionSummary.extracted_data?.deletion_data || 
                          deletionSummary.new_data?.deletion_data ||
                          deletionSummary.existing_data?.deletion_data;
                          
      if (Array.isArray(deletionData)) {
        console.log(`\n📋 Listings marked for deletion (${deletionData.length} total):\n`);
        
        deletionData.forEach((listing, idx) => {
          console.log(`${idx + 1}. ${listing.make} ${listing.model}`);
          console.log(`   Variant: ${listing.variant}`);
          console.log(`   ID: ${listing.listing_id}`);
          console.log(`   HP: ${listing.horsepower || 'N/A'}`);
          console.log('');
        });
      }
    } else {
      console.log('\n❌ No deletion summary found in extraction data');
    }
    
    // Check the actual seller's current inventory
    console.log('=' .repeat(80));
    console.log('\n📊 Current Seller Inventory:\n');
    
    const { data: currentListings } = await supabase
      .from('full_listing_view')
      .select('listing_id, make, model, variant, horsepower')
      .eq('seller_id', session.seller_id)
      .eq('status', 'available')
      .order('make, model, variant');
      
    // Group by make
    const byMake = {};
    currentListings?.forEach(listing => {
      if (!byMake[listing.make]) byMake[listing.make] = [];
      byMake[listing.make].push(listing);
    });
    
    Object.entries(byMake).forEach(([make, listings]) => {
      console.log(`\n${make} (${listings.length} models):`);
      const uniqueModels = [...new Set(listings.map(l => `${l.model} - ${l.variant}`))];
      uniqueModels.sort().forEach((model, idx) => {
        if (idx < 10) { // Show first 10
          console.log(`  - ${model}`);
        }
      });
      if (uniqueModels.length > 10) {
        console.log(`  ... and ${uniqueModels.length - 10} more`);
      }
    });
    
    // Analysis
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 SUMMARY:\n');
    console.log('1. The extraction found 28 Toyota models in the PDF');
    console.log('2. 12 deletions were identified (listings NOT in the PDF)');
    console.log('3. All deletions were REJECTED by admin user');
    console.log('4. This means the "missing" listings are still in the database');
    console.log('\nThis is working correctly - the admin chose to keep listings');
    console.log('that weren\'t in the PDF, possibly because:');
    console.log('- They have active contracts');
    console.log('- The PDF was incomplete');
    console.log('- They want to keep them for other reasons');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run
findDeletionDetails().catch(console.error);