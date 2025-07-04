// AI utility functions for cost estimation

// Cost estimation helpers
export const AI_PRICING = {
  'gpt-3.5-turbo': {
    input_per_1k: 0.0015,  // $0.0015 per 1K input tokens
    output_per_1k: 0.002   // $0.002 per 1K output tokens
  },
  'gpt-4-turbo': {
    input_per_1k: 0.01,    // $0.01 per 1K input tokens
    output_per_1k: 0.03    // $0.03 per 1K output tokens
  }
}

export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English/Danish
  return Math.ceil(text.length / 4)
}

export function estimateCost(inputTokens: number, outputTokens: number, model: string = 'gpt-3.5-turbo'): number {
  const pricing = AI_PRICING[model as keyof typeof AI_PRICING] || AI_PRICING['gpt-3.5-turbo']
  
  const inputCost = (inputTokens / 1000) * pricing.input_per_1k
  const outputCost = (outputTokens / 1000) * pricing.output_per_1k
  
  return inputCost + outputCost
}