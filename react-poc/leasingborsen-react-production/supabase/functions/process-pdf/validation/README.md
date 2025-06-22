# Cross-Dealer Validation and Standardization System

The cross-dealer validation system ensures consistent data quality and formatting across all dealer types and PDF formats. It provides universal validation, normalization, and standardization capabilities.

## 🎯 Overview

This system addresses the challenge of processing vehicle data from different dealers who use varying formats, naming conventions, and units. It standardizes all extracted data to ensure consistency regardless of the source dealer.

## 🔧 Core Components

### 1. CrossDealerValidator (`CrossDealerValidator.ts`)
The main validation engine that:
- Standardizes model and variant names
- Validates technical specifications against industry ranges
- Normalizes body types, fuel types, and transmission types
- Performs unit conversions (HP ↔ kW, L/100km ↔ km/L)
- Calculates quality scores and completeness metrics
- Generates validation flags and normalization records

### 2. StandardizationMaps (`StandardizationMaps.ts`)
Comprehensive mapping tables that provide:
- Model name aliases and fuzzy matching
- Body type standardization
- Fuel type mapping
- Transmission type normalization
- Brand name variations
- Specification parsing and validation

### 3. UnitConverter (`UnitConverter.ts`)
Handles all automotive unit conversions:
- Power: HP ↔ kW
- Fuel consumption: L/100km ↔ km/L ↔ MPG
- Electric consumption: kWh/100km ↔ miles/kWh
- Distance: km ↔ miles
- Automatic unit detection and conversion
- Validation of conversion results

## 📊 Quality Scoring System

The system calculates multiple quality scores for each vehicle:

### Data Completeness Score (0-1)
Based on the presence of required, important, and optional fields:
- **Required fields** (weight: 3): model, variant, pricingOptions
- **Important fields** (weight: 2): horsepower, fuelType, bodyType, transmission
- **Optional fields** (weight: 1): co2Emission, fuelConsumption

### Validation Confidence Score (0-1)
Based on validation flags:
- Each error flag: -0.3
- Each warning flag: -0.1

### Cross-Dealer Consistency Score (0-1)
Based on how well data fits standard patterns:
- Fewer normalizations = higher consistency
- Measures standardization requirements

### Overall Quality Score (0-1)
Weighted combination:
- Data Completeness: 40%
- Validation Confidence: 40%
- Cross-Dealer Consistency: 20%

## 🔄 Standardization Process

### 1. Model Name Standardization
```typescript
// Input variations from different dealers
"ID 4" → "ID.4"
"id4" → "ID.4"
"Id.4" → "ID.4"
"e-tron GT" → "e-tron GT"
"etron GT" → "e-tron GT"
```

### 2. Technical Specification Validation
```typescript
// Power standardization
"150 HP" → normalized to 150 HP (rounded to nearest 5)
"110 kW" → converted to 150 HP

// Fuel consumption normalization
"5.8 L/100km" → standardized format
"17.2 km/L" → converted to 5.8 L/100km
```

### 3. Type Standardization
```typescript
// Body types
"suv" → "SUV"
"Compact SUV" → "Compact SUV"
"estate" → "Estate"

// Fuel types
"Battery" → "Electric"
"BEV" → "Electric"
"hybrid" → "Hybrid"

// Transmission
"Automatisk" → "Automatic"
"DSG" → "DSG"
"CVT" → "CVT"
```

## 📈 Validation Ranges

Industry-standard validation ranges are enforced:

```typescript
{
  priceRange: { min: 1000, max: 50000 },        // kr/month
  horsepowerRange: { min: 50, max: 1000 },      // HP
  fuelConsumptionRange: { min: 2.0, max: 25.0 }, // L/100km
  co2EmissionRange: { min: 0, max: 400 },       // g/km
  electricRangeRange: { min: 100, max: 800 },   // km
  leasingTermRange: { min: 12, max: 60 },       // months
  mileageRange: { min: 5000, max: 50000 }       // km/year
}
```

## 🚀 Usage Examples

### Basic Validation
```typescript
import { CrossDealerValidator } from './CrossDealerValidator.ts'

const validator = new CrossDealerValidator()
const result = await validator.validateAndStandardize(extractedVehicles)

console.log(`Quality Score: ${result.overallQualityScore}`)
console.log(`Vehicles Passed: ${result.validationSummary.passedValidation}`)
```

### Unit Conversion
```typescript
import { UnitConverter } from './UnitConverter.ts'

// Convert power units
const hpToKw = UnitConverter.hpToKw(150) // 150 HP → 110.3 kW

// Auto-detect and convert
const auto = UnitConverter.detectAndConvert("5.8 L/100km", "km/L")
console.log(auto?.value) // 17.2
```

### Model Name Standardization
```typescript
import { StandardizationMaps } from './StandardizationMaps.ts'

const result = StandardizationMaps.findStandardizedModel("ID 4", "Volkswagen")
console.log(result?.standardName) // "ID.4"
console.log(result?.confidence)   // 1.0
```

## 🎯 Integration with GenericPDFProcessor

The validation system is automatically integrated into the PDF processing pipeline:

```typescript
// In GenericPDFProcessor.processPDF()
await progressTracker.updateProgress(95, 'Applying cross-dealer validation...')
const validationResult = await this.crossDealerValidator.validateAndStandardize(vehicles)

return {
  // ... other results
  standardizedVehicles: validationResult.standardizedVehicles,
  validationSummary: validationResult.validationSummary,
  overallQualityScore: validationResult.overallQualityScore
}
```

## 📋 Validation Output

Each standardized vehicle includes:

```typescript
interface StandardizedVehicle extends ExtractedVehicle {
  // Standardized fields
  standardizedModel: string
  standardizedVariant: string
  standardizedBodyType?: string
  standardizedFuelType?: string
  standardizedTransmission?: string
  
  // Unit conversions
  horsepowerHP?: number
  horsepowerKW?: number
  fuelConsumptionL100km?: number
  fuelConsumptionKmL?: number
  
  // Quality metrics
  dataCompleteness: number
  validationConfidence: number
  crossDealerConsistency: number
  qualityScore: number
  
  // Audit trail
  validationFlags: ValidationFlag[]
  normalizations: NormalizationRecord[]
}
```

## 🔍 Supported Dealer Formats

The system handles data from all major dealer types:

- **Volkswagen Group** (VW, Audi, Škoda, SEAT)
- **BMW Group** (BMW, MINI)
- **Mercedes-Benz**
- **Toyota/Lexus**
- **Ford**
- **Volvo**
- **Generic/Unknown** dealers

## ⚙️ Configuration

The validation system uses the universal dealer configuration (`universal.json`) for cross-dealer compatibility, but can be customized per dealer if needed.

## 🧪 Testing

Run the comprehensive example to see the system in action:

```typescript
import { CrossDealerValidationExample } from '../examples/CrossDealerValidationExample.ts'

await CrossDealerValidationExample.runExample()
```

This demonstrates:
- Real-world data from different dealers
- Standardization and validation results
- Quality scoring examples
- Unit conversion demonstrations
- Model name normalization

## 🎨 Benefits

1. **Consistency**: All dealer data follows the same format
2. **Quality**: Comprehensive validation and scoring
3. **Completeness**: Missing data detection and scoring
4. **Accuracy**: Industry-standard range validation
5. **Traceability**: Complete audit trail of changes
6. **Flexibility**: Extensible mapping and validation rules
7. **Performance**: Efficient processing with caching support

The cross-dealer validation system ensures that regardless of the source dealer format, all vehicle data is consistently validated, standardized, and scored for quality before being stored in the database.