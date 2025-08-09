# LeaseScore Circle Animation Plan

## Objective
Add smooth, performant animation to LeaseScore circle that fills when card enters viewport

## Recommended Implementation: Intersection Observer + CSS Animation

### Core Concept
- Use IntersectionObserver to detect when card enters viewport
- Trigger CSS transition on strokeDashoffset from full circumference to final value
- GPU-accelerated for optimal performance
- Only animate once per card view

### Implementation Code

#### 1. Create Reusable Hook
```tsx
// src/hooks/useAnimateOnScroll.ts
import { useState, useEffect, useRef } from 'react'

export const useAnimateOnScroll = (options = {}) => {
  const [isInView, setIsInView] = useState(false)
  const elementRef = useRef(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true)
        }
      },
      { 
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px'
      }
    )
    
    if (elementRef.current) {
      observer.observe(elementRef.current)
    }
    
    return () => observer.disconnect()
  }, [isInView])
  
  return { elementRef, isInView }
}
```

#### 2. Update LeaseScorePill Component
```tsx
// Add to imports
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

// Inside component
const { elementRef, isInView } = useAnimateOnScroll({ threshold: 0.1 })

// Calculate animated offset
const animatedOffset = isInView ? strokeDashoffset : circumference

// Update return statement
return (
  <div
    ref={elementRef}
    className={cn(/* existing classes */)}
  >
    {/* ... */}
    <circle
      cx={sizeConfig.diameter / 2}
      cy={sizeConfig.diameter / 2}
      r={radius}
      stroke={scoreColor}
      strokeWidth={sizeConfig.strokeWidth}
      fill="none"
      strokeDasharray={circumference}
      strokeDashoffset={animatedOffset}
      strokeLinecap="round"
      className="transition-[stroke-dashoffset] duration-700 ease-out"
      style={{
        filter: score >= 90 ? 'drop-shadow(0 0 4px rgba(5, 150, 105, 0.4))' : undefined,
        transition: isInView ? undefined : 'none'
      }}
    />
    {/* ... */}
  </div>
)
```

### Optional Enhancements

#### 1. Animate Score Number
```tsx
const [displayScore, setDisplayScore] = useState(0)

useEffect(() => {
  if (!isInView) return
  
  const duration = 700
  const steps = 30
  const increment = score / steps
  let current = 0
  
  const timer = setInterval(() => {
    current += increment
    if (current >= score) {
      setDisplayScore(score)
      clearInterval(timer)
    } else {
      setDisplayScore(Math.floor(current))
    }
  }, duration / steps)
  
  return () => clearInterval(timer)
}, [isInView, score])

// Display animated score
<div>{displayScore}</div>
```

#### 2. Stagger Animation for Multiple Cards
```tsx
// In ListingCard, pass index prop to LeaseScorePill
<LeaseScorePill 
  score={car.lease_score}
  size="xs"
  animationDelay={index * 50} // ms delay between cards
/>

// In LeaseScorePill
style={{
  transitionDelay: `${animationDelay}ms`
}}
```

#### 3. Respect Reduced Motion Preference
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const animatedOffset = (isInView && !prefersReducedMotion) 
  ? strokeDashoffset 
  : circumference
```

### Performance Considerations

1. **Shared Observer Pattern**: Consider creating a single IntersectionObserver for all cards
2. **Lazy Animation**: Only animate when in viewport
3. **GPU Acceleration**: Use CSS transforms and transitions
4. **Memory**: Clean up observers on unmount
5. **Frame Rate**: CSS transitions maintain 60fps

### Alternative Approaches

#### CSS-Only with Animation
```css
@keyframes fillCircle {
  from { stroke-dashoffset: var(--circumference); }
  to { stroke-dashoffset: var(--offset); }
}

.animate-on-scroll {
  animation: fillCircle 0.7s ease-out forwards;
  animation-play-state: paused;
}

.in-view {
  animation-play-state: running;
}
```

#### Using Framer Motion (if already in project)
```tsx
import { motion } from 'framer-motion'

<motion.circle
  initial={{ strokeDashoffset: circumference }}
  animate={{ strokeDashoffset: strokeDashoffset }}
  transition={{ duration: 0.7, ease: "easeOut" }}
/>
```

### Testing Checklist
- [ ] Animation triggers on scroll into view
- [ ] Animation only plays once per card
- [ ] Performance remains smooth with 20+ cards
- [ ] Works on mobile devices
- [ ] Respects prefers-reduced-motion
- [ ] No memory leaks from observers

### Expected Outcome
- Smooth circle fill animation when cards enter viewport
- No impact on initial page load
- Maintains 60fps during scroll
- Enhances user experience without sacrificing performance