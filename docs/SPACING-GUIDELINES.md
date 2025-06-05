# Section Spacing Guidelines

## 🎯 Standardized Section Spacing

To ensure consistent layout and visual harmony across all pages, we use standardized section spacing patterns.

## 📏 Spacing Standards

### Standard Section Spacing
- **Mobile**: `py-6` (24px top/bottom)  
- **Small screens and up**: `sm:py-8` (32px top/bottom)
- **Positioning**: `relative` for layout context

### Usage Options

#### Option 1: Direct Tailwind Classes
```vue
<template>
  <section class="py-6 sm:py-8 relative">
    <!-- section content -->
  </section>
</template>
```

#### Option 2: CSS Utility Class
```vue
<template>
  <section class="section-wrapper">
    <!-- section content -->
  </section>
</template>
```

## 📋 Implemented Components

The following components have been standardized:

### ✅ Main Section Components
- `CarListingGrid.vue` - `py-6 sm:py-8 relative`
- `PopularCategories.vue` - `py-6 sm:py-8 relative`

### ✅ Page Sections  
- `Home.vue` - Uses standardized components
- `Listing.vue` - Main content: `py-6 sm:py-8 relative`
- `About.vue` - `py-6 sm:py-8 relative`
- `ListingCreation.vue` - `py-6 sm:py-8 relative`

## 🛠 Implementation Notes

1. **Compact Design**: Reduced spacing for modern, tight layouts
2. **Reusable Components**: Major section components implement spacing internally
3. **Page-Level Sections**: Individual page sections use the standardized spacing
4. **CSS Utility**: `.section-wrapper` class available for consistent application
5. **Responsive**: Spacing increases on larger screens for better visual balance
6. **Positioning Context**: `relative` provides positioning context for child elements

## 🎨 Visual Benefits

- **Modern Appearance**: Compact, contemporary spacing
- **Consistent Rhythm**: Predictable vertical spacing across pages
- **Improved Content Density**: More content visible in viewport
- **Professional Appearance**: Unified design language
- **Responsive Design**: Appropriate spacing for different screen sizes

## 🚀 Future Development

When creating new sections or components:

1. Use `class="section-wrapper"` or `class="py-6 sm:py-8 relative"`
2. Maintain consistency with existing patterns
3. Test across mobile and desktop breakpoints
4. Update this documentation when adding new standards 