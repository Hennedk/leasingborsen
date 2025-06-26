# Code Style and Conventions

## TypeScript & React Patterns

### Component Structure
- **TypeScript strict mode** required
- **React 18** with modern hooks (useState, useEffect, useMemo, useCallback)
- **Props interfaces** with proper typing
- **React.memo** for expensive components
- **Error boundaries** for graceful failure handling

### File Naming
- **Components**: PascalCase with .tsx extension (`ListingCard.tsx`)
- **Pages**: PascalCase with Page suffix (`ListingsPage.tsx`)
- **Hooks**: camelCase with "use" prefix (`useUrlSync.ts`, `useImageLazyLoading.ts`)
- **Types**: PascalCase in types file (`types/index.ts`)
- **Utilities**: camelCase (`utils.ts`)

### Import/Export Standards
- **Always use path aliases**: `@/components` not `../components`
- **Barrel exports** in major directories (`index.ts` files)
- **Consistent import order**: React, third-party, local components, types

### Component Patterns
```tsx
// Standard React component structure
interface ComponentProps {
  prop: string
  onEvent?: (data: any) => void
}

const Component: React.FC<ComponentProps> = ({ prop, onEvent }) => {
  const [state, setState] = useState()
  
  useEffect(() => {
    // lifecycle logic
  }, [dependencies])
  
  // Render logic
}

export default Component
```

## UI/Styling Guidelines

### shadcn/ui Components
- **Always use shadcn/ui components** instead of custom styling
- Standard components: Card, Button, Input, Dialog, etc.
- **cn()** utility for class merging from `@/lib/utils`

### Danish Localization
- **All UI text in Danish**
- **Price formatting**: `toLocaleString('da-DK')` for currency
- **Date formatting**: `toLocaleDateString('da-DK')`
- **Error messages in Danish**: "Der opstod en fejl ved..."

## Performance Requirements
- **Bundle size targets**: CSS ~109KB, JS ~292KB
- **Code splitting** with React.lazy and Suspense
- **React.memo** for list components
- **useCallback/useMemo** for stable references
- **Skeleton loading states** from shadcn/ui

## Quality Standards
- **Never use console.log** (console.error for actual errors only)
- **Always include loading and error states**
- **Break down large components** (>300 lines) into focused pieces
- **Extract complex logic to custom hooks**
- **Comprehensive error handling** with Danish messages