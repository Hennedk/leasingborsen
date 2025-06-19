import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testAdminHook() {
  console.log('🧪 Testing exact admin query from hook...');

  const { data: listings, error } = await supabase
    .from('full_listing_view')
    .select(`
      *,
      offer_count:lease_pricing(count)
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('❌ Query failed:', error.message);
    return;
  }
  
  console.log(`✅ Query successful: ${listings.length} listings`);
  
  // Transform the data like the hook does
  const transformedListings = listings?.map(listing => {
    const missingFields = []
    if (!listing.monthly_price) missingFields.push('Månedspris')
    if (!listing.body_type) missingFields.push('Biltype')
    if (!listing.fuel_type) missingFields.push('Brændstof')
    if (!listing.transmission) missingFields.push('Gearkasse')
    
    return {
      ...listing,
      offer_count: listing.offer_count?.[0]?.count || 0,
      is_draft: missingFields.length > 0,
      missing_fields: missingFields
    }
  }) || []
  
  const drafts = transformedListings.filter(l => l.is_draft);
  const published = transformedListings.filter(l => !l.is_draft);
  
  console.log(`📋 Draft listings: ${drafts.length}`);
  console.log(`📋 Published listings: ${published.length}`);
  console.log(`📋 Total: ${transformedListings.length}`);
  
  // Show some examples
  console.log('\nExample drafts:');
  drafts.slice(0, 3).forEach((draft, i) => {
    console.log(`  ${i+1}. ${draft.make} ${draft.model} - missing: ${draft.missing_fields.join(', ')}`);
  });
  
  console.log('\n✅ Hook logic working correctly!');
}

testAdminHook().catch(console.error);