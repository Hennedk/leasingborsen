import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hqqouszbgskteivjoems.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'
);

async function testUpdatedHook() {
  console.log('🧪 Testing updated admin hook...');

  // Get published listings
  const { data: listings } = await supabase
    .from('full_listing_view')
    .select('listing_id, make, model, monthly_price, body_type, fuel_type, transmission')
    .order('created_at', { ascending: false })
    .limit(1000);

  const existingIds = listings?.map(l => l.listing_id) || []
  console.log(`Published: ${existingIds.length}`);

  // Test the additional drafts query
  const { data: additionalDrafts, error: draftError } = await supabase
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
      lease_pricing!left(monthly_price, first_payment, period_months, mileage_per_year)
    `)
    .not('id', 'in', `(${existingIds.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (draftError) {
    console.error('❌ Additional drafts query failed:', draftError.message);
    return;
  }

  console.log(`✅ Additional drafts: ${additionalDrafts?.length || 0}`);

  if (additionalDrafts && additionalDrafts.length > 0) {
    console.log('\\nAdditional draft listings:');
    additionalDrafts.forEach((draft, i) => {
      const firstPricing = draft.lease_pricing?.[0]
      console.log(`  ${i+1}. ${draft.makes?.name} ${draft.models?.name} ${draft.variant}`);
      console.log(`     Seller: ${draft.sellers?.name || 'None'}`);
      console.log(`     Price: ${firstPricing?.monthly_price || 'None'} kr/md`);
      console.log(`     Offers: ${draft.lease_pricing?.length || 0}`);
      console.log(`     Created: ${draft.created_at.substring(0, 16)}`);
    });

    console.log(`\\n📊 Total listings in admin: ${existingIds.length} + ${additionalDrafts.length} = ${existingIds.length + additionalDrafts.length}`);
  }
}

testUpdatedHook().catch(console.error);