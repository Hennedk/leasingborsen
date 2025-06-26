#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// The specific job ID you want to query
const JOB_ID = 'e9a544d2-0989-4854-b482-d752646ddcee';
const BATCH_ID = 'privatleasing-test-1750800097644';

async function showSpecificJobData() {
  try {
    console.log('🔍 Querying Specific Job Data...');
    console.log('=====================================');
    console.log(`Job ID: ${JOB_ID}`);
    console.log(`Batch ID: ${BATCH_ID}`);
    console.log('');

    // 1. Check processing_jobs table
    console.log('📊 Processing Jobs Table:');
    console.log('-------------------------');
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', JOB_ID)
      .single();

    if (jobError) {
      console.log('❌ Error querying processing_jobs:', jobError.message);
    } else if (!job) {
      console.log('❌ No job found with ID:', JOB_ID);
    } else {
      console.log('✅ Job found:');
      console.log(`  Status: ${job.status}`);
      console.log(`  Progress: ${job.progress}%`);
      console.log(`  Current Step: ${job.current_step}`);
      console.log(`  Dealer Type: ${job.dealer_type}`);
      console.log(`  Processed Items: ${job.processed_items || 0}`);
      console.log(`  AI Cost: $${job.ai_cost || 0}`);
      console.log(`  Created: ${job.created_at}`);
      console.log(`  Completed: ${job.completed_at || 'Not completed'}`);
      
      // Check if there's a result field
      if (job.result) {
        console.log('✅ Result field found in processing_jobs!');
        console.log(`  Result type: ${typeof job.result}`);
        if (job.result.extractedItems) {
          console.log(`  Extracted Items: ${job.result.extractedItems.length}`);
          console.log('  First few items:');
          job.result.extractedItems.slice(0, 3).forEach((item, i) => {
            console.log(`    ${i+1}. ${item.model || 'Unknown'} ${item.variant || ''}`);
            console.log(`       Price: ${item.monthly_price || 'N/A'} kr/md`);
            console.log(`       Method: ${item.extraction_method || 'N/A'}`);
          });
        } else {
          console.log(`  Result content: ${JSON.stringify(job.result).substring(0, 200)}...`);
        }
      } else {
        console.log('❌ No result field found in processing_jobs');
      }
    }

    // 2. Check extraction_logs table
    console.log('\n📋 Extraction Logs Table:');
    console.log('-------------------------');
    const { data: logs, error: logsError } = await supabase
      .from('extraction_logs')
      .select('*')
      .eq('created_at', job?.created_at)
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.log('❌ Error querying extraction_logs:', logsError.message);
    } else if (!logs || logs.length === 0) {
      console.log('❌ No extraction logs found for this timeframe');
    } else {
      console.log(`✅ Found ${logs.length} extraction log(s):`);
      logs.forEach((log, i) => {
        console.log(`  ${i+1}. Log ID: ${log.id}`);
        console.log(`     Status: ${log.extraction_status}`);
        console.log(`     Dealer: ${log.dealer_name || 'Unknown'}`);
        console.log(`     Extracted Count: ${log.extracted_count || 0}`);
        console.log(`     Cost: $${(log.cost_cents || 0) / 100}`);
        
        if (log.extracted_data) {
          console.log('     ✅ Extracted data found!');
          console.log(`     Data type: ${typeof log.extracted_data}`);
          if (log.extracted_data.extractedItems) {
            console.log(`     Items: ${log.extracted_data.extractedItems.length}`);
          } else if (Array.isArray(log.extracted_data)) {
            console.log(`     Items: ${log.extracted_data.length}`);
          } else {
            console.log(`     Data: ${JSON.stringify(log.extracted_data).substring(0, 100)}...`);
          }
        } else {
          console.log('     ❌ No extracted_data found');
        }
      });
    }

    // 3. Check batch_imports table
    console.log('\n📦 Batch Imports Table:');
    console.log('-----------------------');
    const { data: batch, error: batchError } = await supabase
      .from('batch_imports')
      .select('*')
      .eq('id', BATCH_ID)
      .single();

    if (batchError) {
      console.log('❌ Error querying batch_imports:', batchError.message);
    } else if (!batch) {
      console.log('❌ No batch found with ID:', BATCH_ID);
    } else {
      console.log('✅ Batch found:');
      console.log(`  Status: ${batch.status}`);
      console.log(`  Total Files: ${batch.total_files || 0}`);
      console.log(`  Processed Files: ${batch.processed_files || 0}`);
      console.log(`  Created: ${batch.created_at}`);
      console.log(`  Updated: ${batch.updated_at}`);
    }

    // 4. Look for any listings that might have been created
    console.log('\n🚗 Related Listings:');
    console.log('--------------------');
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .eq('batch_import_id', BATCH_ID)
      .limit(10);

    if (listingsError) {
      console.log('❌ Error querying listings:', listingsError.message);
    } else if (!listings || listings.length === 0) {
      console.log('❌ No listings found for this batch');
    } else {
      console.log(`✅ Found ${listings.length} listing(s):`);
      listings.forEach((listing, i) => {
        console.log(`  ${i+1}. ${listing.make || 'Unknown'} ${listing.model || 'Unknown'}`);
        console.log(`     Variant: ${listing.variant || 'N/A'}`);
        console.log(`     Price: ${listing.monthly_price || 'N/A'} kr/md`);
        console.log(`     Status: ${listing.status}`);
        console.log(`     Created: ${listing.created_at}`);
      });
    }

    // 5. Check all tables for this batch_id
    console.log('\n🔍 Raw Database Query Results:');
    console.log('------------------------------');
    
    // Query processing_jobs by batch_id
    const { data: jobsByBatch, error: jobsByBatchError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('batch_id', BATCH_ID);

    if (jobsByBatchError) {
      console.log('❌ Error querying jobs by batch_id:', jobsByBatchError.message);
    } else {
      console.log(`✅ Found ${jobsByBatch?.length || 0} job(s) for batch ${BATCH_ID}`);
      jobsByBatch?.forEach((job, i) => {
        console.log(`\n  Job ${i+1}: ${job.id}`);
        console.log(`    Status: ${job.status}`);
        console.log(`    Processed Items: ${job.processed_items || 0}`);
        console.log(`    Has Result: ${job.result ? 'Yes' : 'No'}`);
        if (job.result && typeof job.result === 'object') {
          console.log(`    Result Keys: ${Object.keys(job.result).join(', ')}`);
          if (job.result.extractedItems) {
            console.log(`    Extracted Items Count: ${job.result.extractedItems.length}`);
            
            // Show actual extracted data
            console.log('\n    🚗 EXTRACTED VEHICLE DATA:');
            console.log('    ' + '='.repeat(30));
            job.result.extractedItems.slice(0, 10).forEach((vehicle, index) => {
              console.log(`    ${index + 1}. ${vehicle.model || 'Unknown Model'} ${vehicle.variant || 'Standard'}`);
              console.log(`       Monthly Price: ${vehicle.monthly_price || 'N/A'} kr`);
              console.log(`       Mileage: ${vehicle.mileage_per_year || 'N/A'} km/year`);
              console.log(`       Period: ${vehicle.period_months || 'N/A'} months`);
              console.log(`       Extraction Method: ${vehicle.extraction_method || 'N/A'}`);
              if (vehicle.context_snippet) {
                console.log(`       Context: ${vehicle.context_snippet.substring(0, 50)}...`);
              }
              console.log('');
            });
            
            if (job.result.extractedItems.length > 10) {
              console.log(`    ... and ${job.result.extractedItems.length - 10} more vehicles`);
            }
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
}

showSpecificJobData();