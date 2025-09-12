import { test, expect } from '@playwright/test'

test('Debug analytics setup', async ({ page, baseURL }) => {
  console.log('Testing URL:', baseURL)

  const allRequests: string[] = []
  const mixpanelRequests: string[] = []

  // Log all network requests
  page.on('request', (request) => {
    allRequests.push(`${request.method()} ${request.url()}`)
    if (request.url().includes('mixpanel')) {
      mixpanelRequests.push(`${request.method()} ${request.url()}`)
    }
  })

  // Console logging from the page
  page.on('console', (msg) => {
    console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`)
  })

  // Navigate to homepage
  await page.goto(`${baseURL}/`)
  
  // Wait longer for potential analytics
  await page.waitForTimeout(3000)

  console.log(`Total requests: ${allRequests.length}`)
  console.log(`Mixpanel requests: ${mixpanelRequests.length}`)
  
  if (allRequests.length > 0) {
    console.log('First 10 requests:')
    allRequests.slice(0, 10).forEach((req, i) => {
      console.log(`  ${i + 1}. ${req}`)
    })
  }

  if (mixpanelRequests.length > 0) {
    console.log('Mixpanel requests:')
    mixpanelRequests.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req}`)
    })
  }

  // Check if the page loaded successfully
  const bodyVisible = await page.isVisible('body')
  console.log('Body visible:', bodyVisible)

  // Check if there's a specific element that indicates the app loaded
  const appContainer = await page.isVisible('[data-testid="app"], #root, .app')
  console.log('App container visible:', appContainer)

  // Let's see what's actually on the page
  const title = await page.title()
  console.log('Page title:', title)

  // This test always passes, it's just for debugging
  expect(true).toBe(true)
})