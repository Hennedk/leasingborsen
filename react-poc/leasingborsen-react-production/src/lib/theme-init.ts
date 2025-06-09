// Theme initialization for proper shadcn/ui theming
import { applyTheme, isValidTheme, type Theme } from './themes'

// Initialize theme system on page load
export const initializeTheme = (): void => {
  // Get theme from HTML data attribute or default to cyberpunk
  const htmlTheme = document.documentElement.getAttribute('data-theme')
  const defaultTheme: Theme = 'cyberpunk'
  
  let initialTheme: Theme = defaultTheme
  
  // Validate and use HTML theme if valid
  if (htmlTheme && isValidTheme(htmlTheme)) {
    initialTheme = htmlTheme
  }
  
  // Apply the theme immediately
  applyTheme(initialTheme)
  
  console.log(`🎨 Theme system initialized with: ${initialTheme}`)
}

// Auto-initialize when this module is imported
initializeTheme()