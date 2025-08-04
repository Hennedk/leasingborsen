import { createClient } from '@supabase/supabase-js';

// Staging environment
const STAGING_URL = 'https://lpbtgtpgbnybjqcpsrrf.supabase.co';
const STAGING_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwYnRndHBnYm55YmpxY3BzcnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODU5NDEsImV4cCI6MjA2OTM2MTk0MX0.hQvjGKDJjkz0RocvMtER5aehYKkbmu1gAzPcQ1NAHng';

console.log('🚀 Setting up images storage bucket in staging environment');
console.log('=========================================================\n');

console.log('Since we need service role permissions to create buckets,');
console.log('here are your options:\n');

console.log('Option 1: Run SQL in Supabase Dashboard');
console.log('----------------------------------------');
console.log('1. Open: https://app.supabase.com/project/lpbtgtpgbnybjqcpsrrf/sql/new');
console.log('2. Copy and run the SQL from: setup-staging-storage-complete.sql\n');

console.log('Option 2: Use Supabase Management API');
console.log('-------------------------------------');
console.log('You need a personal access token from: https://app.supabase.com/account/tokens');
console.log('Then run: SUPABASE_ACCESS_TOKEN="your-token" node setup-staging-bucket-admin.js\n');

console.log('Option 3: Quick Manual Setup');
console.log('---------------------------');
console.log('1. Go to: https://app.supabase.com/project/lpbtgtpgbnybjqcpsrrf/storage/buckets');
console.log('2. Click "New bucket"');
console.log('3. Configure:');
console.log('   - Name: images');
console.log('   - Public: Yes (toggle on)');
console.log('   - File size limit: 50 MB');
console.log('   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif');
console.log('4. Click "Save"\n');

// Let's at least verify the current state
async function checkCurrentState() {
  const supabase = createClient(STAGING_URL, STAGING_ANON_KEY);
  
  console.log('📊 Checking current staging environment state...\n');
  
  // Try to list buckets (might fail without proper permissions)
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.log('❌ Cannot list buckets with anon key (expected)');
    console.log('   You need to use one of the options above.\n');
  } else if (buckets && buckets.length > 0) {
    console.log('✅ Found existing buckets:');
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    if (buckets.some(b => b.name === 'images')) {
      console.log('\n🎉 Good news! The images bucket already exists!');
      console.log('   You can now test the auto-crop feature.');
      return true;
    }
  } else {
    console.log('❌ No buckets found in staging');
  }
  
  // Quick test to see if images bucket exists by trying to list files
  console.log('\n🔍 Testing if images bucket exists...');
  const { data: files, error: listError } = await supabase.storage
    .from('images')
    .list('', { limit: 1 });
  
  if (!listError) {
    console.log('✅ Images bucket exists and is accessible!');
    console.log('   You can now test the auto-crop feature.');
    return true;
  } else {
    console.log('❌ Images bucket not found or not accessible');
    console.log('   Please create it using one of the options above.');
    return false;
  }
}

// Run the check
checkCurrentState().then(exists => {
  if (exists) {
    console.log('\n🎯 Next steps:');
    console.log('1. Deploy the updated remove-bg function to staging:');
    console.log('   supabase functions deploy remove-bg --project-ref lpbtgtpgbnybjqcpsrrf');
    console.log('2. Test with: node test-remove-bg.js test-car.jpg');
  }
});