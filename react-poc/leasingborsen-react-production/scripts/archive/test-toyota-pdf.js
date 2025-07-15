#!/usr/bin/env node

/**
 * Test script for Toyota PDF processing
 * This creates a sample Toyota PDF content for testing
 * Run with: node scripts/test-toyota-pdf.js
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
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

// Sample Toyota PDF content (simulating extracted text)
const TOYOTA_SAMPLE_PDF_TEXT = `
TOYOTA FINANCIAL SERVICES DANMARK
ERHVERVSLEASING PRISLISTE
Gældende fra 1. januar 2025

Toyota Yaris
1.5 Hybrid Active - 116 HK
Førstegangsydelse: 20.000 kr.
Månedlig ydelse: 2.295 kr./md.
Restværdi: 45.000 kr.
12 mdr./15.000 km: 2.295 kr./md.
24 mdr./30.000 km: 2.195 kr./md.
36 mdr./45.000 km: 2.095 kr./md.

1.5 Hybrid Comfort - 116 HK
Førstegangsydelse: 25.000 kr.
Månedlig ydelse: 2.695 kr./md.
12 mdr./15.000 km: 2.695 kr./md.
24 mdr./30.000 km: 2.595 kr./md.
36 mdr./45.000 km: 2.495 kr./md.

Toyota Corolla Touring Sports
1.8 Hybrid Active - 140 HK
Månedlig ydelse: 3.495 kr./md.
CO2-udslip: 102 g/km
Brændstofforbrug: 4.5 l/100 km
12 mdr./15.000 km: 3.495 kr./md.
24 mdr./30.000 km: 3.395 kr./md.
36 mdr./45.000 km: 3.295 kr./md.

2.0 Hybrid Executive - 196 HK
Månedlig ydelse: 4.295 kr./md.
CO2-udslip: 107 g/km
Brændstofforbrug: 4.7 l/100 km
12 mdr./15.000 km: 4.295 kr./md.
24 mdr./30.000 km: 4.195 kr./md.
36 mdr./45.000 km: 4.095 kr./md.

Toyota RAV4
2.5 Hybrid Style AWD - 222 HK
Månedlig ydelse: 5.495 kr./md.
CO2-udslip: 115 g/km
Brændstofforbrug: 5.1 l/100 km
12 mdr./15.000 km: 5.495 kr./md.
24 mdr./30.000 km: 5.395 kr./md.
36 mdr./45.000 km: 5.295 kr./md.

2.5 Plug-in Hybrid Premium AWD - 306 HK
Månedlig ydelse: 6.995 kr./md.
CO2-udslip: 22 g/km
Elektrisk rækkevidde: 75 km
12 mdr./15.000 km: 6.995 kr./md.
24 mdr./30.000 km: 6.895 kr./md.
36 mdr./45.000 km: 6.795 kr./md.

Toyota C-HR
1.8 Hybrid Active - 140 HK
Månedlig ydelse: 3.295 kr./md.
CO2-udslip: 106 g/km
12 mdr./15.000 km: 3.295 kr./md.
24 mdr./30.000 km: 3.195 kr./md.
36 mdr./45.000 km: 3.095 kr./md.

Toyota bZ4X
bZ4X Pure FWD - 204 HK
Månedlig ydelse: 5.995 kr./md.
Elektrisk rækkevidde: 516 km WLTP
Batteristørrelse: 71.4 kWh
Energiforbrug: 14.4 kWh/100 km
12 mdr./15.000 km: 5.995 kr./md.
24 mdr./30.000 km: 5.895 kr./md.
36 mdr./45.000 km: 5.795 kr./md.

Alle priser er ekskl. moms og afgifter.
Tilbuddet gælder erhvervskunder.
`;

async function createTestPDF() {
  console.log('🚗 Toyota PDF Test Script');
  console.log('========================\n');

  try {
    // Step 1: Create a test "PDF" in storage (using text file for simulation)
    console.log('📄 Creating test Toyota PDF in storage...');
    const fileName = `test-toyota-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('batch-imports')
      .upload(fileName, TOYOTA_SAMPLE_PDF_TEXT, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    console.log(`✅ Test file uploaded: batch-imports/${fileName}`);

    // Step 2: Test dealer auto-detection
    console.log('\n🔍 Testing Toyota dealer auto-detection...');
    const batchId = `toyota-test-${Date.now()}`;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchId: batchId,
        fileUrl: `batch-imports/${fileName}`,
        // Not specifying dealerId to test auto-detection
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Processing job created: ${result.jobId}`);
    
    if (result.dealerDetection) {
      console.log(`   Detected: ${result.dealerDetection.detectedType} (${result.dealerDetection.confidence}% confidence)`);
    }

    // Step 3: Monitor job progress
    console.log('\n📊 Monitoring job progress...');
    const jobCompleted = await monitorJob(result.jobId);

    if (jobCompleted) {
      // Step 4: Check extraction results
      console.log('\n🔍 Checking extraction results...');
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('id', result.jobId)
        .single();

      if (!jobError && jobData) {
        console.log('✅ Job completed successfully!');
        console.log(`   Status: ${jobData.status}`);
        console.log(`   Vehicles extracted: ${jobData.result?.vehicles?.length || 0}`);
        
        if (jobData.result?.vehicles?.length > 0) {
          console.log('\n📋 Sample extracted vehicles:');
          jobData.result.vehicles.slice(0, 3).forEach((vehicle, index) => {
            console.log(`   ${index + 1}. ${vehicle.make} ${vehicle.model} ${vehicle.variant}`);
            console.log(`      Price: ${vehicle.monthly_price} kr/md`);
            console.log(`      Fuel: ${vehicle.fuel_type}`);
          });
        }

        if (jobData.result?.validationSummary) {
          console.log('\n✅ Validation Summary:');
          console.log(`   Total vehicles: ${jobData.result.validationSummary.totalVehicles}`);
          console.log(`   Valid: ${jobData.result.validationSummary.validVehicles}`);
          console.log(`   Errors: ${jobData.result.validationSummary.errors}`);
          console.log(`   Warnings: ${jobData.result.validationSummary.warnings}`);
        }
      }
    }

    // Step 5: Test with explicit Toyota dealer
    console.log('\n\n🎯 Testing with explicit Toyota dealer selection...');
    const explicitBatchId = `toyota-explicit-${Date.now()}`;
    
    const explicitResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchId: explicitBatchId,
        fileUrl: `batch-imports/${fileName}`,
        dealerId: 'toyota' // Explicitly specify Toyota
      })
    });

    if (explicitResponse.ok) {
      const explicitResult = await explicitResponse.json();
      console.log(`✅ Toyota-specific processing job created: ${explicitResult.jobId}`);
    }

    console.log('\n✨ Toyota PDF test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Navigate to /admin/processing-jobs to view all jobs');
    console.log('2. Use the GenericBatchUploadDialog to upload real Toyota PDFs');
    console.log('3. Check /admin/batches/[batchId]/review to review extracted vehicles');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Make sure Edge Function is deployed: npm run pdf:deploy');
    console.error('2. Ensure Toyota config is loaded: npm run pdf:load-configs');
    console.error('3. Check Supabase Storage bucket "batch-imports" exists');
  }
}

async function monitorJob(jobId, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('status, progress_percentage')
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error(`   ❌ Error monitoring job: ${error.message}`);
      return false;
    }
    
    process.stdout.write(`\r   Progress: ${job.progress_percentage || 0}% - Status: ${job.status}`);
    
    if (job.status === 'completed') {
      console.log(''); // New line
      return true;
    }
    
    if (job.status === 'failed') {
      console.log(''); // New line
      return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(''); // New line
  return false;
}

// Run the test
createTestPDF().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});