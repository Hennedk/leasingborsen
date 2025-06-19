import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqqouszbgskteivjoems.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminListings() {
  console.log('🔍 Checking admin listings view...');
  
  const ourListingId = 'be20b113-a5aa-4ac0-bac8-24feb23306b6';
  
  // First check raw listings table
  console.log('\n1. Checking raw listings table...');
  const { data: rawListing, error: rawError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', ourListingId)
    .single();
    
  if (rawError) {
    console.error('❌ Raw listing query failed:', rawError.message);
  } else if (rawListing) {
    console.log(`✅ Found in raw listings table:`);
    console.log(`  ID: ${rawListing.id}`);
    console.log(`  Make ID: ${rawListing.make_id}`);
    console.log(`  Model ID: ${rawListing.model_id}`);
    console.log(`  Variant: ${rawListing.variant || 'NULL'}`);
    console.log(`  Seller ID: ${rawListing.seller_id || 'NULL'}`);
    console.log(`  Created: ${rawListing.created_at}`);
  } else {
    console.log('❌ Not found in raw listings table');
  }
  
  // Then check full_listing_view (without .single() to see all matches)
  console.log('\n2. Checking full_listing_view...');
  const { data: viewListings, error: viewError } = await supabase
    .from('full_listing_view')
    .select('*')
    .eq('listing_id', ourListingId);
    
  if (viewError) {
    console.error('❌ View listing query failed:', viewError.message);
  } else if (viewListings && viewListings.length > 0) {
    console.log(`✅ Found ${viewListings.length} row(s) in full_listing_view:`);
    viewListings.forEach((listing, i) => {
      console.log(`  Row ${i+1}:`);
      console.log(`    ID: ${listing.listing_id}`);
      console.log(`    Make: ${listing.make || 'NULL'}`);
      console.log(`    Model: ${listing.model || 'NULL'}`);
      console.log(`    Variant: ${listing.variant || 'NULL'}`);
      console.log(`    Seller: ${listing.seller_name || 'NULL'}`);
      console.log(`    Monthly Price: ${listing.monthly_price || 'NULL'}`);
    });
  } else {
    console.log('❌ Not found in full_listing_view');
    
    // Let's check why it might not be showing up
    console.log('\n   Diagnosing missing seller_id issue...');
    
    // Check if there are any sellers in the database
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, name')
      .limit(5);
      
    if (sellersError) {
      console.log('   ❌ Cannot check sellers:', sellersError.message);
    } else {
      console.log(`   📋 Available sellers in database: ${sellers?.length || 0}`);
      sellers?.forEach(s => console.log(`     - ${s.id}: ${s.name}`));
    }
  }
  
  // Finally, get recent listings for comparison
  console.log('\n3. Getting recent listings from full_listing_view...');
  const { data: listings, error } = await supabase
    .from('full_listing_view')
    .select(`
      listing_id, make, model, created_at,
      offer_count:lease_pricing(count)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Recent listings query failed:', error.message);
    return;
  }
  
  console.log(`✅ Found ${listings.length} recent listings in admin view`);
  
  const ourListing = listings.find(l => l.listing_id === ourListingId);
  
  if (ourListing) {
    console.log('\n🎉 FOUND our listing in recent listings!');
  } else {
    console.log('\n❌ Our listing NOT in recent 10 listings');
    console.log('\nRecent listings:');
    listings.forEach((listing, i) => {
      console.log(`  ${i+1}. ${listing.listing_id} - ${listing.make} ${listing.model} (${listing.created_at.substring(0, 10)})`);
    });
  }
}

checkAdminListings().catch(console.error);