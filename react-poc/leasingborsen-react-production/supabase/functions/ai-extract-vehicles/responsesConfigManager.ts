// Responses API Configuration Manager
// Manages OpenAI Responses API configurations stored internally

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ResponsesAPIConfig {
  config_id: string
  openai_prompt_id: string
  openai_prompt_version: string
  model: string
  temperature: number
  max_completion_tokens?: number
}

export interface APICallResult {
  success: boolean
  data?: any
  error?: string
  tokens?: {
    completion_tokens?: number
    total_tokens?: number
  }
  duration_ms?: number
}

export class ResponsesConfigManager {
  private supabase: any
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }
  
  /**
   * Get active configuration by name with caching
   */
  async getConfig(configName: string): Promise<ResponsesAPIConfig | null> {
    // Check cache first
    const cached = ConfigManagerSingleton.getCachedConfig(configName)
    if (cached) {
      console.log(`[ResponsesConfigManager] Using cached config for: ${configName}`)
      return cached
    }

    try {
      const { data, error } = await this.supabase
        .rpc('get_responses_api_config', { config_name: configName })
        .single()
      
      if (error) {
        console.error('[ResponsesConfigManager] Error fetching config:', error)
        return null
      }
      
      // Cache the result
      if (data) {
        ConfigManagerSingleton.setCachedConfig(configName, data)
        console.log(`[ResponsesConfigManager] Cached config for: ${configName}`)
      }
      
      return data
    } catch (error) {
      console.error('[ResponsesConfigManager] Failed to get config:', error)
      return null
    }
  }
  
  /**
   * Build OpenAI Responses API payload from configuration
   */
  buildAPIPayload(config: ResponsesAPIConfig, inputText: string): any {
    // Use the stored prompt ID and version - no json_schema needed since it's in the prompt
    const payload: any = {
      prompt: {
        id: config.openai_prompt_id,
        version: config.openai_prompt_version
      },
      input: inputText,  // Pass the string directly, not as an object
      max_output_tokens: config.max_completion_tokens || 2048,
      store: true
    }
    
    return payload
  }
  
  /**
   * Log API call for monitoring and debugging
   */
  async logAPICall(
    config: ResponsesAPIConfig,
    result: APICallResult,
    duration_ms?: number
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_api_call', {
        p_config_id: config.config_id,
        p_openai_prompt_id: config.openai_prompt_id,
        p_openai_prompt_version: config.openai_prompt_version,
        p_model: config.model,
        p_temperature: config.temperature,
        p_completion_tokens: result.tokens?.completion_tokens,
        p_total_tokens: result.tokens?.total_tokens,
        p_response_status: result.success ? 'success' : 'error',
        p_error_message: result.error,
        p_duration_ms: duration_ms || result.duration_ms
      })
    } catch (error) {
      console.error('[ResponsesConfigManager] Failed to log API call:', error)
      // Don't throw - logging failure shouldn't break the main flow
    }
  }
  
  /**
   * Version management removed - configurations are now managed directly
   * This method is kept for backward compatibility but does nothing
   */
  async createVersion(
    configName: string,
    openai_prompt_id: string,
    openai_prompt_version: string,
    model: string,
    temperature: number,
    max_completion_tokens: number,
    changelog: string,
    created_by: string = 'system'
  ): Promise<number | null> {
    console.warn('[ResponsesConfigManager] createVersion is deprecated - version management simplified')
    return null
  }
  
  /**
   * Note: Prompt creation must be done manually in OpenAI Playground
   * This is a placeholder for documentation purposes
   */
  // Removed createPromptTemplate - prompts must be created in OpenAI Playground
  
  /**
   * Get prompt configuration from database
   * Note: Prompts must be created manually in OpenAI Playground first
   */
  async getOrCreatePrompt(configName: string): Promise<ResponsesAPIConfig | null> {
    // Only fetch existing configuration - no automatic creation
    const existingConfig = await this.getConfig(configName)
    if (existingConfig) {
      console.log(`[ResponsesConfigManager] Using existing configuration: ${configName}`)
      return existingConfig
    }
    
    console.error(`[ResponsesConfigManager] Configuration '${configName}' not found in database`)
    console.error(`[ResponsesConfigManager] Please create the prompt in OpenAI Playground and update the database`)
    return null
  }
  
  /**
   * Get the system prompt template for vehicle extraction
   * Note: This method is deprecated - prompts are now managed in OpenAI Playground
   */
  private getSystemPromptTemplate(): string {
    return `DEPRECATED: System prompt moved to main extraction function for optimization.`
  }
  
  /**
   * Get configuration with error handling
   */
  async getConfigWithFallback(configName: string): Promise<ResponsesAPIConfig | null> {
    // Try to get configuration from database
    const config = await this.getOrCreatePrompt(configName)
    
    if (config) {
      return config
    }
    
    // Return null to trigger fallback to Chat Completions API
    console.error(`[ResponsesConfigManager] No configuration found for '${configName}'`)
    console.error(`[ResponsesConfigManager] Falling back to Chat Completions API`)
    return null
  }
}

// Singleton instance manager with caching
class ConfigManagerSingleton {
  private static instance: ResponsesConfigManager | null = null
  private static configCache: Map<string, {config: ResponsesAPIConfig, timestamp: number}> = new Map()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static getInstance(): ResponsesConfigManager {
    if (!this.instance) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing for ResponsesConfigManager')
      }
      
      this.instance = new ResponsesConfigManager(supabaseUrl, supabaseServiceKey)
    }
    return this.instance
  }

  static getCachedConfig(name: string): ResponsesAPIConfig | null {
    const cached = this.configCache.get(name)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.config
    }
    return null
  }

  static setCachedConfig(name: string, config: ResponsesAPIConfig): void {
    this.configCache.set(name, {
      config: config,
      timestamp: Date.now()
    })
  }

  static clearCache(): void {
    this.configCache.clear()
  }

  static getCacheStats(): {size: number, keys: string[]} {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    }
  }
}

// Helper function to get the default config manager instance
export function getResponsesConfigManager(): ResponsesConfigManager {
  return ConfigManagerSingleton.getInstance()
}