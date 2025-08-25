# Scroll Restoration Race Condition Fix - January 25, 2025

## Issue
When navigating back from `/listing` to `/listings`, the scroll position was not being restored. The saved position (e.g., 526px) was being overwritten with 0 immediately after navigation.

## Root Cause
A race condition in the scroll restoration logic:
1. The scroll save handler was running before restoration completed
2. Position 0 was being saved on mount, overwriting the stored position
3. The `isNavigatingAway` flag wasn't being properly managed

## Solution Implemented

### 1. Enhanced `useListingsScrollRestoration.ts`
- Added debounced save handler (100ms delay) to prevent rapid saves
- Added mount time tracking to prevent saves within first 500ms
- Enhanced position 0 protection logic:
  - Won't save 0 if there's a saved position > 100 within 2 seconds of mount
  - Won't save 0 within 3 seconds after restoration
- Extended `isRestoring` flag duration to 300ms after restoration completes
- Added `hasRestoredRef` to track if restoration occurred

### 2. Enhanced `useNavigationContext.ts`
- Added timestamp saving alongside scroll position for freshness checks
- Save both `listings-scroll:${normalizedSearch}` and `${key}:timestamp`

## Key Changes
- Debouncing prevents immediate saves during mount/restoration
- Mount time tracking prevents race conditions
- Better protection against overwriting valid positions with 0
- Timestamp tracking ensures fresh data

## Testing
The fix should handle:
- Navigation from `/listings` → `/listing/:id` → back to `/listings`
- Both browser back button and programmatic navigation
- Different filter combinations
- Scroll positions at various heights

## Result
Scroll position is now properly restored when navigating back to the listings page, with no visible jumps or position loss.