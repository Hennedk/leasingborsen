Analytics Listing Click Test Plan (Playwright Matrix)

Scope
- Verify listing_click carries origin/container, interaction mechanics, and optional context.
- Ensure listing_view impressions use the same container as clicks and dedupe works.
- Guard against duplicates under React StrictMode and SPA navigation.

Events Under Test
- listing_view
- listing_click

Common Assertions
- origin.surface/type/name match the surface.
- container is present and consistent with view/click.
- entry_method is 'click' or 'keyboard' appropriately.
- open_target is 'new_tab' when ctrl/cmd/middle-click, else 'same_tab'.
- position and position_bucket reflect slot at click-time (index+1).
- results_session_id present on Results; absent/undefined on Home/Similar.
- results_ctx_hash present only when results_session_id exists; stable across clicks with same filters.
- source_event_id present and UUID.

Test Matrix
1) Results Grid → Detail
- Setup: Navigate to /listings with known query (e.g., ?sort_option=lease_score_desc&fuel_type=ev).
- Action: Click first card normally.
- Expect listing_view with container 'results_grid'.
- Expect listing_click with:
  - origin: { surface: 'listings', type: 'grid', name: 'results_grid' }
  - container: 'results_grid'
  - entry_method: 'click'
  - open_target: 'same_tab'
  - position: 1, position_bucket: '1-3'
  - results_session_id: defined
  - results_ctx_hash: defined and stable for same filters
  - price_dkk and lease_score present when available

2) Results Grid → New Tab (modifier)
- Action: Ctrl/Cmd+Click the second card.
- Expect listing_click with entry_method: 'click', open_target: 'new_tab', position: 2, position_bucket: '1-3'.

3) Results Grid → Keyboard Enter
- Action: Focus third card and press Enter.
- Expect entry_method: 'keyboard', open_target: 'same_tab'.

4) Similar Cars (Detail) → Detail
- Setup: Navigate to /listing/$id where Similar Cars are rendered.
- Action: Click first similar card.
- Expect listing_view with container 'similar_grid' and listing_click with:
  - origin: { surface: 'detail', type: 'module', name: 'similar_cars' }
  - container: 'similar_grid'
  - results_session_id: undefined
  - results_ctx_hash: undefined
  - position_bucket correct for position

5) Home Featured Module (Carousel) → Detail
- Setup: Navigate to /
- Action: Click first card in the "Bedste tilbud lige nu" section.
- Expect listing_view with container 'home_carousel' and listing_click with:
  - origin: { surface: 'home', type: 'module', name: 'home_featured' }
  - container: 'home_carousel'
  - results_session_id: undefined

6) Impression Dedup on Results
- Setup: Scroll cards into view above 50% for 300ms dwell; ensure single listing_view per listing per results_session_id+container.
- Action: Navigate away and back with same RSID (BFCache/warm); confirm no duplicate impressions.

7) StrictMode Double-Render Guard
- Setup: Run app with React.StrictMode.
- Action: Click a card once.
- Assert exactly one listing_click recorded per user gesture.

Implementation Notes
- Hook into the analytics transport (mock/stub) to capture payloads.
- Expose a window.__TEST_ANALYTICS__ bus or intercept the analytics.track method in test env to collect events.
- Use data-testid on listing cards if necessary for stable selection.

Non-Goals
- No module_id/instance_id high-cardinality testing beyond presence when passed.
- No backend join tests; focus on emitted payloads.

Rollback/Compatibility
- container is still emitted for downstream stability.
- origin is additive; dashboards can migrate to it gradually.

