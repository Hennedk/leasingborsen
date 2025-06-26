import { describe, expect, test } from 'vitest'
import { 
  ExtractionError,
  ValidationError,
  ProviderError,
  CostLimitError,
  TimeoutError,
  ErrorType,
  categorizeError,
  getRetryDelay,
  isExtractionError,
  isValidationError,
  isProviderError,
  isCostLimitError,
  isTimeoutError
} from '../utils/errors'

describe('ExtractionError', () => {
  test('creates base error correctly', () => {
    const error = new ExtractionError(
      ErrorType.EXTRACTION,
      'Test error message',
      { testData: 'value' },
      true,
      'Danish user message'
    )

    expect(error.type).toBe(ErrorType.EXTRACTION)
    expect(error.message).toBe('Test error message')
    expect(error.details.testData).toBe('value')
    expect(error.retryable).toBe(true)
    expect(error.userMessage).toBe('Danish user message')
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  test('generates default Danish user messages', () => {
    const extractionError = new ExtractionError(ErrorType.EXTRACTION, 'Test')
    const validationError = new ExtractionError(ErrorType.VALIDATION, 'Test')
    const providerError = new ExtractionError(ErrorType.PROVIDER, 'Test')
    const costError = new ExtractionError(ErrorType.COST_LIMIT, 'Test')
    const timeoutError = new ExtractionError(ErrorType.TIMEOUT, 'Test')

    expect(extractionError.userMessage).toBe('Der opstod en fejl ved behandling af dokumentet')
    expect(validationError.userMessage).toBe('Dokumentet kunne ikke valideres korrekt')
    expect(providerError.userMessage).toBe('Tjenesten er midlertidigt utilgængelig')
    expect(costError.userMessage).toBe('Omkostningsgrænsen er nået')
    expect(timeoutError.userMessage).toBe('Behandlingen tog for lang tid')
  })

  test('serializes to JSON correctly', () => {
    const error = new ExtractionError(
      ErrorType.VALIDATION,
      'Validation failed',
      { field: 'test' },
      false
    )

    const json = error.toJSON()

    expect(json).toHaveProperty('name', 'ExtractionError')
    expect(json).toHaveProperty('type', ErrorType.VALIDATION)
    expect(json).toHaveProperty('message', 'Validation failed')
    expect(json).toHaveProperty('details')
    expect(json).toHaveProperty('retryable', false)
    expect(json).toHaveProperty('timestamp')
    expect(json).toHaveProperty('stack')
  })

  test('creates client-safe version', () => {
    const error = new ExtractionError(
      ErrorType.PROVIDER,
      'Internal API key error',
      { apiKey: 'secret-key', sensitiveData: 'hidden' },
      true
    )

    const clientSafe = error.toClientSafe()

    expect(clientSafe).toHaveProperty('type', ErrorType.PROVIDER)
    expect(clientSafe).toHaveProperty('retryable', true)
    expect(clientSafe).toHaveProperty('timestamp')
    expect(clientSafe).not.toHaveProperty('message') // Sensitive message excluded
    expect(clientSafe).not.toHaveProperty('details') // Sensitive details excluded
    expect(clientSafe).not.toHaveProperty('stack')
  })
})

describe('ValidationError', () => {
  test('creates validation error with field info', () => {
    const error = ValidationError.requiredField('pricing.monthlyPayment')

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.field).toBe('pricing.monthlyPayment')
    expect(error.expectedType).toBe('required')
    expect(error.retryable).toBe(false)
  })

  test('creates invalid type error', () => {
    const error = ValidationError.invalidType('age', 'number', 'string')

    expect(error.field).toBe('age')
    expect(error.expectedType).toBe('number')
    expect(error.receivedValue).toBe('string')
  })

  test('creates invalid format error', () => {
    const error = ValidationError.invalidFormat('date', 'YYYY-MM-DD', '01/01/2024')

    expect(error.field).toBe('date')
    expect(error.expectedType).toBe('YYYY-MM-DD')
    expect(error.receivedValue).toBe('01/01/2024')
  })
})

describe('ProviderError', () => {
  test('creates rate limit error', () => {
    const error = ProviderError.rateLimited('openai', 60)

    expect(error).toBeInstanceOf(ProviderError)
    expect(error.provider).toBe('openai')
    expect(error.statusCode).toBe(429)
    expect(error.rateLimited).toBe(true)
    expect(error.retryable).toBe(true)
    expect(error.details.retryAfter).toBe(60)
  })

  test('creates API error', () => {
    const error = ProviderError.apiError('anthropic', 500, 'Internal server error', 'INTERNAL_ERROR')

    expect(error.provider).toBe('anthropic')
    expect(error.statusCode).toBe(500)
    expect(error.providerErrorCode).toBe('INTERNAL_ERROR')
    expect(error.retryable).toBe(true) // 5xx errors are retryable
  })

  test('creates network error', () => {
    const originalError = new Error('Connection timeout')
    const error = ProviderError.networkError('openai', originalError)

    expect(error.provider).toBe('openai')
    expect(error.providerErrorCode).toBe('network_error')
    expect(error.details.originalError).toBe('Connection timeout')
  })

  test('determines retryability correctly', () => {
    const rateLimitError = ProviderError.rateLimited('openai')
    const serverError = ProviderError.apiError('openai', 500, 'Server error')
    const clientError = ProviderError.apiError('openai', 400, 'Bad request')

    expect(rateLimitError.retryable).toBe(true)
    expect(serverError.retryable).toBe(true)
    expect(clientError.retryable).toBe(false)
  })
})

describe('CostLimitError', () => {
  test('creates monthly cost limit error', () => {
    const error = CostLimitError.monthly(2500, 2000) // 25$ spent, 20$ limit

    expect(error).toBeInstanceOf(CostLimitError)
    expect(error.currentCost).toBe(2500)
    expect(error.limit).toBe(2000)
    expect(error.period).toBe('monthly')
    expect(error.retryable).toBe(false)
  })

  test('creates daily cost limit error', () => {
    const error = CostLimitError.daily(500, 300)

    expect(error.currentCost).toBe(500)
    expect(error.limit).toBe(300)
    expect(error.period).toBe('daily')
  })

  test('includes Danish user message', () => {
    const error = CostLimitError.monthly(2500, 2000)
    expect(error.userMessage).toContain('Omkostningsgrænsen')
    expect(error.userMessage).toContain('måned')
  })
})

describe('TimeoutError', () => {
  test('creates extraction timeout error', () => {
    const error = TimeoutError.extraction(30000)

    expect(error).toBeInstanceOf(TimeoutError)
    expect(error.operation).toBe('extraction')
    expect(error.timeoutMs).toBe(30000)
    expect(error.retryable).toBe(true)
  })

  test('creates API call timeout error', () => {
    const error = TimeoutError.apiCall('openai', 60000)

    expect(error.operation).toBe('api_call_openai')
    expect(error.timeoutMs).toBe(60000)
    expect(error.details.provider).toBe('openai')
  })

  test('includes processing time in user message', () => {
    const error = TimeoutError.extraction(45000) // 45 seconds
    expect(error.userMessage).toContain('45s')
  })
})

describe('Error Type Guards', () => {
  test('identifies error types correctly', () => {
    const extractionError = new ExtractionError(ErrorType.EXTRACTION, 'Test')
    const validationError = new ValidationError('Test', 'field')
    const providerError = new ProviderError('openai', 'Test')
    const costError = new CostLimitError(100, 50)
    const timeoutError = new TimeoutError('test', 1000)
    const regularError = new Error('Regular error')

    expect(isExtractionError(extractionError)).toBe(true)
    expect(isValidationError(validationError)).toBe(true)
    expect(isProviderError(providerError)).toBe(true)
    expect(isCostLimitError(costError)).toBe(true)
    expect(isTimeoutError(timeoutError)).toBe(true)

    expect(isExtractionError(regularError)).toBe(false)
    expect(isValidationError(extractionError)).toBe(false)
  })
})

describe('Error Categorization', () => {
  test('categorizes extraction errors correctly', () => {
    const extractionError = new ExtractionError(ErrorType.PROVIDER, 'Test')
    const categorized = categorizeError(extractionError)

    expect(categorized).toBe(extractionError)
  })

  test('categorizes timeout errors from message', () => {
    const timeoutError = new Error('Request timeout after 30 seconds')
    const categorized = categorizeError(timeoutError)

    expect(categorized).toBeInstanceOf(TimeoutError)
    expect(categorized.type).toBe(ErrorType.TIMEOUT)
  })

  test('categorizes rate limit errors from message', () => {
    const rateLimitError = new Error('Rate limit exceeded (429)')
    const categorized = categorizeError(rateLimitError)

    expect(categorized).toBeInstanceOf(ProviderError)
    expect(categorized.type).toBe(ErrorType.PROVIDER)
  })

  test('categorizes validation errors from message', () => {
    const validationError = new Error('Validation failed: invalid format')
    const categorized = categorizeError(validationError)

    expect(categorized).toBeInstanceOf(ValidationError)
    expect(categorized.type).toBe(ErrorType.VALIDATION)
  })

  test('categorizes unknown errors as extraction errors', () => {
    const unknownError = new Error('Something went wrong')
    const categorized = categorizeError(unknownError)

    expect(categorized).toBeInstanceOf(ExtractionError)
    expect(categorized.type).toBe(ErrorType.EXTRACTION)
    expect(categorized.retryable).toBe(true)
  })

  test('handles non-Error objects', () => {
    const categorized = categorizeError('String error')

    expect(categorized).toBeInstanceOf(ExtractionError)
    expect(categorized.details.originalError).toBe('String error')
  })
})

describe('Retry Delay Calculation', () => {
  test('returns 0 for non-retryable errors', () => {
    const error = new ValidationError('Test')
    const delay = getRetryDelay(error, 1)

    expect(delay).toBe(0)
  })

  test('calculates exponential backoff for rate limits', () => {
    const error = ProviderError.rateLimited('openai')
    
    const delay1 = getRetryDelay(error, 1)
    const delay2 = getRetryDelay(error, 2)
    const delay3 = getRetryDelay(error, 3)

    expect(delay2).toBeGreaterThan(delay1)
    expect(delay3).toBeGreaterThan(delay2)
    expect(delay3).toBeLessThanOrEqual(60000) // Max 1 minute
  })

  test('calculates linear backoff for timeouts', () => {
    const error = TimeoutError.extraction(30000)
    
    const delay1 = getRetryDelay(error, 1)
    const delay2 = getRetryDelay(error, 2)

    expect(delay2).toBe(delay1 * 2)
  })

  test('calculates exponential backoff for extraction errors', () => {
    const error = new ExtractionError(ErrorType.EXTRACTION, 'Test', {}, true)
    
    const delay1 = getRetryDelay(error, 1)
    const delay2 = getRetryDelay(error, 2)
    const delay3 = getRetryDelay(error, 3)

    expect(delay2).toBe(delay1 * 2)
    expect(delay3).toBe(delay1 * 4)
    expect(delay3).toBeLessThanOrEqual(30000) // Max 30 seconds
  })
})