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

async function reviewExtractionAfterUpdate(sessionId) {
  console.log('🔍 Reviewing Extraction After Prompt Update\n');
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
    console.log('API Version:', session.api_version);
    
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
    let suspiciousMonthlyPrices = 0;
    let goodMonthlyPrices = 0;
    
    // Track pricing patterns
    const monthlyPrices = [];
    const downPayments = [];
    
    changes.forEach((change, idx) => {
      const data = change.new_data || change.extracted_data;
      
      // Skip delete operations for offer analysis
      if (change.change_type === 'delete') {
        return;
      }
      
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
            const monthlyPrice = offer.monthly_price;
            const downPayment = offer.first_payment;
            
            console.log(`    Offer ${offerIdx + 1}:`);
            console.log(`      Monthly Price: ${monthlyPrice || 'MISSING'} kr`);
            console.log(`      First Payment: ${downPayment || 'MISSING'} kr`);
            console.log(`      Period: ${offer.period_months || 'MISSING'} months`);
            console.log(`      Mileage/Year: ${offer.mileage_per_year || 'MISSING'} km`);
            console.log(`      Total Price: ${offer.total_price ? offer.total_price + ' kr' : 'N/A'}`);
            
            // Collect pricing data
            if (monthlyPrice) monthlyPrices.push(monthlyPrice);
            if (downPayment) downPayments.push(downPayment);
            
            // Check for pricing issues
            if (!monthlyPrice || !downPayment || !offer.period_months || !offer.mileage_per_year) {
              console.log('      ⚠️  MISSING REQUIRED FIELDS!');
              invalidOffersCount++;
            }
            
            // Check if monthly price is suspicious (>10,000 kr)
            if (monthlyPrice > 10000) {
              console.log('      🚨 SUSPICIOUS: Monthly price > 10,000 kr (might be down payment?)');
              suspiciousMonthlyPrices++;
            } else if (monthlyPrice >= 2000 && monthlyPrice <= 8000) {
              console.log('      ✅ Monthly price in expected range (2,000-8,000 kr)');
              goodMonthlyPrices++;
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
    
    // Analyze pricing patterns
    console.log('=' .repeat(80));
    console.log('\n📊 Pricing Analysis:');
    
    if (monthlyPrices.length > 0) {
      const avgMonthly = monthlyPrices.reduce((a, b) => a + b, 0) / monthlyPrices.length;
      const minMonthly = Math.min(...monthlyPrices);
      const maxMonthly = Math.max(...monthlyPrices);
      
      console.log('\nMonthly Prices:');
      console.log(`  Average: ${avgMonthly.toFixed(0)} kr`);
      console.log(`  Range: ${minMonthly} - ${maxMonthly} kr`);
      console.log(`  Good prices (2-8k): ${goodMonthlyPrices}`);
      console.log(`  Suspicious (>10k): ${suspiciousMonthlyPrices}`);
    }
    
    if (downPayments.length > 0) {
      const avgDown = downPayments.reduce((a, b) => a + b, 0) / downPayments.length;
      const minDown = Math.min(...downPayments);
      const maxDown = Math.max(...downPayments);
      
      console.log('\nDown Payments:');
      console.log(`  Average: ${avgDown.toFixed(0)} kr`);
      console.log(`  Range: ${minDown} - ${maxDown} kr`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 Summary:');
    console.log(`  Total Listings (non-delete): ${changes.filter(c => c.change_type !== 'delete').length}`);
    console.log(`  Total Offers: ${totalOffersCount}`);
    console.log(`  Average Offers per Listing: ${(totalOffersCount / changes.filter(c => c.change_type !== 'delete').length).toFixed(1)}`);
    
    if (noOffersCount > 0) {
      console.log(`\n  ⚠️  WARNING: ${noOffersCount} listings have NO OFFERS!`);
    }
    
    if (invalidOffersCount > 0) {
      console.log(`  ⚠️  WARNING: ${invalidOffersCount} offers have MISSING FIELDS!`);
    }
    
    if (suspiciousMonthlyPrices > 0) {
      console.log(`  🚨 WARNING: ${suspiciousMonthlyPrices} offers have suspicious monthly prices (>10,000 kr)!`);
      console.log(`     These might be down payments incorrectly placed as monthly prices.`);
    }
    
    if (suspiciousMonthlyPrices === 0 && invalidOffersCount === 0) {
      console.log('\n  ✅ All offers have valid pricing within expected ranges!');
    }
    
    // Compare with previous extraction
    console.log('\n' + '=' .repeat(80));
    console.log('\n🔄 Comparison with Previous Extraction:');
    console.log('Previous extraction (5d53e130-9f4a-47ec-8a42-8796b6ce5c93):');
    console.log('  - Had many monthly prices of 14,995 and 29,995 kr (suspicious)');
    console.log('  - These were likely down payments misidentified as monthly prices');
    console.log('\nCurrent extraction:');
    if (suspiciousMonthlyPrices === 0) {
      console.log('  ✅ No suspicious monthly prices found!');
      console.log('  ✅ The new prompt guidance appears to be working!');
    } else {
      console.log('  ⚠️  Still some suspicious prices - may need further prompt refinement');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run with the new session ID
const sessionId = 'da2976c3-5cf4-4c25-bb0b-89cd76ff78d3';
reviewExtractionAfterUpdate(sessionId).catch(console.error);