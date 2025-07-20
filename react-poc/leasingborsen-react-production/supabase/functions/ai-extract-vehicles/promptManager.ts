// Internal prompt management system
// Replaces reliance on OpenAI's stored prompts API

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface PromptVersion {
  prompt_id: string
  version: number
  system_prompt: string
  user_prompt_template: string
  model: string
  temperature: number
  max_tokens: number
  response_format?: any
}

export interface PromptContext {
  dealerName?: string
  fileName?: string
  referenceData?: string
  existingListings?: string
  pdfText: string
  extractionInstructions?: {
    prioritizeExistingVariants?: boolean
    mergeTransmissionVariants?: boolean
    rangeHandling?: string
    variantMatchingRules?: {
      hpMatchThreshold?: number
      hpCreateThreshold?: number
      equipmentSeparator?: string
      strictMatching?: boolean
    }
  }
}

export class InternalPromptManager {
  private supabase: any
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }
  
  /**
   * Get the latest version of a prompt by name
   */
  async getLatestPrompt(promptName: string): Promise<PromptVersion | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_latest_prompt_version', { prompt_name: promptName })
        .single()
      
      if (error) {
        console.error('[InternalPromptManager] Error fetching prompt:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('[InternalPromptManager] Failed to get prompt:', error)
      return null
    }
  }
  
  /**
   * Build the final prompts by replacing template variables
   */
  buildPrompts(promptVersion: PromptVersion, context: PromptContext): {
    systemPrompt: string
    userPrompt: string
    model: string
    temperature: number
    maxTokens: number
  } {
    // Build system prompt (no replacements needed for current version)
    const systemPrompt = promptVersion.system_prompt
    
    // Build user prompt by replacing template variables
    let userPrompt = promptVersion.user_prompt_template
    
    // Replace template variables
    userPrompt = userPrompt.replace('{{DEALER_CONTEXT}}', 
      `Dealer: ${context.dealerName || 'Unknown'}\nFile: ${context.fileName || 'PDF Upload'}`
    )
    
    userPrompt = userPrompt.replace('{{REFERENCE_DATA}}', context.referenceData || '')
    userPrompt = userPrompt.replace('{{EXISTING_LISTINGS}}', context.existingListings || '')
    userPrompt = userPrompt.replace('{{PDF_TEXT}}', context.pdfText)
    
    // Build extraction instructions
    const extractionInstructions = `
- Prioritize existing variants: ${context.extractionInstructions?.prioritizeExistingVariants || true}
- Merge transmission variants: ${context.extractionInstructions?.mergeTransmissionVariants || true}
- Range handling: ${context.extractionInstructions?.rangeHandling || 'use-context'}
- HP match threshold: ±${context.extractionInstructions?.variantMatchingRules?.hpMatchThreshold || 5} HP
- HP create threshold: >${context.extractionInstructions?.variantMatchingRules?.hpCreateThreshold || 10} HP
- Equipment separator: "${context.extractionInstructions?.variantMatchingRules?.equipmentSeparator || ' – '}"
- Strict variant matching: ${context.extractionInstructions?.variantMatchingRules?.strictMatching || true}`
    
    userPrompt = userPrompt.replace('{{EXTRACTION_INSTRUCTIONS}}', extractionInstructions)
    
    return {
      systemPrompt,
      userPrompt,
      model: promptVersion.model,
      temperature: promptVersion.temperature,
      maxTokens: promptVersion.max_tokens
    }
  }
  
  /**
   * Create a new version of a prompt
   */
  async createNewVersion(
    promptName: string,
    systemPrompt: string,
    userPromptTemplate: string,
    changelog: string,
    model: string = 'gpt-4-1106-preview'
  ): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('create_prompt_version', {
          p_prompt_name: promptName,
          p_system_prompt: systemPrompt,
          p_user_prompt_template: userPromptTemplate,
          p_changelog: changelog,
          p_model: model
        })
      
      if (error) {
        console.error('[InternalPromptManager] Error creating prompt version:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('[InternalPromptManager] Failed to create prompt version:', error)
      return null
    }
  }
}

// Helper function to get the default prompt manager instance
export function getPromptManager(): InternalPromptManager {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }
  
  return new InternalPromptManager(supabaseUrl, supabaseServiceKey)
}