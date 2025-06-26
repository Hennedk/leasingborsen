# AI Extraction Utilities

This directory contains utility functions and classes for the AI extraction service.

## logger.ts - ExtractionLogger

A comprehensive logging utility specifically designed for AI extraction operations with both console and database persistence.

### Features

- **Multi-level logging**: debug, info, warn, error with configurable filtering
- **Structured console output**: Formatted logs with timestamps and context
- **Database persistence**: Automatic logging to Supabase extraction_logs table
- **Cost tracking**: Log AI usage costs and performance metrics  
- **Extraction workflow tracking**: Start/success/failure/partial extraction logging
- **Metadata sanitization**: Remove sensitive data and handle large payloads
- **Query capabilities**: Retrieve extraction history and statistics
- **Child loggers**: Create loggers with additional context
- **Configurable output**: Control console vs database logging independently

### Quick Start

```typescript
import { createExtractionLogger } from './utils/logger'

// Create logger with context
const logger = createExtractionLogger('BMW Denmark', 'https://example.com/prices.pdf')

// Basic logging
logger.info('Starting extraction', { documentType: 'price_list' })
logger.error('Extraction failed', { reason: 'API timeout' }, new Error('Timeout'))

// Track full extraction workflow
const logId = await logger.logExtractionStart(pdfUrl, dealerName)
try {
  const result = await extractCarData(content)
  if (result.success) {
    await logger.logExtractionSuccess(logId, result, result.data!, processingTime)
  } else {
    await logger.logExtractionFailure(logId, result.error!, processingTime, 'openai')
  }
} catch (error) {
  await logger.logExtractionFailure(logId, error, processingTime, 'openai')
}

// Query extraction history
const recent = await logger.getRecentExtractions(10, 'BMW Denmark')
const stats = await logger.getExtractionStats(startDate, endDate)
const costs = await logger.getCostSummary()
```

### Configuration Options

```typescript
interface LoggerConfig {
  enableConsoleLogging: boolean    // Output to console
  enableDatabaseLogging: boolean   // Store in Supabase
  minLogLevel: LogLevel           // Filter log levels
  includeStackTrace: boolean      // Add stack traces for errors
  maxMetadataSize: number         // Limit metadata size (bytes)
}
```

### Factory Functions

- `createExtractionLogger(dealer?, pdfUrl?)` - Standard extraction logger
- `createDebugLogger()` - Verbose logging for development
- `createProductionLogger()` - Minimal output for production

### Database Integration

The logger automatically writes to the `extraction_logs` table in Supabase with:

- Extraction attempt tracking (start/success/failure/partial)
- Cost and performance metrics
- AI provider and model information
- Raw responses and extracted data for debugging
- Validation errors and retry information

### Testing

Comprehensive test suite in `logger.test.ts` covers:

- Basic logging functionality
- Log level filtering
- Context handling and child loggers
- Metadata sanitization
- Extraction workflow tracking
- Cost and performance logging
- Configuration management

Run tests with: `npm test src/services/ai-extraction/utils/logger.test.ts`

## cost-calculator.ts

Utility for calculating and tracking AI extraction costs across providers and time periods.

## errors.ts 

Error handling utilities and custom error types for the extraction service.