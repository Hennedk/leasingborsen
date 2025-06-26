# Task Completion Requirements

## When a Task is Completed

### 1. Code Quality Checks
```bash
npm run lint         # ESLint must pass
npm run build        # TypeScript compilation must succeed
npm run test:run     # All tests must pass (if applicable)
```

### 2. Testing Requirements
- **CRITICAL**: All refactored components MUST have comprehensive test coverage
- **Unit tests**: 90%+ coverage including error states and loading states
- **Custom hooks**: 100% coverage with edge cases
- **Integration tests**: Component interaction validation

### 3. Performance Validation
- **Bundle size monitoring**: Ensure targets are met (~109KB CSS, ~292KB JS)
- **Component optimization**: React.memo applied where appropriate
- **Loading states**: Skeleton components implemented

### 4. Documentation Updates
- Update relevant documentation (CLAUDE.md, README.md, improvement plans)
- Note any breaking changes or incomplete refactors
- Highlight next priority items

### 5. Production Readiness
- **Environment variables**: Properly configured for staging/production
- **Error boundaries**: Implemented for critical components
- **Danish localization**: All user-facing text translated
- **Accessibility**: Basic requirements met with shadcn/ui

### 6. Git & Deployment
```bash
# Standard commit message format
git commit -m "type(scope): description

- Specific change 1
- Specific change 2
- Related to: [Documentation reference]

Claude Change Summary: [Brief summary]"
```

### 7. Serena Integration (if active)
- Use semantic search to verify all references updated
- Analyze component relationships after changes
- Ensure TypeScript types are consistent across codebase

## Pre-Completion Checklist
- [ ] Code compiles without TypeScript errors
- [ ] All tests pass
- [ ] ESLint issues resolved
- [ ] Component is properly memoized (if performance-critical)
- [ ] Error states handle Danish error messages
- [ ] Loading states use shadcn/ui Skeleton components
- [ ] Mobile responsiveness verified
- [ ] Accessibility considerations addressed