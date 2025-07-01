#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugProductionResponse() {
  try {
    console.log('🔍 Debugging Production Function Response')
    console.log('========================================')
    
    const testExtractedCars = [
      {
        make: 'Skoda',
        model: 'Kodiaq',
        variant: 'Selection 2.0 TDI DSG7 150 HK',
        horsepower: 150,
        transmission: 'automatic',
        fuel_type: 'diesel',
        body_type: 'SUV',
        monthly_price: 5500
      }
    ]
    
    console.log('📤 Calling compare-extracted-listings function...')
    
    const { data, error } = await supabase.functions.invoke('compare-extracted-listings', {
      body: {
        extractedCars: testExtractedCars,
        sellerId: '11327fb8-4305-4156-8897-ddedb23e508b'
      }
    })
    
    if (error) {
      console.error('❌ Function call error:', error)
      return
    }
    
    console.log('📥 Raw function response:')
    console.log(JSON.stringify(data, null, 2))
    
    console.log('\n🔍 Response analysis:')
    console.log('Response type:', typeof data)
    console.log('Is array:', Array.isArray(data))
    console.log('Keys:', Object.keys(data || {}))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('Error details:', error)
  }
}

debugProductionResponse()