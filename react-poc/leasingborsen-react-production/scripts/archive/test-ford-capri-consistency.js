#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TEST_CONFIG = {
  pdfUrl: 'https://katalog.ford.dk/prislister/privatleasing/capri/GetPDF.ashx',
  sellerId: '3eb3f0ca-9069-4769-87a7-fd13f3a99790',
  totalRuns: 10,
  delayMinutes: 1.5
}

// Store all extraction results for comparison
const extractionResults = []
let consistencyErrors = []

/**
 * Run a single AI extraction
 */
async function runExtraction(runNumber) {
  console.log(`\n🔄 Run ${runNumber}/${TEST_CONFIG.totalRuns} - Starting extraction...`)
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-extract-vehicles', {
      body: {
        pdfUrl: TEST_CONFIG.pdfUrl,
        sellerId: TEST_CONFIG.sellerId,
        sessionName: `Consistency Test Run ${runNumber}`,
        prompt: 'Extract Ford Capri leasing data with deterministic temperature=0'
      }
    })

    if (error) {
      throw error
    }

    console.log(`✅ Run ${runNumber} completed successfully`)
    console.log(`   Session ID: ${data.sessionId}`)
    console.log(`   Cars extracted: ${data.extractedCars?.length || 0}`)
    
    // Log first car's offers for quick visual check
    if (data.extractedCars?.[0]?.offers) {
      console.log(`   First car offers: ${data.extractedCars[0].offers.length}`)
      console.log(`   Sample offers: ${JSON.stringify(data.extractedCars[0].offers.slice(0, 2))}`)
    }

    return {
      runNumber,
      sessionId: data.sessionId,
      extractedCars: data.extractedCars,
      timestamp: new Date().toISOString(),
      success: true
    }

  } catch (error) {
    console.error(`❌ Run ${runNumber} failed:`, error.message)
    return {
      runNumber,
      error: error.message,
      timestamp: new Date().toISOString(),
      success: false
    }
  }
}

/**
 * Compare two extraction results for consistency
 */
function compareExtractions(result1, result2) {
  const errors = []

  if (!result1.success || !result2.success) {
    return ['One or both extractions failed']
  }

  const cars1 = result1.extractedCars || []
  const cars2 = result2.extractedCars || []

  if (cars1.length !== cars2.length) {
    errors.push(`Different car counts: ${cars1.length} vs ${cars2.length}`)
    return errors
  }

  // Compare each car
  for (let i = 0; i < cars1.length; i++) {
    const car1 = cars1[i]
    const car2 = cars2[i]

    // Compare basic fields
    if (car1.make !== car2.make) {
      errors.push(`Car ${i+1} make differs: "${car1.make}" vs "${car2.make}"`)
    }
    if (car1.model !== car2.model) {
      errors.push(`Car ${i+1} model differs: "${car1.model}" vs "${car2.model}"`)
    }
    if (car1.variant !== car2.variant) {
      errors.push(`Car ${i+1} variant differs: "${car1.variant}" vs "${car2.variant}"`)
    }

    // Compare offers arrays
    const offers1 = car1.offers || []
    const offers2 = car2.offers || []

    if (offers1.length !== offers2.length) {
      errors.push(`Car ${i+1} offer count differs: ${offers1.length} vs ${offers2.length}`)
      continue
    }

    // Sort offers for consistent comparison
    const sortedOffers1 = [...offers1].sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0] // monthly_price
      if (a[1] !== b[1]) return a[1] - b[1] // down_payment
      return a[3] - b[3] // mileage
    })

    const sortedOffers2 = [...offers2].sort((a, b) => {
      if (a[0] !== b[0]) return a[0] - b[0] // monthly_price
      if (a[1] !== b[1]) return a[1] - b[1] // down_payment
      return a[3] - b[3] // mileage
    })

    // Compare each offer
    for (let j = 0; j < sortedOffers1.length; j++) {
      const offer1 = sortedOffers1[j]
      const offer2 = sortedOffers2[j]

      for (let k = 0; k < 4; k++) {
        if (offer1[k] !== offer2[k]) {
          const fields = ['monthly_price', 'down_payment', 'months', 'mileage']
          errors.push(`Car ${i+1} offer ${j+1} ${fields[k]} differs: ${offer1[k]} vs ${offer2[k]}`)
        }
      }
    }
  }

  return errors
}

/**
 * Sleep for specified minutes
 */
function sleep(minutes) {
  const ms = minutes * 60 * 1000
  console.log(`⏱️  Waiting ${minutes} minutes to avoid rate limits...`)
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate summary report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 FORD CAPRI CONSISTENCY TEST REPORT')
  console.log('='.repeat(60))

  const successfulRuns = extractionResults.filter(r => r.success)
  const failedRuns = extractionResults.filter(r => !r.success)

  console.log(`\n📈 Results Summary:`)
  console.log(`   Total runs: ${TEST_CONFIG.totalRuns}`)
  console.log(`   Successful: ${successfulRuns.length}`)
  console.log(`   Failed: ${failedRuns.length}`)

  if (failedRuns.length > 0) {
    console.log(`\n❌ Failed runs:`)
    failedRuns.forEach(run => {
      console.log(`   Run ${run.runNumber}: ${run.error}`)
    })
  }

  if (successfulRuns.length < 2) {
    console.log(`\n⚠️  Need at least 2 successful runs for consistency analysis`)
    return
  }

  // Analyze consistency between all successful runs
  let totalComparisons = 0
  let consistentComparisons = 0

  console.log(`\n🔍 Consistency Analysis:`)

  for (let i = 0; i < successfulRuns.length - 1; i++) {
    for (let j = i + 1; j < successfulRuns.length; j++) {
      const result1 = successfulRuns[i]
      const result2 = successfulRuns[j]
      
      const errors = compareExtractions(result1, result2)
      totalComparisons++

      if (errors.length === 0) {
        consistentComparisons++
        console.log(`   ✅ Run ${result1.runNumber} vs Run ${result2.runNumber}: IDENTICAL`)
      } else {
        console.log(`   ❌ Run ${result1.runNumber} vs Run ${result2.runNumber}: ${errors.length} differences`)
        errors.slice(0, 3).forEach(error => {
          console.log(`      - ${error}`)
        })
        if (errors.length > 3) {
          console.log(`      - ... and ${errors.length - 3} more differences`)
        }
      }
    }
  }

  const consistencyRate = totalComparisons > 0 ? (consistentComparisons / totalComparisons * 100).toFixed(1) : 0

  console.log(`\n📊 Final Results:`)
  console.log(`   Total comparisons: ${totalComparisons}`)
  console.log(`   Identical results: ${consistentComparisons}`)
  console.log(`   Consistency rate: ${consistencyRate}%`)

  if (consistencyRate === '100.0') {
    console.log(`\n🎉 SUCCESS: Temperature=0 achieved 100% consistency!`)
    console.log(`   All Ford Capri extractions produced identical results.`)
  } else {
    console.log(`\n⚠️  ISSUE: Temperature=0 did not achieve full consistency.`)
    console.log(`   Additional prompt engineering may be needed.`)
  }

  // Show sample data from first successful run
  if (successfulRuns.length > 0) {
    const sampleCar = successfulRuns[0].extractedCars?.[0]
    if (sampleCar) {
      console.log(`\n📋 Sample extracted car (${sampleCar.make} ${sampleCar.model} ${sampleCar.variant}):`)
      console.log(`   Offers: ${sampleCar.offers?.length || 0}`)
      if (sampleCar.offers?.length > 0) {
        console.log(`   First 3 offers:`)
        sampleCar.offers.slice(0, 3).forEach((offer, i) => {
          console.log(`     ${i+1}. [${offer[0]}, ${offer[1]}, ${offer[2]}, ${offer[3]}]`)
        })
      }
    }
  }
}

/**
 * Main test execution
 */
async function runConsistencyTest() {
  console.log('🚀 Starting Ford Capri AI Extraction Consistency Test')
  console.log(`📝 Configuration:`)
  console.log(`   PDF: ${TEST_CONFIG.pdfUrl}`)
  console.log(`   Seller: ${TEST_CONFIG.sellerId}`)
  console.log(`   Runs: ${TEST_CONFIG.totalRuns}`)
  console.log(`   Delay: ${TEST_CONFIG.delayMinutes} minutes`)
  console.log(`   Temperature: 0 (deterministic)`)

  const startTime = Date.now()

  // Run all extractions with delays
  for (let i = 1; i <= TEST_CONFIG.totalRuns; i++) {
    const result = await runExtraction(i)
    extractionResults.push(result)

    // Sleep between runs (except after the last one)
    if (i < TEST_CONFIG.totalRuns) {
      await sleep(TEST_CONFIG.delayMinutes)
    }
  }

  const endTime = Date.now()
  const totalMinutes = ((endTime - startTime) / 1000 / 60).toFixed(1)

  console.log(`\n⏱️  Test completed in ${totalMinutes} minutes`)

  // Generate final report
  generateReport()
}

// Run the test
runConsistencyTest().catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})