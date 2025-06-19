import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testCompleteAdmin() {
  console.log('🧪 Testing complete admin hook with VW listings...');

  // Step 1: Published listings from full_listing_view
  const { data: listings, error } = await supabase
    .from('full_listing_view')
    .select(`
      *,
      offer_count:lease_pricing(count)
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('❌ Published query failed:', error.message);
    return;
  }

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

  console.log(`✅ Published listings: ${transformedListings.length}`);

  // Step 2: Additional drafts not in view
  const existingIds = transformedListings.map(l => l.listing_id)
  
  const { data: additionalDrafts } = await supabase
    .from('listings')
    .select(`
      id,
      created_at,
      updated_at,
      variant,
      makes!left(name),
      models!left(name),
      sellers!left(name),
      body_types!left(name),
      fuel_types!left(name),
      transmissions!left(name),
      lease_pricing!left(monthly_price, first_payment, period_months, mileage_per_year)
    `)
    .not('id', 'in', existingIds.length > 0 ? `(${existingIds.join(',')})` : '()')
    .order('created_at', { ascending: false })
    .limit(50)

  console.log(`✅ Additional drafts: ${additionalDrafts?.length || 0}`);

  if (additionalDrafts && additionalDrafts.length > 0) {
    const transformedAdditionalDrafts = additionalDrafts.map(listing => {
      const firstPricing = listing.lease_pricing?.[0]
      const missingFields = []
      
      if (!firstPricing?.monthly_price) missingFields.push('Månedspris')
      if (!listing.body_types?.name) missingFields.push('Biltype')
      if (!listing.fuel_types?.name) missingFields.push('Brændstof')
      if (!listing.transmissions?.name) missingFields.push('Gearkasse')
      
      return {
        listing_id: listing.id,
        make: listing.makes?.name || 'Ukendt',
        model: listing.models?.name || 'Ukendt',
        variant: listing.variant,
        year: null,
        monthly_price: firstPricing?.monthly_price || null,
        body_type: listing.body_types?.name || null,
        fuel_type: listing.fuel_types?.name || null,
        transmission: listing.transmissions?.name || null,
        seller_name: listing.sellers?.name || null,
        created_at: listing.created_at,
        offer_count: listing.lease_pricing?.length || 0,
        is_draft: true,
        missing_fields: missingFields
      }
    })

    // Merge and sort
    const allListings = [...transformedListings, ...transformedAdditionalDrafts]
    allListings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log(`\n📊 Final Results:`);
    console.log(`   Published: ${transformedListings.length}`);
    console.log(`   Additional drafts: ${transformedAdditionalDrafts.length}`);
    console.log(`   Total: ${allListings.length}`);

    // Look for our VW listings
    const vwListings = allListings.filter(l => l.make === 'Volkswagen' && l.created_at.startsWith('2025-06-19'));
    console.log(`\n🚗 VW batch listings found: ${vwListings.length}`);
    
    vwListings.forEach((vw, i) => {
      console.log(`   ${i+1}. ${vw.model} ${vw.variant} (${vw.seller_name || 'No seller'})`);
      console.log(`      Missing: ${vw.missing_fields.join(', ') || 'None'}`);
      console.log(`      Pricing: ${vw.monthly_price ? vw.monthly_price + ' kr/md' : 'None'}`);
      console.log(`      Offers: ${vw.offer_count}`);
    });

    return allListings;
  }

  return transformedListings;
}

testCompleteAdmin().catch(console.error);