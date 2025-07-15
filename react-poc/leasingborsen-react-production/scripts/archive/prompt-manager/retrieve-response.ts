#!/usr/bin/env node

/**
 * Retrieve a specific OpenAI response by ID
 */

import OpenAI from 'openai'

async function retrieveResponse(responseId: string) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  console.log(`🔍 Retrieving response: ${responseId}\n`)

  try {
    const response = await openai.responses.retrieve(responseId)
    
    console.log('✅ Response retrieved successfully!\n')
    console.log('📋 Response Details:')
    console.log(`   ID: ${response.id}`)
    console.log(`   Status: ${response.status}`)
    console.log(`   Created: ${new Date(response.created_at * 1000).toLocaleString()}`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Stored: ${response.store}`)
    
    if (response.metadata && Object.keys(response.metadata).length > 0) {
      console.log(`   Metadata:`, response.metadata)
    }
    
    console.log('\n📊 Usage:')
    console.log(`   Input tokens: ${response.usage?.input_tokens || 0}`)
    console.log(`   Output tokens: ${response.usage?.output_tokens || 0}`)
    console.log(`   Total tokens: ${response.usage?.total_tokens || 0}`)
    
    console.log('\n📝 Output:')
    if (response.output_text) {
      console.log(response.output_text)
    } else if (response.output && response.output.length > 0) {
      response.output.forEach((item: any, index: number) => {
        if (item.type === 'message' && item.content) {
          item.content.forEach((content: any) => {
            if (content.type === 'output_text') {
              console.log(content.text)
            }
          })
        }
      })
    }
    
    // If there was an input, show it
    if (response.input || response.instructions) {
      console.log('\n📥 Input/Instructions:')
      if (response.instructions) {
        console.log('Instructions:', response.instructions)
      }
      if (response.input) {
        console.log('Input:', response.input)
      }
    }
    
    return response
    
  } catch (error) {
    console.error('❌ Error retrieving response:', error.message)
    
    if (error.status === 404) {
      console.log('\n💡 This response ID was not found. Possible reasons:')
      console.log('   - The response was created with store: false')
      console.log('   - The response was deleted')
      console.log('   - The ID is incorrect')
      console.log('   - The response was created by a different API key/organization')
    }
    
    process.exit(1)
  }
}

// Get response ID from command line argument or use the one provided
const responseId = process.argv[2] || 'resp_6870322f1590819a9e4623699adbdcc80035b2d61c434fc6'

retrieveResponse(responseId).catch(console.error)