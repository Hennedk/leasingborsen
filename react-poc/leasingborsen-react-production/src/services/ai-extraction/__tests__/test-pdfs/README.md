# Test PDF Data

This directory contains sample PDF content and validation data for testing the AI extraction service.

## Test PDF Content Files

These files contain text content that simulates what would be extracted from real PDF documents:

- `toyota-aygo-x-2024.txt` - Simple Toyota model with 3 variants
- `bmw-business-leasing-2024.txt` - BMW business leasing with electric and hybrid models
- `mercedes-comprehensive-2024.txt` - Complex Mercedes document with multiple models
- `multi-brand-dealer-2024.txt` - Document with multiple brands (edge case)
- `invalid-pricing-example.txt` - Document with validation issues
- `minimal-content.txt` - Minimal content for basic testing

## Expected Results

Each PDF content file has a corresponding JSON file with the expected extraction result:

- `toyota-aygo-x-2024.expected.json`
- `bmw-business-leasing-2024.expected.json`
- `mercedes-comprehensive-2024.expected.json`
- etc.

## Validation Test Cases

- `validation-errors.json` - Test cases that should produce validation errors
- `business-rules-tests.json` - Danish market specific validation tests
- `edge-cases.json` - Edge cases and boundary conditions

## Usage

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'

// Load test content
const testContent = readFileSync(
  join(__dirname, 'toyota-aygo-x-2024.txt'), 
  'utf-8'
)

// Load expected result
const expectedResult = JSON.parse(readFileSync(
  join(__dirname, 'toyota-aygo-x-2024.expected.json'), 
  'utf-8'
))

// Run extraction test
const result = await extractionService.extract(testContent, options)
expect(result.data).toEqual(expectedResult)
```

## Test Categories

### 1. Standard Documents
Realistic car leasing documents with typical structure and content.

### 2. Edge Cases
- Minimal content
- Missing information
- Multi-brand documents
- Special characters
- Very long documents

### 3. Validation Cases
- Invalid pricing (too low/high)
- Missing required fields
- Inconsistent data
- Non-Danish brands
- Incorrect powertrains

### 4. Performance Cases
- Large documents (8000+ tokens)
- Many variants (20+ per model)
- Complex specifications
- Multiple accessories

## Maintenance

When adding new test cases:

1. Create the content file (`.txt`)
2. Create the expected result file (`.expected.json`)
3. Add validation expectations if relevant
4. Update this README with the new test case
5. Add the test case to the test runner

## Real PDF Testing

For testing with actual PDF files:

1. Place PDF files in `real-pdfs/` subdirectory
2. Ensure no sensitive dealer information is included
3. Use PDFPlumber to extract text content
4. Manually verify expected results
5. Add to integration test suite