# AI Extraction Validation System

This validation system provides comprehensive validation for extracted car data using Zod schemas and Danish market-specific business rules.

## Features

- **Schema Validation**: Uses Zod for structural validation and type safety
- **Business Rules**: Danish market-specific validation (pricing, specifications, brands)
- **Confidence Scoring**: Calculates confidence scores based on validation results
- **Danish Localization**: Supports Danish number formats and currency validation
- **Comprehensive Error Reporting**: Detailed errors and warnings with field paths

## Usage

### Basic Validation

```typescript
import { CarDataValidator } from '@/services/ai-extraction/validation'

// Validate extracted data
const result = await CarDataValidator.validate(extractedData)

if (result.isValid) {
  console.log('Data is valid!')
  console.log(`Confidence: ${Math.round(result.confidence * 100)}%`)
} else {
  console.log('Validation failed:')
  result.errors.forEach(error => {
    console.log(`- ${error.field}: ${error.message}`)
  })
}
```

### Quick Validation

For performance-critical scenarios, use quick validation:

```typescript
const isValid = await CarDataValidator.validateQuick(data)
if (!isValid) {
  // Perform full validation for detailed errors
  const fullResult = await CarDataValidator.validate(data)
}
```

### Working with Results

```typescript
const result = await CarDataValidator.validate(data)

// Get validation summary
const summary = CarDataValidator.getValidationSummary(result)
console.log(summary) // "Validation: PASSED | Errors: 0 | Warnings: 2 | Confidence: 85%"

// Format errors for display
if (result.errors.length > 0) {
  const errorText = CarDataValidator.formatValidationErrors(result.errors)
  console.log(errorText)
}

// Get only critical errors
const criticalErrors = CarDataValidator.getCriticalErrors(result)
```

## Validation Rules

### Schema Validation

The system validates against these schemas:

- **DocumentInfo**: Brand, date, currency, language, document type
- **Vehicle**: Model, category, lease period, powertrain type, variants
- **VehicleVariant**: Name, engine, transmission, pricing, specifications
- **Pricing**: Monthly payment, first payment, total cost, kilometers, CO2 tax
- **Specifications**: Fuel consumption, CO2 emissions, electric range, battery, power

### Danish Market Business Rules

#### Pricing Rules
- Monthly lease: 1,000 - 50,000 DKK
- First payment: 0 - 500,000 DKK  
- Annual kilometers: 5,000 - 100,000 km
- CO2 tax: 0 - 15,000 DKK (biannual)

#### Specification Rules
- Fuel consumption: 0.5 - 50 km/l
- CO2 emissions: 0 - 500 g/km
- Electric range: 50 - 1,000 km
- Battery capacity: 10 - 200 kWh
- Horsepower: 50 - 2,000 hp
- Acceleration: 2 - 30 seconds

#### Consistency Rules
- Powertrain type must match engine specifications
- Electric vehicles must have battery capacity and range
- Brand names are validated against Danish market brands
- Pricing consistency within vehicle models

## Error Types

### Critical Errors
- Missing required fields
- Invalid data types or formats
- Values outside acceptable ranges
- Schema validation failures

### Warnings
- Inconsistent data patterns
- Unknown brands (with suggestions)
- High price variations
- Missing optional but important fields

## Confidence Scoring

Confidence is calculated based on:

- **Structure Validity** (40%): Valid Zod schema
- **No Critical Errors** (30%): No required field or range errors
- **Completeness** (20%): How much data is present
- **Consistency** (10%): Internal data consistency

## Danish Number Format Support

The system supports Danish number formats:

```typescript
import { BusinessRules } from '@/services/ai-extraction/validation'

// Parse Danish numbers
const price = BusinessRules.parseDanishNumber('1.234,56') // Returns 1234.56
const formatted = BusinessRules.formatDanishCurrency(1234) // Returns "1.234 kr"
```

## Example Data

See `example.ts` for complete examples of valid and invalid data structures.

## Integration

The validation system integrates with the AI extraction pipeline:

```typescript
import { CarDataValidator } from '@/services/ai-extraction/validation'

// In your extraction pipeline
const extractedData = await extractCarData(pdfContent)
const validationResult = await CarDataValidator.validate(extractedData)

if (!validationResult.isValid) {
  const criticalErrors = CarDataValidator.getCriticalErrors(validationResult)
  if (criticalErrors.length > 0) {
    throw new Error(`Critical validation errors: ${CarDataValidator.formatValidationErrors(criticalErrors)}`)
  }
}

// Log validation summary
console.log(CarDataValidator.getValidationSummary(validationResult))
```