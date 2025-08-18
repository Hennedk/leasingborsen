# Color System Documentation

Complete guide to the centralized color styling system in the Leasingborsen React platform.

## 🎨 System Architecture

The Leasingborsen color system is built on modern web standards for maximum consistency, accessibility, and maintainability:

- **OKLCH Color Space**: Perceptually uniform color model for predictable color relationships
- **CSS Custom Properties**: Dynamic theming with semantic variable names
- **Tailwind CSS Integration**: Utility-first CSS framework with custom color extensions
- **shadcn/ui Components**: Pre-built components automatically using the color system
- **Automatic Dark Mode**: Theme switching via `.dark` class with consistent brand colors

### Why OKLCH?

OKLCH (Oklab Lightness Chroma Hue) provides significant advantages over traditional HSL/RGB:

- **L (Lightness)**: 0 (black) to 1 (white) - perceptually uniform lightness
- **C (Chroma)**: 0 (gray) to ~0.4 (maximum saturation) - consistent color intensity
- **H (Hue)**: 0-360 degrees - predictable color wheel relationships

Benefits:
- Perceptually uniform color transitions
- Predictable color mixing and gradients
- Better accessibility contrast calculations
- Consistent visual weight across color modifications

## 🎯 Complete Color Reference

### Light Mode (Default Theme)

| Variable | OKLCH Value | Hex Equivalent | Description | Primary Usage |
|----------|-------------|----------------|-------------|---------------|
| `--background` | `oklch(1.0000 0 0)` | `#ffffff` | Pure white | Page backgrounds, main content areas |
| `--foreground` | `oklch(0.1288 0.0406 264.6952)` | `#1a1625` | Near black | Primary text, body content |
| `--primary` | `0.5896 0.1961 36` | `#D8400D` | Orange brand | Primary buttons, links, focus states |
| `--primary-foreground` | `1 0 0` | `#ffffff` | White | Text on primary backgrounds |
| `--secondary` | `oklch(0.9683 0.0069 247.8956)` | `#f4f4f5` | Light gray | Secondary buttons, inactive states |
| `--secondary-foreground` | `oklch(0.1288 0.0406 264.6952)` | `#1a1625` | Dark gray | Text on secondary backgrounds |
| `--muted` | `oklch(0.9683 0.0069 247.8956)` | `#f4f4f5` | Light gray | Disabled elements, placeholders |
| `--muted-foreground` | `oklch(0.5544 0.0407 257.4166)` | `#71717a` | Medium gray | Secondary text, descriptions |
| `--accent` | `oklch(0.9683 0.0069 247.8956)` | `#f4f4f5` | Light gray | Hover states, highlights |
| `--accent-foreground` | `oklch(0.1288 0.0406 264.6952)` | `#1a1625` | Dark gray | Text on accent backgrounds |
| `--destructive` | `oklch(0.6368 0.2078 25.3313)` | `#dc2626` | Red | Error states, delete actions |
| `--destructive-foreground` | `oklch(1.0000 0 0)` | `#ffffff` | White | Text on destructive backgrounds |
| `--border` | `oklch(0.9216 0.0000 0)` | `#ebebeb` | Light gray | Borders, dividers |
| `--input` | `oklch(0.9216 0.0000 0)` | `#ebebeb` | Light gray | Input field borders |
| `--ring` | `var(--primary)` | `#D8400D` | Orange | Focus rings, active states |
| `--card` | `oklch(1.0000 0 0)` | `#ffffff` | White | Card backgrounds |
| `--card-foreground` | `oklch(0.1288 0.0406 264.6952)` | `#1a1625` | Dark gray | Card content text |
| `--popover` | `oklch(1.0000 0 0)` | `#ffffff` | White | Dropdown, modal backgrounds |
| `--popover-foreground` | `oklch(0.1288 0.0406 264.6952)` | `#1a1625` | Dark gray | Popover text content |

### Dark Mode

| Variable | OKLCH Value | Hex Equivalent | Description | Primary Usage |
|----------|-------------|----------------|-------------|---------------|
| `--background` | `oklch(0.1469 0.0041 49.2499)` | `#0f0f23` | Near black | Page backgrounds |
| `--foreground` | `oklch(0.9851 0 0)` | `#fafafa` | Near white | Primary text |
| `--primary` | `0.5896 0.1961 36` | `#D8400D` | Orange (unchanged) | Brand consistency |
| `--primary-foreground` | `1 0 0` | `#ffffff` | White | Text on primary |
| `--secondary` | `oklch(0.2739 0.0055 286.0326)` | `#27272a` | Dark gray | Secondary elements |
| `--secondary-foreground` | `oklch(0.9851 0 0)` | `#fafafa` | Near white | Text on secondary |
| `--muted` | `oklch(0.2739 0.0055 286.0326)` | `#27272a` | Dark gray | Disabled states |
| `--muted-foreground` | `oklch(0.7118 0.0129 286.0665)` | `#a1a1aa` | Light gray | Muted text |
| `--accent` | `oklch(0.3703 0.0119 285.8054)` | `#3f3f46` | Medium dark | Hover states |
| `--accent-foreground` | `oklch(0.9851 0 0)` | `#fafafa` | Near white | Text on accent |
| `--destructive` | `oklch(0.4437 0.1613 26.8994)` | `#7f1d1d` | Dark red | Error states |
| `--destructive-foreground` | `oklch(0.9842 0.0034 247.8575)` | `#f4f4f5` | Off-white | Text on destructive |
| `--border` | `oklch(0.2739 0.0055 286.0326)` | `#27272a` | Dark gray | Borders |
| `--input` | `oklch(0.2739 0.0055 286.0326)` | `#27272a` | Dark gray | Input borders |
| `--ring` | `var(--primary)` | `#D8400D` | Orange (unchanged) | Focus consistency |

### Chart Colors (Both Themes)

| Variable | OKLCH Value | Hex Equivalent | Usage |
|----------|-------------|----------------|-------|
| `--chart-1` | `0.5896 0.1961 36` | `#D8400D` | Primary data series |
| `--chart-2` | `oklch(0.7960 0.1058 292.3865)` | `#a855f7` | Secondary data series |
| `--chart-3` | `oklch(0.6540 0.1878 287.0131)` | `#8b5cf6` | Tertiary data series |
| `--chart-4` | `oklch(0.4749 0.2793 273.5953)` | `#6366f1` | Quaternary data series |
| `--chart-5` | `oklch(0.3661 0.2238 271.9731)` | `#4f46e5` | Quinary data series |

### Sidebar Colors (Admin Interface)

| Variable | Light Mode | Dark Mode | Usage |
|----------|------------|-----------|-------|
| `--sidebar` | `oklch(0.9842 0.0034 247.8575)` | `oklch(0.1469 0.0041 49.2499)` | Sidebar background |
| `--sidebar-foreground` | `oklch(0.5544 0.0407 257.4166)` | `oklch(0.7118 0.0129 286.0665)` | Sidebar text |
| `--sidebar-primary` | `var(--primary)` | `var(--primary)` | Active sidebar items |
| `--sidebar-primary-foreground` | `oklch(1.0000 0 0)` | `oklch(1.0000 0 0)` | Text on active items |
| `--sidebar-accent` | `oklch(1.0000 0 0)` | `oklch(0.3703 0.0119 285.8054)` | Hover states |
| `--sidebar-accent-foreground` | `oklch(0.1288 0.0406 264.6952)` | `oklch(0.9851 0 0)` | Text on hover |
| `--sidebar-border` | `oklch(0.9216 0.0000 0)` | `oklch(0.2739 0.0055 286.0326)` | Sidebar borders |
| `--sidebar-ring` | `var(--primary)` | `var(--primary)` | Focus states |

## 🌈 Special Gradient Implementations

### Primary Button Gradient System

The primary button uses a sophisticated multi-state gradient system:

```css
/* Default State */
background: linear-gradient(to right, #D8400D, #B2330B);

/* Hover State */
background: linear-gradient(to right, #C43A0D, #A93407);

/* Active State */
background: linear-gradient(to right, #B2330B, #992C06);
```

**State Progression:**
- **Default**: `#D8400D` → `#B2330B` (Medium to dark orange)
- **Hover**: `#C43A0D` → `#A93407` (Darker progression)
- **Active**: `#B2330B` → `#992C06` (Darkest progression)

**Implementation:**
```tsx
<Button className="bg-gradient-to-r from-[#D8400D] to-[#B2330B] hover:from-[#C43A0D] hover:to-[#A93407] active:from-[#B2330B] active:to-[#992C06]">
  Primary Action
</Button>
```

### Hero Banner Gradient

Three-stop gradient for maximum visual impact:

```css
background: linear-gradient(to right, #D8400D, #C43A0D, #B2330B);
```

**Implementation:**
```tsx
<div className="bg-gradient-to-r from-[#D8400D] via-[#C43A0D] to-[#B2330B]">
  Hero content
</div>
```

## 🎯 Tailwind CSS Usage Patterns

### Background Colors

```tsx
// Semantic backgrounds
<div className="bg-background">      // Main page background
<div className="bg-card">            // Card/surface background
<div className="bg-primary">         // Brand color background
<div className="bg-secondary">       // Secondary element background
<div className="bg-muted">           // Disabled/inactive background
<div className="bg-accent">          // Interactive hover background
<div className="bg-destructive">     // Error/warning background
<div className="bg-popover">         // Floating element background

// With opacity modifiers
<div className="bg-primary/10">      // 10% opacity primary
<div className="bg-muted/50">        // 50% opacity muted
<div className="bg-destructive/20">  // 20% opacity destructive
```

### Text Colors

```tsx
// Primary text colors
<p className="text-foreground">           // Main body text
<p className="text-muted-foreground">     // Secondary/description text
<p className="text-primary">              // Brand color text
<p className="text-destructive">          // Error text

// Foreground variants (for colored backgrounds)
<p className="text-primary-foreground">     // Text on primary background
<p className="text-secondary-foreground">   // Text on secondary background
<p className="text-card-foreground">        // Text on card background
<p className="text-popover-foreground">     // Text on popover background
<p className="text-destructive-foreground"> // Text on destructive background

// With opacity
<p className="text-foreground/70">       // 70% opacity text
<p className="text-muted-foreground/50"> // 50% opacity muted text
```

### Border Colors

```tsx
// Border utilities
<div className="border border-border">           // Standard border
<div className="border-2 border-primary">        // Primary brand border
<div className="border border-input">            // Input field border
<div className="border border-destructive">      // Error border
<div className="border-t border-border">         // Top border only
<div className="divide-y divide-border">         // Divider lines

// Border with opacity
<div className="border border-border/50">        // 50% opacity border
<div className="border border-primary/30">       // 30% opacity primary border
```

### Focus States

```tsx
// Focus ring patterns
<button className="focus:ring-2 focus:ring-ring focus:ring-offset-2">
  Standard focus
</button>

<input className="focus:ring-2 focus:ring-primary/20 focus:border-primary">
  Input focus
</input>

<button className="focus-visible:ring-2 focus-visible:ring-destructive/20">
  Error state focus
</button>

// Focus ring offset
<button className="focus:ring-offset-background focus:ring-offset-2">
  Focus with background offset
</button>
```

## 🧩 Component Implementation Patterns

### Button Variants

```tsx
import { Button } from '@/components/ui/button'

// Primary button (gradient)
<Button variant="default">
  Primary Action
</Button>

// Secondary button
<Button variant="secondary">
  Secondary Action
</Button>

// Destructive button
<Button variant="destructive">
  Delete Item
</Button>

// Outline button
<Button variant="outline">
  Cancel
</Button>

// Ghost button
<Button variant="ghost">
  Subtle Action
</Button>

// Link-style button
<Button variant="link">
  Learn More
</Button>
```

**Variant Definitions:**
```css
/* Default: Gradient with states */
.btn-default {
  background: linear-gradient(to right, #593CFB, #4329C7);
  color: white;
  font-weight: 600;
}

/* Secondary: Uses semantic colors */
.btn-secondary {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

/* Destructive: Error state */
.btn-destructive {
  background-color: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
}

/* Outline: Transparent with border */
.btn-outline {
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}

/* Ghost: Transparent with hover */
.btn-ghost {
  background-color: transparent;
  color: hsl(var(--foreground));
}
.btn-ghost:hover {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
```

### Card Components

```tsx
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'

<Card className="bg-card border-border shadow-sm">
  <CardHeader>
    <CardTitle className="text-card-foreground">
      Card Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">
      Card description content
    </p>
  </CardContent>
</Card>
```

### Form Elements

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-2">
  <Label className="text-foreground">
    Email Address
  </Label>
  <Input 
    className="border-input bg-background text-foreground"
    placeholder="Enter email..."
  />
</div>

// Error state
<Input 
  className="border-destructive focus:ring-destructive/20"
  aria-invalid="true"
/>
<p className="text-destructive text-sm">
  This field is required
</p>
```

### Admin Interface Components

```tsx
// Admin-specific patterns
<div className="admin-card bg-card border-border/50">
  <div className="admin-card-header">
    <h3 className="admin-section-title text-foreground">
      Section Title
    </h3>
  </div>
  <div className="admin-card-content">
    <div className="admin-form-grid">
      {/* Form elements */}
    </div>
  </div>
</div>

// Admin badges
<span className="admin-badge-missing text-muted-foreground border-dashed">
  Missing Data
</span>

<span className="admin-draft-badge text-orange-700 bg-orange-50 border-orange-200">
  Draft
</span>
```

## 🌓 Dark Mode Implementation

### Activation Method

Dark mode is controlled by adding/removing the `.dark` class on the root element:

```typescript
// Toggle dark mode
const toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark')
}

// Set dark mode
const setDarkMode = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
```

### Automatic Color Switching

All semantic colors automatically switch when `.dark` class is present:

```tsx
// These automatically adapt to theme
<div className="bg-background text-foreground">
  Content that adapts to theme
</div>

<div className="bg-card border-border">
  Card that switches colors automatically
</div>
```

### Manual Dark Mode Overrides

For specific dark mode styling:

```tsx
// Manual dark mode classes
<div className="bg-white dark:bg-gray-900">
  Manual light/dark backgrounds
</div>

<p className="text-gray-900 dark:text-gray-100">
  Manual light/dark text
</p>

// Opacity in dark mode
<div className="bg-primary/20 dark:bg-primary/10">
  Different opacity in dark mode
</div>
```

### Brand Color Consistency

Key brand elements maintain consistency across themes:

- **Primary color** (`#D8400D`) remains identical in both modes
- **Focus rings** use the same primary color
- **Primary buttons** maintain the same gradient
- **Charts** use consistent color palette

## 🔧 Technical Implementation

### CSS Custom Properties Definition

Location: `src/index.css`

```css
:root {
  /* Light mode colors */
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.1288 0.0406 264.6952);
  --primary: 0.5896 0.1961 36;
  --primary-foreground: 1 0 0;
  /* ... additional variables */
}

.dark {
  /* Dark mode overrides */
  --background: oklch(0.1469 0.0041 49.2499);
  --foreground: oklch(0.9851 0 0);
  --primary: 0.5896 0.1961 36; /* Consistent */
  --primary-foreground: 1 0 0;
  /* ... additional variables */
}
```

### Tailwind Configuration

Location: `tailwind.config.js`

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
      },
    },
  },
}
```

### OKLCH Integration

CSS variables use OKLCH numeric tuples, referenced via OKLCH functions in Tailwind:

```css
/* CSS Variable (OKLCH tuples) */
--primary: 0.5896 0.1961 36;

/* Tailwind Usage (OKLCH function) */
background-color: oklch(var(--primary) / <alpha-value>);
```

The browser parses OKLCH tuples directly, providing better color accuracy and consistency.

## 📊 Accessibility & Contrast

### WCAG Compliance

All color combinations meet WCAG AA standards:

| Combination | Contrast Ratio | WCAG Level |
|-------------|----------------|------------|
| `foreground` on `background` | 16.2:1 | AAA |
| `primary-foreground` on `primary` | 6.8:1 | AA |
| `secondary-foreground` on `secondary` | 15.1:1 | AAA |
| `muted-foreground` on `background` | 4.7:1 | AA |
| `destructive-foreground` on `destructive` | 5.2:1 | AA |

### High Contrast Support

```css
@media (prefers-contrast: high) {
  :root {
    --border: oklch(0.8000 0.0200 255.5078); /* Darker borders */
    --ring: oklch(0.4000 0.3000 279.22);     /* Higher contrast focus */
  }
}
```

### Color Blindness Considerations

- Primary brand color (`#593CFB`) remains accessible to most color vision types
- Red destructive color (`#dc2626`) is supplemented with icons and context
- Chart colors use both hue and lightness differences for differentiation

## 🚀 Best Practices

### Development Guidelines

1. **Always Use Semantic Names**
   ```tsx
   // ✅ Correct
   <div className="bg-primary text-primary-foreground">

   // ❌ Incorrect
   <div className="bg-purple-600 text-white">
   ```

2. **Leverage the Alpha Channel**
   ```tsx
   // ✅ Good - uses system colors with opacity
   <div className="bg-primary/10 border border-primary/20">

   // ❌ Avoid - hardcoded opacity colors
   <div className="bg-purple-100 border border-purple-200">
   ```

3. **Maintain Foreground/Background Pairs**
   ```tsx
   // ✅ Correct pairing
   <div className="bg-destructive text-destructive-foreground">

   // ❌ Incorrect pairing
   <div className="bg-destructive text-white">
   ```

4. **Test Both Themes**
   ```tsx
   // Ensure components work in both modes
   <div className="bg-card border-border text-card-foreground">
     Content that adapts properly
   </div>
   ```

### Component Design Rules

1. **No Custom Colors**: Only use defined CSS variables
2. **No Hardcoded Values**: Always reference the color system
3. **Consistent Patterns**: Use the same color patterns across similar components
4. **Accessible Combinations**: Only use tested foreground/background pairs

### Performance Considerations

1. **CSS Variables are Fast**: No JavaScript required for theme switching
2. **Single Source of Truth**: All colors defined in one location
3. **Automatic Inheritance**: Child elements inherit theme automatically
4. **Minimal Bundle Impact**: Only CSS variables, no additional JavaScript

### Migration Guidelines

When updating existing components:

1. **Identify Current Colors**: Note any hardcoded colors
2. **Map to Semantic Names**: Find the appropriate semantic variable
3. **Update Classes**: Replace hardcoded values with semantic utilities
4. **Test Both Themes**: Verify appearance in light and dark modes
5. **Check Accessibility**: Ensure contrast ratios remain compliant

## 🔍 Debugging & Troubleshooting

### Common Issues

1. **Colors Not Changing in Dark Mode**
   ```tsx
   // Problem: Hardcoded colors
   <div className="bg-white text-black">

   // Solution: Use semantic colors
   <div className="bg-background text-foreground">
   ```

2. **Poor Contrast**
   ```tsx
   // Problem: Mismatched pairs
   <div className="bg-muted text-foreground">

   // Solution: Use proper pairs
   <div className="bg-muted text-muted-foreground">
   ```

3. **Gradients Not Working**
   ```tsx
   // Problem: CSS variables in gradients
   <div className="bg-gradient-to-r from-primary to-secondary">

   // Solution: Use hardcoded gradient or custom CSS
   <div className="bg-gradient-to-r from-[#593CFB] to-[#4329C7]">
   ```

### Development Tools

1. **Browser DevTools**: Inspect CSS variables in real-time
2. **Tailwind CSS IntelliSense**: VS Code extension for class autocomplete
3. **React DevTools**: Check component props and className values
4. **Accessibility Inspector**: Verify contrast ratios

### Testing Checklist

- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode
- [ ] All text has sufficient contrast (4.5:1 minimum)
- [ ] Focus states are visible and accessible
- [ ] Colors work with color blindness simulators
- [ ] No hardcoded color values in component code
- [ ] Semantic color names used throughout

## 📚 Additional Resources

### Related Documentation
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [OKLCH Color Picker](https://oklch.com)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

### Design System Extensions
- **Typography**: Font system using Poppins
- **Spacing**: Consistent spacing scale
- **Border Radius**: Unified radius system (`--radius: 0.75rem`)
- **Shadows**: Disabled for clean design (`shadow: none`)
- **Animations**: Consistent transition timing

### Future Considerations
- **Color Palette Expansion**: Additional semantic colors as needed
- **Theme Variants**: Potential for multiple theme options
- **System Integration**: OS-level theme detection improvements
- **Accessibility Enhancements**: Additional high contrast modes

---

**Last Updated**: August 2025  
**Version**: 3.0 (Orange Primary Migration)  
**Maintainer**: Development Team