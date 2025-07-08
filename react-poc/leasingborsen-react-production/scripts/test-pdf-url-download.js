// Test script to verify PDF URL download functionality

async function testPDFDownload(url) {
  console.log(`Testing PDF download from: ${url}`);
  
  try {
    const response = await fetch(url);
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('pdf')) {
      console.warn('Warning: Content-Type does not indicate PDF');
    }
    
    const blob = await response.blob();
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);
    
    // Extract filename from URL
    const fileName = url.split('/').pop()?.split('?')[0] || 'downloaded.pdf';
    console.log('Extracted filename:', fileName);
    
    console.log('✅ PDF download test successful!');
    return true;
    
  } catch (error) {
    console.error('❌ PDF download test failed:', error.message);
    return false;
  }
}

// Test URLs (replace with actual PDF URLs)
const testUrls = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  // Add more test URLs here
];

// Run tests
(async () => {
  console.log('Starting PDF URL download tests...\n');
  
  for (const url of testUrls) {
    await testPDFDownload(url);
    console.log('\n---\n');
  }
})();