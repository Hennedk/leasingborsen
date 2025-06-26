import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { config } from '../config'

describe('AI Extraction Config', () => {
  let originalEnv: typeof process.env

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('returns correct default values', () => {
    // Clear relevant env vars
    delete process.env.VITE_AI_EXTRACTION_ENABLED
    delete process.env.VITE_MAX_COST_PER_PDF_CENTS
    delete process.env.VITE_DAILY_COST_LIMIT_USD

    expect(config.isEnabled()).toBe(true)
    expect(config.getMaxCostPerPdfCents()).toBe(20)
    expect(config.getDailyCostLimitCents()).toBe(1000)
  })

  test('reads environment variables correctly', () => {
    process.env.VITE_AI_EXTRACTION_ENABLED = 'false'
    process.env.VITE_MAX_COST_PER_PDF_CENTS = '50'
    process.env.VITE_DAILY_COST_LIMIT_USD = '25'

    expect(config.isEnabled()).toBe(false)
    expect(config.getMaxCostPerPdfCents()).toBe(50)
    expect(config.getDailyCostLimitCents()).toBe(2500) // $25 = 2500 cents
  })

  test('provider configuration checks', () => {
    // Mock env for OpenAI
    process.env.VITE_OPENAI_API_KEY = 'test-key'
    expect(config.isProviderConfigured('openai')).toBe(true)

    // Mock env for Anthropic
    process.env.VITE_ANTHROPIC_API_KEY = 'test-key'
    expect(config.isProviderConfigured('anthropic')).toBe(true)

    // Mock provider always configured
    expect(config.isProviderConfigured('mock')).toBe(true)
  })

  test('returns primary and fallback providers', () => {
    process.env.VITE_AI_PROVIDER_PRIMARY = 'openai'
    process.env.VITE_AI_PROVIDER_FALLBACK = 'anthropic'

    expect(config.getPrimaryProvider()).toBe('openai')
    expect(config.getFallbackProvider()).toBe('anthropic')
  })

  test('returns model configurations', () => {
    process.env.VITE_OPENAI_MODEL = 'gpt-4-turbo-preview'
    process.env.VITE_ANTHROPIC_MODEL = 'claude-3-opus-20240229'

    expect(config.getOpenAIModel()).toBe('gpt-4-turbo-preview')
    expect(config.getAnthropicModel()).toBe('claude-3-opus-20240229')
  })

  test('returns timeout and retry settings', () => {
    process.env.VITE_EXTRACTION_TIMEOUT_SECONDS = '120'
    process.env.VITE_EXTRACTION_MAX_RETRIES = '5'

    expect(config.getTimeoutMs()).toBe(120000) // 120 seconds
    expect(config.getMaxRetries()).toBe(5)
  })

  test('returns available providers list', () => {
    process.env.VITE_OPENAI_API_KEY = 'test-key'
    process.env.VITE_ANTHROPIC_API_KEY = 'test-key'

    const providers = config.getAvailableProviders()
    expect(providers).toContain('openai')
    expect(providers).toContain('anthropic')
    expect(providers).toContain('mock')
  })

  test('handles missing environment variables gracefully', () => {
    delete process.env.VITE_AI_PROVIDER_PRIMARY
    delete process.env.VITE_AI_PROVIDER_FALLBACK

    expect(config.getPrimaryProvider()).toBe('mock')
    expect(config.getFallbackProvider()).toBe('mock')
  })

  test('validates cost limits are positive', () => {
    process.env.VITE_MAX_COST_PER_PDF_CENTS = '-10'
    process.env.VITE_DAILY_COST_LIMIT_USD = '-5'

    expect(config.getMaxCostPerPdfCents()).toBeGreaterThan(0)
    expect(config.getDailyCostLimitCents()).toBeGreaterThan(0)
  })
})