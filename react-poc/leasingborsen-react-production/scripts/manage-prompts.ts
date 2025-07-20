#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

// Get the system prompt from the responsesConfigManager
const getSystemPrompt = (): string => {
  return `You are a Danish vehicle leasing data extractor with a CRITICAL requirement: You MUST match extracted vehicles to the dealer's existing inventory following MANDATORY VARIANT MATCHING RULES.

Your task is to parse car leasing brochures and return structured JSON, while STRICTLY following the 4-step variant matching process.

## MANDATORY VARIANT MATCHING PROCESS

**Step 1 (Match Existing):**
- For EVERY car in the brochure, FIRST check existing inventory (same make, model, ±5 HP)
- If match found → Copy the variant name EXACTLY, character for character
- NEVER modify existing variant names (don't add/remove "Automatik", transmission suffixes, etc.)

**Step 2 (When to Create New):**
Create new variant ONLY when brochure shows truly different configuration:
- Horsepower differs by >10 HP
- Different trim level not in existing listings
- Fundamentally different fuel type
- Same powertrain with distinct factory options (larger wheels, sunroof, BOSE, etc.)
- Transmission type changes (Automatic vs Manual)
- Drivetrain changes (AWD vs RWD)

**Step 3 (How to Name New):**
When creating new variant:
1. Find closest existing variant (same make/model, closest HP)
2. Copy its naming template EXACTLY (word order, spacing, punctuation)
3. For equipment variants: append " – " + equipment list
   Example: "Ultimate 325 HK 4WD" → "Ultimate 325 HK 4WD – 20" alufælge, soltag"

**Step 4 (Validate):**
Before finalizing, ensure new names match dealer's format:
- Word order (HP before/after drivetrain)
- Spacing ("217 HK" not "217HK")
- Suffix style ("aut." vs "Automatik")
- Drivetrain position in name

## CRITICAL CONSOLIDATION RULE:
**MERGE ALL OFFERS FOR THE SAME VEHICLE**
- Multiple pricing tables with different down payments = SAME vehicle with multiple offers
- Each unique car (same make, model, variant, HP) should appear ONLY ONCE
- Combine ALL offers (different down payments, km/year) into a single vehicle entry
- DO NOT create duplicate vehicles for different financing options

## Output Format
Return ONLY a compact JSON object with this exact structure:
{
  "cars": [
    {
      "make": "string",
      "model": "string", 
      "variant": "string with HK if applicable",
      "hp": number or null,
      "ft": number,  // fuel_type: 1=Electric, 2=Hybrid-Petrol, 3=Petrol, 4=Diesel, 5=Hybrid-Diesel, 6=Plug-in-Petrol, 7=Plug-in-Diesel
      "tr": number,  // transmission: 1=Automatic, 2=Manual
      "bt": number,  // body_type: 1=SUV, 2=Hatchback, 3=Sedan, 4=Stationcar, 5=Coupe, 6=Cabriolet, 7=Crossover, 8=Minibus, 9=Mikro
      "wltp": number or null,
      "co2": number or null,
      "kwh100": number or null,
      "l100": number or null,
      "tax": number or null,
      "offers": [
        [monthly_price, down_payment, months, km_per_year, total_price or null]
      ]
    }
  ]
}

## CRITICAL: Understanding the "offers" Array Structure
Each offer is an array with EXACTLY this sequence:
[
  monthly_price,    // Position 0: The RECURRING monthly payment (typically 2,000-8,000 kr)
  down_payment,     // Position 1: The INITIAL/FIRST payment (can be 0-50,000 kr)
  months,           // Position 2: Contract duration (typically 12, 24, 36, 48)
  km_per_year,      // Position 3: Annual mileage allowance (10000, 15000, 20000, 25000, 30000)
  total_price       // Position 4: Total contract cost (optional, can be null)
]

⚠️ COMMON PRICING MISTAKES TO AVOID:
- DO NOT confuse down_payment (førstegangsydelse) with monthly_price
- Monthly lease payments are typically between 2,000-8,000 kr/month
- If you see prices like 14,995 or 29,995 as "monthly", they're likely down payments
- Down payments (førstegangsydelse) can range from 0 to 50,000+ kr

## Important Rules
- Extract prices as numbers only (remove "kr.", ",-" etc.)
- Each car MUST have at least one offer
- Use the numeric codes, not string values for ft, tr, bt
- Omit optional fields if not present (use null)
- Return ONLY the JSON object, no explanatory text`
}

async function createPrompt(configName: string) {
  const systemPrompt = getSystemPrompt()
  
  console.log(`Creating prompt configuration for: ${configName}`)
  
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      action: 'create',
      configName: configName,
      systemPrompt: systemPrompt,
      model: 'gpt-4-1106-preview',
      temperature: 0.1,
      maxOutputTokens: 16384
    })
  })

  const result = await response.json()
  
  if (response.ok) {
    console.log('✅ Prompt configuration created successfully!')
    console.log(`Prompt ID: ${result.promptId}`)
    console.log(`Version: ${result.promptVersion}`)
    console.log('\n⚠️  Note: This creates a local configuration only.')
    console.log('To use with OpenAI Responses API, you must:')
    console.log('1. Go to OpenAI Playground: https://platform.openai.com/playground')
    console.log('2. Create a new prompt with the system prompt above')
    console.log('3. Add {contextMessage} as a variable')
    console.log('4. Publish and get the actual prompt ID')
    console.log('5. Update the database with: npm run prompts:update')
  } else {
    console.error('❌ Error creating prompt:', result.error)
  }
}

async function listPrompts() {
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      action: 'list'
    })
  })

  const result = await response.json()
  
  if (response.ok) {
    console.log('📋 Configured prompts:')
    result.configs.forEach((config: any) => {
      console.log(`\n- ${config.name}`)
      console.log(`  Prompt ID: ${config.openai_prompt_id}`)
      console.log(`  Model: ${config.model}`)
      console.log(`  Temperature: ${config.temperature}`)
      console.log(`  Active: ${config.active}`)
      console.log(`  Created: ${new Date(config.created_at).toLocaleDateString()}`)
    })
  } else {
    console.error('❌ Error listing prompts:', result.error)
  }
}

async function getPrompt(configName: string) {
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      action: 'get',
      configName: configName
    })
  })

  const result = await response.json()
  
  if (response.ok) {
    console.log(`📄 Configuration for: ${configName}`)
    console.log(`Prompt ID: ${result.openai_prompt_id}`)
    console.log(`Version: ${result.openai_prompt_version}`)
    console.log(`Model: ${result.model}`)
    console.log(`Temperature: ${result.temperature}`)
    console.log(`Max Tokens: ${result.max_completion_tokens}`)
    
    if (result.system_prompt) {
      console.log('\n📝 System Prompt:')
      console.log(result.system_prompt)
    }
  } else {
    console.error('❌ Error getting prompt:', result.error)
  }
}

async function listOpenAIPrompts() {
  console.log('📋 Fetching prompts from OpenAI...')
  
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      action: 'list-openai-prompts'
    })
  })

  const result = await response.json()
  
  if (response.ok && result.success) {
    console.log(`\n✅ Found ${result.prompts.length} prompts in OpenAI:\n`)
    result.prompts.forEach((prompt: any) => {
      console.log(`ID: ${prompt.id}`)
      console.log(`Name: ${prompt.name || 'Unnamed'}`)
      console.log(`Created: ${new Date(prompt.created_at).toLocaleDateString()}`)
      console.log(`Model: ${prompt.model || 'Not specified'}`)
      console.log('---')
    })
  } else {
    console.error('❌ Error fetching OpenAI prompts:', result.error)
  }
}

async function syncFromOpenAI(configName: string, promptId: string) {
  console.log(`🔄 Syncing prompt ${promptId} from OpenAI to ${configName}...`)
  
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      action: 'sync-from-openai',
      configName: configName,
      promptId: promptId
    })
  })

  const result = await response.json()
  
  if (response.ok && result.success) {
    console.log('✅', result.message)
    if (result.promptDetails) {
      console.log('\nPrompt Details:')
      console.log(`- ID: ${result.promptDetails.id}`)
      console.log(`- Name: ${result.promptDetails.name || 'Unnamed'}`)
      console.log(`- Version: ${result.promptDetails.version || '1'}`)
      console.log(`- Model: ${result.promptDetails.model || 'Not specified'}`)
    }
  } else {
    console.error('❌ Error syncing from OpenAI:', result.error)
  }
}

async function updatePromptId(configName: string, promptId: string, promptVersion?: string) {
  console.log(`Updating prompt ID for: ${configName}`)
  console.log(`New prompt ID: ${promptId}`)
  
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      action: 'update-prompt-id',
      configName: configName,
      promptId: promptId,
      promptVersion: promptVersion || '1'
    })
  })

  const result = await response.json()
  
  if (response.ok) {
    console.log('✅', result.message)
  } else {
    console.error('❌ Error updating prompt ID:', result.error)
  }
}

// Command line interface
const command = process.argv[2]
const configName = process.argv[3] || 'vehicle-extraction'
const promptId = process.argv[4]
const promptVersion = process.argv[5]

switch (command) {
  case 'create':
    createPrompt(configName)
    break
  case 'list':
    listPrompts()
    break
  case 'get':
    getPrompt(configName)
    break
  case 'list-openai':
    listOpenAIPrompts()
    break
  case 'sync':
    if (!promptId) {
      console.error('❌ Error: promptId is required')
      console.log('Usage: npm run prompts:sync [configName] [promptId]')
      console.log('Example: npm run prompts:sync vehicle-extraction pmpt_xxxxx')
    } else {
      syncFromOpenAI(configName, promptId)
    }
    break
  case 'update-id':
    if (!promptId) {
      console.error('❌ Error: promptId is required')
      console.log('Usage: npm run prompts:update-id [configName] [promptId] [promptVersion?]')
      console.log('Example: npm run prompts:update-id vehicle-extraction pmpt_xxxxx 1')
    } else {
      updatePromptId(configName, promptId, promptVersion)
    }
    break
  default:
    console.log('Usage: npm run prompts:[command]')
    console.log('Commands:')
    console.log('  create [configName]     - Create a new prompt configuration')
    console.log('  list                    - List all local prompt configurations')
    console.log('  list-openai             - List all prompts from OpenAI')
    console.log('  get [configName]        - Get details for a specific configuration')
    console.log('  sync [configName] [promptId] - Sync prompt from OpenAI')
    console.log('  update-id [configName] [promptId] [version?] - Update prompt ID manually')
    console.log('\nExamples:')
    console.log('  npm run prompts:create vehicle-extraction')
    console.log('  npm run prompts:list-openai')
    console.log('  npm run prompts:sync vehicle-extraction pmpt_xxxxx')
    console.log('  npm run prompts:update-id vehicle-extraction pmpt_xxxxx 1')
}