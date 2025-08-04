import { createClient } from '@supabase/supabase-js';

// Note: This requires the service role key to create buckets
// You'll need to get this from the Supabase dashboard under Settings > API
const STAGING_URL = 'https://lpbtgtpgbnybjqcpsrrf.supabase.co';
const SERVICE_ROLE_KEY = process.env.STAGING_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ STAGING_SERVICE_ROLE_KEY environment variable not set');
  console.log('\nTo get the service role key:');
  console.log('1. Go to https://app.supabase.com');
  console.log('2. Select the staging project (lpbtgtpgbnybjqcpsrrf)');
  console.log('3. Go to Settings > API');
  console.log('4. Copy the "service_role" key (keep it secret!)');
  console.log('5. Run: STAGING_SERVICE_ROLE_KEY="your-key" node create-staging-bucket.js');
  process.exit(1);
}

const supabase = createClient(STAGING_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createImagesBucket() {
  try {
    console.log('Creating images bucket in staging...\n');
    
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
    const bucketExists = existingBuckets?.some(b => b.name === 'images');
    
    if (bucketExists) {
      console.log('✅ Images bucket already exists!');
      return;
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('images', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (error) {
      console.error('Error creating bucket:', error);
      return;
    }
    
    console.log('✅ Images bucket created successfully!');
    console.log('Bucket details:', data);
    
    // Test the bucket
    console.log('\nTesting bucket access...');
    const testFileName = `test-${Date.now()}.txt`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(testFileName, new Blob(['test']), {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('Test upload failed:', uploadError);
    } else {
      console.log('✅ Test upload successful!');
      
      // Clean up test file
      await supabase.storage.from('images').remove([testFileName]);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

createImagesBucket();