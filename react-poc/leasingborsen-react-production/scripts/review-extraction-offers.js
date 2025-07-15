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

async function reviewExtractionOffers(sessionId) {
  console.log('🔍 Reviewing Extraction Offers\n');
  console.log('=' .repeat(80));
  
  try {
    // Get extraction session details
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    console.log('\nExtraction Session:');
    console.log('ID:', session.id);
    console.log('Name:', session.session_name);
    console.log('Status:', session.status);
    console.log('Total Extracted:', session.total_extracted);
    console.log('Created:', new Date(session.created_at).toLocaleString());
    
    // Get listing changes
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');

    if (changesError) throw changesError;

    console.log('\n' + '=' .repeat(80));
    console.log('\nExtracted Listings and Offers:');
    console.log('Total changes:', changes.length);
    console.log('\n' + '=' .repeat(80) + '\n');
    
    let totalOffersCount = 0;
    let noOffersCount = 0;
    let invalidOffersCount = 0;
    
    changes.forEach((change, idx) => {
      const data = change.new_data || change.extracted_data;
      console.log(`Listing ${idx + 1}:`);
      console.log('  Change Type:', change.change_type);
      console.log('  Status:', change.change_status);
      
      if (data) {
        console.log('  Make/Model:', `${data.make} ${data.model}`);
        console.log('  Variant:', data.variant);
        console.log('  Horsepower:', data.horsepower, 'HP');
        
        // Check offers
        if (data.offers && Array.isArray(data.offers)) {
          console.log('\n  Offers:', data.offers.length);
          totalOffersCount += data.offers.length;
          
          data.offers.forEach((offer, offerIdx) => {
            console.log(`    Offer ${offerIdx + 1}:`);
            console.log(`      Monthly Price: ${offer.monthly_price || 'MISSING'} kr`);
            console.log(`      First Payment: ${offer.first_payment || 'MISSING'} kr`);
            console.log(`      Period: ${offer.period_months || 'MISSING'} months`);
            console.log(`      Mileage/Year: ${offer.mileage_per_year || 'MISSING'} km`);
            console.log(`      Total Price: ${offer.total_price ? offer.total_price + ' kr' : 'N/A'}`);
            
            // Check for invalid offers
            if (!offer.monthly_price || !offer.first_payment || !offer.period_months || !offer.mileage_per_year) {
              console.log('      ⚠️  MISSING REQUIRED FIELDS!');
              invalidOffersCount++;
            }
          });
        } else {
          console.log('\n  ❌ NO OFFERS FOUND!');
          noOffersCount++;
        }
      } else {
        console.log('  ❌ No data found in change record');
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    });
    
    // Summary
    console.log('=' .repeat(80));
    console.log('\n📊 Summary:');
    console.log(`  Total Listings: ${changes.length}`);
    console.log(`  Total Offers: ${totalOffersCount}`);
    console.log(`  Average Offers per Listing: ${(totalOffersCount / changes.length).toFixed(1)}`);
    
    if (noOffersCount > 0) {
      console.log(`\n  ⚠️  WARNING: ${noOffersCount} listings have NO OFFERS!`);
    }
    
    if (invalidOffersCount > 0) {
      console.log(`  ⚠️  WARNING: ${invalidOffersCount} offers have MISSING FIELDS!`);
    }
    
    if (noOffersCount === 0 && invalidOffersCount === 0) {
      console.log('\n  ✅ All listings have valid offers!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run with the provided session ID
const sessionId = '5d53e130-9f4a-47ec-8a42-8796b6ce5c93';
reviewExtractionOffers(sessionId).catch(console.error);