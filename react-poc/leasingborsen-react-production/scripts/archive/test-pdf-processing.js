#!/usr/bin/env node

/**
 * Quick test script for PDF processing system
 * Run with: node scripts/test-pdf-processing.js
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function log(message, type = 'info') {
  const color = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue
  }[type] || colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  log('\n📊 Testing Database Connection...', 'info');
  
  try {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    log('✅ Database connection successful', 'success');
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 2: Dealer Configurations
async function testDealerConfigs() {
  log('\n🔧 Testing Dealer Configurations...', 'info');
  
  try {
    const { data: configs, error } = await supabase
      .from('dealer_configs')
      .select('id, name, version, active')
      .in('id', ['volkswagen', 'toyota']);
    
    if (error) throw error;
    
    if (configs.length === 0) {
      log('⚠️  No dealer configurations found. Run: node scripts/load-dealer-configs.js', 'warning');
      return false;
    }
    
    configs.forEach(config => {
      log(`✅ Found ${config.name} config (v${config.version}) - ${config.active ? 'Active' : 'Inactive'}`, 'success');
    });
    
    return true;
  } catch (error) {
    log(`❌ Dealer config test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 3: Edge Function Health
async function testEdgeFunctionHealth() {
  log('\n🚀 Testing Edge Function Health...', 'info');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf/health`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    log('✅ Edge function is healthy', 'success');
    return true;
  } catch (error) {
    log(`❌ Edge function health check failed: ${error.message}`, 'error');
    log('   Make sure to deploy with: supabase functions deploy process-pdf', 'warning');
    return false;
  }
}

// Test 4: Sample PDF Processing
async function testPDFProcessing() {
  log('\n📄 Testing PDF Processing...', 'info');
  
  const testBatchId = `test-${Date.now()}`;
  
  try {
    // Create a test job
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchId: testBatchId,
        fileUrl: 'batch-imports/test-vw.pdf', // You'll need to upload a test PDF
        dealerId: 'volkswagen'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    log(`✅ PDF processing job created: ${result.jobId}`, 'success');
    
    // Monitor progress
    log('   Monitoring progress...', 'info');
    await monitorJob(result.jobId);
    
    return true;
  } catch (error) {
    log(`❌ PDF processing test failed: ${error.message}`, 'error');
    log('   Make sure you have a test PDF in Supabase storage', 'warning');
    return false;
  }
}

// Monitor job progress
async function monitorJob(jobId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('status, progress_percentage, error_message, dealer_detection')
      .eq('id', jobId)
      .single();
    
    if (error) {
      log(`   ❌ Error monitoring job: ${error.message}`, 'error');
      return false;
    }
    
    if (!job) {
      log('   ❌ Job not found', 'error');
      return false;
    }
    
    // Update progress line
    process.stdout.write(`\r   Progress: ${job.progress_percentage || 0}% - Status: ${job.status}`);
    
    if (job.status === 'completed') {
      console.log(''); // New line
      log(`   ✅ Job completed successfully!`, 'success');
      if (job.dealer_detection) {
        log(`   Dealer detected: ${job.dealer_detection.detectedType} (${job.dealer_detection.confidence}% confidence)`, 'info');
      }
      return true;
    }
    
    if (job.status === 'failed') {
      console.log(''); // New line
      log(`   ❌ Job failed: ${job.error_message}`, 'error');
      return false;
    }
    
    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(''); // New line
  log('   ⚠️  Job monitoring timeout', 'warning');
  return false;
}

// Test 5: Client-Side Integration
async function testClientIntegration() {
  log('\n🖥️  Testing Client-Side Integration...', 'info');
  
  try {
    // Check if useJobProgress hook data structure exists
    const { data: jobs, error } = await supabase
      .from('processing_jobs')
      .select('id, status, progress_percentage')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    log(`✅ Found ${jobs.length} processing jobs in database`, 'success');
    
    // Check admin UI files exist
    const adminFiles = [
      'src/pages/admin/ProcessingJobsPage.tsx',
      'src/components/admin/processing/JobProgressMonitor.tsx',
      'src/hooks/useJobProgress.ts'
    ];
    
    let allFilesExist = true;
    adminFiles.forEach(file => {
      const path = join(__dirname, '..', file);
      if (fs.existsSync(path)) {
        log(`   ✅ ${file} exists`, 'success');
      } else {
        log(`   ❌ ${file} missing`, 'error');
        allFilesExist = false;
      }
    });
    
    return allFilesExist;
  } catch (error) {
    log(`❌ Client integration test failed: ${error.message}`, 'error');
    return false;
  }
}

// Main test runner
async function runTests() {
  log('🧪 PDF Processing System Test Suite', 'info');
  log('=====================================\n', 'info');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Dealer Configurations', fn: testDealerConfigs },
    { name: 'Edge Function Health', fn: testEdgeFunctionHealth },
    { name: 'PDF Processing', fn: testPDFProcessing },
    { name: 'Client Integration', fn: testClientIntegration }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const passed = await test.fn();
    results.push({ name: test.name, passed });
  }
  
  // Summary
  log('\n📊 Test Summary', 'info');
  log('================', 'info');
  
  let passedCount = 0;
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'success' : 'error';
    log(`${icon} ${result.name}`, color);
    if (result.passed) passedCount++;
  });
  
  log(`\nTotal: ${passedCount}/${results.length} tests passed`, passedCount === results.length ? 'success' : 'warning');
  
  if (passedCount < results.length) {
    log('\n📚 Next Steps:', 'info');
    log('1. Deploy Edge Function: supabase functions deploy process-pdf', 'info');
    log('2. Load dealer configs: node scripts/load-dealer-configs.js', 'info');
    log('3. Upload test PDF to Supabase storage', 'info');
    log('4. Check .env.local for correct credentials', 'info');
  } else {
    log('\n🎉 All tests passed! The system is ready for use.', 'success');
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'error');
  process.exit(1);
});