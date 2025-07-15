#!/usr/bin/env node

/**
 * Test the OpenAI Responses API
 * This demonstrates the actual Responses API as documented
 */

import OpenAI from 'openai'

async function testResponsesAPI() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  console.log('🔌 Testing OpenAI Responses API...\n')

  try {
    // Test 1: Create a simple response
    console.log('📝 Test 1: Creating a simple response...')
    
    const response1 = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: 'Tell me a three sentence bedtime story about a unicorn.',
      temperature: 0.7,
      store: true, // Store for later retrieval
      metadata: {
        test: 'prompt-manager-poc',
        type: 'simple-text'
      }
    })

    console.log('✅ Response created!')
    console.log(`   ID: ${response1.id}`)
    console.log(`   Status: ${response1.status}`)
    console.log(`   Output: ${response1.output_text}\n`)

    // Test 2: Using stored prompt with vehicle extraction pattern
    console.log('📝 Test 2: Creating response with vehicle extraction pattern...')
    
    const vehicleInput = `
Dealer: Toyota Denmark
File: january-2025-offers.pdf

PDF Content:
Toyota Corolla 1.8 Hybrid Active Plus
- Leasing: 3.500 kr/md
- Førstegangsydelse: 25.000 kr
- Løbetid: 36 måneder
- Km/år: 15.000
- WLTP: 4.5 l/100km
- CO2: 102 g/km

Toyota Yaris 1.5 Hybrid Active
- Leasing: 2.800 kr/md
- Førstegangsydelse: 20.000 kr
- Løbetid: 36 måneder
`

    const response2 = await openai.responses.create({
      model: 'gpt-4o',
      instructions: `You are an expert at extracting vehicle information from Danish car dealer PDFs.
Extract all vehicles and their lease terms. Respond in JSON format with this structure:
{ "vehicles": [{ "make": "", "model": "", "variant": "", "monthly_price": 0, "down_payment": 0, "duration_months": 0 }] }`,
      input: vehicleInput + '\n\nPlease respond with JSON format.',
      temperature: 0.1,
      text: {
        format: {
          type: 'json_object'
        }
      },
      metadata: {
        test: 'prompt-manager-poc',
        type: 'vehicle-extraction'
      }
    })

    console.log('✅ Vehicle extraction response created!')
    console.log(`   ID: ${response2.id}`)
    console.log(`   Extracted data:`)
    
    try {
      const extractedData = JSON.parse(response2.output_text || '{}')
      console.log(JSON.stringify(extractedData, null, 2))
    } catch {
      console.log(response2.output_text)
    }

    // Test 3: Using your existing stored prompt ID
    if (process.env.OPENAI_STORED_PROMPT_ID) {
      console.log('\n📝 Test 3: Using stored prompt from environment...')
      console.log(`   Prompt ID: ${process.env.OPENAI_STORED_PROMPT_ID}`)
      
      try {
        const response3 = await openai.responses.create({
          model: 'gpt-4o',
          prompt: {
            id: process.env.OPENAI_STORED_PROMPT_ID,
            version: '10' // Your current version
          },
          input: vehicleInput,
          temperature: 0.1,
          metadata: {
            test: 'prompt-manager-poc',
            type: 'stored-prompt'
          }
        })

        console.log('✅ Response created with stored prompt!')
        console.log(`   Response ID: ${response3.id}`)
        console.log(`   Status: ${response3.status}`)
      } catch (error) {
        console.log('❌ Error using stored prompt:', error.message)
        console.log('   This prompt ID might not exist or might not be accessible')
      }
    }

    // Test 4: Retrieve a response
    console.log('\n🔍 Test 4: Retrieving the first response...')
    const retrieved = await openai.responses.retrieve(response1.id)
    
    console.log('✅ Response retrieved!')
    console.log(`   Created at: ${new Date(retrieved.created_at * 1000).toLocaleString()}`)
    console.log(`   Model: ${retrieved.model}`)
    console.log(`   Tokens used: ${retrieved.usage?.total_tokens || 0}`)

    // Test 5: List responses (Note: This endpoint might not be available)
    console.log('\n📋 Test 5: Listing responses...')
    try {
      // The Responses API doesn't have a list endpoint according to the docs
      // But we can try to see if it exists
      const list = await (openai.responses as any).list?.({ limit: 5 })
      if (list) {
        console.log(`   Found ${list.data.length} responses`)
      }
    } catch {
      console.log('   Note: List endpoint not available (as expected from docs)')
    }

    // Test 6: Delete a response
    console.log('\n🗑️  Test 6: Deleting test responses...')
    const deleteResult = await openai.responses.delete(response1.id)
    console.log(`✅ Deleted response ${deleteResult.id}`)

    // Also delete the second response
    await openai.responses.delete(response2.id)
    console.log(`✅ Deleted response ${response2.id}`)

    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📚 Key Insights:')
    console.log('1. The Responses API creates model responses, not prompt templates')
    console.log('2. Use "input" parameter for user messages')
    console.log('3. Can reference stored prompts with prompt: { id, version }')
    console.log('4. Responses can be stored and retrieved later')
    console.log('5. Each response has a unique ID and usage tracking')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    
    if (error.status === 401) {
      console.log('\n💡 Authentication error - check your API key')
    } else if (error.status === 404) {
      console.log('\n💡 Resource not found - the API endpoint might not be available')
    } else if (error.status === 400) {
      console.log('\n💡 Bad request - check the API parameters')
      console.log('   Error details:', error.response?.data || error)
    }
  }
}

// Run the test
testResponsesAPI().catch(console.error)