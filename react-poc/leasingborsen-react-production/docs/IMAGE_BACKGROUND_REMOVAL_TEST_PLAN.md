# Image Background Removal Test Plan

## Overview
Comprehensive test plan for image upload, background removal, and persistence functionality to prevent regression issues like images disappearing after save.

## Test Categories

### 1. Unit Tests - Component Level

#### ImageUploadWithBackgroundRemoval Component
- **Test File**: `src/components/admin/shared/__tests__/ImageUploadWithBackgroundRemoval.test.tsx`
- **Coverage Goals**: 
  - File upload handling
  - URL input validation
  - Background removal toggle
  - Preview dialog functionality
  - Error handling

#### MediaSectionWithBackgroundRemoval Component  
- **Test File**: `src/components/admin/listings/forms/form-sections/__tests__/MediaSectionWithBackgroundRemoval.test.tsx`
- **Coverage Goals**:
  - Form field integration
  - Processed image display logic
  - Callback propagation

### 2. Hook Tests - Business Logic

#### useAdminImageUpload Hook
- **Test File**: `src/hooks/__tests__/useAdminImageUpload.test.ts`
- **Coverage Goals**:
  - File to base64 conversion
  - Edge Function invocation
  - Error handling
  - Progress tracking

#### useAdminFormState Hook
- **Test File**: `src/hooks/__tests__/useAdminFormState.test.ts`
- **Coverage Goals**:
  - Auto-save trigger conditions
  - Race condition prevention
  - Image state management
  - Form data persistence

### 3. Integration Tests - End-to-End Flow

#### Image Persistence Flow
- **Test File**: `src/components/admin/listings/__tests__/ImagePersistence.integration.test.tsx`
- **Coverage Goals**:
  - Upload → Save → Refresh → Verify
  - Background removal → Save → Verify processed URLs
  - Multiple images handling
  - Auto-save behavior

### 4. Edge Function Tests

#### admin-image-operations
- **Test File**: `supabase/functions/admin-image-operations/__tests__/index.test.ts`
- **Coverage Goals**:
  - Upload operation
  - Background processing
  - Update listing images
  - Error scenarios

## Critical Test Scenarios

### Scenario 1: Background Removal Persistence
```typescript
it('should persist background-removed images after save and refresh', async () => {
  // 1. Upload image with background removal
  // 2. Verify processedImageUrl is returned
  // 3. Save listing
  // 4. Refresh/remount component
  // 5. Verify images still display
})
```

### Scenario 2: Auto-Save Race Condition
```typescript
it('should handle auto-save correctly when processed images are added', async () => {
  // 1. Start with existing listing
  // 2. Add background-removed image
  // 3. Verify auto-save triggers for both images AND processed fields
  // 4. Verify no duplicate saves
})
```

### Scenario 3: Form State Synchronization
```typescript
it('should load images array correctly on edit', async () => {
  // 1. Mock listing with images array
  // 2. Load form
  // 3. Verify all images display
  // 4. Verify processed images load into correct fields
})
```

### Scenario 4: Error Recovery
```typescript
it('should handle background removal API failures gracefully', async () => {
  // 1. Mock API failure
  // 2. Upload image
  // 3. Verify error message in Danish
  // 4. Verify option to use original image
})
```

## Test Data Requirements

### Mock Listing Data
```typescript
const mockListing = {
  listing_id: '1f773bdf-2a60-4c85-a739-513dedf035cb',
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/processed-image.png'
  ],
  processed_image_grid: 'https://example.com/grid.png',
  processed_image_detail: 'https://example.com/detail.png'
}
```

### Mock Edge Function Responses
```typescript
const mockUploadResponse = {
  success: true,
  imageUrl: 'https://example.com/uploaded.jpg',
  processedImageUrl: 'https://example.com/processed.jpg'
}
```

## Regression Test Checklist

- [ ] Images persist after page refresh
- [ ] Processed images saved to correct database fields
- [ ] Auto-save triggers for all image changes
- [ ] Form loads images from array field, not just single image
- [ ] Background removal errors shown in Danish
- [ ] Multiple images can be uploaded and saved
- [ ] URL validation accepts common image patterns
- [ ] Edge Functions handle all image operations correctly

## Performance Considerations

- Test with large image files (5MB limit)
- Test with multiple simultaneous uploads
- Verify auto-save debouncing works correctly
- Check for memory leaks in preview dialog

## Accessibility Testing

- Keyboard navigation for image upload
- Screen reader compatibility
- Focus management in preview dialog
- Error announcements

## Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Testing

- Touch gestures for drag & drop
- File picker on mobile devices
- Responsive preview dialog

## Success Criteria

- All tests pass with >90% coverage
- No regression of fixed issues
- Danish error messages display correctly
- Performance benchmarks met
- Accessibility standards maintained