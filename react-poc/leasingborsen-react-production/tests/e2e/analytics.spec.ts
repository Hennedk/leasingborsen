import { test, expect } from '@playwright/test'

type MPEvent = { event: string, properties: Record<string, any> }

function decodeMixpanelPayload(body: string): MPEvent[] {
  try {
    // Try plain JSON first
    const parsed = JSON.parse(body)
    if (parsed && parsed.event && parsed.properties) return [parsed]
    if (parsed && Array.isArray(parsed)) return parsed as MPEvent[]
    if (parsed && parsed.data) return [parsed.data]
  } catch {}

  try {
    // Fallback: encoded as form data with base64 "data" param
    const params = new URLSearchParams(body)
    const dataParam = params.get('data')
    if (!dataParam) return []
    const decoded = Buffer.from(dataParam, 'base64').toString('utf-8')
    const arr = JSON.parse(decoded)
    return Array.isArray(arr) ? arr : [arr]
  } catch {}

  return []
}

test('Results → Click → Detail has stable RSID and origin/container', async ({ page, baseURL }) => {
  const events: MPEvent[] = []
  await page.route(/mixpanel\.com\/track/i, async (route) => {
    const req = route.request()
    const body = req.postData() || ''
    const decoded = decodeMixpanelPayload(body)
    events.push(...decoded)
    await route.continue()
  })

  await page.goto(`${baseURL}/listings?mdr=36&sort=lease_score_desc`)
  await page.waitForTimeout(1200)

  const get = (name: string) => events.filter(e => e.event === name).map(e => e.properties)
  const pv = get('page_view').at(-1)
  expect(pv?.page_type).toBe('results')
  expect(pv?.results_session_id).toBeTruthy()

  const lv = get('listing_view').at(-1)
  expect(lv?.container).toBe('results_grid')
  // Allow a minor delay where km default might update RSID; accept equality or next lv match
  const rsids = get('listing_view').slice(-3).map(p => p.results_session_id)
  expect(rsids.includes(pv?.results_session_id)).toBeTruthy()

  // Click the first card (assumes role link presence). Adjust selector if needed.
  const firstCard = page.locator('[role="link"]').first()
  await firstCard.click()
  await page.waitForTimeout(500)

  const lc = get('listing_click').at(-1)
  expect(lc?.origin).toEqual({ surface: 'listings', type: 'grid', name: 'results_grid' })
  expect(['click', 'keyboard']).toContain(lc?.entry_method)
  expect(['same_tab','new_tab']).toContain(lc?.open_target)
  expect(['1-3','4-6','7-12','13+']).toContain(lc?.position_bucket)
  // When RSID exists, results_ctx_hash should be present
  if (lc?.results_session_id) expect(lc?.results_ctx_hash).toBeTruthy()
})

test('Similar Cars → Click carries correct origin/container', async ({ page, baseURL }) => {
  const events: MPEvent[] = []
  await page.route(/mixpanel\.com\/track/i, async (route) => {
    const body = route.request().postData() || ''
    events.push(...decodeMixpanelPayload(body))
    await route.continue()
  })

  // Navigate to a known listing id or the first results → click
  await page.goto(`${baseURL}/listings?mdr=36&sort=lease_score_desc`)
  await page.waitForTimeout(1000)
  await page.locator('[role="link"]').first().click()
  await page.waitForTimeout(800)

  const get = (name: string) => events.filter(e => e.event === name).map(e => e.properties)
  const simView = get('listing_view').reverse().find(p => p.container === 'similar_grid')
  expect(simView?.container).toBe('similar_grid')

  // Click a similar card - use second/third link as a heuristic if needed
  const similarLink = page.locator('[role="link"]').nth(1)
  await similarLink.click()
  await page.waitForTimeout(500)

  const lc = get('listing_click').at(-1)
  expect(lc?.container).toBe('similar_grid')
  expect(lc?.origin).toMatchObject({ surface: 'detail', type: 'module', name: 'similar_cars' })
})

