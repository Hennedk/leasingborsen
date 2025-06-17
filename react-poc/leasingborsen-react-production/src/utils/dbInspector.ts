import { supabase } from '@/lib/supabase'

export const inspectListingsTable = async () => {
  try {
    console.log('🔍 Inspecting listings table structure...')
    
    // Get a sample record to see column names
    const { data: sampleData, error: sampleError } = await supabase
      .from('listings')
      .select('*')
      .limit(1)
      .single()
    
    if (sampleError && sampleError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching sample data:', sampleError)
    } else if (sampleData) {
      console.log('✅ Sample listing record columns:')
      console.log(Object.keys(sampleData))
      console.log('Sample data:', sampleData)
    }

    // Try to get table info from information_schema (may not work due to RLS)
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'listings' })
    
    if (!columnsError && columns) {
      console.log('✅ Table columns from information_schema:')
      console.log(columns)
    } else {
      console.log('ℹ️ Could not fetch column info from information_schema (expected with RLS)')
    }

    // Check what happens when we try to insert with different column names
    // const testData = {
    //   make: 'Test',
    //   model: 'Test',
    //   body_type: 'Test', // Try with underscore
    //   bodytype: 'Test',  // Try without underscore
    //   fuel_type: 'Test', // Try with underscore
    //   fueltype: 'Test',  // Try without underscore
    // }

    console.log('🧪 Testing column names with dry run...')
    
    // Try each column variation to see which ones exist
    const columnTests = [
      { name: 'body_type', value: 'Sedan' },
      { name: 'bodytype', value: 'Sedan' },
      { name: 'fuel_type', value: 'Benzin' },
      { name: 'fueltype', value: 'Benzin' },
      { name: 'transmission', value: 'Manual' },
      { name: 'horsepower', value: 150 },
      { name: 'seats', value: 5 },
      { name: 'doors', value: 4 },
      { name: 'co2_emission', value: 120 },
      { name: 'co2_tax_half_year', value: 1000 },
      { name: 'consumption_l_100km', value: 6.5 },
      { name: 'consumption_kwh_100km', value: 15.0 },
      { name: 'wltp', value: 400 },
    ]

    for (const test of columnTests) {
      // const singleFieldTest = {
      //   make: 'TestMake',
      //   model: 'TestModel',
      //   [test.name]: test.value
      // }

      // Try to validate the field by doing a select with a filter
      const { error } = await supabase
        .from('listings')
        .select(test.name)
        .limit(1)

      if (error) {
        console.log(`❌ Column '${test.name}' does not exist: ${error.message}`)
      } else {
        console.log(`✅ Column '${test.name}' exists`)
      }
    }

  } catch (error) {
    console.error('Error inspecting database:', error)
  }
}

export const inspectAllTables = async () => {
  try {
    console.log('🔍 Checking available tables...')
    
    const tablesToCheck = [
      'listings',
      'makes', 
      'models',
      'body_types',
      'fuel_types',
      'sellers',
      'offers'
    ]

    for (const tableName of tablesToCheck) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ Table '${tableName}': ${error.message}`)
      } else {
        console.log(`✅ Table '${tableName}' exists`)
        if (data && data.length > 0) {
          console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`)
        }
      }
    }

  } catch (error) {
    console.error('Error checking tables:', error)
  }
}