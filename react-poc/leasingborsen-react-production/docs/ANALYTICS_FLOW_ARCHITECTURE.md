# Analytics Plan — Minimum Lovable (Mixpanel EU, v1)

Revised to match the requested event model while keeping a lean, privacy-first scope using Mixpanel Browser SDK (EU). All events include schema_version:"1". No code in this document.

## 1) Architecture Overview (EU, Consent, Identity)

- Mixpanel (EU): Send to `api-eu.mixpanel.com`. Use EU project with EU data residency. Retention target: 13 months (configure in Mixpanel).
- Consent: Opt-out by default. Emit no analytics before explicit opt-in. Respect withdrawals immediately.
- Identity & sessions:
  - distinct_id: Anonymous device ID until login. On login: alias/identify to user ID (no PII in events).
  - session_id: Rolling 30-minute inactivity TTL. New session on ≥30m idle.
  - results_session_id: Tracks a search journey across results/detail/back. Start on first results entry (page_view results) or first filters_apply, reset on new results entry.
  - feature_flags: Include evaluated flags per event post-consent.
- Common props on all post-consent events: schema_version:"1", distinct_id, session_id, device_type:"desktop"|"mobile"|"tablet", feature_flags.
- Privacy: No PII. Pre-consent, store first-touch UTM locally only if policy allows; otherwise keep in-memory and attach to first post-consent event if still available.

## 2) Core Event Scope (exactly 7)

Note: Monetary values are DKK integers. Mileage (km/year) and term (months) are integers. Product context for listing_* and dealer_outbound: listing_id, lease_score:int, lease_score_band:"excellent"|"good"|"fair"|"weak", price_dkk:int, mileage_km_per_year:int, term_months:int, fuel_type:"ev"|"phev"|"ice", dealer_id?:string, dealer_name?:string.

1) page_view
- When: Any route render post-consent.
- Required: page_type:"home"|"results"|"listing_detail".
- Results entry (first load only): results_session_id, filters_active:{keys:string[],count:int}, results_count:int, latency_ms:int.
- Detail entry: product context + entry_method:"deep_link"|"in_app_click"|"browser_nav", source_event_id?:string (from listing_click if applicable).
- Optional: utm_* (if available), referrer?:string.

2) listing_view (impression)
- When: Listing card is meaningfully visible in grid/module (or equivalent impression). Not fired on detail render (use listing_detail_view).
- Sampling: 25% sample_rate; include sample_rate:0.25. Cap: max 50 per session. Dedupe per (listing_id + source) within session.
- Required: product context; source:{ type:"grid"|"module", name:"results_grid"|"similar_cars"|"best_offer_home", variant?:string, position_in_module?:int }.
- Position: position_bucket:"r1"|"r2"|"r3_4"|"r5_8"|">r8" (buckets instead of raw index) to reduce cardinality.

3) listing_click (in-app interactions only)
- When: User clicks within the app (grid card/title/image/CTA) leading to detail/open. Never fire on deep links.
- Required: product context, event_id:uuid, source (same schema as listing_view), listing_rank_clicked:int.

4) listing_detail_view
- When: Listing detail page renders (deep link, in-app click, or browser navigation).
- Required: product context, entry_method:"deep_link"|"in_app_click"|"browser_nav".
- Optional: source_event_id?:string (correlate to listing_click), results_session_id?:string.

5) filters_change (debounced, interaction-level)
- When: User adjusts filter controls but before query settle. Debounce to avoid spam.
- Required: filter_changed:string, old_value:string|int|boolean, new_value:string|int|boolean, filters_active:{keys:string[],count:int}.
- Optional: results_session_id?:string.

6) filters_apply (state settled/canonical query)
- When: Filters state finalizes and a query executes.
- Required: filters_active:{keys:string[],count:int}, previous_results_count?:int, results_count:int, results_delta?:int, latency_ms:int, changed_keys_count:int, is_zero_results?:boolean, results_session_id:string.

7) dealer_outbound (conversion)
- When: User attempts contact/visit dealer from our UI.
- Required: product context, event_id:uuid, outbound_method:"dealer_site"|"phone"|"email".
- Dealer/config: dealer_id?:string, dealer_name?:string, selected_config:{ mileage_km_per_year:int, term_months:int, first_payment:int, pricing_id:string }, config_changed:boolean.

Auxiliary (non-core, recommended)
- error_occurred: error_type:"api"|"network"|"client"|"server", endpoint?:string, status_code?:int, fatal:boolean, results_session_id?:string.
- price_config_summary (optional): once per detail visit on 5s idle or nav-away; includes final selected_config.
- Performance (~10% sampling):
  - route_timing: from:string, to:string, page_load_type:"cold"|"warm"|"bfcache"|"spa", ttfb_ms:int, content_ready_ms:int, interactive_ms:int, sample_rate:0.1.
  - api_timing: endpoint:string, method:"GET"|"POST"|..., status:int, duration_ms:int, ok:boolean, sample_rate:0.1.

## 3) Property Schemas (typed, explicit)

- device_type: "desktop"|"mobile"|"tablet"
- page_type: "home"|"results"|"listing_detail"
- entry_method: "deep_link"|"in_app_click"|"browser_nav"
- outbound_method: "dealer_site"|"phone"|"email"
- source.type: "grid"|"module"
- source.name: "results_grid"|"similar_cars"|"best_offer_home"
- position_bucket: "r1"|"r2"|"r3_4"|"r5_8"|">r8"
- results_session_id: string (UUID recommended)
- event_id: string (UUID)
- feature_flags: string[]
- Monetary values in DKK integers. km/year and months as integers.

## 4) Reliability, Dedupe, Resilience

- listing_view: sample at 25% with sample_rate. Cap at 50 impressions/session. Dedupe per (listing_id + source) within session.
- listing_click: include event_id; ignore duplicate event_id retries.
- dealer_outbound: include event_id; dedupe repeats within 24h per session. Use server redirect concept (`/api/go?to=…`) to register outbound even with blockers (no code here; pattern only). Respect consent.

## 5) Consent & Attribution

- Pre-consent: Send nothing. If policy allows, persist first-touch UTM in first-party storage as super-props (no network). Else, keep in-memory until consent and attach to first event.
- On consent: Opt-in, set super-props (device_type, session_id, feature_flags, results_session_id when applicable), then begin emitting events. Do not backfill.
- Persistence: Store consent state; honor on every load. On withdraw, stop emitting and evaluation for analytics.

## 6) Performance Telemetry (sampling)

- route_timing and api_timing sampled at ~10% with sample_rate on each event. Attach common props. Emit post-consent only.

## 7) Dashboards (post-instrumentation)

- Core Funnel: page_view(page_type:"results") → listing_view → listing_click → listing_detail_view → dealer_outbound; slice by device_type, UTM, lease_score_band, position_bucket. Include deep-link paths via page_view(page_type:"listing_detail")[entry_method].
- Filters & Recovery: Use filters_apply to monitor query outcomes, zero-results rate (is_zero_results), and latency. Trend changed_keys_count and results_delta.
- Module/Rank Impact: CTR and outbound by source.name and position_bucket/rank (listing_rank_clicked).

## 8) Governance & Rollout

- Success metrics:
  - ≥98% of core events contain required props.
  - Funnel coverage by device_type/UTM/lease_score_band with clear conversion visibility.
  - Perf coverage ≈10% for route_timing/api_timing.
- QA plan (conceptual):
  - Live payload checks for types/enums and schema_version:"1".
  - Enum drift review (source.* names, position_bucket, entry_method, outbound_method) weekly.
  - E2E smoke: new session → consent accept → results entry (page_view) → filters_change → filters_apply → listing_view (sample permitting) → listing_click → listing_detail_view → dealer_outbound; validate dedupe and sampling caps.
- Versioning: All events carry schema_version:"1". Track future non-breaking updates as v1.x in Change Log.
- Risks & mitigations: Ad-blockers (server redirect for outbound), consent drop-off (clear UI), taxonomy drift (enum lock + weekly review), impression volume (sampling + cap).

## 9) Out of Scope (this phase)

Heatmaps/session replay, ML/quantiles, per-dealer callbacks, pathing analyses, BI/warehouse sync.

---

# Event Dictionary (v1)

All payloads: schema_version:"1", distinct_id, session_id, device_type, feature_flags. Include results_session_id when on results journeys. Examples trimmed for brevity.

1) page_view
- Required: page_type
- Results example: { schema_version:"1", page_type:"results", results_session_id:"a1b2…", filters_active:{keys:["fuel_type","mileage_km_per_year"],count:2}, results_count:234, latency_ms:412 }
- Detail example: { schema_version:"1", page_type:"listing_detail", entry_method:"deep_link", listing_id:"L-123", lease_score:86, lease_score_band:"good", price_dkk:3299, mileage_km_per_year:15000, term_months:36, fuel_type:"ev" }

2) listing_view
- Required: product context, source, position_bucket; plus sample_rate:0.25
- Example: { schema_version:"1", listing_id:"L-123", lease_score:86, lease_score_band:"good", price_dkk:3299, mileage_km_per_year:15000, term_months:36, fuel_type:"ev", source:{type:"grid",name:"results_grid",position_in_module:7}, position_bucket:"r3_4", sample_rate:0.25 }

3) listing_click
- Required: product context, event_id, source, listing_rank_clicked:int
- Example: { schema_version:"1", event_id:"7b8b…", listing_id:"L-123", lease_score:86, lease_score_band:"good", price_dkk:3299, mileage_km_per_year:15000, term_months:36, fuel_type:"ev", source:{type:"grid",name:"results_grid",position_in_module:7}, listing_rank_clicked:7 }

4) listing_detail_view
- Required: product context, entry_method
- Optional: source_event_id, results_session_id
- Example: { schema_version:"1", entry_method:"in_app_click", source_event_id:"7b8b…", listing_id:"L-123", lease_score:86, lease_score_band:"good", price_dkk:3299, mileage_km_per_year:15000, term_months:36, fuel_type:"ev" }

5) filters_change
- Required: filter_changed, old_value, new_value, filters_active
- Example: { schema_version:"1", filter_changed:"fuel_type", old_value:"ice", new_value:"ev", filters_active:{keys:["fuel_type"],count:1} }

6) filters_apply
- Required: filters_active, previous_results_count?, results_count, results_delta?, latency_ms, changed_keys_count, is_zero_results?, results_session_id
- Example: { schema_version:"1", results_session_id:"a1b2…", filters_active:{keys:["mileage_km_per_year"],count:1}, previous_results_count:240, results_count:212, results_delta:-28, latency_ms:320, changed_keys_count:1, is_zero_results:false }

7) dealer_outbound
- Required: product context, event_id, outbound_method; selected_config, config_changed
- Example: { schema_version:"1", event_id:"c0de…", listing_id:"L-123", lease_score:86, lease_score_band:"good", price_dkk:3299, mileage_km_per_year:15000, term_months:36, fuel_type:"ev", outbound_method:"dealer_site", selected_config:{mileage_km_per_year:15000,term_months:36,first_payment:10000,pricing_id:"P-77"}, config_changed:true }

Auxiliary examples
- error_occurred: { schema_version:"1", error_type:"api", endpoint:"/api/listings", status_code:500, fatal:false, results_session_id:"a1b2…" }
- route_timing: { schema_version:"1", from:"/", to:"/listings", page_load_type:"spa", ttfb_ms:90, content_ready_ms:320, interactive_ms:600, sample_rate:0.1 }
- api_timing: { schema_version:"1", endpoint:"/api/listings", method:"GET", status:200, duration_ms:280, ok:true, sample_rate:0.1 }

---

# Change Log

- 2025-09-08 (v1 update): Adapted to requested event model. Added listing_detail_view, constrained listing_click to in-app only, removed visit_id, added results_session_id lifecycle, refined page_view props (results/detail), listing_view sampling (25%) with cap and dedupe, added filters_change/filters_apply semantics, expanded dealer_outbound with selected_config, documented error/perf auxiliary events (~10% sampling), kept EU endpoint and privacy-first consent. All events continue to carry schema_version:"1".
