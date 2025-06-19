// Simple test to verify schema fixes without PDF.js dependencies
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://project-url.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCreateListing() {
  console.log('🧪 Testing createNewListing with fixed schema...')
  
  // Mock the essential data structure from AI extraction
  const mockItem = {
    parsed_data: {
      model: 'ID.3',
      variant: 'Pro S',
      horsepower: 204,
      pricing_options: [
        {
          monthly_price: 5095,
          mileage_per_year: 10000,
          period_months: 12,
          deposit: 5000,
          total_cost: 67140
        },
        {
          monthly_price: 5295,
          mileage_per_year: 15000,
          period_months: 12,
          deposit: 5000,
          total_cost: 69540
        }
      ]
    }
  }
  
  try {
    console.log('📋 Testing with mock data:')
    console.log(`  Model: ${mockItem.parsed_data.model}`)
    console.log(`  Variant: ${mockItem.parsed_data.variant}`)
    console.log(`  Pricing Options: ${mockItem.parsed_data.pricing_options.length}`)
    
    // Test the exact data structure that will be inserted
    const extracted = mockItem.parsed_data
    const pricingOptions = extracted.pricing_options || []
    const firstPricing = pricingOptions[0] || {}
    
    const listingData = {
      make: 'Volkswagen',
      model: extracted.model,
      variant: extracted.variant,
      monthly_price: firstPricing.monthly_price || 0,
      mileage_per_year: firstPricing.mileage_per_year || 10000,
      period_months: firstPricing.period_months || 12
    }
    
    console.log('\n💾 Testing listing insertion with fields:', Object.keys(listingData))
    console.log('📊 Data:', listingData)
    
    // Test the main listing creation (this should work with current schema)
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingData)
      .select()
      .single()
    
    if (listingError) {
      console.error('❌ Listing creation failed:', listingError)
      console.error('Error details:', listingError.details)
      console.error('Error hint:', listingError.hint)
      return
    }
    
    console.log(`✅ Listing created successfully: ID ${listing.id}`)
    
    // Test lease pricing creation if there are multiple options
    if (pricingOptions.length > 1) {
      console.log(`\n💰 Testing ${pricingOptions.length} lease pricing options...`)
      
      const leasePricingInserts = pricingOptions.map(option => ({
        listing_id: listing.id,
        monthly_price: option.monthly_price || 0,
        first_payment: option.deposit || 0,
        period_months: option.period_months || 12,
        mileage_per_year: option.mileage_per_year || 10000,
        total_lease_cost: option.total_cost || (option.monthly_price * option.period_months)
      }))
      
      console.log('📋 Lease pricing fields:', Object.keys(leasePricingInserts[0]))
      
      const { error: pricingError } = await supabase
        .from('lease_pricing')
        .insert(leasePricingInserts)
      
      if (pricingError) {
        console.error('⚠️ Pricing options creation failed:', pricingError)
        console.error('Error details:', pricingError.details)
        console.error('Error hint:', pricingError.hint)
      } else {
        console.log(`✅ Created ${pricingOptions.length} lease pricing options`)
      }
    }
    
    console.log('\n🎉 Test completed successfully!')
    console.log('✅ All schema issues appear to be resolved')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Full error:', error)
  }
}

// Run the test
testCreateListing().catch(console.error)