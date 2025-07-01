#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugEdgeFunctionResponse() {
  try {
    console.log('🔍 Testing What extract-cars-generic Actually Returns')
    console.log('===================================================')
    
    // Create a small test extraction to see the response structure
    const testPayload = {
      textContent: `
Toyota Aygo X Selection 1.0 VVT-i 72 HK
Toyota Corolla Active 1.8 Hybrid 140 HK
Toyota C-HR Selection 1.8 Hybrid 140 HK
      `,
      dealerName: 'Test Dealer',
      fileName: 'test.pdf',
      sellerId: 'test-seller-123',
      sellerName: 'Test Seller',
      batchId: 'debug-batch-123',
      makeId: 'toyota-make-id',
      makeName: 'Toyota'
    }
    
    console.log('📤 Calling extract-cars-generic with test payload...')
    
    const { data: aiResult, error } = await supabase.functions.invoke('extract-cars-generic', {
      body: testPayload
    })
    
    if (error) {
      console.error('❌ Edge Function error:', error)
      return
    }
    
    console.log('📥 Raw Edge Function Response:')
    console.log('==============================')
    console.log('Response type:', typeof aiResult)
    console.log('Response keys:', Object.keys(aiResult || {}))
    console.log()
    
    // Check each key in detail
    if (aiResult) {
      Object.keys(aiResult).forEach(key => {
        const value = aiResult[key]
        console.log(`🔑 ${key}:`)
        console.log(`   Type: ${typeof value}`)
        if (Array.isArray(value)) {
          console.log(`   Array length: ${value.length}`)
          if (value.length > 0) {
            console.log(`   First item:`, value[0])
          }
        } else if (typeof value === 'object' && value !== null) {
          console.log(`   Object keys:`, Object.keys(value))
          console.log(`   Object content:`, value)
        } else {
          console.log(`   Value:`, value)
        }
        console.log()
      })
    }
    
    console.log('🔍 Checking for Summary Data:')
    console.log('============================')
    
    if (aiResult?.summary) {
      console.log('✅ Summary found in immediate response!')
      console.log('Summary:', aiResult.summary)
    } else {
      console.log('❌ No summary in immediate response')
      console.log('This explains why the modal shows 0s!')
    }
    
    if (aiResult?.metadata) {
      console.log('📊 Metadata found:')
      console.log('Metadata:', aiResult.metadata)
    }
    
    if (aiResult?.cars) {
      console.log('🚗 Cars found:')
      console.log(`Total cars: ${aiResult.cars?.length || 0}`)
    }
    
    console.log('\n🎯 Expected vs Actual:')
    console.log('======================')
    console.log('Modal expects: aiResult.summary.totalNew, totalUpdated, etc.')
    console.log('Actual structure: TBD based on above output')
    
  } catch (error) {
    console.error('❌ Error testing edge function:', error.message)
  }
}

debugEdgeFunctionResponse()