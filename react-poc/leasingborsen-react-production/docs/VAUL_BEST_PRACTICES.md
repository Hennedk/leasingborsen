# Vaul Drawer: Best Practices & Implementation Guidelines

## Quick Reference
This guide provides actionable best practices for implementing Vaul drawers in the Leasingborsen platform and similar React applications.

---

## Core Principles

### 1. Structure First, Style Second
Always establish the correct DOM structure before applying styles:

```tsx
// ✅ CORRECT: Proper flex structure
<Drawer.Content className="flex flex-col">
  <header className="flex-shrink-0" />
  <main className="flex-1 min-h-0 overflow-y-auto" />
  <footer className="flex-shrink-0" />
</Drawer.Content>

// ❌ WRONG: Footer inside scrollable area
<Drawer.Content>
  <div className="overflow-y-auto">
    <header />
    <main />
    <footer /> {/* Will scroll away! */}
  </div>
</Drawer.Content>
```

### 2. Protect Nested Interactions
Prevent drawer gestures from interfering with content:

```tsx
// Horizontal scrolls
<div vaul-drawer-direction="horizontal">
  <ScrollableCards />
</div>

// Sliders and ranges
<div vaul-drawer-direction="vertical">
  <Slider />
</div>

// Maps and canvases
<div vaul-drawer-direction="both">
  <InteractiveMap />
</div>
```

### 3. Respect Platform Conventions

#### iOS
```css
/* Home indicator padding */
padding-bottom: env(safe-area-inset-bottom);

/* Rubber band scrolling */
-webkit-overflow-scrolling: touch;

/* Tap highlight */
-webkit-tap-highlight-color: transparent;
```

#### Android
```css
/* System bar spacing */
padding-top: env(safe-area-inset-top);

/* Overscroll effect */
overscroll-behavior: contain;
```

---

## Implementation Patterns

### Basic Drawer Setup
```tsx
import { Drawer } from 'vaul'

export function BasicDrawer({ isOpen, onClose, children }) {
  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      modal={true}
      dismissible={true}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white">
          <Drawer.Handle />
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

### Advanced Configuration Drawer
```tsx
export function ConfigurationDrawer({ 
  isOpen, 
  onClose, 
  options, 
  onSelect 
}) {
  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      snapPoints={[0.5, 0.9]}  // Multiple heights
      defaultSnapPoint={0.5}    // Start at half
      modal={false}             // Allow interaction behind
      shouldScaleBackground    // iOS-style scaling
    >
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content className="flex flex-col max-h-[90vh]">
          {/* Fixed Header */}
          <header className="flex-shrink-0 p-4 border-b">
            <Drawer.Handle />
            <Drawer.Title>Configure Options</Drawer.Title>
            <Drawer.Close />
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto overscroll-contain">
            <OptionsList options={options} onSelect={onSelect} />
          </main>

          {/* Sticky Footer */}
          <footer className="flex-shrink-0 p-4 border-t bg-primary">
            <ConfirmButton />
          </footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

### Nested Drawers Pattern
```tsx
export function NestedDrawerSystem() {
  const [primaryOpen, setPrimaryOpen] = useState(false)
  const [secondaryOpen, setSecondaryOpen] = useState(false)

  return (
    <>
      {/* Primary Drawer */}
      <Drawer.Root open={primaryOpen && !secondaryOpen}>
        <Drawer.Content>
          <button onClick={() => setSecondaryOpen(true)}>
            Open Details
          </button>
        </Drawer.Content>
      </Drawer.Root>

      {/* Secondary Drawer (higher z-index) */}
      <Drawer.Root open={secondaryOpen}>
        <Drawer.Content className="z-[60]">
          <DetailView />
        </Drawer.Content>
      </Drawer.Root>
    </>
  )
}
```

---

## Performance Optimization

### 1. Lazy Load Content
```tsx
const DrawerContent = lazy(() => import('./DrawerContent'))

export function OptimizedDrawer({ isOpen }) {
  return (
    <Drawer.Root open={isOpen}>
      <Drawer.Content>
        <Suspense fallback={<DrawerSkeleton />}>
          {isOpen && <DrawerContent />}
        </Suspense>
      </Drawer.Content>
    </Drawer.Root>
  )
}
```

### 2. Virtualize Long Lists
```tsx
import { VirtualList } from '@tanstack/react-virtual'

export function VirtualizedDrawer({ items }) {
  return (
    <Drawer.Content>
      <VirtualList
        height={600}
        itemCount={items.length}
        itemSize={80}
        renderItem={({ index }) => (
          <ItemCard item={items[index]} />
        )}
      />
    </Drawer.Content>
  )
}
```

### 3. Debounce Expensive Operations
```tsx
export function SearchDrawer() {
  const [query, setQuery] = useState('')
  
  const debouncedSearch = useMemo(
    () => debounce((q) => searchAPI(q), 300),
    []
  )

  useEffect(() => {
    debouncedSearch(query)
  }, [query])

  return (
    <Drawer.Content>
      <SearchInput onChange={setQuery} />
      <SearchResults />
    </Drawer.Content>
  )
}
```

---

## Accessibility Guidelines

### Required ARIA Attributes
```tsx
<Drawer.Content
  role="dialog"
  aria-modal="true"
  aria-labelledby="drawer-title"
  aria-describedby="drawer-description"
>
  <h2 id="drawer-title">Drawer Title</h2>
  <p id="drawer-description">Drawer description</p>
</Drawer.Content>
```

### Focus Management
```tsx
export function AccessibleDrawer({ isOpen }) {
  const closeButtonRef = useRef()

  useEffect(() => {
    if (isOpen) {
      // Focus close button on open
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  return (
    <Drawer.Content>
      <button ref={closeButtonRef} aria-label="Close drawer">
        <X />
      </button>
      {/* Trap focus within drawer */}
      <FocusTrap>
        <DrawerContent />
      </FocusTrap>
    </Drawer.Content>
  )
}
```

### Keyboard Navigation
```tsx
export function KeyboardNavigableDrawer() {
  const handleKeyDown = (e) => {
    switch(e.key) {
      case 'Escape':
        onClose()
        break
      case 'Tab':
        // Handle tab navigation
        break
    }
  }

  return (
    <Drawer.Content onKeyDown={handleKeyDown}>
      {/* Content */}
    </Drawer.Content>
  )
}
```

---

## Common Patterns

### 1. Confirmation Drawer
```tsx
export function ConfirmationDrawer({ 
  isOpen, 
  onConfirm, 
  onCancel,
  message 
}) {
  return (
    <Drawer.Root open={isOpen} dismissible={false}>
      <Drawer.Content>
        <div className="p-6">
          <h3 className="text-lg font-semibold">Confirm Action</h3>
          <p className="mt-2 text-muted-foreground">{message}</p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      </Drawer.Content>
    </Drawer.Root>
  )
}
```

### 2. Form Drawer
```tsx
export function FormDrawer({ isOpen, onSubmit }) {
  const [formData, setFormData] = useState({})

  return (
    <Drawer.Root open={isOpen}>
      <Drawer.Content>
        <form onSubmit={(e) => {
          e.preventDefault()
          onSubmit(formData)
        }}>
          <header className="p-4 border-b">
            <h2>Edit Information</h2>
          </header>
          
          <div className="p-4 space-y-4">
            <Input 
              label="Name"
              onChange={(e) => setFormData({
                ...formData,
                name: e.target.value
              })}
            />
            {/* More fields */}
          </div>

          <footer className="p-4 border-t">
            <Button type="submit">Save Changes</Button>
          </footer>
        </form>
      </Drawer.Content>
    </Drawer.Root>
  )
}
```

### 3. Media Gallery Drawer
```tsx
export function GalleryDrawer({ images, isOpen }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <Drawer.Root open={isOpen} snapPoints={[0.5, 1]}>
      <Drawer.Content>
        {/* Main image */}
        <div className="aspect-video bg-black">
          <img 
            src={images[selectedIndex]} 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Thumbnail strip */}
        <div className="flex gap-2 p-4 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "w-20 h-20 rounded border-2",
                i === selectedIndex && "border-primary"
              )}
            >
              <img src={img} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  )
}
```

---

## Testing Strategies

### Unit Testing
```typescript
describe('Drawer Component', () => {
  it('opens when triggered', () => {
    const { getByRole } = render(
      <Drawer isOpen={true} />
    )
    expect(getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on escape key', () => {
    const onClose = jest.fn()
    const { container } = render(
      <Drawer isOpen={true} onClose={onClose} />
    )
    fireEvent.keyDown(container, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
```

### Integration Testing
```typescript
describe('Drawer Integration', () => {
  it('updates parent state on selection', async () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <ConfigDrawer 
        isOpen={true}
        options={[{ id: 1, label: 'Option 1' }]}
        onSelect={onSelect}
      />
    )
    
    fireEvent.click(getByText('Option 1'))
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({ id: 1, label: 'Option 1' })
    })
  })
})
```

### E2E Testing
```typescript
describe('Drawer E2E', () => {
  it('completes configuration flow', async () => {
    await page.goto('/listing/123')
    await page.click('[data-testid="configure-button"]')
    
    // Drawer should open
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Select options
    await page.click('[data-testid="option-1"]')
    await page.click('[data-testid="confirm"]')
    
    // Drawer should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})
```

---

## Troubleshooting Guide

### Problem: Drawer doesn't open
```typescript
// Check: Is modal portal mounted?
console.log(document.querySelector('[data-vaul-drawer-wrapper]'))

// Solution: Ensure portal container exists
<div id="drawer-root" />
```

### Problem: Can't scroll content
```tsx
// Check: Overflow settings
// ❌ Wrong
<Drawer.Content className="overflow-hidden">

// ✅ Correct
<Drawer.Content className="flex flex-col">
  <div className="overflow-y-auto flex-1">
```

### Problem: Gestures not working
```tsx
// Check: Touch events
// Solution: Don't prevent default on touch events
onTouchStart={(e) => {
  // ❌ e.preventDefault() 
  // Let Vaul handle touches
}}
```

### Problem: Performance issues
```tsx
// Check: Re-renders
// Solution: Memoize expensive children
const DrawerContent = memo(() => {
  return <ExpensiveComponent />
})
```

---

## Migration Checklist

When migrating from another drawer/modal solution:

- [ ] Install Vaul: `npm install vaul`
- [ ] Update component structure to flex layout
- [ ] Move footer outside scrollable area
- [ ] Add vaul-drawer-direction for nested scrolls
- [ ] Update ARIA attributes
- [ ] Test gesture interactions
- [ ] Add safe area padding
- [ ] Test on real devices
- [ ] Update tests
- [ ] Document changes

---

## Do's and Don'ts

### Do's ✅
- Use semantic HTML elements
- Test on real devices
- Provide keyboard navigation
- Add loading states
- Handle errors gracefully
- Use proper ARIA labels
- Respect safe areas
- Optimize for performance

### Don'ts ❌
- Don't nest scrollable containers incorrectly
- Don't override Vaul's touch handlers
- Don't forget focus management
- Don't use fixed heights (use max-height)
- Don't ignore platform conventions
- Don't animate everything
- Don't block the main thread
- Don't forget error boundaries

---

## Resources

### Official Documentation
- [Vaul GitHub](https://github.com/emilkowalski/vaul)
- [Examples](https://vaul.emilkowalski.com/)

### Related Libraries
- [Radix UI](https://www.radix-ui.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [React Spring](https://www.react-spring.dev/)

### Design Guidelines
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://material.io/design)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

---

*Last updated: 2025-08-09*
*Version: 1.0.0*