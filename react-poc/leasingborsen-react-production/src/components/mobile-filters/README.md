# Mobile Filter Components

This directory contains specialized mobile-optimized filter components designed for touch interfaces and mobile user experience patterns. These components provide a comprehensive filtering system specifically tailored for mobile devices with performance optimizations and intuitive mobile interactions.

## 📱 Overview

The mobile filter system provides:
- **Touch-optimized interfaces** with proper hit targets and gestures
- **Mobile-first design patterns** with swipe actions and drawer interfaces
- **Performance optimization** with mobile-specific bundle splitting
- **Progressive enhancement** that works across all mobile browsers
- **Danish localization** with mobile-friendly text sizing

## 📁 Directory Structure

```
mobile-filters/
├── Layout & Navigation
│   ├── MobileViewHeader.tsx         # Mobile header with filter toggle
│   ├── MobileFilterOverlay.tsx      # Full-screen filter overlay
│   └── MobileNavigation.tsx         # Mobile-specific navigation
│
├── Search & Input
│   ├── MobileSearchInput.tsx        # Touch-optimized search input
│   ├── MobileKeyboard.tsx           # Custom keyboard handling
│   └── MobileAutocomplete.tsx       # Mobile autocomplete dropdown
│
├── Filter Interface
│   ├── MobileFilterCategories.tsx   # Category selection with icons
│   ├── MobileFilterPanel.tsx        # Individual filter panels
│   └── MobileFilterChips.tsx        # Active filter chips with swipe-to-remove
│
├── Price & Range
│   ├── MobilePriceBar.tsx           # Mobile price range slider
│   ├── MobilePriceInput.tsx         # Number input with mobile keyboard
│   └── MobileRangeSelector.tsx      # Dual-handle range selector
│
└── Actions & Results
    ├── MobileFilterActions.tsx      # Apply/Clear action buttons
    ├── MobileResultsCounter.tsx     # Results count with loading states
    └── MobileQuickFilters.tsx       # Quick filter shortcuts
```

## 📱 Core Mobile Components

### **MobileFilterOverlay.tsx** - Primary Filter Interface

#### Full-Screen Filter Experience
```tsx
interface MobileFilterOverlayProps {
  isOpen: boolean
  onClose: () => void
  initialFilters?: FilterState
}

export const MobileFilterOverlay: React.FC<MobileFilterOverlayProps> = ({
  isOpen,
  onClose,
  initialFilters
}) => {
  // Mobile-specific state management
  const [activePanel, setActivePanel] = useState<FilterPanel | null>(null)
  const [localFilters, setLocalFilters] = useState(initialFilters)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Touch gesture handling
  const { swipeHandlers } = useSwipeGestures({
    onSwipeDown: onClose,
    threshold: 50
  })
  
  // Performance: Only render when open
  if (!isOpen) return null
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-background"
      {...swipeHandlers}
    >
      <MobileViewHeader 
        title="Filtre"
        onBack={onClose}
        showSave={hasChanges}
        onSave={handleSaveFilters}
      />
      
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Filter content implementation */}
      </div>
      
      <MobileFilterActions
        hasChanges={hasChanges}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        resultCount={filteredCount}
      />
    </div>
  )
}
```

**Mobile UX Features:**
- **Full-Screen Interface**: Immersive mobile experience without distractions
- **Swipe Gestures**: Swipe down to close, swipe left/right for navigation
- **Touch Targets**: Minimum 44px touch targets for accessibility
- **Visual Feedback**: Immediate visual response to touch interactions

### **MobileSearchInput.tsx** - Touch-Optimized Search

#### Mobile-First Search Experience
```tsx
export const MobileSearchInput: React.FC<MobileSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Søg efter bil...",
  autoFocus = false
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Mobile keyboard optimization
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Scroll input into view on mobile
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center' 
      })
    }, 300) // Wait for keyboard animation
  }, [])
  
  // Debounced search for performance
  const debouncedOnChange = useDebouncedCallback(onChange, 300)
  
  return (
    <div className={cn(
      "relative transition-all duration-200",
      isFocused && "ring-2 ring-primary ring-offset-2"
    )}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
      
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => debouncedOnChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-4 py-3", // Larger padding for mobile
          "text-base", // Prevent zoom on iOS
          "border border-border rounded-lg",
          "bg-background text-foreground",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-0" // Custom focus styling
        )}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
      />
      
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
          aria-label="Ryd søgning"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
```

**Mobile Optimizations:**
- **No Zoom Input**: `text-base` class prevents iOS zoom
- **Keyboard Handling**: Smart scroll-into-view for mobile keyboards
- **Large Touch Targets**: 44px+ interactive elements
- **Visual Focus**: Custom focus states optimized for mobile

### **MobilePriceBar.tsx** - Touch Range Slider

#### Dual-Handle Price Range for Mobile
```tsx
export const MobilePriceBar: React.FC<MobilePriceBarProps> = ({
  min = 0,
  max = 50000,
  value = [0, 50000],
  onChange,
  step = 500
}) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null)
  const [localValue, setLocalValue] = useState(value)
  const sliderRef = useRef<HTMLDivElement>(null)
  
  // Touch event handling for mobile
  const handleTouchStart = useCallback((handle: 'min' | 'max') => (e: TouchEvent) => {
    e.preventDefault()
    setIsDragging(handle)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }, [])
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !sliderRef.current) return
    
    const touch = e.touches[0]
    const rect = sliderRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    const newValue = Math.round((min + percentage * (max - min)) / step) * step
    
    setLocalValue(prev => 
      isDragging === 'min' 
        ? [Math.min(newValue, prev[1]), prev[1]]
        : [prev[0], Math.max(newValue, prev[0])]
    )
  }, [isDragging, min, max, step])
  
  // Optimized visual representation
  const minPercentage = ((localValue[0] - min) / (max - min)) * 100
  const maxPercentage = ((localValue[1] - min) / (max - min)) * 100
  
  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium">Pris per måned</span>
        <span className="text-sm text-muted-foreground">
          {formatPrice(localValue[0])} - {formatPrice(localValue[1])}
        </span>
      </div>
      
      <div 
        ref={sliderRef}
        className="relative h-6 bg-muted rounded-full touch-manipulation"
      >
        {/* Track */}
        <div 
          className="absolute top-1/2 h-2 bg-primary rounded-full transform -translate-y-1/2"
          style={{
            left: `${minPercentage}%`,
            width: `${maxPercentage - minPercentage}%`
          }}
        />
        
        {/* Min Handle */}
        <div
          className="absolute top-1/2 w-6 h-6 bg-primary border-2 border-background rounded-full transform -translate-y-1/2 -translate-x-1/2 cursor-pointer shadow-lg"
          style={{ left: `${minPercentage}%` }}
          onTouchStart={handleTouchStart('min')}
        />
        
        {/* Max Handle */}
        <div
          className="absolute top-1/2 w-6 h-6 bg-primary border-2 border-background rounded-full transform -translate-y-1/2 -translate-x-1/2 cursor-pointer shadow-lg"
          style={{ left: `${maxPercentage}%` }}
          onTouchStart={handleTouchStart('max')}
        />
      </div>
      
      {/* Quick preset buttons */}
      <div className="flex flex-wrap gap-2 mt-4">
        {PRICE_PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.range)}
            className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/80"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Touch Features:**
- **Native Touch Events**: Direct touch handling for smooth interaction
- **Large Handle Size**: 24px handles for easy touch manipulation
- **Visual Feedback**: Immediate visual response to touch
- **Quick Presets**: Common price ranges for quick selection

## 🎨 Mobile Design Patterns

### **Touch Interaction Guidelines**
```scss
// Minimum touch target sizes
.mobile-touch-target {
  min-height: 44px;  // iOS Human Interface Guidelines
  min-width: 44px;   // Material Design minimum
  padding: 12px;     // Comfortable touch padding
}

// Touch feedback
.mobile-interactive {
  transition: all 0.15s ease;
  
  &:active {
    scale: 0.98;      // Subtle press feedback
    opacity: 0.8;     // Visual feedback
  }
}
```

### **Mobile Typography**
```tsx
// Prevent iOS zoom on input focus
const mobileInputStyles = "text-base" // Never smaller than 16px

// Mobile-optimized text sizes
const mobileFontSizes = {
  heading: "text-lg md:text-xl",     // Larger on mobile
  body: "text-base",                 // Base size prevents zoom
  caption: "text-sm",                // Readable on small screens
  button: "text-base font-medium"    // Clear button text
}
```

### **Gesture Integration**
```tsx
// Custom hook for swipe gestures
export const useSwipeGestures = (options: SwipeOptions) => {
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  
  const handleTouchStart = (e: TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setStartY(e.touches[0].clientY)
  }
  
  const handleTouchEnd = (e: TouchEvent) => {
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - startX
    const deltaY = endY - startY
    
    // Determine swipe direction and trigger callbacks
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (deltaY > options.threshold) options.onSwipeDown?.()
      if (deltaY < -options.threshold) options.onSwipeUp?.()
    } else {
      if (deltaX > options.threshold) options.onSwipeRight?.()
      if (deltaX < -options.threshold) options.onSwipeLeft?.()
    }
  }
  
  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd
    }
  }
}
```

## 📊 Performance Optimizations

### **Mobile-Specific Bundle Splitting**
```tsx
// Lazy load mobile components to reduce initial bundle
const MobileFilterOverlay = lazy(() => 
  import('./MobileFilterOverlay').then(module => ({
    default: module.MobileFilterOverlay
  }))
)

// Only load mobile components on mobile devices
const isMobile = useMediaQuery('(max-width: 768px)')

return (
  <>
    {isMobile ? (
      <Suspense fallback={<MobileFilterSkeleton />}>
        <MobileFilterOverlay />
      </Suspense>
    ) : (
      <DesktopFilterSidebar />
    )}
  </>
)
```

### **Touch Performance**
```tsx
// Optimize for 60fps touch interactions
const useTouchOptimization = () => {
  const [isInteracting, setIsInteracting] = useState(false)
  
  // Disable non-essential animations during touch
  useEffect(() => {
    if (isInteracting) {
      document.body.style.pointerEvents = 'none'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.pointerEvents = ''
      document.body.style.userSelect = ''
    }
  }, [isInteracting])
  
  return { isInteracting, setIsInteracting }
}
```

## 🧪 Mobile Testing Strategy

### **Device Testing**
```tsx
// Mobile-specific test scenarios
describe('MobileFilterOverlay', () => {
  beforeEach(() => {
    // Mock mobile viewport
    global.innerWidth = 375
    global.innerHeight = 667
  })
  
  it('handles touch gestures correctly', async () => {
    const { getByTestId } = render(<MobileFilterOverlay />)
    const overlay = getByTestId('mobile-filter-overlay')
    
    // Simulate swipe down to close
    fireEvent.touchStart(overlay, { touches: [{ clientX: 0, clientY: 0 }] })
    fireEvent.touchEnd(overlay, { changedTouches: [{ clientX: 0, clientY: 100 }] })
    
    expect(mockOnClose).toHaveBeenCalled()
  })
  
  it('maintains 44px minimum touch targets', () => {
    const { getAllByRole } = render(<MobileFilterCategories />)
    const buttons = getAllByRole('button')
    
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect()
      expect(rect.height).toBeGreaterThanOrEqual(44)
      expect(rect.width).toBeGreaterThanOrEqual(44)
    })
  })
})
```

### **Performance Testing**
```tsx
// Test mobile performance characteristics
describe('Mobile Performance', () => {
  it('lazy loads mobile components', async () => {
    const { rerender } = render(<FilterSystem isMobile={false} />)
    
    // Should not load mobile components on desktop
    expect(screen.queryByTestId('mobile-filter')).not.toBeInTheDocument()
    
    rerender(<FilterSystem isMobile={true} />)
    
    // Should lazy load mobile components
    await waitFor(() => {
      expect(screen.getByTestId('mobile-filter')).toBeInTheDocument()
    })
  })
})
```

## 🚀 Usage Examples

### **Basic Mobile Filter Setup**
```tsx
const CarListingsPage = () => {
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { filters } = useConsolidatedFilterStore()
  
  return (
    <div className="min-h-screen">
      {isMobile && (
        <MobileViewHeader
          title="Privatleasing"
          onFilterClick={() => setShowMobileFilters(true)}
          filterCount={getActiveFilterCount(filters)}
        />
      )}
      
      <main className="pb-16 md:pb-0">
        <ListingGrid />
      </main>
      
      {isMobile && (
        <MobileFilterOverlay
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
        />
      )}
    </div>
  )
}
```

### **Mobile-First Responsive Component**
```tsx
const PriceFilter = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return isMobile ? (
    <MobilePriceBar
      value={priceRange}
      onChange={setPriceRange}
      min={1000}
      max={50000}
    />
  ) : (
    <DesktopPriceSlider
      value={priceRange}
      onChange={setPriceRange}
    />
  )
}
```

---

*These mobile filter components provide a comprehensive, touch-optimized filtering experience that adapts to mobile user behavior patterns while maintaining performance and accessibility standards.*