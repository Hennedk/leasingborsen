# Session 2025-08-30: Yearly Mileage Navigation Investigation

## Session Summary
Investigated user-reported issue where yearly mileage selection wasn't being carried over when navigating from /listings to individual listing detail pages. Only worked after page refresh.

## Key Finding
**Issue was already fixed!** The latest commits had resolved the problem:

### The Fix (Already Applied)
- **Commit**: `a0dca96` - "fix(production): resolve navigation issue in listing detail page" 
- **File**: `src/hooks/useLeaseCalculator.ts` line 325
- **Change**: Added `car?.listing_id` to reset effect dependencies
- **Code**: `}, [car?.id, car?.listing_id]`

### Root Cause Analysis
The issue was a production vs development environment difference:
1. Production car objects use `listing_id` field
2. Development/staging use `id` field  
3. The reset effect was only watching `car?.id`
4. In production, when navigating between cars, the calculator state wouldn't reset
5. This prevented proper initialization with new car's selected mileage values

### The Solution
By watching both `car?.id` AND `car?.listing_id`, the reset effect now properly triggers in all environments:
1. User selects mileage on /listings page
2. ListingCard passes URL params as selectedMileage/selectedTerm/selectedDeposit
3. Reset effect triggers when car changes (via listing_id in production)
4. Calculator state resets to null
5. Initialization effect runs and picks up car's selected_* values
6. Correct mileage is displayed

## Related Commits Reviewed
- `a0dca96` - Fix production navigation issue
- `fd9f4fb` - Selected offer mileage display fix
- `15cd8e1` - Preserve selected mileage on detail (main implementation)

## Status
✅ **RESOLVED** - Issue has been fixed and deployed to production
- No additional changes needed
- Fix is working in production environment
- Navigation from /listings to /listing now properly carries over mileage selection

## Files Analyzed
- `src/hooks/useLeaseCalculator.ts` - Main calculator logic
- `src/components/ListingCard.tsx` - Navigation parameter passing
- `src/pages/Listing.tsx` - Parameter handling
- `src/lib/supabase.ts` - Data fetching with offer selection

## Key Learning
Always check both development and production field names when dealing with database objects. The `id` vs `listing_id` difference was crucial to identifying this environment-specific issue.