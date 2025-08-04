import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://lpbtgtpgbnybjqcpsrrf.supabase.co';
const STAGING_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwYnRndHBnYm55YmpxY3BzcnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODU5NDEsImV4cCI6MjA2OTM2MTk0MX0.hQvjGKDJjkz0RocvMtER5aehYKkbmu1gAzPcQ1NAHng';

const supabase = createClient(STAGING_URL, STAGING_ANON_KEY);

async function checkBuckets() {
  try {
    console.log('Checking storage buckets in staging...\n');
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('❌ No storage buckets found in staging!');
      console.log('\nThe "images" bucket needs to be created for background removal to work.');
    } else {
      console.log('Found buckets:');
      buckets.forEach(bucket => {
        console.log(`- ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkBuckets();