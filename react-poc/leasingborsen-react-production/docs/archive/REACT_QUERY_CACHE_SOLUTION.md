# React Query Cache Invalidation Solution

## Problem Summary

The batch import was showing that "Corolla Touring Sports" and "Urban Cruiser" were still not found, even though these models were successfully added to the database. The issue was **React Query caching** - the reference data was cached for 1 hour and wasn't reflecting the newly added models.

## Root Cause Analysis

1. ✅ **Database State**: Both models exist in the database (confirmed by scripts)
2. ❌ **Cache State**: React Query had stale cached data from before the models were added
3. 🔧 **Cache Settings**: Reference data cache was set to 1 hour stale time with no automatic invalidation

## Solution Implemented

### 1. Cache Utilities (`src/lib/cacheUtils.ts`)

Created centralized cache management utilities:

```typescript
export const cacheUtils = {
  invalidateReferenceData: async (queryClient: QueryClient) => {
    // Invalidates all reference data queries
  },
  refetchReferenceData: async (queryClient: QueryClient) => {
    // Forces refetch of reference data
  },
  clearAllCache: (queryClient: QueryClient) => {
    // Clears entire query cache
  },
  isReferenceDataCached: (queryClient: QueryClient) => {
    // Checks current cache status
  }
}
```

### 2. Development Cache Controller (`src/components/dev/CacheInvalidator.tsx`)

Added a development-only component that provides cache management UI:

- **Cache Status Display**: Shows which data is currently cached
- **Invalidate Button**: Clears reference data cache
- **Refetch Button**: Forces fresh data fetch
- **Clear All Button**: Nuclear option to clear everything
- **Auto-hides in production**: Only visible in development mode

### 3. Batch Hook Enhancement (`src/hooks/useBatchListingCreation.ts`)

Enhanced the batch creation hook with cache management:

```typescript
export const useBatchListingCreation = () => {
  // ... existing code ...
  
  const refreshReferenceDataAndRetry = useCallback(async () => {
    // Automatically refreshes cache when reference data errors occur
  }, [queryClient, refetchReferenceData])

  const isReferenceDataError = (error: string): boolean => {
    // Detects if error is related to missing reference data
  }

  return {
    // ... existing returns ...
    refreshReferenceDataAndRetry,
    isReferenceDataError
  }
}
```

### 4. Smart Error Handling (`src/pages/admin/AdminBatchListings.tsx`)

Added intelligent error detection and recovery:

```tsx
{error && (
  <Alert variant="destructive">
    <AlertDescription>
      {/* Show error message */}
      {error instanceof Error && isReferenceDataError(error.message) && (
        <Button onClick={refreshReferenceDataAndRetry}>
          🔄 Opdater Reference Data og Prøv Igen
        </Button>
      )}
    </AlertDescription>
  </Alert>
)}
```

### 5. Batch Review Page Integration

Added the cache invalidator to the batch review page for easy access:

```tsx
{/* Development Cache Invalidator */}
<CacheInvalidator />
```

## How to Use the Solution

### Method 1: Development Cache Controller

1. Navigate to the Batch Review page (`/admin/batch-review/[batchId]`)
2. Look for the yellow "Development Cache Controller" card
3. Click **"Invalidate Reference Data"** to clear the cache
4. Try the batch import again

### Method 2: Smart Error Recovery

1. Attempt the batch import
2. When you get a "Model not found" error, look for the button:
   **"🔄 Opdater Reference Data og Prøv Igen"**
3. Click the button to automatically refresh cache
4. Retry the import operation

### Method 3: Manual Script

Run the cache invalidation script:

```bash
node scripts/invalidate-reference-cache.js
```

## Verification Scripts

### Check Model Availability
```bash
node scripts/test-cache-invalidation.js
```

### Verify Database State
```bash
node scripts/invalidate-reference-cache.js
```

## Technical Details

### Cache Configuration

Current React Query cache settings for reference data:

```typescript
staleTime: 60 * 60 * 1000,        // 1 hour
gcTime: 24 * 60 * 60 * 1000,      // 24 hours
refetchOnMount: false,
refetchOnWindowFocus: false,
refetchOnReconnect: true
```

### Query Keys Structure

```typescript
referenceDataAll: () => ['reference-data']
models: (makeId?: string) => ['reference-data', 'models', makeId]
makes: () => ['reference-data', 'makes']
```

### Cache Invalidation Strategy

1. **Invalidate Queries**: Marks cache as stale, triggers background refetch
2. **Refetch Queries**: Forces immediate fresh data fetch
3. **Clear Cache**: Nuclear option, removes all cached data

## Files Modified

### New Files
- ✅ `src/lib/cacheUtils.ts` - Cache management utilities
- ✅ `src/components/dev/CacheInvalidator.tsx` - Development UI component
- ✅ `scripts/invalidate-reference-cache.js` - CLI cache management
- ✅ `scripts/test-cache-invalidation.js` - Verification script

### Modified Files
- ✅ `src/hooks/useBatchListingCreation.ts` - Added cache refresh capabilities
- ✅ `src/pages/admin/AdminBatchListings.tsx` - Smart error handling
- ✅ `src/pages/admin/BatchReviewPage.tsx` - Added cache invalidator component

## Future Improvements

### 1. Automatic Cache Invalidation
Consider adding cache invalidation when models are added through the admin interface:

```typescript
// In model creation mutation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.models() })
}
```

### 2. Cache Warning System
Add warnings when cache is older than a certain threshold:

```typescript
const cacheAge = Date.now() - lastFetchTime
if (cacheAge > CACHE_WARNING_THRESHOLD) {
  // Show warning to refresh cache
}
```

### 3. Smart Cache Refresh
Implement background cache refresh when new reference data is detected:

```typescript
// Periodic background check for stale reference data
useInterval(() => {
  if (shouldRefreshCache()) {
    queryClient.invalidateQueries({ queryKey: queryKeys.referenceDataAll() })
  }
}, BACKGROUND_CHECK_INTERVAL)
```

## Testing Status

✅ **Database Verification**: Both "Corolla Touring Sports" and "Urban Cruiser" exist in database  
✅ **Component Creation**: Cache invalidator component created and integrated  
✅ **Hook Enhancement**: Batch creation hook enhanced with cache management  
✅ **Error Handling**: Smart error detection and recovery implemented  
✅ **Development Server**: All changes compile and run successfully  

## Summary

The issue was a classic caching problem - the database was correct, but the application was using stale cached data. The solution provides multiple ways to refresh the cache:

1. **Immediate**: Development cache controller for quick fixes
2. **Automatic**: Smart error detection with one-click recovery
3. **Preventive**: CLI scripts for manual cache management

This ensures that newly added reference data is immediately available for batch operations without requiring application restarts or waiting for cache expiration.