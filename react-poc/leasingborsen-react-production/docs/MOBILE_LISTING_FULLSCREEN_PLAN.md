# Mobile Full-Page Takeover for Listing Page

## Overview
Transform the mobile listing page into an immersive full-screen experience with advanced scroll-based transitions, removing the standard header and implementing a dynamic sticky navigation.

## Key Features to Implement

### 1. **Full-Screen Mobile Layout**
- **Hide standard header** on mobile for listing page only
- **Edge-to-edge image** at the very top (no margins/padding)
- **Floating back button** overlaid on top-left of image

### 2. **Scroll-Based Transitions**
- **Image fade effect**: Gradually reduce opacity as user scrolls
- **Sticky header appearance**: Emerges when scrolled past image
- **Smooth transitions**: All animations using CSS transitions

### 3. **Ultra-Thin Sticky Header**
- **Height**: ~48px (ultra-thin design)
- **Contents**: Back button + car title
- **Style**: Bottom border, blur backdrop effect
- **Behavior**: Fixed position, appears after image scroll

## Implementation Details

### **1. Update Listing Page Structure**
```tsx
// Mobile-specific layout detection
const [scrollY, setScrollY] = useState(0)
const [imageInView, setImageInView] = useState(true)

// Hide header on mobile for listing page
<BaseLayout showHeader={!isMobile}>
```

### **2. Create MobileListingImage Component**
New component with:
- Full viewport width image
- Floating back button overlay
- Opacity calculation based on scroll
- Intersection Observer for visibility

### **3. Create MobileStickyHeader Component**
```tsx
// Ultra-thin sticky header (48px height)
- Position: fixed top-0
- Background: backdrop-blur with semi-transparent bg
- Border: bottom border (1px)
- Contents: Back button + Make Model
- Animation: slide down + fade in
```

### **4. Scroll Management Hook**
```tsx
useListingScroll() {
  - Track scroll position
  - Calculate image opacity (1 - scrollY/imageHeight)
  - Determine sticky header visibility
  - Performance: throttled scroll events
}
```

## File Structure Changes

### **New Components:**
1. `src/components/listing/MobileListingImage.tsx`
   - Edge-to-edge image
   - Floating back button
   - Fade-on-scroll effect

2. `src/components/listing/MobileStickyHeader.tsx`
   - Ultra-thin sticky bar
   - Back navigation + title
   - Slide/fade animations

3. `src/hooks/useListingScroll.ts`
   - Scroll position tracking
   - Visibility calculations
   - Performance optimizations

### **Modified Files:**
1. `src/pages/Listing.tsx`
   - Conditional mobile/desktop layouts
   - Hide BaseLayout header on mobile
   - Integrate new mobile components

## Mobile Layout Structure
```
┌──────────────────────┐
│  [←] (floating)      │ ← Floating back button
│                      │
│    Car Image         │ ← Full width, fades on scroll
│                      │
└──────────────────────┘
        ↓ scroll ↓
┌──────────────────────┐
│ ← Back | Make Model  │ ← Ultra-thin sticky (appears)
├──────────────────────┤
│  Title               │
│  Key Specs           │
│  Specifications      │
└──────────────────────┘
```

## Animation Specifications

### **Image Fade:**
- Opacity: `1 - (scrollY / imageHeight * 1.5)`
- Max fade at 67% scroll through image

### **Sticky Header:**
- Appears when: `scrollY > imageHeight - 100`
- Animation: `translateY(-100%) → translateY(0)`
- Duration: 200ms ease-out

### **Back Button Transition:**
- From: Floating on image (white/shadow)
- To: Inside sticky header (standard color)

## Responsive Breakpoints
- **Mobile only**: < 768px (md breakpoint)
- **Desktop**: Unchanged current layout
- **Tablet**: Uses desktop layout

## Benefits
- ✅ **Immersive mobile experience** - Full-screen content
- ✅ **Smooth transitions** - Professional scroll animations
- ✅ **Space efficient** - Ultra-thin sticky header
- ✅ **Progressive disclosure** - Header appears when needed
- ✅ **Native app feel** - Modern mobile UX patterns

## Testing Considerations
- Scroll performance on low-end devices
- iOS Safari bounce scroll behavior
- Android Chrome address bar hiding
- Touch target sizes for back button
- Accessibility for screen readers

## Implementation Priority
This feature should be implemented after:
1. Core listing functionality is stable
2. Current responsive design is finalized
3. Performance benchmarks are established

## Technical Notes
- Use CSS transforms for performance (GPU acceleration)
- Implement scroll throttling for smooth performance
- Consider using Intersection Observer API for visibility detection
- Test on actual devices for scroll behavior validation