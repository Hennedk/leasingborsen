import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function debugAdditionalDrafts() {
  console.log('🔍 Debugging additional drafts query...');

  // Get published IDs
  const { data: publishedListings } = await supabase
    .from('full_listing_view')
    .select('listing_id');

  const existingIds = publishedListings?.map(l => l.listing_id) || []
  console.log(`Published listings: ${existingIds.length}`);
  console.log(`First few IDs: ${existingIds.slice(0, 3).join(', ')}`);

  // Test the filter differently - first get all listings count
  const { data: allListings } = await supabase
    .from('listings')
    .select('id')
    .order('created_at', { ascending: false });

  console.log(`Total listings in table: ${allListings?.length || 0}`);

  // Test our VW listings specifically
  const vwIds = [
    'be20b113-a5aa-4ac0-bac8-24feb23306b6',
    'c88ff248-de7d-4384-b012-a642c1d8f43d', 
    '91c2b15f-0fad-4471-ba05-234b83e69bba',
    '1d945f67-0004-460d-b971-99b61ad73b23',
    '732963a6-93e8-484a-a0cf-d98a8676dbfe'
  ];

  // Check if VW listings are in published list
  const vwInPublished = vwIds.filter(id => existingIds.includes(id));
  console.log(`VW listings in published: ${vwInPublished.length}`);
  console.log(`VW listings NOT in published: ${vwIds.length - vwInPublished.length}`);

  // Try a simpler query first - just count listings not in the view
  const { data: notInView, error: countError } = await supabase
    .from('listings')
    .select('id, created_at')
    .not('id', 'in', `(${existingIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (countError) {
    console.error('❌ Count query failed:', countError.message);
    
    // Try without the filter to see if query works
    console.log('\\nTrying without filter...');
    const { data: allResults } = await supabase
      .from('listings')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log(`All listings query: ${allResults?.length || 0} results`);
    
  } else {
    console.log(`✅ Listings not in view: ${notInView?.length || 0}`);
    notInView?.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.id.substring(0, 8)}... (${item.created_at.substring(0, 10)})`);
    });
    
    // Check if our VW listings are in this result
    const vwFound = notInView?.filter(item => vwIds.includes(item.id)) || [];
    console.log(`\\n🚗 VW listings in not-in-view results: ${vwFound.length}`);
  }
}

debugAdditionalDrafts().catch(console.error);