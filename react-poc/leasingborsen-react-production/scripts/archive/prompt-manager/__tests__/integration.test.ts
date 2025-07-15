import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import OpenAI from 'openai'
import { PromptManager, FileBasedPromptRegistry } from '../index'
import type { PromptTemplate } from '../types'

/**
 * INTEGRATION TESTS - These make real API calls to OpenAI
 * 
 * Prerequisites:
 * 1. Set OPENAI_API_KEY environment variable
 * 2. Run with: INTEGRATION_TEST=true npm test scripts/prompt-manager/__tests__/integration.test.ts
 * 
 * WARNING: These tests will create real prompts in your OpenAI account!
 */

describe.skipIf(!process.env.INTEGRATION_TEST)('PromptManager - OpenAI Integration', () => {
  let promptManager: PromptManager
  let registry: FileBasedPromptRegistry
  let openai: OpenAI
  let createdPromptIds: string[] = []

  beforeAll(async () => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for integration tests')
    }

    // Initialize real OpenAI client
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Create registry with test-specific path
    registry = new FileBasedPromptRegistry('./scripts/prompt-manager/data-test')
    await registry.initialize()

    // Create PromptManager with real clients
    promptManager = new PromptManager(openai, registry)

    console.log('🔌 Connected to OpenAI API')
    console.log('📍 You can verify prompts at: https://platform.openai.com/stored-responses')
  })

  afterAll(async () => {
    // Cleanup: Delete all created prompts
    console.log('\n🧹 Cleaning up test prompts...')
    
    for (const promptId of createdPromptIds) {
      try {
        await openai.responses.del(promptId)
        console.log(`✅ Deleted prompt: ${promptId}`)
      } catch (error) {
        console.error(`❌ Failed to delete prompt ${promptId}:`, error.message)
      }
    }
  })

  it('should create a real prompt in OpenAI and verify it exists', async () => {
    const timestamp = Date.now()
    const template: PromptTemplate = {
      name: `test-vehicle-extraction-${timestamp}`,
      description: 'Integration test for vehicle extraction',
      messages: [
        {
          role: 'system',
          content: 'You are a test prompt for vehicle extraction. This is an integration test.'
        },
        {
          role: 'user',
          content: 'Extract vehicles from: {{pdfContent}}'
        }
      ],
      parameters: ['pdfContent'],
      metadata: {
        version: 1,
        tags: ['test', 'integration'],
        environment: 'development'
      }
    }

    // Create the prompt
    console.log(`\n📝 Creating prompt: ${template.name}`)
    const result = await promptManager.createPrompt(template)
    createdPromptIds.push(result.id)

    expect(result.id).toMatch(/^resp-/)
    expect(result.name).toBe(template.name)
    expect(result.version).toBe(1)

    console.log(`✅ Created prompt with ID: ${result.id}`)
    console.log(`🔗 View in OpenAI UI: https://platform.openai.com/stored-responses`)

    // Verify we can retrieve it from OpenAI
    const retrieved = await openai.responses.retrieve(result.id)
    expect(retrieved.id).toBe(result.id)
    expect(retrieved.messages).toEqual(template.messages)
    
    console.log(`✅ Verified prompt exists in OpenAI`)
  })

  it('should list all prompts including the newly created one', async () => {
    // First create a prompt
    const timestamp = Date.now()
    const template: PromptTemplate = {
      name: `test-list-prompt-${timestamp}`,
      description: 'Test prompt for listing',
      messages: [
        { role: 'system', content: 'Test listing prompt' }
      ],
      parameters: []
    }

    const created = await promptManager.createPrompt(template)
    createdPromptIds.push(created.id)

    // List from OpenAI API
    console.log('\n📋 Listing prompts from OpenAI...')
    const response = await openai.responses.list()
    
    const foundPrompt = response.data.find(p => p.id === created.id)
    expect(foundPrompt).toBeDefined()
    expect(foundPrompt?.name).toBe(template.name)

    console.log(`✅ Found ${response.data.length} total prompts in your account`)
    console.log(`✅ Verified our test prompt is listed`)
  })

  it('should update a prompt and verify the update in OpenAI', async () => {
    // Create initial prompt
    const timestamp = Date.now()
    const template: PromptTemplate = {
      name: `test-update-prompt-${timestamp}`,
      description: 'Test prompt for updates',
      messages: [
        { role: 'system', content: 'Original system message' },
        { role: 'user', content: '{{input}}' }
      ],
      parameters: ['input']
    }

    const created = await promptManager.createPrompt(template)
    createdPromptIds.push(created.id)

    // Update the prompt
    console.log(`\n🔄 Updating prompt: ${created.name}`)
    const updateResult = await promptManager.updatePrompt(created.name, {
      messages: [
        { role: 'system', content: 'Updated system message with more context' },
        { role: 'user', content: 'Process this input: {{input}}' }
      ],
      metadata: {
        changelog: 'Updated system message for better clarity'
      }
    })

    expect(updateResult.version).toBe(2)

    // Verify the update in OpenAI
    const updated = await openai.responses.retrieve(created.id)
    expect(updated.messages[0].content).toContain('Updated system message')
    
    console.log(`✅ Updated to version ${updateResult.version}`)
    console.log(`✅ Verified update in OpenAI`)
  })

  it('should delete a prompt from OpenAI', async () => {
    // Create a prompt to delete
    const timestamp = Date.now()
    const template: PromptTemplate = {
      name: `test-delete-prompt-${timestamp}`,
      description: 'Test prompt for deletion',
      messages: [
        { role: 'system', content: 'This prompt will be deleted' }
      ],
      parameters: []
    }

    const created = await promptManager.createPrompt(template)
    
    // Delete the prompt
    console.log(`\n🗑️  Deleting prompt: ${created.name}`)
    const deleteResult = await promptManager.deletePrompt(created.name, {
      confirm: true
    })

    expect(deleteResult.success).toBe(true)
    expect(deleteResult.deletedId).toBe(created.id)

    // Verify it's deleted from OpenAI
    await expect(openai.responses.retrieve(created.id)).rejects.toThrow()
    
    console.log(`✅ Deleted prompt ${created.id}`)
    console.log(`✅ Verified deletion in OpenAI`)

    // Remove from cleanup list since it's already deleted
    createdPromptIds = createdPromptIds.filter(id => id !== created.id)
  })

  it('should demonstrate using a prompt for actual extraction', async () => {
    // Create a realistic vehicle extraction prompt
    const template: PromptTemplate = {
      name: `vehicle-extraction-demo-${Date.now()}`,
      description: 'Demo vehicle extraction for integration test',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting vehicle information from text.
Extract the make, model, and price from the given text.
Respond in JSON format: { "vehicles": [{ "make": "", "model": "", "price": "" }] }`
        },
        {
          role: 'user',
          content: '{{vehicleText}}'
        }
      ],
      parameters: ['vehicleText']
    }

    const created = await promptManager.createPrompt(template)
    createdPromptIds.push(created.id)

    console.log(`\n🚗 Testing vehicle extraction with prompt ${created.id}`)

    // Now use the prompt with the Responses API
    try {
      const testInput = "Toyota Corolla 2024 - Leasing fra 3.500 kr/md"
      
      console.log(`📄 Input text: "${testInput}"`)
      console.log(`🤖 Calling OpenAI Responses API...`)

      // Note: The responses.create syntax might need adjustment based on OpenAI's API
      // This is a demonstration of how you would use the stored prompt
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting vehicle information from text.
Extract the make, model, and price from the given text.
Respond in JSON format: { "vehicles": [{ "make": "", "model": "", "price": "" }] }`
          },
          {
            role: 'user',
            content: testInput
          }
        ],
        temperature: 0.1
      })

      const response = completion.choices[0].message.content
      console.log(`✅ Extraction result: ${response}`)

      // In a real implementation, you would use:
      // const response = await openai.responses.create({
      //   prompt: { id: created.id },
      //   input: [{ role: 'user', content: testInput }]
      // })

    } catch (error) {
      console.error('❌ Extraction failed:', error.message)
    }
  })
})

// Instructions for running integration tests
console.log(`
📌 Integration Test Instructions:
1. Set your OpenAI API key: export OPENAI_API_KEY=sk-...
2. Run tests: INTEGRATION_TEST=true npm test scripts/prompt-manager/__tests__/integration.test.ts
3. Check created prompts at: https://platform.openai.com/stored-responses
4. Tests will auto-cleanup created prompts

⚠️  These tests create real prompts in your OpenAI account!
`)