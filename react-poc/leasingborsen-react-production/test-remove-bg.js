// Test script for remove-bg Edge Function
import fs from 'fs';
import path from 'path';

// Read a test image and convert to base64
const testImagePath = process.argv[2];
if (!testImagePath) {
  console.error('Please provide an image path as argument');
  process.exit(1);
}

const imageBuffer = fs.readFileSync(testImagePath);
const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

// Test environment - now using staging with auto-crop
const TEST_URL = 'https://lpbtgtpgbnybjqcpsrrf.supabase.co';
const TEST_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwYnRndHBnYm55YmpxY3BzcnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODU5NDEsImV4cCI6MjA2OTM2MTk0MX0.hQvjGKDJjkz0RocvMtER5aehYKkbmu1gAzPcQ1NAHng';

// Test remove-bg directly
async function testRemoveBg() {
  try {
    console.log('Testing remove-bg Edge Function...');
    console.log('Image size:', imageBuffer.length, 'bytes');
    
    const response = await fetch(`${TEST_URL}/functions/v1/remove-bg`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64Image,
        fileName: path.basename(testImagePath)
      })
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Background removal successful!');
      console.log('Original URL:', result.original);
      console.log('Processed URL:', result.processed);
      if (result.standardizedImages) {
        console.log('Grid image:', result.standardizedImages.grid?.url);
        console.log('Detail image:', result.standardizedImages.detail?.url);
      }
    } else {
      console.log('❌ Background removal failed:', result.error);
    }
  } catch (error) {
    console.error('Error testing remove-bg:', error);
  }
}

testRemoveBg();