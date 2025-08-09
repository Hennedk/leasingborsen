# Mobile Filter Drawer Migration Plan

## Overview
Plan for transforming the existing `MobileFilterOverlay` component into a Vaul-powered drawer with enhanced animations and gesture support, following the successful implementation of `MobilePriceDrawer`.

## Current State Analysis

### Existing Component: MobileFilterOverlay
- **Location**: `src/components/MobileFilterOverlay.tsx`
- **Size**: ~768 lines of code
- **Complexity**: Multi-view navigation system with 4 distinct views
- **Current Animation**: Basic CSS transitions (300ms ease-out)
- **Gesture Support**: None (click/tap only)

### Component Features
1. **Multiple Views**:
   - Main filters view (default)
   - Makes selection view
   - Make overview (for selecting models per make)
   - Models selection view

2. **Interactive Elements**:
   - Search inputs (makes/models)
   - Checkboxes for selection
   - Badges for fuel type/transmission
   - Select dropdown for sorting
   - Price range sliders
   - Seats range inputs

3. **State Management**:
   - Uses `consolidatedFilterStore` (Zustand)
   - Complex navigation state between views
   - Search with debouncing
   - Filter counting and active state tracking

## Implementation Strategy

### Phase 1: Setup and Structure

#### 1.1 Create New Component
```bash
src/components/
├── MobileFilterOverlay.tsx    # Keep temporarily for rollback
├── MobileFilterDrawer.tsx     # New Vaul implementation
└── mobile-filters/            # Existing shared sub-components
```

#### 1.2 Dependencies
```bash
# Already installed
npm install vaul
```

### Phase 2: Component Architecture

#### 2.1 Basic Drawer Structure
```tsx
// MobileFilterDrawer.tsx
import { Drawer } from 'vaul'
import React, { useState, useMemo, useCallback } from 'react'
// ... all other imports from MobileFilterOverlay

const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  resultCount,
  sortOrder,
  onSortChange
}) => {
  // Copy ALL state and logic from MobileFilterOverlay
  const [currentView, setCurrentView] = useState<MobileView>('filters')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMakeForModels, setSelectedMakeForModels] = useState<string | null>(null)
  
  return (
    <Drawer.Root 
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modal={true}
      dismissible={true}
      snapPoints={[0.95]} // Higher than price drawer due to more content
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-background rounded-t-2xl shadow-2xl border-t border-border/50 max-h-[95vh] lg:hidden">
          <Drawer.Handle className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/40" />
          {/* All existing view content */}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

### Phase 3: View-Specific Implementations

#### 3.1 Main Filters View
```tsx
const renderFiltersView = () => (
  <div className="flex-1 flex flex-col min-h-0">
    {/* Header */}
    <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
      <h2 className="text-lg font-bold">Filtrer</h2>
      <Drawer.Close asChild>
        <Button variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </Drawer.Close>
    </div>
    
    {/* Scrollable content */}
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* All filter options */}
    </div>
    
    {/* Sticky footer */}
    <div className="sticky bottom-0 p-5 border-t bg-background">
      <Button onClick={onClose}>
        Vis {resultCount} resultater
      </Button>
    </div>
  </div>
)
```

#### 3.2 Search Input Protection
```tsx
const renderSearchInput = () => (
  <div 
    className="p-5 border-b border-border/50"
    vaul-drawer-direction="none" // Prevent drag dismissal
  >
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
      <Input
        type="text"
        placeholder="Søg..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10"
      />
    </div>
  </div>
)
```

#### 3.3 Horizontal Scroll Protection
```tsx
// For fuel type badges and other horizontal scrollable areas
<div 
  className="flex gap-2 overflow-x-auto"
  vaul-drawer-direction="none"
>
  {fuelTypes.map(type => (
    <Badge key={type} onClick={() => toggleFuelType(type)}>
      {type}
    </Badge>
  ))}
</div>
```

### Phase 4: Gesture Handling

#### 4.1 Areas Requiring Protection
1. **Search Inputs**: Prevent drag when focusing/typing
2. **Horizontal Scrolls**: Badge selections, chip scrolling
3. **Checkboxes**: Prevent accidental dismissal during selection
4. **Select Dropdowns**: Ensure dropdowns work within drawer
5. **Price/Seat Sliders**: Protect drag interactions

#### 4.2 Implementation Pattern
```tsx
// Wrapper component for protected areas
const ProtectedArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div vaul-drawer-direction="none">
    {children}
  </div>
)
```

### Phase 5: Navigation Between Views

#### 5.1 View Transition Logic
```tsx
const navigateToView = useCallback((view: MobileView, makeName?: string) => {
  // Maintain existing navigation logic
  if (view === 'models' && makeName) {
    setSelectedMakeForModels(makeName)
  }
  setCurrentView(view)
  clearSearch()
  
  // Optional: Add view transition animation
  // Vaul will handle the drawer animation automatically
}, [clearSearch])
```

#### 5.2 Back Navigation
```tsx
const handleBack = useCallback(() => {
  switch (currentView) {
    case 'makes':
    case 'makeSelection':
      setCurrentView('filters')
      break
    case 'models':
      setCurrentView(selectedMakes.length > 1 ? 'makeSelection' : 'filters')
      break
  }
}, [currentView, selectedMakes.length])
```

## Testing Strategy

### Functional Tests
- [ ] All 4 views render correctly
- [ ] Navigation between views works
- [ ] Search functionality in makes/models views
- [ ] Filter selections persist across views
- [ ] Reset filters clears all selections
- [ ] Result count updates correctly
- [ ] Sort order changes apply

### Gesture Tests
- [ ] Drag to dismiss from handle
- [ ] Drag protection on search inputs
- [ ] Horizontal scroll in badge areas
- [ ] Vertical scroll in content areas
- [ ] Checkbox interactions don't trigger drag
- [ ] Select dropdown opens properly

### Device-Specific Tests
- [ ] iOS Safari - rubber band scrolling
- [ ] Android Chrome - gesture handling
- [ ] iPad - responsive behavior at lg breakpoint
- [ ] Various screen sizes (SE to Pro Max)

### Performance Tests
- [ ] Smooth animations at 60fps
- [ ] No lag with many checkboxes
- [ ] Search debouncing works
- [ ] Memory usage acceptable

## Migration Steps

### Week 1: Core Implementation
**Day 1-2: Basic Structure**
- Create `MobileFilterDrawer.tsx`
- Copy all imports and interfaces
- Set up Drawer.Root structure
- Migrate main filters view

**Day 3-4: View Migration**
- Migrate makes selection view
- Migrate make overview view
- Migrate models selection view
- Ensure navigation works

**Day 5: Gesture Protection**
- Add vaul-drawer-direction to protected areas
- Test search inputs
- Test horizontal scrolls
- Verify checkbox interactions

### Week 2: Polish and Testing
**Day 1-2: Edge Cases**
- Fix select dropdown z-index if needed
- Ensure iOS safe areas work
- Test with many items (performance)
- Fix any gesture conflicts

**Day 3: Cross-Device Testing**
- Test on real iOS devices
- Test on real Android devices
- Test on tablets
- Fix device-specific issues

**Day 4: Integration**
- Update `Listings.tsx` to use new component
- Add feature flag for gradual rollout
- Monitor performance metrics
- Gather user feedback

**Day 5: Cleanup**
- Remove old `MobileFilterOverlay` component
- Update imports across codebase
- Update documentation
- Create PR for review

## Potential Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Complex view state** | Preserve existing state machine, only change wrapper |
| **Search input conflicts** | Use `vaul-drawer-direction="none"` attribute |
| **Select dropdown z-index** | May need to adjust portal z-index or use Drawer.Portal |
| **Horizontal scroll conflicts** | Protect with `vaul-drawer-direction="none"` |
| **Performance with many items** | Use React.memo and virtualization if needed |
| **iOS keyboard behavior** | Test thoroughly, may need viewport adjustments |
| **Animation timing** | Fine-tune spring physics for best feel |

## Benefits

### User Experience
- **Natural gestures**: Drag to dismiss feels native
- **Spring animations**: Smooth, physics-based movement
- **Better feedback**: Visual drag handle
- **Consistent**: Matches price drawer behavior

### Technical Benefits
- **Less custom CSS**: Vaul handles animations
- **Hardware acceleration**: Better performance
- **Standard patterns**: Easier to maintain
- **Accessibility**: Built-in ARIA support

### Development Benefits
- **Simpler code**: Remove custom animation logic
- **Better testing**: Standard gesture library
- **Future-proof**: Can easily add snap points
- **Reusable**: Pattern can be applied elsewhere

## Success Metrics

### Performance
- [ ] 60fps animations consistently
- [ ] < 100ms response to gestures
- [ ] No memory leaks
- [ ] Bundle size increase < 5KB

### User Experience
- [ ] 90% of users successfully use drag gesture
- [ ] Reduced accidental dismissals
- [ ] Faster filter interactions
- [ ] Positive user feedback

### Code Quality
- [ ] 100% feature parity with old component
- [ ] Reduced lines of code
- [ ] Better test coverage
- [ ] Cleaner component structure

## Rollback Plan

If issues arise during migration:

1. **Feature Flag**: Use environment variable to toggle between old/new
2. **Parallel Components**: Keep both components until stable
3. **Gradual Rollout**: Start with 10% of users, increase gradually
4. **Quick Revert**: Single line change in `Listings.tsx` to revert

```tsx
// In Listings.tsx
const FilterComponent = process.env.REACT_APP_USE_NEW_FILTER_DRAWER 
  ? MobileFilterDrawer 
  : MobileFilterOverlay
```

## Future Enhancements

Once the basic drawer is working:

1. **Snap Points**: Add intermediate snap points (25%, 75%, 100%)
2. **Nested Drawers**: Models view could be a nested drawer
3. **Gesture Hints**: Animate handle on first open
4. **Persistent State**: Remember last snap point
5. **Animations**: Add subtle animations between views
6. **Haptic Feedback**: On iOS devices for better feel

## Conclusion

This migration plan provides a safe, incremental approach to upgrading the mobile filter overlay with Vaul animations. The key principles are:

1. **Preserve functionality**: Keep all existing features
2. **Incremental migration**: Test thoroughly at each step
3. **User-first**: Ensure better UX, not just different
4. **Safe rollback**: Always have a way back

The expected timeline is 2 weeks for full implementation and testing, with the ability to rollback at any point if issues arise.

## References

- [Vaul Documentation](https://vaul.emilkowal.ski/)
- [Original MobileFilterOverlay Component](../src/components/MobileFilterOverlay.tsx)
- [MobilePriceDrawer Implementation](../src/components/MobilePriceDrawer.tsx)
- [Radix UI Drawer Patterns](https://www.radix-ui.com/primitives/docs/components/dialog)