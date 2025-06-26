# AI Extraction Service

A comprehensive AI-powered service for extracting structured car leasing data from Danish PDF documents.

## 🎯 Features

- **Multi-Provider Support**: OpenAI GPT-4, Anthropic Claude-3, and Mock provider
- **Smart Provider Selection**: Primary/fallback strategy with cost optimization
- **Cost Management**: Real-time cost tracking and budget enforcement
- **Data Validation**: Comprehensive validation with Danish market business rules
- **Retry Logic**: Exponential backoff with provider fallback
- **Comprehensive Logging**: Database and console logging with performance metrics
- **Danish Localization**: Specialized for Danish car leasing terminology

## 🏗️ Architecture

```
src/services/ai-extraction/
├── extraction/
│   ├── extractor.ts          # Main orchestrator service
│   ├── index.ts              # Extraction module exports
│   └── test-extraction.ts    # Testing utilities
├── providers/
│   ├── base.ts               # Abstract provider base class
│   ├── openai.ts             # OpenAI GPT-4 provider
│   ├── anthropic.ts          # Anthropic Claude-3 provider
│   ├── mock.ts               # Mock provider for testing
│   └── index.ts              # Provider exports
├── validation/
│   ├── validator.ts          # Main validation orchestrator
│   ├── schemas.ts            # Zod schemas for data structure
│   ├── rules.ts              # Danish market business rules
│   └── index.ts              # Validation exports
├── utils/
│   ├── cost-calculator.ts    # Cost tracking and budget management
│   ├── logger.ts             # Comprehensive logging system
│   └── errors.ts             # Custom error classes
├── config.ts                 # Configuration management
├── types.ts                  # TypeScript type definitions
└── index.ts                  # Main service exports
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { extractionService } from '@/services/ai-extraction'

// Extract data from PDF content
const result = await extractionService.extract(pdfContent, {
  dealer: 'Toyota Denmark',
  language: 'da',
  strategy: 'primary_with_fallback'
})

if (result.success && result.data) {
  console.log(`Extracted ${result.data.vehicles.length} vehicles`)
  result.data.vehicles.forEach(vehicle => {
    console.log(`${vehicle.model}: ${vehicle.variants.length} variants`)
  })
}
```

### Advanced Configuration

```typescript
import { createCostOptimizedService, createAccuracyOptimizedService } from '@/services/ai-extraction'

// Cost-optimized service (lower accuracy, lower cost)
const costService = createCostOptimizedService()

// Accuracy-optimized service (higher accuracy, higher cost)  
const accuracyService = createAccuracyOptimizedService()
```

### Testing

```typescript
import { createTestService } from '@/services/ai-extraction'

// Create service for testing (uses mock provider)
const testService = createTestService()

// Test provider availability
const mockTest = await testService.testProvider('mock', sampleContent)
console.log(`Mock provider available: ${mockTest.available}`)
```

## ⚙️ Configuration

Set environment variables:

```bash
# AI Provider Configuration
VITE_AI_EXTRACTION_ENABLED=true
VITE_AI_PROVIDER_PRIMARY=openai
VITE_AI_PROVIDER_FALLBACK=anthropic

# API Keys
VITE_OPENAI_API_KEY=your_openai_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key

# Model Versions
VITE_OPENAI_MODEL=gpt-4-turbo-preview
VITE_ANTHROPIC_MODEL=claude-3-opus-20240229

# Cost Controls
VITE_MAX_COST_PER_PDF_CENTS=20
VITE_DAILY_COST_LIMIT_USD=10
VITE_MAX_TOKENS_PER_PDF=8000

# Extraction Settings
VITE_EXTRACTION_TIMEOUT_SECONDS=60
VITE_EXTRACTION_MAX_RETRIES=2
VITE_EXTRACTION_CONFIDENCE_THRESHOLD=0.8
```

## 📊 Provider Strategies

### `primary_only`
Uses only the configured primary provider.

### `primary_with_fallback` (Default)
Tries primary provider first, falls back to secondary if primary fails.

### `cost_optimized`
Orders providers by cost efficiency (cheapest first).

### `all_providers`
Tries all available providers until one succeeds.

## 🎯 Data Structure

The service extracts structured data matching this format:

```typescript
interface ExtractedCarData {
  documentInfo: {
    brand: string
    documentDate: string
    currency: string
    language: string
    documentType: 'private_leasing' | 'business_leasing' | 'price_list'
  }
  vehicles: Array<{
    model: string
    category?: string
    leasePeriodMonths: number
    powertrainType: 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'plugin_hybrid'
    variants: Array<{
      variantName: string
      engineSpecification: string
      transmission: 'manual' | 'automatic' | 'cvt'
      pricing: {
        monthlyPayment: number
        firstPayment?: number
        totalCost?: number
        annualKilometers?: number
        co2TaxBiannual?: number
      }
      specifications?: {
        fuelConsumptionKmpl?: number
        co2EmissionsGkm?: number
        energyLabel?: string
        electricRangeKm?: number | null
        batteryCapacityKwh?: number | null
        horsePower?: number
        acceleration0to100?: number
      }
    }>
  }>
  accessories?: Array<{
    packageName: string
    description?: string
    monthlyCost: number
    category: 'wheels' | 'service' | 'insurance' | 'other'
    packageCode?: string
  }>
  metadata?: {
    extractionTimestamp: string
    documentPages?: number
    extractionWarnings?: string[]
  }
}
```

## 🔍 Validation

The service includes comprehensive validation:

- **Schema Validation**: Zod-based structure validation
- **Business Rules**: Danish market-specific validation
- **Data Quality**: Completeness and consistency checks
- **Confidence Scoring**: 0-1 scale based on data quality

## 💰 Cost Management

Built-in cost controls:

- **Per-PDF Limits**: Maximum cost per extraction
- **Daily Limits**: Daily spending caps
- **Monthly Limits**: Monthly spending caps
- **Real-time Tracking**: Live cost monitoring
- **Provider Comparison**: Cost efficiency analysis

## 📝 Logging

Comprehensive logging system:

- **Structured Logging**: JSON-formatted logs
- **Database Integration**: Extraction history tracking
- **Performance Metrics**: Processing time and cost tracking
- **Error Analysis**: Detailed error categorization
- **Cost Analytics**: Provider and dealer cost breakdowns

## 🧪 Testing

Run the test suite:

```typescript
import { testExtractionService } from '@/services/ai-extraction/extraction/test-extraction'

// Run comprehensive test
await testExtractionService()
```

## 🛠️ Development

### Adding New Providers

1. Extend `BaseAIProvider`
2. Implement required methods
3. Add to provider initialization in `extractor.ts`
4. Update configuration in `config.ts`

### Custom Validation Rules

1. Add rules to `validation/rules.ts`
2. Update `BusinessRules` class
3. Test with Danish market data

### Error Handling

All errors implement the `ExtractionError` interface:

```typescript
interface ExtractionError {
  type: 'validation' | 'api' | 'parsing' | 'cost_limit' | 'timeout' | 'unknown'
  message: string
  details?: any
  retryable?: boolean
}
```

## 📚 API Reference

### Main Service

- `extract(content, options)` - Extract data from PDF content
- `getServiceStatus()` - Get service health and statistics
- `testProvider(name, content?)` - Test specific provider
- `getCostSummary()` - Get cost tracking summary

### Configuration

- `config.isProviderConfigured(name)` - Check provider setup
- `config.getDailyCostLimitCents()` - Get cost limits
- `config.getTimeoutMs()` - Get timeout settings

### Validation

- `CarDataValidator.validate(data)` - Validate extracted data
- `CarDataValidator.validateQuick(data)` - Fast validation
- `CarDataValidator.getCriticalErrors(result)` - Get critical errors

### Cost Tracking

- `costCalculator.canAffordExtraction(...)` - Check affordability
- `costCalculator.recordCost(...)` - Record extraction cost
- `costCalculator.getCostSummary()` - Get cost statistics

## 🔧 Troubleshooting

### Common Issues

**Provider Not Available**
- Check API keys in environment variables
- Verify provider configuration
- Test provider connectivity

**Validation Failures**
- Review extracted data structure
- Check Danish market business rules
- Adjust confidence threshold

**Cost Limit Exceeded**
- Review daily/monthly spending
- Adjust cost limits in configuration
- Use cost-optimized strategy

**Timeout Errors**
- Increase timeout duration
- Reduce document size
- Use faster provider

### Debug Mode

Enable detailed logging:

```typescript
import { createDebugLogger } from '@/services/ai-extraction'

const debugService = new AIExtractionService({
  customLogger: createDebugLogger(),
  enableLogging: true
})
```

## 📈 Performance

### Optimization Tips

1. **Use Mock Provider for Development** - Avoid API costs during testing
2. **Implement Content Preprocessing** - Clean and optimize PDF content before extraction
3. **Cache Results** - Store successful extractions to avoid re-processing
4. **Monitor Costs** - Set up alerts for unusual spending patterns
5. **Provider Selection** - Choose appropriate strategy for your use case

### Benchmarks

Typical performance metrics:

- **Mock Provider**: ~500ms, ~1¢ cost
- **OpenAI GPT-4**: ~3-8s, ~5-15¢ cost
- **Anthropic Claude-3**: ~4-10s, ~8-25¢ cost

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add comprehensive tests for new features
3. Update validation rules for new car brands
4. Maintain Danish localization
5. Document new configuration options

## 📄 License

Part of the Leasingbørsen React application.