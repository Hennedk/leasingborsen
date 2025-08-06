# Card Layout Issue - Session End Summary

## Problem
User wants 4 cards to fit perfectly within container, with 5th card spilling over. Currently 4th card is overspilling.

## Current State
- **Component**: `CarListingGrid.tsx` 
- **Current formula**: `w-[calc((100%-3*1rem)/4)] lg:w-[calc((100%-3*1.5rem)/4)]`
- **Gap settings**: `gap-4 lg:gap-6` (16px/24px)
- **Issue**: 4th card overspills instead of fitting perfectly

## What We've Tried
1. ❌ `min-w-72 sm:min-w-80` - caused horizontal expansion
2. ❌ `w-[calc(25%-12px)]` - made cards too narrow
3. ❌ `w-[calc((100%-3*1rem)/4)]` - still causes 4th card overspill

## Fixes Applied Successfully
- ✅ Similar cars image mapping (`image: scoredCar.image_url`)
- ✅ Similar cars data mapping (mileage_per_year default)
- ✅ Removed height constraints to prevent internal scrolling

## Next Steps for Continuation
1. **Debug CSS calc approach**: Check if gap calculation is incorrect
2. **Try simpler approach**: Use `flex: 1` for first 4 cards, `flex-none` for rest
3. **Consider CSS Grid**: `grid-template-columns: repeat(4, 1fr)` + overflow
4. **Manual width testing**: Try fixed percentages like `w-[24%]`

## Files to Focus On
- `src/components/CarListingGrid.tsx` (lines 80, 91)
- Test both homepage "Seneste biler" and listing page "Lignende annoncer"

## Status
- Images: ✅ Fixed
- Data mapping: ✅ Fixed  
- Height constraints: ✅ Fixed
- Width distribution: ❌ Still needs work

The core functionality is working, just need to fine-tune the card width calculation.