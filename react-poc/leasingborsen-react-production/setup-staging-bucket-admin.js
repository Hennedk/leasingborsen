import fetch from 'node-fetch';

// Staging project details
const PROJECT_REF = 'lpbtgtpgbnybjqcpsrrf';
const STAGING_URL = `https://${PROJECT_REF}.supabase.co`;

// You need to get these from Supabase dashboard
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SERVICE_ROLE_KEY = process.env.STAGING_SERVICE_ROLE_KEY;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN environment variable not set');
  console.log('\nTo get your access token:');
  console.log('1. Go to https://app.supabase.com/account/tokens');
  console.log('2. Generate a new access token');
  console.log('3. Run: SUPABASE_ACCESS_TOKEN="your-token" STAGING_SERVICE_ROLE_KEY="your-service-key" node setup-staging-bucket-admin.js');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ STAGING_SERVICE_ROLE_KEY environment variable not set');
  console.log('\nTo get the service role key:');
  console.log('1. Go to https://app.supabase.com');
  console.log('2. Select the staging project');
  console.log('3. Go to Settings > API');
  console.log('4. Copy the service_role key');
  process.exit(1);
}

async function createStorageBucket() {
  try {
    console.log('🚀 Setting up images storage bucket in staging environment...\n');

    // First, check if bucket exists using the Storage API
    console.log('Checking existing buckets...');
    const listResponse = await fetch(`${STAGING_URL}/storage/v1/bucket`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('Failed to list buckets:', error);
      return;
    }

    const buckets = await listResponse.json();
    const bucketExists = buckets.some(b => b.id === 'images');

    if (bucketExists) {
      console.log('✅ Images bucket already exists!');
      return;
    }

    // Create the bucket
    console.log('Creating images bucket...');
    const createResponse = await fetch(`${STAGING_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: 'images',
        name: 'images',
        public: true,
        file_size_limit: 52428800, // 50MB
        allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Failed to create bucket:', error);
      return;
    }

    const createdBucket = await createResponse.json();
    console.log('✅ Images bucket created successfully!');
    console.log('Bucket details:', createdBucket);

    // Create RLS policies using SQL
    console.log('\nCreating RLS policies...');
    const policySQL = `
      -- Allow authenticated users to upload
      CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'images');

      -- Allow public to view images
      CREATE POLICY "Allow public to view images" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'images');

      -- Allow authenticated users to update their own images
      CREATE POLICY "Allow authenticated users to update images" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'images');

      -- Allow authenticated users to delete their own images
      CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'images');
    `;

    // Execute SQL to create policies
    const sqlResponse = await fetch(`${STAGING_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: policySQL })
    });

    if (sqlResponse.ok) {
      console.log('✅ RLS policies created successfully!');
    } else {
      console.log('⚠️  Could not create RLS policies automatically. Please run the SQL in setup-staging-storage.sql manually.');
    }

    // Test the bucket
    console.log('\nTesting bucket access...');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'Test file for bucket verification';
    
    const uploadResponse = await fetch(`${STAGING_URL}/storage/v1/object/images/${testFileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'text/plain'
      },
      body: testContent
    });

    if (uploadResponse.ok) {
      console.log('✅ Test upload successful!');
      
      // Clean up test file
      await fetch(`${STAGING_URL}/storage/v1/object/images/${testFileName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY
        }
      });
      console.log('✅ Test file cleaned up');
    } else {
      const error = await uploadResponse.text();
      console.error('Test upload failed:', error);
    }

    console.log('\n🎉 Staging storage bucket setup complete!');
    console.log('\nYou can now:');
    console.log('1. Test background removal in staging environment');
    console.log('2. Deploy the auto-crop Edge Function to staging');
    console.log('3. Use staging for safe testing');

  } catch (error) {
    console.error('Error setting up bucket:', error);
  }
}

createStorageBucket();