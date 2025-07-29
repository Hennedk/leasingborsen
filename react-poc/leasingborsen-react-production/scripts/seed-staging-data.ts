#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load staging environment variables
dotenv.config({ path: join(__dirname, '..', '.env.staging') })

const STAGING_URL = process.env.VITE_SUPABASE_URL
const STAGING_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!STAGING_URL || !STAGING_ANON_KEY) {
  console.error('❌ Missing staging credentials. Please run npm run staging:setup first.')
  process.exit(1)
}

const supabase = createClient(STAGING_URL, STAGING_ANON_KEY)

console.log('🌱 Seeding Staging Database')
console.log('===========================')
console.log(`URL: ${STAGING_URL}`)

async function seedReferenceData() {
  console.log('\n📝 Seeding reference data...')

  // Seed makes
  const makes = [
    { name: 'Volkswagen' },
    { name: 'Toyota' },
    { name: 'Ford' },
    { name: 'BMW' },
    { name: 'Mercedes-Benz' },
    { name: 'Audi' },
    { name: 'Volvo' },
    { name: 'Tesla' }
  ]

  const { data: insertedMakes, error: makesError } = await supabase
    .from('makes')
    .insert(makes)
    .select()

  if (makesError) {
    console.error('❌ Error seeding makes:', makesError)
    return
  }
  console.log(`✅ Seeded ${insertedMakes?.length || 0} makes`)

  // Seed models for each make
  const models = [
    // Volkswagen
    { make_id: insertedMakes?.find(m => m.name === 'Volkswagen')?.id, name: 'Golf' },
    { make_id: insertedMakes?.find(m => m.name === 'Volkswagen')?.id, name: 'Passat' },
    { make_id: insertedMakes?.find(m => m.name === 'Volkswagen')?.id, name: 'Tiguan' },
    { make_id: insertedMakes?.find(m => m.name === 'Volkswagen')?.id, name: 'ID.4' },
    // Toyota
    { make_id: insertedMakes?.find(m => m.name === 'Toyota')?.id, name: 'Corolla' },
    { make_id: insertedMakes?.find(m => m.name === 'Toyota')?.id, name: 'RAV4' },
    { make_id: insertedMakes?.find(m => m.name === 'Toyota')?.id, name: 'Camry' },
    // BMW
    { make_id: insertedMakes?.find(m => m.name === 'BMW')?.id, name: '3 Series' },
    { make_id: insertedMakes?.find(m => m.name === 'BMW')?.id, name: 'X3' },
    { make_id: insertedMakes?.find(m => m.name === 'BMW')?.id, name: 'iX' }
  ].filter(m => m.make_id)

  const { data: insertedModels, error: modelsError } = await supabase
    .from('models')
    .insert(models)
    .select()

  if (modelsError) {
    console.error('❌ Error seeding models:', modelsError)
  } else {
    console.log(`✅ Seeded ${insertedModels?.length || 0} models`)
  }

  // Seed body types
  const bodyTypes = [
    { name: 'Sedan' },
    { name: 'SUV' },
    { name: 'Hatchback' },
    { name: 'Station Wagon' },
    { name: 'Coupe' },
    { name: 'Convertible' }
  ]

  const { error: bodyTypesError } = await supabase
    .from('body_types')
    .insert(bodyTypes)

  if (bodyTypesError) {
    console.error('❌ Error seeding body types:', bodyTypesError)
  } else {
    console.log(`✅ Seeded ${bodyTypes.length} body types`)
  }

  // Seed fuel types
  const fuelTypes = [
    { name: 'Benzin' },
    { name: 'Diesel' },
    { name: 'Hybrid' },
    { name: 'Plugin Hybrid' },
    { name: 'Elektrisk' }
  ]

  const { error: fuelTypesError } = await supabase
    .from('fuel_types')
    .insert(fuelTypes)

  if (fuelTypesError) {
    console.error('❌ Error seeding fuel types:', fuelTypesError)
  } else {
    console.log(`✅ Seeded ${fuelTypes.length} fuel types`)
  }

  // Seed transmissions
  const transmissions = [
    { name: 'Manual' },
    { name: 'Automatisk' }
  ]

  const { error: transmissionsError } = await supabase
    .from('transmissions')
    .insert(transmissions)

  if (transmissionsError) {
    console.error('❌ Error seeding transmissions:', transmissionsError)
  } else {
    console.log(`✅ Seeded ${transmissions.length} transmissions`)
  }

  // Seed colours
  const colours = [
    { name: 'Sort' },
    { name: 'Hvid' },
    { name: 'Grå' },
    { name: 'Sølv' },
    { name: 'Blå' },
    { name: 'Rød' }
  ]

  const { error: coloursError } = await supabase
    .from('colours')
    .insert(colours)

  if (coloursError) {
    console.error('❌ Error seeding colours:', coloursError)
  } else {
    console.log(`✅ Seeded ${colours.length} colours`)
  }
}

async function seedTestSellers() {
  console.log('\n👥 Seeding test sellers...')

  const sellers = [
    {
      name: 'Test Forhandler A/S',
      address: 'Testvej 123, 2100 København Ø',
      phone: '+45 12345678',
      email: 'test@forhandler.dk',
      company: 'Test Forhandler A/S',
      country: 'Denmark'
    },
    {
      name: 'Demo Bilhus ApS',
      address: 'Demovej 456, 8000 Aarhus C',
      phone: '+45 87654321',
      email: 'info@demo-bilhus.dk',
      company: 'Demo Bilhus ApS',
      country: 'Denmark'
    }
  ]

  const { data: insertedSellers, error } = await supabase
    .from('sellers')
    .insert(sellers)
    .select()

  if (error) {
    console.error('❌ Error seeding sellers:', error)
    return null
  }

  console.log(`✅ Seeded ${insertedSellers?.length || 0} sellers`)
  return insertedSellers
}

async function seedTestListings(sellers: any[]) {
  console.log('\n🚗 Seeding test listings...')

  if (!sellers || sellers.length === 0) {
    console.error('❌ No sellers available for listings')
    return
  }

  // Get reference data IDs
  const { data: makes } = await supabase.from('makes').select('id, name')
  const { data: models } = await supabase.from('models').select('id, name, make_id')
  const { data: bodyTypes } = await supabase.from('body_types').select('id, name')
  const { data: fuelTypes } = await supabase.from('fuel_types').select('id, name')
  const { data: transmissions } = await supabase.from('transmissions').select('id, name')

  const listings = [
    {
      seller_id: sellers[0].id,
      make_id: makes?.find(m => m.name === 'Volkswagen')?.id,
      model_id: models?.find(m => m.name === 'Golf')?.id,
      variant: 'Style 1.5 TSI',
      year: 2024,
      mileage: 5000,
      body_type_id: bodyTypes?.find(b => b.name === 'Hatchback')?.id,
      fuel_type_id: fuelTypes?.find(f => f.name === 'Benzin')?.id,
      transmission_id: transmissions?.find(t => t.name === 'Automatisk')?.id,
      retail_price: 285000,
      status: 'active',
      dealer_id: 'test-dealer-1'
    },
    {
      seller_id: sellers[1].id,
      make_id: makes?.find(m => m.name === 'BMW')?.id,
      model_id: models?.find(m => m.name === '3 Series')?.id,
      variant: '320d Touring M Sport',
      year: 2023,
      mileage: 15000,
      body_type_id: bodyTypes?.find(b => b.name === 'Station Wagon')?.id,
      fuel_type_id: fuelTypes?.find(f => f.name === 'Diesel')?.id,
      transmission_id: transmissions?.find(t => t.name === 'Automatisk')?.id,
      retail_price: 425000,
      status: 'active',
      dealer_id: 'test-dealer-2'
    }
  ]

  const { data: insertedListings, error } = await supabase
    .from('listings')
    .insert(listings)
    .select()

  if (error) {
    console.error('❌ Error seeding listings:', error)
    return
  }

  console.log(`✅ Seeded ${insertedListings?.length || 0} listings`)

  // Add lease pricing
  const leasePricing = insertedListings?.map(listing => ({
    listing_id: listing.id,
    monthly_price: Math.floor(listing.retail_price * 0.012), // ~1.2% per month
    first_payment: Math.floor(listing.retail_price * 0.05), // 5% as first payment
    period_months: 36,
    mileage_per_year: 15000,
    is_primary: true
  }))

  if (leasePricing && leasePricing.length > 0) {
    const { error: pricingError } = await supabase
      .from('lease_pricing')
      .insert(leasePricing)

    if (pricingError) {
      console.error('❌ Error seeding lease pricing:', pricingError)
    } else {
      console.log(`✅ Seeded ${leasePricing.length} lease pricing records`)
    }
  }
}

async function seedTestDealers() {
  console.log('\n🏢 Seeding test dealers...')

  const dealers = [
    {
      name: 'VW Test Dealer',
      pdf_url: 'https://example.com/vw-test.pdf',
      is_active: true,
      ai_config: {
        model: 'gpt-3.5-turbo',
        extraction_rules: {
          brand_filter: 'Volkswagen'
        }
      }
    },
    {
      name: 'Multi-Brand Test Dealer',
      pdf_url: 'https://example.com/multi-test.pdf',
      is_active: true,
      ai_config: {
        model: 'gpt-4',
        extraction_rules: {
          multi_brand: true
        }
      }
    }
  ]

  const { error } = await supabase
    .from('dealers')
    .insert(dealers)

  if (error) {
    console.error('❌ Error seeding dealers:', error)
  } else {
    console.log(`✅ Seeded ${dealers.length} dealers`)
  }
}

async function main() {
  try {
    // Check connection
    const { data, error } = await supabase
      .from('makes')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Failed to connect to staging database:', error)
      process.exit(1)
    }

    console.log('✅ Connected to staging database')

    // Seed data
    await seedReferenceData()
    const sellers = await seedTestSellers()
    if (sellers) {
      await seedTestListings(sellers)
    }
    await seedTestDealers()

    console.log('\n✨ Staging database seeding complete!')
    console.log('\nYou can now run:')
    console.log('  npm run staging:dev    # Run app with staging database')
    console.log('  npm run staging:test   # Test staging connection')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()