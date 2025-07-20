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
   * Create a new version of a configuration
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
    try {
      const { data, error } = await this.supabase
        .rpc('create_config_version', {
          p_config_name: configName,
          p_openai_prompt_id: openai_prompt_id,
          p_openai_prompt_version: openai_prompt_version,
          p_model: model,
          p_temperature: temperature,
          p_max_completion_tokens: max_completion_tokens,
          p_changelog: changelog,
          p_created_by: created_by
        })
      
      if (error) {
        console.error('[ResponsesConfigManager] Error creating version:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('[ResponsesConfigManager] Failed to create version:', error)
      return null
    }
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
   */
  private getSystemPromptTemplate(): string {
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
   Example: "Ultimate 325 HK 4WD" → "Ultimate 325 HK 4WD – 20\" alufælge, soltag"

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