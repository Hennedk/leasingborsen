# Dynamic Dealer PDF URL Whitelisting Plan

## Overview

This document outlines the migration from static hardcoded domain whitelisting to dynamic database-driven dealer PDF URL validation for the leasingborsen PDF extraction system.

## Current Problem

**Error**: `403 - Domain not in trusted list` when processing dealer PDFs
**Root Cause**: Static `TRUSTED_DOMAINS` array in `pdf-proxy` Edge Function requires code deployments for each new dealer

## Current vs Proposed Architecture

### Current Static Approach
```typescript
// Hard-coded in supabase/functions/pdf-proxy/index.ts
const TRUSTED_DOMAINS = [
  'volkswagen.dk', 'audi.dk', 'bmw.dk', 'mercedes-benz.dk',
  'toyota.dk', 'hyundai.dk', 'kia.dk', // ... 42+ domains
]
```

**Issues:**
- ❌ Requires deployment for each new dealer
- ❌ Admin cannot onboard dealers independently  
- ❌ Maintenance burden grows with each dealer
- ❌ Poor business agility

### Proposed Dynamic Approach
```typescript
// Database-driven validation
async function isDealerUrlTrusted(url: string): Promise<boolean> {
  // Query sellers table for matching PDF URLs
  // Validate against stored dealer PDF URLs
  // Maintain same security protections
}
```

**Benefits:**
- ✅ Zero deployments for new dealers
- ✅ Admin self-service capability
- ✅ Automatic scaling with business growth
- ✅ Maintains security through admin control

## Technical Implementation

### Phase 1: Enhanced PDF Proxy Validation

**File:** `supabase/functions/pdf-proxy/index.ts`

**Changes:**
1. Replace `isDomainTrusted()` with `isDealerUrlTrusted()`
2. Add Supabase client initialization with service role
3. Query `sellers` table for PDF URL validation
4. Maintain backward compatibility with static domains as fallback

**New Validation Logic:**
```typescript
async function isDealerUrlTrusted(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Same security checks (HTTPS, IP blocking)
    if (!validateUrlSecurity(url)) return false
    
    // Query database for matching dealer PDF URLs
    const { data: dealers } = await supabase
      .from('sellers')
      .select('pdf_url, pdf_urls')
      .not('pdf_url', 'is', null)
      .or('pdf_urls.neq.null')
    
    // Check if requested URL matches any dealer PDF URL
    return dealers.some(dealer => {
      // Check legacy single PDF URL
      if (dealer.pdf_url && urlMatchesDomain(url, dealer.pdf_url)) {
        return true
      }
      
      // Check modern multiple PDF URLs array
      if (dealer.pdf_urls?.some(pdfUrl => urlMatchesDomain(url, pdfUrl.url))) {
        return true
      }
      
      return false
    })
  } catch (error) {
    console.error('Database validation error:', error)
    return false // Fail securely
  }
}
```

### Phase 2: Performance Optimization

**Add Caching Layer:**
```typescript
// In-memory cache for valid domains (5-10 minute TTL)
const domainCache = new Map<string, { valid: boolean, expires: number }>()

function getCachedDomainValidation(hostname: string): boolean | null {
  const cached = domainCache.get(hostname)
  if (cached && cached.expires > Date.now()) {
    return cached.valid
  }
  return null
}
```

**Benefits:**
- Reduces database queries for repeated requests
- Improves response time for PDF downloads
- Maintains security with reasonable cache TTL

### Phase 3: Admin Interface Enhancement

**File:** `src/components/admin/sellers/SellerForm.tsx`

**Enhancements:**
1. Real-time URL validation when admins enter PDF URLs
2. Preview capability to test PDF accessibility
3. Domain extraction and validation feedback
4. HTTPS enforcement in the UI

**Validation Features:**
```typescript
const validatePdfUrl = async (url: string) => {
  // Check HTTPS requirement
  // Test URL accessibility
  // Validate PDF content type
  // Preview first page if possible
}
```

## Database Schema Utilization

**Existing Structure (No Changes Needed):**
```sql
-- sellers table already has:
pdf_url TEXT,              -- Legacy single URL
pdf_urls JSONB DEFAULT '[]' -- Modern multiple URLs array

-- Example pdf_urls structure:
[
  { "name": "Main Price List", "url": "https://dealer.com/prices.pdf" },
  { "name": "Campaign Offers", "url": "https://dealer.com/special.pdf" }
]
```

## Security Considerations

### Maintained Security Features
1. **HTTPS Enforcement**: Only HTTPS URLs allowed
2. **SSRF Protection**: IP address blocking for internal networks
3. **DNS Validation**: Resolve domains to prevent DNS rebinding
4. **Admin Control**: Only admin-added URLs are trusted
5. **Audit Trail**: Track which admin added which URLs

### Security Model Shift
- **Before**: Trust explicit domain list (developer controlled)
- **After**: Trust admin-validated dealer URLs (business controlled)

**Risk Mitigation:**
- Admin role restrictions (only trusted users can add dealers)
- URL validation at input time (admin interface)
- Logging and monitoring of all PDF requests
- Fallback to static domains for critical dealers

## Migration Strategy

### Step 1: Backward Compatible Implementation
- Keep existing `TRUSTED_DOMAINS` as fallback
- Add new database validation in parallel
- Log both validation results for comparison

### Step 2: Testing Phase
- Test with new dealers first
- Monitor performance and security metrics
- Validate caching effectiveness

### Step 3: Gradual Migration
- Migrate existing dealers to database-stored URLs
- Phase out static domain list over time
- Maintain monitoring for any issues

### Step 4: Full Migration
- Remove static `TRUSTED_DOMAINS` array
- Complete migration to dynamic validation
- Update documentation and admin procedures

## Rollback Plan

**If Issues Arise:**
1. Disable database validation flag
2. Revert to static `TRUSTED_DOMAINS` array
3. Investigate and fix database validation issues
4. Re-enable dynamic validation when stable

## Performance Metrics

**Target Performance:**
- Database query: < 50ms (with caching < 5ms)
- PDF download initiation: < 200ms total
- Cache hit ratio: > 80% for repeat requests

**Monitoring:**
- Track PDF proxy response times
- Monitor database query performance
- Alert on validation failures

## Admin User Experience

### Before (Current)
1. Admin identifies new dealer domain
2. Admin requests developer to add domain
3. Developer updates `TRUSTED_DOMAINS` array
4. Developer deploys PDF proxy function
5. Dealer can upload PDFs (1-2 days delay)

### After (Dynamic)
1. Admin adds dealer with PDF URL in admin interface
2. System validates URL accessibility automatically
3. Dealer can immediately upload PDFs (< 5 minutes)

## Business Impact

**Benefits:**
- **Faster dealer onboarding**: Minutes instead of days
- **Reduced development overhead**: No deployments needed
- **Better business agility**: Admin team independence
- **Improved scalability**: Handles unlimited dealers
- **Enhanced user experience**: Immediate PDF processing

**Success Metrics:**
- Dealer onboarding time: < 5 minutes (vs 1-2 days)
- Development deployments for dealers: 0 (vs monthly)
- Admin satisfaction: Self-service capability
- System scalability: Support 100+ dealers without code changes

## Technical Debt Considerations

**Reduced Technical Debt:**
- Eliminate manual domain list maintenance
- Remove deployment dependencies for business operations
- Reduce code complexity in PDF proxy function

**New Technical Considerations:**
- Database query performance monitoring
- Cache invalidation strategies
- Admin interface URL validation complexity

## Conclusion

Dynamic dealer PDF URL whitelisting transforms dealer onboarding from a **development bottleneck** into a **business capability**, while maintaining the same security protections through admin-controlled URL validation.

This approach enables business growth without technical constraints and provides a foundation for future scalability in the car leasing platform.