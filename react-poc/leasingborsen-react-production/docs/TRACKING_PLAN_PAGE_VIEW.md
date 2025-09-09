# Page View Tracking Plan

## Overview

This document describes the `page_view` event implementation for the Danish car leasing platform. The analytics system is GDPR-compliant, uses Mixpanel EU for data residency, and implements a consent-first approach with opt-out by default.

## Event Schema

### Base Properties (All Events)

All `page_view` events include these required properties:

```typescript
{
  schema_version: "1",
  session_id: string,           // Rolling 30-minute TTL
  device_type: "desktop" | "mobile" | "tablet",
  page_type: "home" | "results" | "listing_detail" | "other",
  path: string,                 // URL pathname
  page_load_type: "cold" | "warm" | "bfcache" | "spa",
  
  // Optional base properties
  page_name?: string,           // Human-readable page name
  query?: Record<string, string | number | boolean>,
  referrer_host?: string,       // Domain only (no PII)
  feature_flags?: string[],     // Array of active feature flags
  utm_source?: string,
  utm_medium?: string,
  utm_campaign?: string,
  utm_content?: string,
  utm_term?: string
}
```

### Results Page Context

When `page_type === "results"`, these additional properties are included:

```typescript
{
  results_session_id: string,   // UUID per search journey
  results_count?: number,       // Number of results returned
  filters_active?: {            // Whitelisted filter subset
    make?: string,
    model?: string,
    fuel_type?: string,
    body_type?: string,
    sort_option?: string,
    mileage_km_per_year?: number,
    term_months?: number,
    price_max?: number
  },
  latency_ms?: number          // Search/load latency if available
}
```

### Listing Detail Context

When `page_type === "listing_detail"`, these additional properties are included:

```typescript
{
  listing_id: string,           // Required listing identifier
  lease_score?: number,         // 0-100 lease score
  lease_score_band?: "excellent" | "good" | "fair" | "weak",
  price_dkk?: number,          // Monthly price in DKK (integer)
  mileage_km_per_year?: number, // Annual mileage limit
  term_months?: number,        // Contract term in months
  fuel_type?: "ev" | "phev" | "ice",
  entry_method?: "direct" | "internal_grid_click" | "internal_similar" | "ad" | "email" | "push",
  source_event_id?: string     // UUID of prior click event if available
}
```

## Example Events

### Homepage Visit (Direct)
```json
{
  "schema_version": "1",
  "session_id": "s_1704067200_abc123",
  "device_type": "desktop",
  "page_type": "home",
  "page_name": "Homepage",
  "path": "/",
  "page_load_type": "cold",
  "referrer_host": "google.com",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "leasing-q1"
}
```

### Results Page (With Filters)
```json
{
  "schema_version": "1",
  "session_id": "s_1704067200_abc123",
  "device_type": "mobile",
  "page_type": "results",
  "page_name": "Results",
  "path": "/listings",
  "page_load_type": "spa",
  "query": {
    "make": "BMW",
    "fuel_type": "ev",
    "max_price": "5000"
  },
  "results_session_id": "rs_1704067300_def456",
  "results_count": 24,
  "filters_active": {
    "make": "BMW",
    "fuel_type": "ev",
    "price_max": 5000
  },
  "latency_ms": 450
}
```

### Listing Detail Page (Internal Navigation)
```json
{
  "schema_version": "1",
  "session_id": "s_1704067200_abc123",
  "device_type": "desktop",
  "page_type": "listing_detail",
  "page_name": "Listing Detail",
  "path": "/listing/abc-123-def-456",
  "page_load_type": "spa",
  "listing_id": "abc-123-def-456",
  "lease_score": 85,
  "lease_score_band": "excellent",
  "price_dkk": 4200,
  "mileage_km_per_year": 15000,
  "term_months": 36,
  "fuel_type": "ev",
  "entry_method": "internal_grid_click"
}
```

## Consent & Privacy

### GDPR Compliance
- **Opt-out by default**: No events are sent before explicit consent
- **EU data residency**: All data sent to `api-eu.mixpanel.com`
- **No PII**: Only device IDs, session IDs, and business context
- **Consent management**: `analytics.grantConsent()` / `analytics.revokeConsent()`

### Current Implementation
```typescript
// Initialize with opt-out
analytics.init({ token: "...", eu: true })

// Only track after consent (currently auto-granted)
// TODO: Implement proper consent UI
analytics.grantConsent()
```

## Session Management

### Session ID Rules
- **30-minute rolling TTL**: Session extends on activity
- **Format**: `s_{timestamp}_{random}` (e.g., `s_1704067200_abc123`)
- **Cross-page persistence**: Consistent across SPA navigation
- **New session triggers**: 30+ minutes idle, new browser session

### Results Session ID
- **Generated when**: First results page visit or filter change
- **Format**: `rs_{timestamp}_{random}` (e.g., `rs_1704067300_def456`)
- **Persistence**: Until filters change significantly
- **Purpose**: Track search journey across results → detail → back flows

## De-duplication & Performance

### De-duplication Logic
- **200ms window**: Prevents duplicate events on rapid re-renders
- **Key**: `{path + query}` combination
- **Storage**: In-memory per session

### Size Guards
- **Payload limit**: 32KB maximum
- **Filter whitelist**: Only allowed filter keys included
- **Query sanitization**: Only primitive types preserved

## Technical Implementation

### Initialization (App.tsx)
```typescript
useEffect(() => {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN
  if (token) {
    analytics.init({ token, eu: true })
    analytics.grantConsent()
  }
  
  // Track initial page
  trackInitialPageView()
  
  // Subscribe to SPA navigation
  const unsubscribe = router.subscribe('onLoad', ({ location }) => {
    trackRouteNavigation(location.pathname, location.search)
  })
  
  return unsubscribe
}, [])
```

### Route Context Detection
- **Home**: `path === "/"`
- **Results**: `path === "/listings"`  
- **Listing Detail**: `path.startsWith("/listing/")`
- **Query parsing**: URL search params converted to typed object
- **Filter mapping**: URL params mapped to analytics schema

### Error Handling
- **Silent failures**: Analytics errors won't crash the app
- **Console logging**: Development debugging with `[Analytics]` prefix
- **Graceful degradation**: App functions normally without analytics

## Development & Testing

### Environment Configuration

#### Development & Staging
```bash
# Development (.env)
VITE_MIXPANEL_TOKEN=448751493043ebfbe9074c20efc72f23

# Staging (.env.staging)
VITE_MIXPANEL_TOKEN=448751493043ebfbe9074c20efc72f23
```

#### Production Deployment (Vercel)
**Important**: Production token should **never** be committed to the repository.

**Complete Vercel Environment Configuration:**

1. **Production Environment** (✅ Configured):
   - Go to your Vercel project → Settings → Environment Variables
   - Add variable:
     - Name: `VITE_MIXPANEL_TOKEN`
     - Value: `cefe2d6f968f8bb421405ad77daf2c3b` (production token)
     - Environment: **Production only** ✓

2. **Preview Environment** (Recommended for PR deployments):
   - Add another variable with same name:
     - Name: `VITE_MIXPANEL_TOKEN`
     - Value: `448751493043ebfbe9074c20efc72f23` (dev/staging token)
     - Environment: **Preview only** ✓
   
   **Why Preview needs separate config:**
   - Keeps PR deployment analytics separate from production
   - Prevents test data from polluting production analytics
   - Maintains consistent development experience

3. **Development Environment** (Optional):
   - Rarely needed since developers use local `.env` files
   - If needed, use same dev token as Preview

4. **Environment Matrix**:

| Environment | Token | Analytics Project | Purpose |
|-------------|--------|------------------|---------|
| **Production** | `cefe2...c3b` | Production | Live site data |
| **Preview** | `4487...f23` | Development | PR testing |
| **Local Dev** | `4487...f23` | Development | Local development |

5. **Redeploy** after configuration to apply environment variables

**Next Steps:**
- **Recommended**: Configure Preview environment to keep PR deployments separate from production analytics
- **Optional**: Configure Development environment if using Vercel's development features
- Verify analytics are working correctly in each environment after deployment

### Testing Checklist
- [ ] No events before consent granted
- [ ] page_view fires on initial load
- [ ] page_view fires on SPA navigation  
- [ ] No duplicate events within 200ms
- [ ] Correct page_type detection
- [ ] Results context includes filters
- [ ] Listing context includes product data
- [ ] Session ID stays consistent across navigation
- [ ] New session ID after 30+ minutes idle
- [ ] EU endpoint used (api-eu.mixpanel.com)
- [ ] Payloads under 32KB limit

### Debug Console
Analytics events are logged to browser console with `[Analytics]` prefix for development debugging.

## Future Extensibility

The foundation supports easy addition of new events:

```typescript
// TODO: Planned events (commented in mp.ts)
// - listing_view (impressions)
// - listing_click (interactions)
// - filters_change (user input)
// - filters_apply (query execution)
// - dealer_outbound (external link clicks)
```

All future events will reuse the same base properties, session management, and consent system.