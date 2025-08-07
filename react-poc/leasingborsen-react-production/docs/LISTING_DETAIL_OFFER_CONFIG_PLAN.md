# Listing Detail Page Offer Configuration - Implementation Plan

## Overview
Enhance the car listing detail page with intelligent offer configuration features that improve price transparency and decision-making for Danish consumers.

## Phase 1: Foundation & Quick Wins (1-2 days)

### Features
1. **Total Cost Display**
   - Show total lease cost below monthly price
   - Formula: `(monthly_price × period_months) + first_payment`
   - Format: "Samlet: 67.080 kr over 24 måneder"

2. **"Laveste pris" Quick Configure Button**
   - Leverage existing `resetToCheapest()` function
   - Add button above dropdowns
   - Visual indicator when current selection is cheapest

### Technical Requirements
- Modify `LeaseCalculatorCard.tsx`
- Update `useLeaseCalculator` hook with total cost calculation
- Use existing shadcn/ui Button components

### Deliverables
```tsx
// New UI elements in LeaseCalculatorCard
<div className="space-y-2">
  <h3 className="text-3xl font-bold">{monthly} kr/md</h3>
  <p className="text-sm text-muted-foreground">
    Samlet: {totalCost.toLocaleString('da-DK')} kr over {period} måneder
  </p>
</div>

<Button variant="outline" size="sm" onClick={resetToCheapest}>
  <TrendingDown className="w-4 h-4 mr-1" />
  Laveste pris
</Button>
```

## Phase 2: Value-Based Selection (2-3 days)

### Features
1. **"Bedste værdi" Quick Configure Button**
   - Find configuration with highest `lease_score`
   - Indicate when current selection has best score
   - Tooltip showing lease score on hover

2. **Lease Score Integration**
   - Display lease score badge for current configuration
   - Update when configuration changes

### Technical Requirements
- Ensure `lease_pricing` table includes `lease_score` per configuration
- Add `resetToBestValue()` to `useLeaseCalculator`
- Import and use `LeaseScoreBadge` component

### Dependencies
- Database migration to add `lease_score` to `lease_pricing` table (if not present)
- Edge function update for score calculation per configuration

### Deliverables
```tsx
// Quick configure buttons
<div className="flex gap-2 mb-4">
  <Button onClick={resetToCheapest}>Laveste pris</Button>
  <Button onClick={resetToBestValue}>Bedste værdi</Button>
</div>

// Score display
{selectedLease?.lease_score && (
  <LeaseScoreBadge score={selectedLease.lease_score} size="sm" />
)}
```

## Phase 3: Price Impact Visualization (3-4 days)

### Features
1. **Dropdown Price Impact Display**
   - Show price difference for each option
   - Green for savings, red for increases
   - "Nuværende" label for current selection

2. **Enhanced Select Components**
   - Custom `PriceImpactSelectItem` component
   - Consistent formatting across all dropdowns

### Technical Requirements
- Create `PriceImpactSelectItem.tsx` component
- Update `useLeaseCalculator` to provide price impact data
- Modify all three Select components in `LeaseCalculatorCard`

### Deliverables
```tsx
// Price impact in dropdowns
<Select value={selectedMileage?.toString()}>
  <SelectContent>
    {availableMileages.map(mileage => (
      <PriceImpactSelectItem
        key={mileage}
        value={mileage.toString()}
        label={`${mileage.toLocaleString('da-DK')} km/år`}
        currentPrice={selectedLease?.monthly_price || 0}
        optionPrice={priceMatrix[mileage]?.[selectedPeriod]?.[selectedUpfront]?.price || 0}
      />
    ))}
  </SelectContent>
</Select>
```

## Phase 4: Dynamic Price Feedback (2-3 days)

### Features
1. **Animated Price Updates**
   - Smooth number transitions on price change
   - Temporary difference indicator (+200 kr)
   - Pulse effect on price change

2. **Price History Tracking**
   - Track previous price for animations
   - Show direction of change

### Technical Requirements
- Create `AnimatedPrice.tsx` component
- Add price history state management
- CSS animations using Tailwind classes

### Deliverables
```tsx
// Animated price display
<AnimatedPrice 
  value={selectedLease?.monthly_price || 0}
  previousValue={previousPrice}
/>

// CSS classes
.animate-price-pulse {
  animation: pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1);
}
```

## Phase 5: Mobile Optimization (1-2 days)

### Features
1. **Mobile Price Overlay Updates**
   - Add quick configure buttons to mobile view
   - Ensure price impacts work in `MobilePriceOverlay`
   - Optimize touch interactions

### Technical Requirements
- Update `MobilePriceOverlay.tsx`
- Responsive design adjustments
- Touch-friendly button sizes

## Phase 6: Performance & Polish (1-2 days)

### Features
1. **Price Matrix Optimization**
   - Pre-compute all price combinations
   - Instant feedback on hover
   - Loading states for large datasets

2. **Accessibility**
   - ARIA labels for price changes
   - Keyboard navigation improvements
   - Screen reader announcements

### Technical Requirements
- Memoization of price calculations
- Virtualized dropdowns for many options
- Comprehensive testing

## Implementation Timeline

| Phase | Duration | Dependencies | Priority |
|-------|----------|--------------|----------|
| Phase 1 | 1-2 days | None | HIGH |
| Phase 2 | 2-3 days | Lease score data | HIGH |
| Phase 3 | 3-4 days | Phase 1 complete | HIGH |
| Phase 4 | 2-3 days | Phase 3 complete | MEDIUM |
| Phase 5 | 1-2 days | Phases 1-3 complete | MEDIUM |
| Phase 6 | 1-2 days | All phases complete | LOW |

**Total estimated duration**: 10-15 days

## Success Metrics
- Reduced time to final configuration selection
- Increased engagement with different options
- Higher conversion to dealer contact
- Positive user feedback on price transparency

## Technical Debt Considerations
- Ensure compatibility with existing admin tools
- Maintain performance with large option sets
- Plan for A/B testing infrastructure
- Document new components and patterns