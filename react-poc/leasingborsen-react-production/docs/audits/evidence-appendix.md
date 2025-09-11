# Evidence Appendix — Documentation Drift

Each excerpt is ≤30 lines with path and line numbers to support the drift findings.

1) README staging deploy command (no matching script)
- Path: README.md:119–120
```
119  # Deploy to staging
120  npm run staging:deploy
```

2) Dev commands – staging:check (no matching script)
- Path: docs/DEVELOPMENT_COMMANDS.md:213–220
```
213 ### Staging Deployment
215 # Deploy to staging
216 npm run staging:deploy
218 # Check staging
219 npm run staging:check
```

3) package.json scripts (no staging:deploy/check)
- Path: package.json (scripts excerpt)
```
"staging:deploy-functions": "supabase functions deploy --project-ref $STAGING_PROJECT_REF",
"staging:deploy-all": "npm run staging:deploy-functions && echo '✅ All Edge Functions deployed to staging'",
"staging:dev": "NODE_ENV=staging npm run dev",
"staging:logs": "echo 'Viewing staging logs in deploy/staging/logs/'",
"staging:monitor": "echo 'Opening staging monitoring dashboard...'",
```

4) Unused feature flag envs documented in README
- Path: README.md:57–65
```
57 # Feature Flags
58 VITE_AI_EXTRACTION_ENABLED=true
59 VITE_BATCH_PROCESSING_ENABLED=true
60 VITE_MOBILE_FILTERS_ENABLED=true
63 VITE_DEBUG_MODE=false
64 VITE_PERFORMANCE_MONITORING=true
```

5) No code reads the above flags
- Path: src/** env usage (grep summary)
```
src/config/environments.ts: VITE_AI_EXTRACTION_ENABLED, VITE_ENVIRONMENT
src/App.tsx: VITE_MIXPANEL_TOKEN
src/services/PDFExtractor.ts: VITE_PDF_SERVICE_URL
-- no references to VITE_BATCH_PROCESSING_ENABLED, VITE_MOBILE_FILTERS_ENABLED, VITE_PERFORMANCE_MONITORING
```

6) Mileage default and active-filter rules drift
- Path: src/stores/consolidatedFilterStore.ts:34–48 (defaults)
```
34  horsepower_max: null,
35  mileage_selected: null
```
- Path: src/stores/consolidatedFilterStore.ts:304–318 (hasStoredFilters)
```
... if (key === 'mileage_selected') return value != null
```
- Path: src/stores/consolidatedFilterStore.ts:248–286 (mileage chip)
```
// Mileage filter (only show if explicitly selected)
if (state.mileage_selected != null) {
  activeFilters.push({ key: 'mileage', ... })
}
```

7) Analytics opt-out + EU host + consent
- Path: src/analytics/mp.ts:48–55, 119–121, 30
```
48  mixpanel.init(options.token, {
49    api_host: options.eu ? 'https://api-eu.mixpanel.com' : 'https://api.mixpanel.com',
52    loaded: () => { mixpanel.opt_out_tracking() }
...
119 mixpanel.opt_out_tracking()
30  private readonly SESSION_TTL_MS = 30 * 60 * 1000
```

8) page_view de-duplication and tracking
- Path: src/analytics/pageview.ts:54–58, 175–190
```
57 const DEDUPE_WINDOW_MS = 200
175 const canonicalQuery = canonicalizeQuery(event.query)
179 if (pageKey === lastPageViewKey && (now - lastPageViewTime) < DEDUPE_WINDOW_MS) {
188 analytics.track('page_view', event)
```

9) SPA marking on navigation
- Path: src/App.tsx:49–55
```
49 const unsubscribe = router.subscribe('onLoad', () => {
50   analytics.markAsSpaNavigation()
55   trackRouteNavigation(window.location.pathname, window.location.search)
```

10) Edge Functions listed and present (validated)
- Path: docs/DEVELOPMENT_COMMANDS.md (utilities list)
- Files: supabase/functions/staging-check, supabase/functions/test-function
```
$ node scripts/staging-check.mjs
All required edge functions present.
```

11) CLAUDE.md route claim for PDF review
- Path: CLAUDE.md:73–95
```
73 /admin/listings          # Admin interface
74 /admin/ai-extractions    # PDF extraction review
...
95 **Testing**: Upload PDF via `/admin/sellers` → Review at `/admin/ai-extractions`
```
- Reality: Current routes for extraction review
- Path: src/routes/admin/
```
extraction-sessions.index.ts
extraction-sessions.$sessionId.ts
```

12) Edge Functions count vs reality
- Path: docs/DEVELOPMENT_COMMANDS.md:80 (header)
```
80 ### Complete Deployment List (14 Functions)
```
- Reality: Count actual functions
- Command:
```
$ ls -1 supabase/functions/*/index.ts | wc -l
15
```
- Includes (subset):
```
supabase/functions/get-similar-cars/index.ts
supabase/functions/staging-check/index.ts
supabase/functions/test-function/index.ts
```

13) Docs reference missing script `typecheck`
- Path: docs/DEVELOPMENT_COMMANDS.md:239,326
```
239 npm run typecheck
326 | Check types | `npm run typecheck` |
```
- Reality:
- Path: package.json scripts (no typecheck entry found)
```
"scripts": { ... "build": "npm run sync:leaseScore && tsc -b && vite build", ... }
```
