// Script to invalidate reference data cache and verify models
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function checkToyotaModels() {
  console.log('🔍 Checking Toyota models in database...')
  
  try {
    // Get Toyota make ID
    const { data: makes, error: makesError } = await supabase
      .from('makes')
      .select('id, name')
      .eq('name', 'Toyota')
      .single()
    
    if (makesError) {
      console.error('❌ Error fetching Toyota make:', makesError)
      return
    }
    
    console.log('✅ Found Toyota make:', makes)
    
    // Get all Toyota models
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('id, name, make_id')
      .eq('make_id', makes.id)
      .order('name')
    
    if (modelsError) {
      console.error('❌ Error fetching Toyota models:', modelsError)
      return
    }
    
    console.log('✅ Found Toyota models:')
    models.forEach(model => {
      console.log(`  - ${model.name} (ID: ${model.id})`)
    })
    
    // Check specifically for the missing models
    const missingModels = ['Corolla Touring Sports', 'Urban Cruiser']
    const foundMissingModels = models.filter(model => 
      missingModels.includes(model.name)
    )
    
    console.log('\n🔍 Checking for previously missing models:')
    missingModels.forEach(modelName => {
      const found = foundMissingModels.find(m => m.name === modelName)
      if (found) {
        console.log(`  ✅ ${modelName} - FOUND (ID: ${found.id})`)
      } else {
        console.log(`  ❌ ${modelName} - NOT FOUND`)
      }
    })
    
    if (foundMissingModels.length === missingModels.length) {
      console.log('\n🎉 All previously missing models are now in the database!')
      console.log('💡 The issue is likely React Query caching - need to invalidate cache.')
    } else {
      console.log('\n⚠️  Some models are still missing from the database.')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

async function addMissingModels() {
  console.log('\n🔧 Adding missing Toyota models...')
  
  try {
    // Get Toyota make ID
    const { data: makes, error: makesError } = await supabase
      .from('makes')
      .select('id')
      .eq('name', 'Toyota')
      .single()
    
    if (makesError) {
      console.error('❌ Error fetching Toyota make:', makesError)
      return
    }
    
    const missingModels = [
      { name: 'Corolla Touring Sports', make_id: makes.id },
      { name: 'Urban Cruiser', make_id: makes.id }
    ]
    
    // Check if models already exist
    const { data: existingModels } = await supabase
      .from('models')
      .select('name')
      .eq('make_id', makes.id)
      .in('name', missingModels.map(m => m.name))
    
    const modelsToAdd = missingModels.filter(model => 
      !existingModels?.some(existing => existing.name === model.name)
    )
    
    if (modelsToAdd.length === 0) {
      console.log('✅ All models already exist in database')
      return
    }
    
    // Add missing models
    const { data: insertedModels, error: insertError } = await supabase
      .from('models')
      .insert(modelsToAdd)
      .select()
    
    if (insertError) {
      console.error('❌ Error inserting models:', insertError)
      return
    }
    
    console.log('✅ Successfully added models:')
    insertedModels.forEach(model => {
      console.log(`  - ${model.name} (ID: ${model.id})`)
    })
    
  } catch (error) {
    console.error('❌ Unexpected error adding models:', error)
  }
}

// Create a cache invalidation helper
function createCacheInvalidationHelper() {
  console.log('\n💡 React Query Cache Invalidation Helper:')
  console.log('To invalidate the reference data cache, add this to a component:')
  console.log(`
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

// In your component:
const queryClient = useQueryClient()

// Invalidate all reference data
await queryClient.invalidateQueries({ queryKey: queryKeys.referenceDataAll() })

// Or invalidate just models
await queryClient.invalidateQueries({ queryKey: queryKeys.models() })

// Or manually refetch
await queryClient.refetchQueries({ queryKey: queryKeys.referenceDataAll() })
`)
  
  console.log('🔧 Or create a development button with this code:')
  console.log(`
const DevCacheInvalidator = () => {
  const queryClient = useQueryClient()
  
  const invalidateCache = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.referenceDataAll() })
    console.log('✅ Cache invalidated!')
  }
  
  return (
    <button onClick={invalidateCache} className="btn btn-warning">
      Invalidate Reference Cache
    </button>
  )
}
`)
}

async function main() {
  console.log('🚀 Reference Data Cache Invalidation Script')
  console.log('=========================================\n')
  
  // First check current state
  await checkToyotaModels()
  
  // Add missing models if needed
  await addMissingModels()
  
  // Show cache invalidation helper
  createCacheInvalidationHelper()
  
  console.log('\n✅ Script completed!')
}

main().catch(console.error)