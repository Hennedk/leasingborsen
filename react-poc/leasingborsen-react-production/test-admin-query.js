import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testNewAdminQuery() {
  console.log('🧪 Testing new admin listings query...');
  
  // Test our updated admin query
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      id,
      created_at,
      variant,
      makes!inner(name),
      models!inner(name),
      sellers(name),
      body_types(name),
      fuel_types(name),
      transmissions(name),
      lease_pricing(monthly_price)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Query failed:', error.message);
    return;
  }
  
  console.log(`✅ Found ${listings.length} listings with new admin query`);
  
  const ourListingId = 'be20b113-a5aa-4ac0-bac8-24feb23306b6';
  const ourListing = listings.find(l => l.id === ourListingId);
  
  if (ourListing) {
    console.log('\n🎉 SUCCESS! Our listing now appears in admin query:');
    console.log(`  Make: ${ourListing.makes.name}`);
    console.log(`  Model: ${ourListing.models.name}`);
    console.log(`  Variant: ${ourListing.variant}`);
    console.log(`  Seller: ${ourListing.sellers?.name || 'NULL'}`);
    console.log(`  Body Type: ${ourListing.body_types?.name || 'NULL (DRAFT)'}`);
    console.log(`  Fuel Type: ${ourListing.fuel_types?.name || 'NULL (DRAFT)'}`);
    console.log(`  Transmission: ${ourListing.transmissions?.name || 'NULL (DRAFT)'}`);
    console.log(`  Pricing Records: ${ourListing.lease_pricing?.length || 0}`);
    
    // Simulate draft detection
    const missingFields = [];
    if (!ourListing.lease_pricing?.[0]?.monthly_price) missingFields.push('Månedspris');
    if (!ourListing.body_types?.name) missingFields.push('Biltype');
    if (!ourListing.fuel_types?.name) missingFields.push('Brændstof');
    if (!ourListing.transmissions?.name) missingFields.push('Gearkasse');
    
    console.log(`\n📋 Draft Status: ${missingFields.length > 0 ? 'YES' : 'NO'}`);
    console.log(`📋 Missing Fields: ${missingFields.join(', ') || 'None'}`);
  } else {
    console.log('\n❌ Our listing still not found in admin query');
    console.log('\nRecent listings:');
    listings.forEach((l, i) => {
      console.log(`  ${i+1}. ${l.id} - ${l.makes.name} ${l.models.name} (${l.created_at.substring(0, 10)})`);
    });
  }
}

testNewAdminQuery().catch(console.error);