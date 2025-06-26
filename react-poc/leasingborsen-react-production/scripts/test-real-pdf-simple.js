#!/usr/bin/env node

/**
 * Simple PDF text extraction using pdf2pic or alternative method
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const color = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    highlight: colors.cyan
  }[type] || colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
}

async function extractPDFText(pdfPath) {
  try {
    log('📄 Attempting to extract text from PDF...', 'info');
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }
    
    // Try using pdftotext (part of poppler-utils)
    try {
      const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
      if (stdout && stdout.trim().length > 0) {
        log(`✅ Extracted ${stdout.length} characters using pdftotext`, 'success');
        return stdout;
      }
    } catch (error) {
      log('⚠️  pdftotext not available, trying alternative...', 'warning');
    }
    
    // Fallback: Read file info and provide instructions
    const stats = fs.statSync(pdfPath);
    log(`📊 PDF file found: ${(stats.size / 1024).toFixed(1)} KB`, 'info');
    
    // For now, let's check what tools are available
    try {
      await execAsync('which pdftotext');
      log('✅ pdftotext is available', 'success');
    } catch {
      try {
        await execAsync('which pdftk');
        log('✅ pdftk is available', 'success');
      } catch {
        log('❌ No PDF tools found. Install poppler-utils: sudo apt install poppler-utils', 'error');
      }
    }
    
    // Return a placeholder that indicates we need to install tools
    return `PDF_EXTRACTION_NEEDS_TOOLS: File size ${stats.size} bytes, created ${stats.mtime}`;
    
  } catch (error) {
    log(`❌ PDF extraction failed: ${error.message}`, 'error');
    throw error;
  }
}

async function processRealPDF() {
  try {
    log('🚀 Testing REAL PDF Extraction', 'highlight');
    log('==========================================', 'info');
    
    const pdfPath = join(__dirname, '../Privatleasing_priser.pdf');
    
    // Extract text from real PDF
    const pdfText = await extractPDFText(pdfPath);
    
    if (pdfText.startsWith('PDF_EXTRACTION_NEEDS_TOOLS:')) {
      log('🔧 PDF tools installation required', 'warning');
      log('Run: sudo apt install poppler-utils', 'info');
      log('Then re-run this script to extract real PDF text', 'info');
      return;
    }
    
    // Show first part of extracted text
    log('📝 Real PDF Text (first 1000 characters):', 'highlight');
    console.log('---');
    console.log(pdfText.substring(0, 1000));
    console.log('---');
    
    // Process through AI system
    log('🤖 Processing through AI extraction...', 'info');
    
    const payload = {
      filename: 'Privatleasing_priser.pdf',
      textContent: pdfText,
      extractedData: {
        dealer_name: 'Real PDF Extraction',
        dealer_id: 'real-pdf-test',
        batch_id: `real-pdf-${Date.now()}`,
        processing_timestamp: new Date().toISOString()
      }
    };
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Processing failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    log('✅ Real PDF processed successfully!', 'success');
    log(`📊 Job ID: ${result.job_id}`, 'info');
    
  } catch (error) {
    log(`❌ Processing failed: ${error.message}`, 'error');
  }
}

processRealPDF().catch(console.error);