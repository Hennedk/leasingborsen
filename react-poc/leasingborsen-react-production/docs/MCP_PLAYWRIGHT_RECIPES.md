MCP Playwright Recipes for Analytics Verification

Goal
- Use the Playwright MCP server to drive a headless browser and assert Mixpanel analytics payloads without adding app hooks.

Start the server
- `npm run mcp:playwright`
  - Headless Chrome on port 3344.

Example MCP prompts (Claude Desktop or compatible client)

1) Connect + open results page
- "Connect to the Playwright MCP server at http://localhost:3344 and emulate iPhone 15. Navigate to {BASE_URL}/listings?mdr=36&sort=lease_score_desc. Start recording network events."

2) Capture Mixpanel track calls
- "Filter recorded network requests to URLs containing 'mixpanel.com/track'. For each POST, parse the body: if JSON, read data.event/properties; if 'data=' base64 param, decode and parse JSON. Collect events in memory."

3) Assert RSID parity on results
- "From collected events, assert: the last page_view has page_type='results' and a results_session_id; the latest listing_view has container='results_grid' and its results_session_id equals the page_view's RSID (allow a short delay where a default 'km' might change RSID once)."

4) Click + assert listing_click
- "Click the first listing card. Find the latest listing_click event. Assert: origin={surface:'listings',type:'grid',name:'results_grid'}, entry_method in ['click','keyboard'], open_target in ['same_tab','new_tab'], position_bucket in ['1-3','4-6','7-12','13+'], and results_ctx_hash is present if results_session_id exists."

5) Similar Cars
- "Navigate to a listing detail by clicking a card. Wait for events. Find a listing_view with container='similar_grid'. Click a similar card; assert latest listing_click has origin={surface:'detail',type:'module',name:'similar_cars'} and container='similar_grid'."

6) Optional: Home module
- "Navigate to /. Find listing_view with container='home_carousel' or 'home_grid'. Click first card and assert origin surface='home' and appropriate name/type."

Notes
- If your client supports scripting, implement a helper that parses Mixpanel payloads: try JSON parse; else parse as form data and base64-decode the 'data' parameter.
- You can constrain origins via server flags (e.g., `--allowed-origins`) or set device via `--device`.

