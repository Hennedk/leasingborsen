// Simple test to verify cache invalidation works
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testModelAvailability() {
  console.log('🧪 Testing Model Availability')
  console.log('============================\n')
  
  try {
    // Get Toyota make
    const { data: toyotaMake, error: makeError } = await supabase
      .from('makes')
      .select('id, name')
      .eq('name', 'Toyota')
      .single()
    
    if (makeError) {
      console.error('❌ Error fetching Toyota make:', makeError)
      return
    }
    
    console.log('✅ Toyota make found:', toyotaMake)
    
    // Test specifically for the problematic models
    const problematicModels = ['Corolla Touring Sports', 'Urban Cruiser']
    
    for (const modelName of problematicModels) {
      const { data: model, error: modelError } = await supabase
        .from('models')
        .select('id, name, make_id')
        .eq('name', modelName)
        .eq('make_id', toyotaMake.id)
        .single()
      
      if (modelError) {
        console.log(`❌ ${modelName}: NOT FOUND in database`)
        console.log('   Error:', modelError.message)
      } else {
        console.log(`✅ ${modelName}: FOUND in database (ID: ${model.id})`)
      }
    }
    
    // Also get full list of Toyota models
    const { data: allModels, error: allModelsError } = await supabase
      .from('models')
      .select('name')
      .eq('make_id', toyotaMake.id)
      .order('name')
    
    if (allModelsError) {
      console.error('❌ Error fetching all Toyota models:', allModelsError)
    } else {
      console.log('\n📋 All Toyota models in database:')
      allModels.forEach(model => {
        const isProblematic = problematicModels.includes(model.name)
        console.log(`   ${isProblematic ? '🎯' : '  '} ${model.name}`)
      })
    }
    
    console.log('\n💡 Solution Steps:')
    console.log('1. Navigate to the Batch Review page: http://localhost:5175/admin/batch-review/[batchId]')
    console.log('2. Look for the yellow "Development Cache Controller" card')
    console.log('3. Click "Invalidate Reference Data" to clear the cache')
    console.log('4. Try the batch import again')
    console.log('')
    console.log('🔧 Alternative: In the batch listings page error, click the "Opdater Reference Data" button when it appears')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testModelAvailability()