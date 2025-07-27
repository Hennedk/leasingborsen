import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from "https://esm.sh/openai@latest"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePromptRequest {
  action: 'create' | 'update' | 'list' | 'get' | 'update-prompt-id' | 'list-openai-prompts' | 'sync-from-openai'
  configName?: string
  systemPrompt?: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  promptId?: string
  promptVersion?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Parse request
    const request: CreatePromptRequest = await req.json()
    const { action, configName, systemPrompt, model = 'gpt-4-1106-preview', temperature = 0.1, maxOutputTokens = 16384, promptId, promptVersion } = request

    switch (action) {
      case 'create': {
        if (!configName || !systemPrompt) {
          return new Response(
            JSON.stringify({ error: 'configName and systemPrompt are required for create action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[manage-prompts] Creating prompt for config: ${configName}`)

        // Note: OpenAI doesn't currently support programmatic prompt creation
        // We'll store the configuration locally and provide instructions
        
        const promptId = `pending_${Date.now()}`
        const promptVersion = '1'

        // Store the prompt configuration in the database
        const { data: existingConfig } = await supabase
          .from('responses_api_configs')
          .select('id')
          .eq('name', configName)
          .single()

        if (existingConfig) {
          // Update existing configuration
          const { error: updateError } = await supabase
            .from('responses_api_configs')
            .update({
              openai_prompt_id: promptId,
              openai_prompt_version: promptVersion,
              model: model,
              temperature: temperature,
              max_completion_tokens: maxOutputTokens,
              updated_at: new Date().toISOString()
            })
            .eq('name', configName)

          if (updateError) throw updateError

          // Version history removed - simplified configuration management

          console.log(`[manage-prompts] Updated configuration for: ${configName}`)
        } else {
          // Create new configuration
          const { error: insertError } = await supabase
            .from('responses_api_configs')
            .insert({
              name: configName,
              description: `Configuration for ${configName}`,
              openai_prompt_id: promptId,
              openai_prompt_version: promptVersion,
              model: model,
              temperature: temperature,
              max_completion_tokens: maxOutputTokens,
              active: true
            })

          if (insertError) throw insertError

          console.log(`[manage-prompts] Created new configuration for: ${configName}`)
        }

        // Store the system prompt separately for reference
        const { error: promptError } = await supabase
          .from('prompt_templates')
          .insert({
            prompt_id: promptId,
            config_name: configName,
            system_prompt: systemPrompt,
            model: model,
            temperature: temperature,
            max_output_tokens: maxOutputTokens,
            created_at: new Date().toISOString()
          })

        if (promptError && promptError.code !== '23505') { // Ignore duplicate key errors
          console.error('[manage-prompts] Error storing prompt template:', promptError)
        }

        return new Response(
          JSON.stringify({
            success: true,
            promptId: promptId,
            promptVersion: promptVersion,
            message: `Prompt configuration stored locally for ${configName}.\n\nTo use with OpenAI Responses API:\n1. Go to https://platform.openai.com/playground\n2. Click "Prompts" → "Create New"\n3. Copy the system prompt from this configuration\n4. Add {contextMessage} as a variable\n5. Publish and get the prompt ID\n6. Update this configuration with: npm run prompts:update ${configName} [prompt-id]`,
            systemPrompt: systemPrompt.substring(0, 500) + '...\n\n[Full prompt stored in database]'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      }

      case 'get': {
        if (!configName) {
          return new Response(
            JSON.stringify({ error: 'configName is required for get action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .rpc('get_responses_api_config', { config_name: configName })
          .single()

        if (error || !data) {
          return new Response(
            JSON.stringify({ error: `Configuration not found: ${configName}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Also try to get the stored prompt template
        const { data: promptData } = await supabase
          .from('prompt_templates')
          .select('system_prompt')
          .eq('prompt_id', data.openai_prompt_id)
          .single()

        return new Response(
          JSON.stringify({
            ...data,
            system_prompt: promptData?.system_prompt || null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list': {
        const { data, error } = await supabase
          .from('responses_api_configs')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        return new Response(
          JSON.stringify({ configs: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update': {
        if (!configName) {
          return new Response(
            JSON.stringify({ error: 'configName is required for update action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const updates: any = {}
        if (systemPrompt !== undefined) {
          // For system prompt updates, we need to create a new version
          const { data: currentConfig } = await supabase
            .from('responses_api_configs')
            .select('openai_prompt_id')
            .eq('name', configName)
            .single()

          if (currentConfig) {
            // Update the prompt template
            await supabase
              .from('prompt_templates')
              .update({ system_prompt: systemPrompt })
              .eq('prompt_id', currentConfig.openai_prompt_id)
          }
        }
        if (model !== undefined) updates.model = model
        if (temperature !== undefined) updates.temperature = temperature
        if (maxOutputTokens !== undefined) updates.max_completion_tokens = maxOutputTokens

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString()
          
          const { error } = await supabase
            .from('responses_api_configs')
            .update(updates)
            .eq('name', configName)

          if (error) throw error
        }

        return new Response(
          JSON.stringify({ success: true, message: `Configuration updated for ${configName}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list-openai-prompts': {
        console.log('[manage-prompts] Fetching prompts from OpenAI API...')
        
        try {
          // Use the OpenAI client to list prompts
          const response = await fetch('https://api.openai.com/v1/prompts', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
          }

          const data = await response.json()
          
          return new Response(
            JSON.stringify({
              success: true,
              prompts: data.data || [],
              message: `Found ${data.data?.length || 0} prompts in OpenAI`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('[manage-prompts] Error fetching OpenAI prompts:', error)
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message || 'Failed to fetch prompts from OpenAI'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'sync-from-openai': {
        if (!promptId || !configName) {
          return new Response(
            JSON.stringify({ error: 'configName and promptId are required for sync-from-openai action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`[manage-prompts] Syncing prompt ${promptId} from OpenAI to config ${configName}`)
        
        try {
          // Fetch specific prompt details from OpenAI
          const response = await fetch(`https://api.openai.com/v1/prompts/${promptId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
          }

          const promptData = await response.json()
          
          // Update the configuration with the OpenAI prompt details
          const { error: updateError } = await supabase
            .from('responses_api_configs')
            .update({
              openai_prompt_id: promptData.id,
              openai_prompt_version: promptData.version?.toString() || '1',
              model: promptData.model || model,
              temperature: promptData.temperature || temperature,
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('name', configName)

          if (updateError) throw updateError

          // Store the prompt content if available
          if (promptData.messages || promptData.instructions) {
            const systemPromptContent = promptData.messages?.find(m => m.role === 'system')?.content || 
                                      promptData.instructions || 
                                      'Prompt content from OpenAI'
            
            await supabase
              .from('prompt_templates')
              .upsert({
                prompt_id: promptData.id,
                config_name: configName,
                system_prompt: systemPromptContent,
                model: promptData.model || model,
                temperature: promptData.temperature || temperature,
                max_output_tokens: promptData.max_tokens || maxOutputTokens,
                updated_at: new Date().toISOString()
              })
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: `Successfully synced prompt ${promptId} from OpenAI to configuration ${configName}`,
              promptDetails: {
                id: promptData.id,
                name: promptData.name,
                version: promptData.version,
                model: promptData.model
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('[manage-prompts] Error syncing from OpenAI:', error)
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message || 'Failed to sync prompt from OpenAI'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'update-prompt-id': {
        if (!configName || !promptId) {
          return new Response(
            JSON.stringify({ error: 'configName and promptId are required for update-prompt-id action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('responses_api_configs')
          .update({
            openai_prompt_id: promptId,
            openai_prompt_version: promptVersion || '1',
            active: true,
            updated_at: new Date().toISOString()
          })
          .eq('name', configName)

        if (error) throw error

        // Version history removed - simplified configuration management

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Successfully updated ${configName} with OpenAI prompt ID: ${promptId}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('[manage-prompts] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})