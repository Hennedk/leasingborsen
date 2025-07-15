/**
 * Example usage of the PromptManager for vehicle extraction
 */

import OpenAI from 'openai'
import { PromptManager, createPromptRegistry, FileBasedPromptRegistry } from './index'
import type { PromptTemplate } from './types'

async function main() {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  // Create registry (use 'memory' for testing, 'file' for persistence)
  const registry = createPromptRegistry('file') as FileBasedPromptRegistry
  await registry.initialize()

  // Create PromptManager instance
  const promptManager = new PromptManager(openai, registry)

  // Example 1: Create a new vehicle extraction prompt
  console.log('📝 Creating vehicle extraction prompt...')
  
  const vehicleExtractionTemplate: PromptTemplate = {
    name: 'vehicle-extraction-v1',
    description: 'Extract vehicle information from PDF content with Danish market context',
    messages: [
      {
        role: 'system',
        content: `You are an expert at extracting vehicle information from Danish car dealer PDFs.
You understand Danish automotive terminology and can accurately parse:
- Vehicle specifications (make, model, variant, HP, fuel type, etc.)
- Lease pricing structures (monthly payments, down payments, terms)
- Danish-specific data (WLTP, registration tax, CO2 emissions)

Always prioritize accuracy and consistency in variant naming.`
      },
      {
        role: 'user',
        content: `Dealer: {{dealerName}}
File: {{fileName}}

PDF Content:
{{pdfContent}}

Existing Dealer Variants:
{{existingVariants}}

Please extract all vehicles following the schema requirements.`
      }
    ],
    parameters: ['dealerName', 'fileName', 'pdfContent', 'existingVariants'],
    metadata: {
      version: 1,
      tags: ['extraction', 'vehicles', 'danish'],
      environment: 'development',
      author: 'System',
      extractionConfig: {
        model: 'gpt-4-turbo-preview',
        temperature: 0.1,
        maxTokens: 16000
      }
    }
  }

  try {
    const createResult = await promptManager.createPrompt(vehicleExtractionTemplate)
    console.log('✅ Created prompt:', createResult)
    console.log(`   ID: ${createResult.id}`)
    console.log(`   Version: ${createResult.version}`)
  } catch (error) {
    console.error('❌ Error creating prompt:', error.message)
  }

  // Example 2: List all prompts
  console.log('\n📋 Listing all prompts...')
  const prompts = await promptManager.listPrompts()
  prompts.forEach(prompt => {
    console.log(`- ${prompt.name} (v${prompt.currentVersion}) - ${prompt.environment}`)
  })

  // Example 3: Update a prompt
  console.log('\n🔄 Updating prompt with improved variant handling...')
  try {
    const updateResult = await promptManager.updatePrompt('vehicle-extraction-v1', {
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting vehicle information from Danish car dealer PDFs.
You understand Danish automotive terminology and can accurately parse:
- Vehicle specifications (make, model, variant, HP, fuel type, etc.)
- Lease pricing structures (monthly payments, down payments, terms)
- Danish-specific data (WLTP, registration tax, CO2 emissions)

IMPORTANT: When matching variants:
1. Prioritize exact matches with existing dealer variants
2. Remove transmission suffixes (Automatik, Manuel) when comparing
3. Maintain consistency in variant naming across extractions`
        },
        {
          role: 'user',
          content: `Dealer: {{dealerName}}
File: {{fileName}}

PDF Content:
{{pdfContent}}

Existing Dealer Variants ({{existingVariantCount}} vehicles):
{{existingVariants}}

Extract all vehicles with high accuracy. Match existing variants when possible.`
        }
      ],
      metadata: {
        changelog: 'Improved variant matching logic and added existingVariantCount parameter'
      }
    })
    console.log('✅ Updated to version:', updateResult.version)
    console.log('   Changes:', updateResult.changelog)
  } catch (error) {
    console.error('❌ Error updating prompt:', error.message)
  }

  // Example 4: Get prompt details
  console.log('\n🔍 Getting prompt details...')
  try {
    const prompt = await promptManager.getPromptByName('vehicle-extraction-v1')
    console.log('Prompt details:')
    console.log(`- Name: ${prompt.name}`)
    console.log(`- ID: ${prompt.id}`)
    console.log(`- Version: ${prompt.currentVersion}`)
    console.log(`- Environment: ${prompt.environment}`)
    console.log(`- Tags: ${prompt.tags?.join(', ')}`)
  } catch (error) {
    console.error('❌ Error getting prompt:', error.message)
  }

  // Example 5: Using the prompt with OpenAI
  console.log('\n🚀 Example: Using prompt for extraction...')
  try {
    const storedPrompt = await promptManager.getPromptByName('vehicle-extraction-v1')
    
    // In your extraction function, you would use:
    console.log('Would call OpenAI with:')
    console.log(`- Prompt ID: ${storedPrompt.id}`)
    console.log(`- Version: ${storedPrompt.currentVersion}`)
    console.log(`- Parameters: dealerName, fileName, pdfContent, existingVariants`)
    
    // Example integration with your existing code:
    /*
    const response = await openai.responses.create({
      prompt: {
        id: storedPrompt.id,
        version: storedPrompt.currentVersion.toString()
      },
      model: 'gpt-4-turbo-preview',
      input: [{
        role: 'user',
        type: 'message',
        content: contextMessage // Your formatted context
      }],
      text: {
        format: {
          type: 'json_schema',
          schema: vehicleExtractionSchema
        }
      },
      temperature: 0.1
    })
    */
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  // Example 6: Rollback demonstration
  console.log('\n⏪ Demonstrating rollback capability...')
  try {
    // First, let's check available versions
    const versions = await registry.getPromptVersions('vehicle-extraction-v1')
    console.log(`Available versions: ${versions.map(v => v.version).join(', ')}`)
    
    if (versions.length > 1) {
      console.log('Rolling back to version 1...')
      const rollbackResult = await promptManager.rollbackPrompt('vehicle-extraction-v1', 1)
      console.log(`✅ Rolled back from v${rollbackResult.rollbackFrom} to v${rollbackResult.rollbackTo}`)
      console.log(`   New version created: v${rollbackResult.version}`)
    }
  } catch (error) {
    console.error('❌ Error during rollback:', error.message)
  }
}

// Run the example
main().catch(console.error)

export { main as runExample }