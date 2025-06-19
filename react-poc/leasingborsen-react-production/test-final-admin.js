import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testCompleteAdminQuery() {
  console.log('🧪 Testing complete admin query flow...');
  
  try {
    // Step 1: Get listings from full_listing_view
    const { data: listings, error } = await supabase
      .from('full_listing_view')
      .select(`
        *,
        offer_count:lease_pricing(count)
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    // Transform the data to include admin metadata for draft detection
    const transformedListings = listings?.map(listing => {
      // Determine draft status based on missing required fields
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

    console.log(`✅ Step 1: Found ${transformedListings.length} listings from full_listing_view`);
    
    // Step 2: Get additional draft listings
    const existingIds = transformedListings.map(l => l.listing_id)
    let draftQuery = supabase
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
        transmissions!left(name)
      `)
      
    // Only apply the filter if there are existing IDs
    if (existingIds.length > 0) {
      draftQuery = draftQuery.not('id', 'in', `(${existingIds.join(',')})`)
    }
    
    const { data: draftListings, error: draftError } = await draftQuery
      .order('created_at', { ascending: false })
      .limit(100)

    if (!draftError && draftListings) {
      // Add draft listings that aren't in full_listing_view
      const additionalDrafts = draftListings.map(listing => {
        const missingFields = ['Månedspris', 'Biltype', 'Brændstof', 'Gearkasse']
        
        return {
          listing_id: listing.id,
          make: listing.makes?.name || 'Ukendt',
          model: listing.models?.name || 'Ukendt',
          variant: listing.variant,
          year: null,
          monthly_price: null,
          body_type: listing.body_types?.name || null,
          fuel_type: listing.fuel_types?.name || null,
          transmission: listing.transmissions?.name || null,
          seller_name: listing.sellers?.name || null,
          created_at: listing.created_at,
          updated_at: listing.updated_at,
          offer_count: 0,
          is_draft: true,
          missing_fields: missingFields.filter(field => {
            switch(field) {
              case 'Biltype': return !listing.body_types?.name
              case 'Brændstof': return !listing.fuel_types?.name
              case 'Gearkasse': return !listing.transmissions?.name
              default: return true
            }
          })
        }
      })

      console.log(`✅ Step 2: Found ${additionalDrafts.length} additional draft listings`);

      // Merge and sort by creation date
      const allListings = [...transformedListings, ...additionalDrafts]
      allListings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      console.log(`✅ Step 3: Total listings after merge: ${allListings.length}`);
      
      // Check for our specific listing
      const ourListingId = 'be20b113-a5aa-4ac0-bac8-24feb23306b6';
      const ourListing = allListings.find(l => l.listing_id === ourListingId);
      
      if (ourListing) {
        console.log('\n🎉 SUCCESS! Our listing found in final admin results:');
        console.log(`  Make: ${ourListing.make}`);
        console.log(`  Model: ${ourListing.model}`);
        console.log(`  Variant: ${ourListing.variant}`);
        console.log(`  Is Draft: ${ourListing.is_draft}`);
        console.log(`  Missing Fields: ${ourListing.missing_fields.join(', ')}`);
        console.log(`  Offer Count: ${ourListing.offer_count}`);
      } else {
        console.log('\n❌ Our listing still not found in final results');
      }
      
      // Show draft statistics
      const draftCount = allListings.filter(l => l.is_draft).length;
      const publishedCount = allListings.length - draftCount;
      
      console.log(`\n📊 Final Statistics:`);
      console.log(`  Total listings: ${allListings.length}`);
      console.log(`  Published: ${publishedCount}`);
      console.log(`  Drafts: ${draftCount}`);
      
      return allListings;
    }

    return transformedListings;
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
}

testCompleteAdminQuery().catch(console.error);