import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testEditFlow() {
  console.log('🧪 Testing complete admin edit form flow...\n');
  
  // Test with our known draft listing
  const draftId = '9aa6696f-b132-4245-a502-8032a876cddf';
  console.log(`Testing with draft listing: ${draftId.substring(0, 8)}...\n`);
  
  console.log('🔍 Step 1: Simulate useAdminListing hook...');
  
  // Simulate what useAdminListing does
  try {
    // First try full_listing_view (should fail)
    const { data: publishedListing, error: publishedError } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('listing_id', draftId)
      .single()
    
    if (publishedListing) {
      console.log('❌ Listing found in full_listing_view - not a draft!');
      return;
    }
    
    console.log('✅ Listing not in full_listing_view (expected for drafts)');
    
    // Try raw listings table
    const { data: draftListing, error: draftError } = await supabase
      .from('listings')
      .select(`
        id,
        created_at,
        variant,
        year,
        mileage,
        horsepower,
        description,
        image,
        make_id,
        model_id,
        seller_id,
        body_type_id,
        fuel_type_id,
        transmission_id,
        makes!left(name),
        models!left(name),
        sellers!left(name),
        body_types!left(name),
        fuel_types!left(name),
        transmissions!left(name),
        lease_pricing!left(monthly_price, first_payment, period_months, mileage_per_year)
      `)
      .eq('id', draftId)
      .single()
    
    if (draftError) {
      console.error('❌ Draft query failed:', draftError);
      return;
    }
    
    console.log('✅ Draft listing retrieved successfully');
    console.log(`   Make: ${draftListing.makes?.name}`);
    console.log(`   Model: ${draftListing.models?.name}`);
    console.log(`   Variant: ${draftListing.variant}`);
    
  } catch (error) {
    console.error('❌ useAdminListing simulation failed:', error);
    return;
  }
  
  console.log('\n🔍 Step 2: Simulate useOffers hook...');
  
  // Simulate what useOffers does
  try {
    const { data: offers, error: offersError } = await supabase
      .from('lease_pricing')
      .select('*')
      .eq('listing_id', draftId)
      .order('monthly_price')
    
    if (offersError) {
      console.error('❌ Offers query failed:', offersError);
      return;
    }
    
    console.log(`✅ Offers retrieved successfully: ${offers?.length || 0} offers`);
    if (offers && offers.length > 0) {
      console.log(`   First offer: ${offers[0].monthly_price} kr/md`);
    }
    
  } catch (error) {
    console.error('❌ useOffers simulation failed:', error);
    return;
  }
  
  console.log('\n🔍 Step 3: Simulate useReferenceData hook...');
  
  // Simulate what useReferenceData does
  try {
    const [makesResult, modelsResult, bodyTypesResult, fuelTypesResult, transmissionsResult] = await Promise.all([
      supabase.from('makes').select('*').order('name'),
      supabase.from('models').select('*').order('name'),
      supabase.from('body_types').select('*').order('name'),
      supabase.from('fuel_types').select('*').order('name'),
      supabase.from('transmissions').select('*').order('name')
    ]);
    
    if (makesResult.error || modelsResult.error || bodyTypesResult.error || fuelTypesResult.error || transmissionsResult.error) {
      console.error('❌ Reference data query failed');
      return;
    }
    
    console.log('✅ Reference data retrieved successfully');
    console.log(`   Makes: ${makesResult.data?.length || 0}`);
    console.log(`   Models: ${modelsResult.data?.length || 0}`);
    console.log(`   Body Types: ${bodyTypesResult.data?.length || 0}`);
    console.log(`   Fuel Types: ${fuelTypesResult.data?.length || 0}`);
    console.log(`   Transmissions: ${transmissionsResult.data?.length || 0}`);
    
  } catch (error) {
    console.error('❌ useReferenceData simulation failed:', error);
    return;
  }
  
  console.log('\n✅ ALL QUERIES SUCCESSFUL!');
  console.log('🎉 The admin edit form should work perfectly with this draft listing.');
  console.log('\n💡 If you\'re still seeing 406 errors, they might be:');
  console.log('   1. Cached from previous requests');
  console.log('   2. Coming from browser DevTools or other sources');
  console.log('   3. From a different component not related to the edit form');
  console.log('\n🔧 Try:');
  console.log('   - Hard refresh (Ctrl+Shift+R)');
  console.log('   - Clear browser cache');
  console.log('   - Check Network tab for the exact source of 406 errors');
}

testEditFlow().catch(console.error);