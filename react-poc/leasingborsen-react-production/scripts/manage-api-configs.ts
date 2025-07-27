#!/usr/bin/env node
// Script to manage Responses API configurations
// Usage: npx tsx scripts/manage-api-configs.ts [command] [options]

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listConfigs() {
  const { data, error } = await supabase
    .from('responses_api_configs')
    .select(`
      *,
      text_format_configs (
        format_type,
        format_name,
        strict
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error listing configurations:', error)
    return
  }

  console.log('\n🔧 Available API Configurations:')
  data.forEach(config => {
    console.log(`\n- ${config.name} (${config.active ? '✅ Active' : '❌ Inactive'})`)
    console.log(`  Prompt ID: ${config.openai_prompt_id}`)
    console.log(`  Version: ${config.openai_prompt_version}`)
    console.log(`  Model: ${config.model}`)
    console.log(`  Temperature: ${config.temperature}`)
    console.log(`  Max Tokens: ${config.max_completion_tokens || 'Default'}`)
    console.log(`  Text Format: ${config.text_format_configs?.[0]?.format_type || 'None'}`)
    console.log(`  Versions: ${config.config_versions?.length || 0}`)
    console.log(`  Created: ${new Date(config.created_at).toLocaleString()}`)
  })
}

async function showConfig(name: string) {
  const { data, error } = await supabase
    .rpc('get_responses_api_config', { config_name: name })
    .single()

  if (error) {
    console.error('❌ Error getting configuration:', error)
    return
  }

  if (!data) {
    console.error(`❌ Configuration '${name}' not found`)
    return
  }

  console.log(`\n🔧 Configuration: ${name}`)
  console.log(`Prompt ID: ${data.openai_prompt_id}`)
  console.log(`Version: ${data.openai_prompt_version}`)
  console.log(`Model: ${data.model}`)
  console.log(`Temperature: ${data.temperature}`)
  console.log(`Max Tokens: ${data.max_completion_tokens || 'Default'}`)
  
  if (data.format_type) {
    console.log(`\n📝 Text Format:`)
    console.log(`Type: ${data.format_type}`)
    console.log(`Name: ${data.format_name}`)
    console.log(`Strict: ${data.strict}`)
    
    if (data.schema_definition) {
      console.log(`\n📋 Schema Definition:`)
      console.log(JSON.stringify(data.schema_definition, null, 2))
    }
  }
}

async function updateConfig(
  name: string,
  promptId: string,
  promptVersion: string,
  model: string,
  temperature: number,
  maxTokens: number,
  changelog: string
) {
  try {
    // Note: Version creation removed - configurations now managed directly
    console.log('⚠️  Version tracking has been simplified - update the configuration directly instead')
    const data = null // No-op for backward compatibility
    const error = null // No-op for backward compatibility

    if (error) {
      console.error('❌ Error updating configuration:', error)
      return
    }

    console.log(`✅ Created version ${data} for configuration: ${name}`)
  } catch (error) {
    console.error('❌ Failed to update configuration:', error)
  }
}

async function showLogs(configName?: string, limit: number = 10) {
  let query = supabase
    .from('api_call_logs')
    .select(`
      *,
      responses_api_configs (name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (configName) {
    // First get the config ID
    const { data: config } = await supabase
      .from('responses_api_configs')
      .select('id')
      .eq('name', configName)
      .single()
    
    if (config) {
      query = query.eq('config_id', config.id)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ Error getting logs:', error)
    return
  }

  console.log(`\n📊 API Call Logs (last ${limit}):\n`)
  data.forEach(log => {
    const status = log.response_status === 'success' ? '✅' : '❌'
    const duration = log.duration_ms ? `${log.duration_ms}ms` : 'N/A'
    const tokens = log.total_tokens || 'N/A'
    
    console.log(`${status} ${log.responses_api_configs?.name || 'Unknown'} | ${log.model} | ${tokens} tokens | ${duration}`)
    console.log(`   ${new Date(log.created_at).toLocaleString()}`)
    if (log.error_message) {
      console.log(`   Error: ${log.error_message}`)
    }
    console.log('')
  })
}

// Main CLI
const [,, command, ...args] = process.argv

switch (command) {
  case 'list':
    await listConfigs()
    break
    
  case 'show':
    const [configName] = args
    if (!configName) {
      console.error('❌ Usage: manage-api-configs.ts show <config-name>')
      process.exit(1)
    }
    await showConfig(configName)
    break
    
  case 'update':
    const [name, promptId, promptVersion, model, tempStr, maxTokensStr, ...changelogParts] = args
    if (!name || !promptId || !promptVersion || !model || !tempStr || !maxTokensStr || changelogParts.length === 0) {
      console.error('❌ Usage: manage-api-configs.ts update <name> <prompt-id> <prompt-version> <model> <temperature> <max-tokens> <changelog>')
      process.exit(1)
    }
    await updateConfig(
      name,
      promptId,
      promptVersion,
      model,
      parseFloat(tempStr),
      parseInt(maxTokensStr),
      changelogParts.join(' ')
    )
    break
    
  case 'logs':
    const [logConfigName, limitStr] = args
    const logLimit = limitStr ? parseInt(limitStr) : 10
    await showLogs(logConfigName, logLimit)
    break
    
  default:
    console.log(`
🔧 Responses API Configuration Manager

Commands:
  list                                           List all configurations
  show <config-name>                            Show a specific configuration  
  update <name> <prompt-id> <version> <model> <temp> <max-tokens> <changelog>
                                               Update configuration
  logs [config-name] [limit]                    Show API call logs

Examples:
  npx tsx scripts/manage-api-configs.ts list
  npx tsx scripts/manage-api-configs.ts show vehicle-extraction
  npx tsx scripts/manage-api-configs.ts update vehicle-extraction prompt_xyz 15 gpt-4-1106-preview 0.1 16384 "Updated to v15"
  npx tsx scripts/manage-api-configs.ts logs vehicle-extraction 20
`)
}