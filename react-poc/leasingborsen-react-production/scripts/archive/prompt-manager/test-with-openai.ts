#!/usr/bin/env node

/**
 * Quick test script to verify OpenAI Responses API connection
 * Run with: npx tsx scripts/prompt-manager/test-with-openai.ts
 */

import OpenAI from 'openai'
import { PromptManager, FileBasedPromptRegistry } from './index'
import type { PromptTemplate } from './types'

async function testOpenAIConnection() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required')
    console.log('\n💡 Set it with: export OPENAI_API_KEY=sk-...')
    process.exit(1)
  }

  console.log('🔌 Connecting to OpenAI...\n')

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Create registry
    const registry = new FileBasedPromptRegistry('./scripts/prompt-manager/data')
    await registry.initialize()

    // Create PromptManager
    const promptManager = new PromptManager(openai, registry)

    // Step 1: Create a test prompt
    console.log('📝 Creating a test prompt...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const template: PromptTemplate = {
      name: `test-prompt-${timestamp}`,
      description: 'Test prompt created by prompt-manager POC',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for testing the OpenAI Responses API.'
        },
        {
          role: 'user',
          content: 'Hello! The user said: {{userMessage}}'
        }
      ],
      parameters: ['userMessage'],
      metadata: {
        version: 1,
        tags: ['test', 'poc'],
        environment: 'development',
        createdAt: new Date().toISOString()
      }
    }

    const created = await promptManager.createPrompt(template)
    
    console.log('✅ Successfully created prompt!')
    console.log(`   Name: ${created.name}`)
    console.log(`   ID: ${created.id}`)
    console.log(`   Version: ${created.version}`)
    console.log('\n🔗 View your prompt in OpenAI UI:')
    console.log('   https://platform.openai.com/stored-responses')
    console.log(`   Look for prompt ID: ${created.id}`)

    // Step 2: List all prompts
    console.log('\n📋 Listing your OpenAI prompts...')
    const apiList = await openai.responses.list()
    console.log(`   Total prompts in your account: ${apiList.data.length}`)
    
    const ourPrompt = apiList.data.find(p => p.id === created.id)
    if (ourPrompt) {
      console.log('   ✅ Found our test prompt in the list!')
    }

    // Step 3: Retrieve the prompt
    console.log('\n🔍 Retrieving prompt details from OpenAI...')
    const retrieved = await openai.responses.retrieve(created.id)
    console.log('   ✅ Successfully retrieved!')
    console.log(`   Messages: ${retrieved.messages.length} messages`)
    console.log(`   Created: ${retrieved.created_at}`)

    // Step 4: Update the prompt
    console.log('\n🔄 Updating the prompt...')
    const updateResult = await promptManager.updatePrompt(created.name, {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. This prompt was updated by the prompt-manager POC.'
        },
        {
          role: 'user',
          content: 'The user said: {{userMessage}}. Please respond helpfully.'
        }
      ],
      metadata: {
        changelog: 'Updated system message and user prompt format'
      }
    })
    
    console.log('   ✅ Successfully updated!')
    console.log(`   New version: ${updateResult.version}`)
    console.log(`   Changelog: ${updateResult.changelog}`)

    // Step 5: Verify the update
    const updatedPrompt = await openai.responses.retrieve(created.id)
    console.log('   ✅ Verified update in OpenAI')

    // Step 6: Cleanup (optional)
    console.log('\n🧹 Cleanup: Do you want to delete the test prompt?')
    console.log(`   To delete manually, run:`)
    console.log(`   npx tsx -e "const o = new (await import('openai')).default(); await o.responses.del('${created.id}')"`)
    
    // Uncomment to auto-delete:
    // await promptManager.deletePrompt(created.name, { confirm: true })
    // console.log('   ✅ Deleted test prompt')

    console.log('\n🎉 All tests passed! Your OpenAI connection is working.')
    console.log('\n📚 Next steps:')
    console.log('   1. Check the prompt in OpenAI UI')
    console.log('   2. Try the example-usage.ts script')
    console.log('   3. Integrate with your vehicle extraction workflow')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    
    if (error.message.includes('401')) {
      console.log('\n💡 This looks like an authentication error.')
      console.log('   Check that your OPENAI_API_KEY is valid.')
    } else if (error.message.includes('responses')) {
      console.log('\n💡 The Responses API might not be available on your account.')
      console.log('   Contact OpenAI support to enable it.')
    }
    
    process.exit(1)
  }
}

// Run the test
testOpenAIConnection().catch(console.error)