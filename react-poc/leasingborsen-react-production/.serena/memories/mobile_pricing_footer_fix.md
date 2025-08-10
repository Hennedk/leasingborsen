# Mobile Pricing Footer Fix

## Issue
The sticky pricing footer in MobilePriceDrawer was not properly showing when the offer configuration was expanded on the listing detail page. This was caused by z-index conflicts with the MobilePriceBar component.

## Solution Applied
1. **Z-index hierarchy fix**: Changed MobilePriceDrawer z-index from `z-50` to `z-[60]` (both overlay and content) to ensure it appears above MobilePriceBar
2. **Conditional rendering**: Hide MobilePriceBar when drawer is open (`!mobilePriceOpen`) to prevent visual overlap

## Files Modified
- `src/components/MobilePriceDrawer.tsx`: Updated z-index values
- `src/pages/Listing.tsx`: Added conditional rendering for MobilePriceBar

## Result
The pricing footer now properly displays in the drawer and the MobilePriceBar is hidden when the drawer is open, preventing any visual conflicts.