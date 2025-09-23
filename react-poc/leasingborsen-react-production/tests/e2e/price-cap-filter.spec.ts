import { test, expect } from '@playwright/test'

test.describe('Price Cap Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the listings page
    await page.goto('/')

    // Wait for listings to load
    await page.waitForSelector('[data-testid="listing-card"]', { timeout: 10000 })
  })

  test('should filter out listings above price cap', async ({ page }) => {
    // Get initial count of listings
    const initialListings = page.locator('[data-testid="listing-card"]')
    const initialCount = await initialListings.count()

    expect(initialCount).toBeGreaterThan(0)

    // Open price filter (assuming there's a price filter UI)
    const priceFilter = page.locator('[data-testid="price-filter"]').or(page.locator('text=Pris')).first()
    if (await priceFilter.isVisible()) {
      await priceFilter.click()
    }

    // Set a low max price
    const maxPriceInput = page.locator('[data-testid="price-max-input"]').or(page.locator('input[placeholder*="Max"]')).first()
    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.fill('3000')
      await maxPriceInput.press('Enter')
    }

    // Wait for filtering to complete
    await page.waitForTimeout(1000)

    // Check that listings are filtered
    const filteredListings = page.locator('[data-testid="listing-card"]')
    const filteredCount = await filteredListings.count()

    // Should have fewer listings (or possibly zero if price cap is very low)
    expect(filteredCount).toBeLessThanOrEqual(initialCount)

    // Verify that all visible listings have prices within the cap
    for (let i = 0; i < filteredCount; i++) {
      const listing = filteredListings.nth(i)
      const priceElement = listing.locator('.text-xl.font-bold').first()
      const priceText = await priceElement.textContent()

      if (priceText) {
        // Extract numeric value from price (format: "X.XXX kr/md")
        const numericPrice = parseInt(priceText.replace(/[^\d]/g, ''))
        expect(numericPrice).toBeLessThanOrEqual(3000)
      }
    }
  })

  test('should show price cap notes when applicable', async ({ page }) => {
    // Set a moderate price cap that might trigger price-capped offers
    const priceFilter = page.locator('[data-testid="price-filter"]').or(page.locator('text=Pris')).first()
    if (await priceFilter.isVisible()) {
      await priceFilter.click()
    }

    const maxPriceInput = page.locator('[data-testid="price-max-input"]').or(page.locator('input[placeholder*="Max"]')).first()
    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.fill('4500')
      await maxPriceInput.press('Enter')
    }

    await page.waitForTimeout(1000)

    // Look for price cap notes
    const priceCapNotes = page.locator('.bg-muted\\/30').filter({ hasText: 'Ved' })
    const noteCount = await priceCapNotes.count()

    if (noteCount > 0) {
      // Verify the format of price cap notes
      for (let i = 0; i < Math.min(noteCount, 3); i++) {
        const note = priceCapNotes.nth(i)
        const noteText = await note.textContent()

        // Should match pattern: "Ved X kr udbetaling: Y kr/md"
        expect(noteText).toMatch(/Ved .+ udbetaling: .+ kr\/md/)
      }
    }
  })

  test('should maintain consistent count with pagination', async ({ page }) => {
    // Apply price filter
    const priceFilter = page.locator('[data-testid="price-filter"]').or(page.locator('text=Pris')).first()
    if (await priceFilter.isVisible()) {
      await priceFilter.click()
    }

    const maxPriceInput = page.locator('[data-testid="price-max-input"]').or(page.locator('input[placeholder*="Max"]')).first()
    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.fill('4000')
      await maxPriceInput.press('Enter')
    }

    await page.waitForTimeout(1000)

    // Check if there's a results count display
    const resultsCount = page.locator('[data-testid="results-count"]').or(page.locator('text*="resultater"')).first()
    if (await resultsCount.isVisible()) {
      const countText = await resultsCount.textContent()
      const displayedCount = parseInt(countText?.match(/\d+/)?.[0] || '0')

      // Count actual listing cards
      const actualListings = page.locator('[data-testid="listing-card"]')
      const actualCount = await actualListings.count()

      // With pagination, displayed count should be >= actual count on page
      expect(displayedCount).toBeGreaterThanOrEqual(actualCount)
    }
  })

  test('should sort by display price when price cap is active', async ({ page }) => {
    // Apply price filter
    const priceFilter = page.locator('[data-testid="price-filter"]').or(page.locator('text=Pris')).first()
    if (await priceFilter.isVisible()) {
      await priceFilter.click()
    }

    const maxPriceInput = page.locator('[data-testid="price-max-input"]').or(page.locator('input[placeholder*="Max"]')).first()
    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.fill('5000')
      await maxPriceInput.press('Enter')
    }

    await page.waitForTimeout(1000)

    // Apply price ascending sort
    const sortButton = page.locator('[data-testid="sort-button"]').or(page.locator('text=Sorter')).first()
    if (await sortButton.isVisible()) {
      await sortButton.click()
      await page.locator('text*="Pris"').or(page.locator('text*="Laveste"')).first().click()
    }

    await page.waitForTimeout(1000)

    // Verify sorting order
    const priceElements = page.locator('[data-testid="listing-card"] .text-xl.font-bold')
    const priceCount = await priceElements.count()

    if (priceCount >= 2) {
      const prices: number[] = []

      for (let i = 0; i < Math.min(priceCount, 5); i++) {
        const priceText = await priceElements.nth(i).textContent()
        if (priceText) {
          const numericPrice = parseInt(priceText.replace(/[^\d]/g, ''))
          prices.push(numericPrice)
        }
      }

      // Verify ascending order
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
      }
    }
  })

  test('should clear price cap when filter is removed', async ({ page }) => {
    // Get initial count
    const initialListings = page.locator('[data-testid="listing-card"]')
    const initialCount = await initialListings.count()

    // Apply price filter
    const priceFilter = page.locator('[data-testid="price-filter"]').or(page.locator('text=Pris')).first()
    if (await priceFilter.isVisible()) {
      await priceFilter.click()
    }

    const maxPriceInput = page.locator('[data-testid="price-max-input"]').or(page.locator('input[placeholder*="Max"]')).first()
    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.fill('3000')
      await maxPriceInput.press('Enter')
    }

    await page.waitForTimeout(1000)

    // Verify filter is applied
    const filteredListings = page.locator('[data-testid="listing-card"]')
    const filteredCount = await filteredListings.count()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)

    // Clear the filter
    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.clear()
      await maxPriceInput.press('Enter')
    }

    await page.waitForTimeout(1000)

    // Verify listings are restored
    const restoredListings = page.locator('[data-testid="listing-card"]')
    const restoredCount = await restoredListings.count()
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount)

    // Price cap notes should be gone
    const priceCapNotes = page.locator('.bg-muted\\/30').filter({ hasText: 'Ved' })
    const noteCount = await priceCapNotes.count()
    expect(noteCount).toBe(0)
  })

  test('should handle edge case: price exactly at cap', async ({ page }) => {
    // This test verifies boundary conditions
    const priceFilter = page.locator('[data-testid="price-filter"]').or(page.locator('text=Pris')).first()
    if (await priceFilter.isVisible()) {
      await priceFilter.click()
    }

    // Get the price of the first listing to use as boundary
    const firstListing = page.locator('[data-testid="listing-card"]').first()
    const firstPriceElement = firstListing.locator('.text-xl.font-bold').first()
    const firstPriceText = await firstPriceElement.textContent()

    if (firstPriceText) {
      const firstPrice = parseInt(firstPriceText.replace(/[^\d]/g, ''))

      const maxPriceInput = page.locator('[data-testid="price-max-input"]').or(page.locator('input[placeholder*="Max"]')).first()
      if (await maxPriceInput.isVisible()) {
        await maxPriceInput.fill(firstPrice.toString())
        await maxPriceInput.press('Enter')
      }

      await page.waitForTimeout(1000)

      // The first listing should still be visible (price <= cap)
      const filteredListings = page.locator('[data-testid="listing-card"]')
      const filteredCount = await filteredListings.count()
      expect(filteredCount).toBeGreaterThanOrEqual(1)

      // Verify the first listing's price is within cap
      const filteredFirstPrice = await filteredListings.first().locator('.text-xl.font-bold').textContent()
      if (filteredFirstPrice) {
        const numericPrice = parseInt(filteredFirstPrice.replace(/[^\d]/g, ''))
        expect(numericPrice).toBeLessThanOrEqual(firstPrice)
      }
    }
  })
})

// Performance test for price cap functionality
test.describe('Price Cap Performance', () => {
  test('should filter and render within reasonable time', async ({ page }) => {
    await page.goto('/')

    // Wait for initial load
    await page.waitForSelector('[data-testid="listing-card"]', { timeout: 10000 })

    const startTime = Date.now()

    // Apply price filter
    const priceFilter = page.locator('[data-testid="price-filter"]').or(page.locator('text=Pris')).first()
    if (await priceFilter.isVisible()) {
      await priceFilter.click()
    }

    const maxPriceInput = page.locator('[data-testid="price-max-input"]').or(page.locator('input[placeholder*="Max"]')).first()
    if (await maxPriceInput.isVisible()) {
      await maxPriceInput.fill('4000')
      await maxPriceInput.press('Enter')
    }

    // Wait for filtering to complete
    await page.waitForSelector('[data-testid="listing-card"]', { timeout: 5000 })

    const endTime = Date.now()
    const filteringTime = endTime - startTime

    // Should complete within 5 seconds
    expect(filteringTime).toBeLessThan(5000)
  })
})