import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testCombinedAdminQuery() {
  console.log('🧪 Testing combined admin query (published + drafts)...');
  
  // Step 1: Get published listings from full_listing_view
  console.log('\n1. Getting published listings...');
  const { data: publishedListings, error: publishedError } = await supabase
    .from('full_listing_view')
    .select(`
      listing_id,
      make, 
      model,
      variant,
      monthly_price,
      body_type,
      fuel_type,
      transmission,
      created_at,
      offer_count:lease_pricing(count)
    `)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (publishedError) {
    console.error('❌ Published query failed:', publishedError.message);
    return;
  }
  
  console.log(`✅ Found ${publishedListings.length} published listings`);
  
  // Step 2: Get draft listings not in view
  console.log('\n2. Getting draft listings...');
  const publishedIds = publishedListings.map(l => l.listing_id);
  
  let draftQuery = supabase
    .from('listings')
    .select(`
      id,
      created_at,
      variant,
      makes!left(name),
      models!left(name),
      sellers!left(name),
      body_types!left(name),
      fuel_types!left(name),
      transmissions!left(name),
      lease_pricing!left(monthly_price)
    `);
    
  if (publishedIds.length > 0) {
    draftQuery = draftQuery.not('id', 'in', `(${publishedIds.join(',')})`)
  }
  
  const { data: draftListings, error: draftError } = await draftQuery
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (draftError) {
    console.error('❌ Draft query failed:', draftError.message);
    return;
  }
  
  console.log(`✅ Found ${draftListings.length} draft listings`);
  
  // Step 3: Look for our specific listing
  const ourListingId = 'be20b113-a5aa-4ac0-bac8-24feb23306b6';
  
  const ourPublishedListing = publishedListings.find(l => l.listing_id === ourListingId);
  const ourDraftListing = draftListings.find(l => l.id === ourListingId);
  
  console.log('\n3. Checking for our specific listing...');
  
  if (ourPublishedListing) {
    console.log('🎉 Found our listing in PUBLISHED results:');
    console.log(`   Make: ${ourPublishedListing.make}`);
    console.log(`   Model: ${ourPublishedListing.model}`);
    console.log(`   Variant: ${ourPublishedListing.variant}`);
    console.log(`   Monthly Price: ${ourPublishedListing.monthly_price || 'NULL'}`);
    console.log(`   Status: PUBLISHED`);
  } else if (ourDraftListing) {
    console.log('🎉 Found our listing in DRAFT results:');
    console.log(`   Make: ${ourDraftListing.makes?.name || 'NULL'}`);
    console.log(`   Model: ${ourDraftListing.models?.name || 'NULL'}`);
    console.log(`   Variant: ${ourDraftListing.variant}`);
    console.log(`   Monthly Price: ${ourDraftListing.lease_pricing?.[0]?.monthly_price || 'NULL'}`);
    console.log(`   Status: DRAFT`);
  } else {
    console.log('❌ Our listing not found in either published or draft results');
  }
  
  // Step 4: Summary
  console.log('\n📊 Final Summary:');
  console.log(`   Published listings: ${publishedListings.length}`);
  console.log(`   Draft listings: ${draftListings.length}`);
  console.log(`   Total listings: ${publishedListings.length + draftListings.length}`);
  
  const draftCount = draftListings.length;
  if (draftCount > 0) {
    console.log(`   \n🚧 Draft listings found (will show in admin with badges):`);
    draftListings.slice(0, 5).forEach((draft, i) => {
      const missingFields = [];
      if (!draft.lease_pricing?.[0]?.monthly_price) missingFields.push('Price');
      if (!draft.body_types?.name) missingFields.push('Body');
      if (!draft.fuel_types?.name) missingFields.push('Fuel');
      if (!draft.transmissions?.name) missingFields.push('Trans');
      
      console.log(`     ${i+1}. ${draft.makes?.name || 'Unknown'} ${draft.models?.name || 'Unknown'} (missing: ${missingFields.join(', ')})`);
    });
  }
}

testCombinedAdminQuery().catch(console.error);