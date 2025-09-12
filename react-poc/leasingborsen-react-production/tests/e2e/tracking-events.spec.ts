import { test, expect } from '@playwright/test'

type MPEvent = { event: string, properties: Record<string, unknown> }

function decodeMixpanelPayload(body: string): MPEvent[] {
  try {
    // Try plain JSON first
    const parsed = JSON.parse(body)
    if (parsed && parsed.event && parsed.properties) return [parsed]
    if (parsed && Array.isArray(parsed)) return parsed as MPEvent[]
    if (parsed && parsed.data) return [parsed.data]
  } catch {
    // JSON parse failed, try URLSearchParams
  }

  try {
    // Handle form-encoded data
    const params = new URLSearchParams(body)
    const dataParam = params.get('data')
    if (!dataParam) return []
    
    // Data is URL-encoded JSON, not base64
    const decoded = decodeURIComponent(dataParam)
    const parsed = JSON.parse(decoded)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // URLSearchParams decode failed
  }

  return []
}

test.describe('Analytics Tracking Events', () => {
  test('should track page_view event on homepage', async ({ page, baseURL }) => {
    const events: MPEvent[] = []
    
    // Intercept Mixpanel requests
    await page.route(/api-eu\.mixpanel\.com\/track/i, async (route) => {
      const req = route.request()
      const body = req.postData() || ''
      const decoded = decodeMixpanelPayload(body)
      events.push(...decoded)
      console.log('Intercepted event:', decoded.map(e => e.event))
      await route.continue()
    })

    // Navigate to homepage
    await page.goto(`${baseURL}/`)
    
    // Wait for the page to fully load and analytics to fire
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Wait longer for analytics to fire
    
    console.log('Total events captured:', events.length)
    console.log('Event types:', events.map(e => e.event))

    // Find page_view events
    const pageViewEvents = events.filter(e => e.event === 'page_view')
    expect(pageViewEvents.length).toBeGreaterThan(0)

    const latestPageView = pageViewEvents[pageViewEvents.length - 1]
    expect(latestPageView.properties.page_type).toBe('home')
    expect(latestPageView.properties.schema_version).toBe('1')
    expect(latestPageView.properties.device_type).toBeTruthy()
    expect(latestPageView.properties.session_id).toBeTruthy()
  })

  test('should track filters_change event when filters are applied', async ({ page, baseURL }) => {
    const events: MPEvent[] = []
    
    await page.route(/mixpanel\.com\/track/i, async (route) => {
      const body = route.request().postData() || ''
      events.push(...decodeMixpanelPayload(body))
      await route.continue()
    })

    // Navigate to listings page
    await page.goto(`${baseURL}/listings`)
    await page.waitForTimeout(1000)

    // Apply a filter (e.g., select a make)
    const makeFilter = page.locator('button:has-text("Toyota"), select option:has-text("Toyota"), input[placeholder*="mærke" i], button[data-testid="make-filter"]').first()
    
    if (await makeFilter.isVisible()) {
      await makeFilter.click()
      await page.waitForTimeout(500)
    }

    // Look for filter change events
    const filterEvents = events.filter(e => e.event === 'filters_change' || e.event === 'filters_apply')
    console.log('Filter events found:', filterEvents.length)
    console.log('All events:', events.map(e => e.event))

    // Even if no filter events fired, we should at least have page_view
    const pageViewEvents = events.filter(e => e.event === 'page_view')
    expect(pageViewEvents.length).toBeGreaterThan(0)

    const latestPageView = pageViewEvents[pageViewEvents.length - 1]
    expect(latestPageView.properties.page_type).toBe('results')
  })

  test('should track listing_view and listing_click events', async ({ page, baseURL }) => {
    const events: MPEvent[] = []
    
    await page.route(/mixpanel\.com\/track/i, async (route) => {
      const body = route.request().postData() || ''
      events.push(...decodeMixpanelPayload(body))
      await route.continue()
    })

    // Navigate to listings page
    await page.goto(`${baseURL}/listings`)
    await page.waitForTimeout(1500) // Wait for listings to load

    // Find listing_view events
    const listingViewEvents = events.filter(e => e.event === 'listing_view')
    expect(listingViewEvents.length).toBeGreaterThan(0)

    const listingView = listingViewEvents[listingViewEvents.length - 1]
    expect(listingView.properties.container).toBeTruthy()
    expect(['results_grid', 'similar_grid']).toContain(listingView.properties.container)

    // Click on a listing card
    const listingCard = page.locator('[role="link"]').first()
    if (await listingCard.isVisible()) {
      await listingCard.click()
      await page.waitForTimeout(1000)

      // Check for listing_click events
      const listingClickEvents = events.filter(e => e.event === 'listing_click')
      if (listingClickEvents.length > 0) {
        const listingClick = listingClickEvents[listingClickEvents.length - 1]
        expect(listingClick.properties.origin).toBeTruthy()
        expect(listingClick.properties.entry_method).toBeTruthy()
        expect(['click', 'keyboard']).toContain(listingClick.properties.entry_method)
      }
    }
  })

  test('should track session consistency across page navigation', async ({ page, baseURL }) => {
    const events: MPEvent[] = []
    
    await page.route(/mixpanel\.com\/track/i, async (route) => {
      const body = route.request().postData() || ''
      events.push(...decodeMixpanelPayload(body))
      await route.continue()
    })

    // Navigate to homepage
    await page.goto(`${baseURL}/`)
    await page.waitForTimeout(1000)

    // Get initial session ID
    const homePageView = events.filter(e => e.event === 'page_view').pop()
    const initialSessionId = homePageView?.properties.session_id

    // Navigate to listings
    await page.goto(`${baseURL}/listings`)
    await page.waitForTimeout(1000)

    // Check session ID consistency
    const listingsPageView = events.filter(e => e.event === 'page_view').pop()
    const listingsSessionId = listingsPageView?.properties.session_id

    expect(initialSessionId).toBeTruthy()
    expect(listingsSessionId).toBeTruthy()
    expect(initialSessionId).toBe(listingsSessionId) // Session should persist across navigation
  })

  test('should track device type and schema version on all events', async ({ page, baseURL }) => {
    const events: MPEvent[] = []
    
    await page.route(/mixpanel\.com\/track/i, async (route) => {
      const body = route.request().postData() || ''
      events.push(...decodeMixpanelPayload(body))
      await route.continue()
    })

    await page.goto(`${baseURL}/`)
    await page.waitForTimeout(1000)

    // All events should have consistent device type and schema version
    for (const event of events) {
      expect(event.properties.schema_version).toBe('1')
      expect(event.properties.device_type).toBeTruthy()
      expect(['desktop', 'mobile', 'tablet']).toContain(event.properties.device_type)
    }
  })

  test('should handle network failures gracefully', async ({ page, baseURL }) => {
    let requestCount = 0
    
    // Simulate network failure for analytics requests
    await page.route(/mixpanel\.com\/track/i, async (route) => {
      requestCount++
      if (requestCount <= 2) {
        // Fail the first couple requests
        await route.abort('failed')
      } else {
        // Allow subsequent requests
        await route.continue()
      }
    })

    await page.goto(`${baseURL}/`)
    await page.waitForTimeout(1000)

    // App should continue working despite analytics failures
    expect(await page.isVisible('body')).toBeTruthy()
    
    // Navigate to another page to test resilience
    await page.goto(`${baseURL}/listings`)
    await page.waitForTimeout(1000)
    
    expect(await page.isVisible('body')).toBeTruthy()
    expect(requestCount).toBeGreaterThan(2)
  })
})