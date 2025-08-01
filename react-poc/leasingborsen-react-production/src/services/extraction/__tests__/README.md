# Extraction Changes Test Suite

## Critical Context for New Session

### Recent Bug Fixes (January 2025)

This test suite was created to validate critical fixes to the extraction changes system, particularly DELETE operations that were failing due to database constraints.

#### 1. DELETE Operation Failure
**Problem**: "column reference 'existing_listing_id' is ambiguous" error
**Fix**: Renamed variable to `v_existing_listing_id` in database function `apply_selected_extraction_changes`

#### 2. Foreign Key Constraint Violations  
**Problem**: "update or delete on table 'listings' violates foreign key constraint"
**Fix**: Changed DELETE logic to clear ALL references before deletion:
```sql
-- Before (buggy):
UPDATE extraction_listing_changes 
SET existing_listing_id = NULL
WHERE existing_listing_id = existing_listing_id 
  AND id != ANY(p_selected_change_ids);

-- After (fixed):
UPDATE extraction_listing_changes 
SET existing_listing_id = NULL
WHERE existing_listing_id = v_existing_listing_id;
```

#### 3. Toyota bZ4X Duplicate Creation
**Problem**: Same car with different transmissions created duplicates
**Fix**: Removed transmission from exact key generation:
```typescript
// Before: generateExactKey(make, model, variant, transmission)
// After: generateExactKey(make, model, variant)
```

### Key Files Modified
- `supabase/functions/compare-extracted-listings/index.ts` - Updated matching logic
- Database function: `apply_selected_extraction_changes` - Fixed DELETE operations
- `src/services/comparison/comparison-utils.ts` - Frontend matching logic

### Important Behavioral Change
⚠️ **WARNING**: The deletion logic no longer restricts by model. When uploading partial inventories (e.g., single model PDFs), ALL unmatched listings will be marked for deletion. Always review extraction results carefully before applying changes.

## Test Structure

```
src/services/extraction/__tests__/
├── README.md                      # This file
├── delete-operations.test.ts      # Core DELETE functionality tests
├── toyota-bzx4.test.ts           # Toyota matching logic tests
├── apply-changes.test.ts         # General CRUD operations
├── fixtures/
│   ├── toyota-bzx4.ts           # Toyota test scenarios
│   ├── multiple-references.ts    # Foreign key scenarios
│   └── extraction-sessions.ts    # Common test sessions
└── helpers/
    ├── database-setup.ts        # Mock database utilities
    └── assertion-helpers.ts     # Custom test assertions
```

## Quick Start

```bash
# Run all extraction tests
npm run test:extraction

# Watch mode for development
npm run test:extraction:watch

# Coverage report
npm run test:extraction:coverage

# Interactive UI
npm run test:extraction:ui
```

## Key Test Scenarios

### 1. DELETE Operations (`delete-operations.test.ts`)
- Multiple `extraction_listing_changes` referencing same listing
- Cascade deletion of `lease_pricing` records
- Variable naming ambiguity fix validation
- Foreign key constraint handling

### 2. Toyota bZ4X (`toyota-bzx4.test.ts`)
- Exact key generation without transmission
- Matching logic for same model/variant with different transmissions
- Duplicate prevention validation

### 3. Batch Operations (`apply-changes.test.ts`)
- Mixed CREATE + UPDATE + DELETE in single session
- Partial batch failure handling
- Error recovery and reporting

## Test Database Mock

The tests use an in-memory mock that simulates our PostgreSQL structure:

```typescript
interface TestDatabase {
  listings: Map<string, any>;
  extraction_listing_changes: Map<string, any>;
  lease_pricing: Map<string, any>;
  extraction_sessions: Map<string, any>;
}
```

The mock implements the fixed DELETE logic, including:
- Clearing ALL foreign key references
- Proper cascade deletion order
- Error handling for constraint violations

## Adding New Tests

1. **For Bug Fixes**: Create a specific test that reproduces the exact bug scenario
2. **For New Features**: Add both unit tests and integration tests
3. **Use Test Factories**: Leverage fixtures for consistent test data
4. **Document Context**: Add comments explaining why the test exists

## Integration Testing

For testing against real Supabase:

```bash
# Set test environment variables
export VITE_SUPABASE_TEST_URL=your-test-url
export VITE_SUPABASE_TEST_ANON_KEY=your-test-key

# Run integration tests
npm run test:extraction -- --grep "integration"
```

## Debugging Tips

1. **Enable verbose logging**: Set `DEBUG=extraction:*` environment variable
2. **Check mock database state**: Use `console.log(db)` in tests
3. **Validate SQL queries**: Review Edge Function logs in Supabase dashboard
4. **Test specific scenarios**: Use `.only` to focus on failing tests

## Related Documentation

- `docs/archive/EXTRACTION_DELETE_FIX_2025.md` - Detailed technical documentation
- `CLAUDE.md` - AI extraction system overview
- `docs/archive/AI_EXTRACTION_SYSTEM.md` - Complete extraction workflow