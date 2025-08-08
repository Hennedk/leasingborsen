# Debugging Mobile Price Impacts Not Showing

## Issue
Price impacts implemented in MobilePriceOverlay are not appearing in production on mobile devices.

## Debugging Steps

### 1. Check if price impact data exists
Add this temporary debug code to MobilePriceOverlay.tsx right after the component props:

```typescript
// TEMPORARY DEBUG - Remove after fixing
useEffect(() => {
  if (isOpen) {
    console.log('MobilePriceOverlay Debug:', {
      mileagePriceImpacts: mileagePriceImpacts ? Array.from(mileagePriceImpacts.entries()) : 'undefined',
      periodPriceImpacts: periodPriceImpacts ? Array.from(periodPriceImpacts.entries()) : 'undefined',
      upfrontPriceImpacts: upfrontPriceImpacts ? Array.from(upfrontPriceImpacts.entries()) : 'undefined',
      selectedMileage,
      selectedPeriod,
      selectedUpfront,
      availableMileages,
      availablePeriods,
      availableUpfronts
    })
  }
}, [isOpen, mileagePriceImpacts, periodPriceImpacts, upfrontPriceImpacts])
```

### 2. Check if PriceImpactSelectItem is rendering
Add this to PriceImpactSelectItem.tsx at the beginning of the component:

```typescript
// TEMPORARY DEBUG
console.log('PriceImpactSelectItem render:', { value, label, impact })
```

### 3. Verify in Browser DevTools

On mobile (or mobile emulation):
1. Open a listing detail page
2. Click to open the mobile price overlay
3. Open browser console
4. Check for the debug logs
5. Try to select a dropdown and see if options appear

### 4. Check CSS/Styling Issues

In browser DevTools:
1. Inspect the dropdown content when open
2. Look for elements with class `PriceImpactSelectItem` or containing price impact text
3. Check if they have `display: none` or `visibility: hidden`
4. Check z-index issues

### 5. Possible Root Causes

#### A. Data not being passed (most likely)
- Price impacts are undefined/null
- Maps are empty
- useLeaseCalculator not returning price impacts on mobile

#### B. Component not rendering
- PriceImpactSelectItem not compatible with Radix Select on mobile
- Conditional rendering hiding the content

#### C. CSS hiding content
- Responsive classes hiding price text
- Overflow hidden cutting off content
- Z-index issues with mobile overlay

### 6. Quick Fix to Test

Replace one dropdown with explicit debug content to isolate the issue:

```typescript
<SelectContent className="max-h-[50vh]">
  {availableMileages.map((mileage) => {
    const impact = mileagePriceImpacts?.get(mileage)
    console.log(`Mileage ${mileage} impact:`, impact)
    
    return (
      <SelectItem key={`mileage-${mileage}`} value={mileage.toString()}>
        {mileage.toLocaleString('da-DK')} km/år
        {impact && impact.difference !== 0 && (
          <span className="ml-2 text-sm font-medium">
            {impact.difference > 0 ? '+' : ''}{impact.difference} kr/md
          </span>
        )}
      </SelectItem>
    )
  })}
</SelectContent>
```

This will show if the issue is with PriceImpactSelectItem specifically or with the data.

## Deploy Testing

After adding debug code:
1. Test locally first with mobile emulation
2. Deploy to staging/preview if available
3. Test on actual mobile device
4. Check browser console for debug output

## Solution Paths

Based on findings:

### If data is missing:
- Check useLeaseCalculator hook
- Verify PriceMatrix calculations
- Ensure offers are loaded before calculating impacts

### If component issue:
- May need to use SelectItem with inline price display on mobile
- Check PriceImpactSelectItem forward ref compatibility

### If CSS issue:
- Add explicit mobile styles
- Remove any hidden/display none classes
- Ensure z-index is high enough