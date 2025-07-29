# Extraction Changes Application Issues - Complete Documentation

## Overview
Multiple interconnected issues were encountered with the extraction changes application system that prevented UPDATE operations from working properly. This document provides a comprehensive analysis of the problems, solutions implemented, and remaining work.

**Status as of January 28, 2025:**
- ✅ **Issue 1 Resolved**: Session state consistency fixed
- ✅ **Issue 2 Resolved**: PostgreSQL function JSON response structure fixed  
- 🔍 **Issue 3 Ongoing**: Offers/lease pricing updates failing silently

---

## Issue Timeline & Analysis

### Issue 1: Session 26665971-d8c5-43ce-b264-a5daa6273e5f
**Reported Problem**: User saw DELETE operations mentioned in toast messages but UPDATE operations were not being applied.

#### Investigation Process
1. **Database Query Results**:
   - Session showed `total_deleted: 3` but no delete change records existed
   - 6 UPDATE changes remained in 'pending' status  
   - Session status was inconsistent

2. **Root Cause Identified**:
   - July 25th migration deletion logic (lines 426-429) removes ALL extraction_listing_changes that reference a listing being deleted
   - DELETE operations were processed but change records were prematurely cleaned up
   - Left session in inconsistent state where UPDATE operations couldn't proceed

3. **Technical Details**:
   ```sql
   -- Problematic deletion logic from July 25th migration
   DELETE FROM extraction_listing_changes 
   WHERE existing_listing_id = v_listing_to_delete;
   ```
   This removes ALL change records for a listing, including those from other sessions.

#### Resolution ✅
**Date**: January 28, 2025  
**Method**: Manual application using correct change IDs  
**Script Used**: `fix-extraction-session-26665971.sql`  
**Result**: All 6 UPDATE changes successfully applied with proper counters

---

### Issue 2: PostgreSQL Function JSON Response Structure
**Reported Problem**: Edge Function logs showed `undefined` values for key fields:
- `Creates applied: undefined`
- `Updates applied: undefined`  
- `Changes discarded: undefined`

#### Investigation Process
1. **Edge Function Logs Analysis**:
   ```
   [apply-extraction-changes] Change types to process: { update: 14 }
   [apply-extraction-changes] Operation completed successfully:
     - Creates applied: undefined
     - Updates applied: undefined
     - Deletes applied: 0
     - Changes discarded: undefined
   ```

2. **Root Cause Identified**:
   - Edge Function expected specific JSON field names in response
   - PostgreSQL function `json_build_object()` was incomplete
   - Missing fields: `applied_creates`, `applied_updates`, `discarded_count`, `applied_at`

3. **Technical Analysis**:
   - Function was processing changes correctly (counters incrementing)
   - But `json_build_object()` construction was incomplete
   - Edge Function received partial JSON, interpreted missing fields as `undefined`

#### Resolution ✅
**Date**: January 28, 2025  
**Method**: Updated PostgreSQL function with complete JSON response  
**Script Used**: `fix-apply-function-json-fields.sql`

**Key Changes Made**:
```sql
-- Fixed JSON construction with ALL required fields
result := json_build_object(
  'applied_creates', applied_creates,
  'applied_updates', applied_updates,        -- Was missing
  'applied_deletes', applied_deletes,
  'discarded_count', discarded_count,        -- Was missing  
  'total_processed', total_processed,
  'error_count', error_count,
  'error_details', error_details,
  'session_id', p_session_id,
  'applied_by', p_applied_by,
  'applied_at', NOW()                        -- Was missing
);
```

**Verification**:
- Toast messages now show correct counts (e.g., "14 opdateret")
- Edge Function logs show proper numeric values instead of `undefined`

---

### Issue 3: Session 64ad98ac-06fc-40ad-9cef-6c0aeb6323b7 - Offers Not Updating 🔍
**Current Problem**: UPDATE operations apply successfully and show correct toast messages, but lease pricing/offers not actually updated. AI repeatedly detects the same 14 changes on subsequent extractions.

#### Investigation Status
**Confirmed Working**:
- ✅ UPDATE function processes changes correctly
- ✅ Toast messages show proper counts  
- ✅ Data types are valid for casting (`monthly_price`, `period_months`, etc.)

**Data Validation Results**:
```
monthly_price_text: 3395    -> Valid decimal
period_months_text: 48      -> Valid integer  
mileage_per_year_text: 10000 -> Valid integer
first_payment_text: 4995    -> Valid decimal
```

#### Suspected Root Causes
1. **Silent Constraint Failures**:
   - DELETE/INSERT pricing logic encounters foreign key issues
   - Function continues successfully but pricing doesn't actually change
   - No error thrown, so UPDATE counter increments normally

2. **Data Format Mismatch**:
   - Current pricing stored in different format than extracted
   - AI detects differences that appear identical to humans
   - Example: `3395.00` vs `3395` or precision differences

3. **Transaction Rollback**:
   - Some part of UPDATE transaction fails and rolls back pricing changes
   - Main listing updates succeed, creating partial update state

4. **Trigger Interference**:
   - Lease score calculation triggers may interfere with pricing updates
   - Similar to deletion trigger conflicts resolved in July 25th migration

#### Diagnostic Tools Created
- `debug-offers-update-issue.sql` - Comprehensive analysis script
- `debug-offers-comparison.sql` - Current vs extracted pricing comparison

#### Next Steps Required
1. **Run Comparison Analysis**: Compare current vs extracted offers format
2. **Add Pricing-Specific Error Handling**: Separate pricing update error tracking
3. **Verify Transaction Integrity**: Ensure pricing updates don't get silently rolled back

---

## Technical Architecture Analysis

### Database Structure
```
extraction_sessions
├── id (UUID)
├── status ('pending', 'processing', 'completed', 'failed')  
├── total_deleted, total_updated (counters)
└── applied_at (timestamp)

extraction_listing_changes
├── session_id -> extraction_sessions.id
├── existing_listing_id -> listings.id (for updates/deletes)
├── change_type ('create', 'update', 'delete', 'unchanged')
├── change_status ('pending', 'applied', 'discarded')
└── extracted_data (JSONB with offers array)

listings
├── id (UUID)
├── [vehicle fields]
└── lease_pricing[] (one-to-many relationship)

lease_pricing  
├── listing_id -> listings.id
├── monthly_price (DECIMAL)
├── period_months (INTEGER)
├── mileage_per_year (INTEGER)
└── first_payment (DECIMAL)
```

### Function Architecture
```
Edge Function: apply-extraction-changes
├── Input validation
├── Session verification  
├── Calls PostgreSQL: apply_selected_extraction_changes()
└── Returns formatted response to frontend

PostgreSQL Function: apply_selected_extraction_changes()
├── Status updates (pending -> applied/discarded)
├── Processing loop:
│   ├── CREATE: Insert new listings + pricing
│   ├── UPDATE: Update listings + replace pricing  
│   └── DELETE: Remove pricing + listings
└── JSON response with counters
```

### Migration History Impact
- **July 19, 2025**: `20250719_fix_apply_function_rls.sql` - RLS fixes for admin operations
- **July 23, 2025**: `20250723_fix_incomplete_update_fields.sql` - Enhanced UPDATE field coverage
- **July 25, 2025**: `20250725_fix_deletion_lease_score_trigger_conflict.sql` - Fixed deletion trigger conflicts
- **January 28, 2025**: `fix-apply-function-json-fields.sql` - Fixed JSON response structure

**Issue**: Multiple function versions created confusion about active logic. July 25th migration was most comprehensive but may have introduced UPDATE issues while fixing DELETE problems.

---

## Solutions Implemented

### 1. Manual Session Recovery
**Problem**: Inconsistent session state  
**Solution**: Direct application of pending changes with correct IDs
```sql
SELECT apply_selected_extraction_changes(
  '26665971-d8c5-43ce-b264-a5daa6273e5f'::UUID,
  ARRAY[...pending change IDs...],
  'admin'
);
```

### 2. PostgreSQL Function JSON Fix
**Problem**: Incomplete JSON response structure  
**Solution**: Enhanced `json_build_object()` with all required fields
- Added error handling for both success and exception paths
- Ensured consistent field names expected by Edge Function
- Maintained backward compatibility

### 3. Enhanced Error Reporting
**Added Features**:
- Comprehensive error details in JSON response
- Individual change error tracking
- ROW_COUNT verification for deletion operations
- Context-specific error messages

---

## Prevention Strategies

### 1. Atomic Transaction Management
**Implementation Needed**:
- Ensure all related changes (listings + pricing) succeed or fail together
- Add transaction rollback detection and reporting
- Separate pricing update validation from main listing updates

### 2. State Consistency Validation
**Recommendations**:
- Add session state validation before processing
- Detect and auto-correct inconsistent session states  
- Implement session recovery mechanisms for partial failures

### 3. Comprehensive Error Handling
**Current Gaps**:
- Pricing update failures not separately tracked
- Silent constraint violations not detected
- Missing ROW_COUNT verification for pricing operations

**Proposed Enhancements**:
```sql
-- Add pricing-specific error tracking
pricing_insert_count INTEGER := 0;
pricing_delete_count INTEGER := 0;

-- Verify pricing operations
GET DIAGNOSTICS pricing_delete_count = ROW_COUNT;
IF pricing_delete_count = 0 AND expected_pricing_count > 0 THEN
  RAISE EXCEPTION 'Failed to delete existing pricing for listing %', existing_listing_id;
END IF;
```

### 4. Data Format Standardization
**Issues to Address**:
- Decimal precision consistency between extracted and stored data
- Null value handling in pricing fields
- Type casting validation before database operations

### 5. Testing Framework
**Needed Components**:
- Automated tests for extraction change application
- Test data with various edge cases and data formats
- Verification of pricing updates specifically
- Transaction rollback testing

---

## Current Status & Next Steps

### Immediate Actions Required (High Priority)
1. **🔍 Complete Offers Diagnostic**: Run comparison script to identify exact cause of pricing update failures
2. **🛠️ Enhance Error Handling**: Add pricing-specific error tracking to PostgreSQL function  
3. **✅ Verify Transaction Integrity**: Ensure pricing updates don't get rolled back silently

### Medium-Term Improvements
1. **🔧 Refactor Function Architecture**: Separate concerns - listings vs pricing updates
2. **📊 Add Comprehensive Logging**: Track each step of the update process for debugging
3. **🧪 Create Automated Tests**: Prevent regression of these issues

### Long-Term Architecture
1. **📋 Review Migration Strategy**: Avoid multiple conflicting function versions
2. **🔍 Implement Monitoring**: Real-time detection of extraction processing issues
3. **📈 Performance Optimization**: Handle large extraction sessions more efficiently

---

## Reference Information

### Key Files
- **PostgreSQL Function**: `apply_selected_extraction_changes()` in various migrations
- **Edge Function**: `supabase/functions/apply-extraction-changes/index.ts`
- **Frontend Hook**: `src/hooks/useListingComparison.ts`
- **Diagnostic Scripts**: `debug-offers-*.sql`

### Database Objects
- **Tables**: `extraction_sessions`, `extraction_listing_changes`, `listings`, `lease_pricing`
- **Functions**: `apply_selected_extraction_changes()`, `mark_lease_score_stale()`
- **Triggers**: `pricing_score_stale` on `lease_pricing`

### Error Patterns to Watch
- `undefined` values in Edge Function logs = JSON response structure issues
- Toast showing "0 updates" but changes processed = counter not incrementing
- Repeated change detection = data not actually updating despite successful processing
- Session status inconsistencies = partial processing with cleanup issues

---

**Document Created**: January 28, 2025  
**Last Updated**: January 28, 2025  
**Status**: Living document - update as issues are resolved