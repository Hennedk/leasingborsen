import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testBasicQuery() {
  console.log('🧪 Testing basic admin query...');
  
  const { data: listings, error } = await supabase
    .from('full_listing_view')
    .select(`
      listing_id,
      make, 
      model,
      monthly_price,
      body_type,
      fuel_type,
      transmission,
      offer_count:lease_pricing(count)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Query failed:', error.message);
    return;
  }
  
  console.log(`✅ Found ${listings.length} listings`);
  
  // Check draft detection logic
  listings.forEach((listing, i) => {
    const missingFields = [];
    if (!listing.monthly_price) missingFields.push('Månedspris');
    if (!listing.body_type) missingFields.push('Biltype');
    if (!listing.fuel_type) missingFields.push('Brændstof');
    if (!listing.transmission) missingFields.push('Gearkasse');
    
    const isDraft = missingFields.length > 0;
    const offerCount = listing.offer_count?.[0]?.count || 0;
    console.log(`  ${i+1}. ${listing.make} ${listing.model} - ${isDraft ? 'DRAFT' : 'PUBLISHED'} (${missingFields.join(', ') || 'complete'}) - ${offerCount} offers`);
  });
  
  console.log('\n✅ Basic admin query working correctly!');
}

testBasicQuery().catch(console.error);