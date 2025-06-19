import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function debugVWDrafts() {
  console.log('🧪 Testing VW batch listing pickup in admin...');
  
  const vwListingIds = [
    'be20b113-a5aa-4ac0-bac8-24feb23306b6',
    'c88ff248-de7d-4384-b012-a642c1d8f43d', 
    '91c2b15f-0fad-4471-ba05-234b83e69bba',
    '1d945f67-0004-460d-b971-99b61ad73b23',
    '732963a6-93e8-484a-a0cf-d98a8676dbfe'
  ];
  
  // Step 1: Get published IDs
  const { data: publishedIds } = await supabase
    .from('full_listing_view')
    .select('listing_id');
    
  const publishedIdList = publishedIds?.map(l => l.listing_id) || [];
  console.log(`Published listings: ${publishedIdList.length}`);
  
  // Step 2: Test our exact draft query from the hook
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
    
  if (publishedIdList.length > 0) {
    draftQuery = draftQuery.not('id', 'in', `(${publishedIdList.join(',')})`);
  }
  
  const { data: draftListings, error } = await draftQuery
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (error) {
    console.error('❌ Draft query failed:', error.message);
    return;
  }
  
  console.log(`Draft listings found: ${draftListings?.length || 0}`);
  
  // Step 3: Look for our VW listings
  const foundVW = draftListings?.filter(d => vwListingIds.includes(d.id)) || [];
  
  console.log(`\n🎯 VW batch listings in drafts: ${foundVW.length}/5`);
  
  foundVW.forEach((listing, i) => {
    console.log(`  ${i+1}. ${listing.id.substring(0, 8)}... - ${listing.makes?.name} ${listing.models?.name} ${listing.variant}`);
    console.log(`     Seller: ${listing.sellers?.name || 'None'}`);
    console.log(`     Pricing: ${listing.lease_pricing?.length || 0} records`);
    console.log(`     Created: ${listing.created_at.substring(0, 16)}`);
  });
  
  // Step 4: Check why missing listings aren't found
  if (foundVW.length < 5) {
    const missingIds = vwListingIds.filter(id => !foundVW.find(f => f.id === id));
    console.log(`\n⚠️  Missing VW listings: ${missingIds.length}`);
    
    for (const missingId of missingIds) {
      // Check if it exists in raw listings
      const { data: rawListing } = await supabase
        .from('listings')
        .select('id, created_at, makes(name), models(name)')
        .eq('id', missingId)
        .single();
        
      if (rawListing) {
        console.log(`   ${missingId.substring(0, 8)}... exists in raw listings but not in draft query`);
        
        // Check if it's in published list (it shouldn't be)
        if (publishedIdList.includes(missingId)) {
          console.log(`     -> Found in published list (unexpected!)`);
        }
      } else {
        console.log(`   ${missingId.substring(0, 8)}... does not exist in listings table`);
      }
    }
  }
  
  console.log(`\nAdmin should show: ${publishedIdList.length} published + ${draftListings?.length || 0} drafts = ${publishedIdList.length + (draftListings?.length || 0)} total`);
}

debugVWDrafts().catch(console.error);