#!/usr/bin/env node

// Test script for Responses API migration
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test configurations
const testCases = [
  {
    name: 'Test with known dealer (should match existing variants)',
    dealerId: 'f5cdd423-d949-49fa-a68d-937c25c2269a', // Volkswagen
    dealerName: 'Volkswagen Privatleasing',
    fileName: 'test-vw-golf.pdf',
    pdfText: `
Volkswagen Golf
1.5 TSI Life 150 HK DSG
Månedlig ydelse: 3.495 kr./md
Førstegangsydelse: 35.000 kr.
36 måneder - 15.000 km/år
WLTP: 5.4 l/100km
CO2: 122 g/km
    `
  },
  {
    name: 'Test with new variant (should be inferred)',
    dealerId: 'test-dealer-001',
    dealerName: 'Test Dealer',
    fileName: 'test-new-model.pdf',
    pdfText: `
Tesla Model 3
Long Range AWD Performance
Månedlig ydelse: 5.995 kr./md
Førstegangsydelse: 59.950 kr.
36 måneder - 20.000 km/år
WLTP: 547 km
Elforbrug: 14.7 kWh/100km
    `
  }
]

async function testResponsesAPI() {
  console.log('🧪 Testing Responses API Migration\n')

  // Check current configuration
  console.log('📊 Checking migration status...')
  const { data: dashboardData, error: dashboardError } = await supabase
    .rpc('get_migration_dashboard_data')

  if (dashboardError) {
    console.error('❌ Error fetching dashboard:', dashboardError)
  } else {
    console.log('✅ Migration dashboard active')
    console.log(`   Total extractions: ${dashboardData.summary.total_extractions}`)
    console.log(`   Responses API: ${dashboardData.summary.responses_api_count}`)
    console.log(`   Chat Completions: ${dashboardData.summary.chat_completions_count}\n`)
  }

  // Run test cases
  for (const testCase of testCases) {
    console.log(`\n🔄 Running: ${testCase.name}`)
    console.log(`   Dealer: ${testCase.dealerName} (${testCase.dealerId})`)

    try {
      // Call the Edge Function
      const startTime = Date.now()
      
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-extract-vehicles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testCase.pdfText,
          dealerHint: testCase.dealerName,
          sellerId: testCase.dealerId,
          fileName: testCase.fileName,
          includeExistingListings: true
        })
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ API Error (${response.status}):`, error)
        continue
      }

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Extraction successful in ${duration}ms`)
        console.log(`   Session ID: ${result.extractionSessionId}`)
        console.log(`   Items processed: ${result.itemsProcessed}`)
        console.log(`   API Version: ${result.summary.apiVersion}`)
        
        if (result.summary.variantSourceDistribution) {
          console.log(`   Variant Sources:`)
          console.log(`     - Existing: ${result.summary.variantSourceDistribution.existing}`)
          console.log(`     - Reference: ${result.summary.variantSourceDistribution.reference}`)
          console.log(`     - Inferred: ${result.summary.variantSourceDistribution.inferred}`)
          console.log(`   Inference Rate: ${(result.summary.inferenceRate * 100).toFixed(1)}%`)
          console.log(`   Avg Confidence: ${(result.summary.avgVariantConfidence * 100).toFixed(1)}%`)
        }

        // Check which API was used
        if (result.summary.apiVersion === 'responses-api') {
          console.log('   🎯 Used Responses API!')
        } else {
          console.log('   📝 Used Chat Completions API (not in rollout percentage)')
        }

        // Fetch session details
        const { data: session, error: sessionError } = await supabase
          .from('extraction_sessions')
          .select('*')
          .eq('id', result.extractionSessionId)
          .single()

        if (!sessionError && session) {
          console.log(`   Session API Version: ${session.api_version}`)
          if (session.variant_source_stats) {
            console.log(`   Session Variant Stats:`, session.variant_source_stats)
          }
        }

      } else {
        console.error('❌ Extraction failed:', result.error)
      }

    } catch (error) {
      console.error('❌ Test error:', error)
    }
  }

  // Check alerts
  console.log('\n🚨 Checking for alerts...')
  const { data: alerts, error: alertError } = await supabase
    .rpc('check_inference_rate_alert')

  if (alertError) {
    console.error('❌ Error checking alerts:', alertError)
  } else if (alerts && alerts.length > 0) {
    console.log('⚠️  Active alerts:')
    alerts.forEach(alert => {
      console.log(`   - ${alert.severity}: ${alert.message}`)
      console.log(`     Details:`, alert.details)
    })
  } else {
    console.log('✅ No active alerts')
  }

  // Show recent metrics
  console.log('\n📈 Recent extraction metrics:')
  const { data: metrics, error: metricsError } = await supabase
    .from('migration_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!metricsError && metrics) {
    metrics.forEach(metric => {
      console.log(`   ${new Date(metric.created_at).toLocaleString()}:`)
      console.log(`     - API: ${metric.api_version}`)
      console.log(`     - Tokens: ${metric.tokens_used}`)
      console.log(`     - Time: ${metric.processing_time_ms}ms`)
      console.log(`     - Inference Rate: ${(metric.inference_rate * 100).toFixed(1)}%`)
      if (metric.error_occurred) {
        console.log(`     - ERROR: ${metric.error_message}`)
      }
    })
  }
}

// Run the tests
testResponsesAPI().catch(console.error)