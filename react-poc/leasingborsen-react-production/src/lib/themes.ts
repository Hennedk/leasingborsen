// Scalable theme system with proper TypeScript support
export const THEMES = [
  'light',
  'dark', 
  'synthwave',
  'cyberpunk',
  'corporate',
  'business',
  'fantasy',
  'luxury'
] as const

export type Theme = typeof THEMES[number]

// Theme definitions with RGB values for better browser compatibility
export const themeDefinitions: Record<Theme, Record<string, string>> = {
  light: {
    'color-background': '255 255 255',
    'color-foreground': '15 23 42',
    'color-card': '255 255 255',
    'color-card-foreground': '15 23 42',
    'color-primary': '139 92 246',
    'color-primary-foreground': '255 255 255',
    'color-secondary': '241 245 249',
    'color-secondary-foreground': '15 23 42',
    'color-muted': '241 245 249',
    'color-muted-foreground': '100 116 139',
    'color-accent': '241 245 249',
    'color-accent-foreground': '15 23 42',
    'color-destructive': '239 68 68',
    'color-destructive-foreground': '255 255 255',
    'color-border': '226 232 240',
    'color-input': '226 232 240',
    'color-ring': '139 92 246',
  },
  dark: {
    'color-background': '15 23 42',
    'color-foreground': '248 250 252',
    'color-card': '15 23 42',
    'color-card-foreground': '248 250 252',
    'color-primary': '168 85 247',
    'color-primary-foreground': '15 23 42',
    'color-secondary': '30 41 59',
    'color-secondary-foreground': '248 250 252',
    'color-muted': '30 41 59',
    'color-muted-foreground': '148 163 184',
    'color-accent': '30 41 59',
    'color-accent-foreground': '248 250 252',
    'color-destructive': '239 68 68',
    'color-destructive-foreground': '248 250 252',
    'color-border': '30 41 59',
    'color-input': '30 41 59',
    'color-ring': '168 85 247',
  },
  synthwave: {
    'color-background': '26 12 46',
    'color-foreground': '255 0 255',
    'color-card': '45 27 78',
    'color-card-foreground': '255 0 255',
    'color-primary': '0 255 255',
    'color-primary-foreground': '26 12 46',
    'color-secondary': '76 29 149',
    'color-secondary-foreground': '255 0 255',
    'color-muted': '76 29 149',
    'color-muted-foreground': '192 132 252',
    'color-accent': '0 255 255',
    'color-accent-foreground': '26 12 46',
    'color-destructive': '255 0 128',
    'color-destructive-foreground': '255 0 255',
    'color-border': '124 58 237',
    'color-input': '76 29 149',
    'color-ring': '0 255 255',
  },
  cyberpunk: {
    'color-background': '16 4 51',
    'color-foreground': '255 255 0',
    'color-card': '32 8 102',
    'color-card-foreground': '255 255 0',
    'color-primary': '255 255 0',
    'color-primary-foreground': '16 4 51',
    'color-secondary': '128 0 255',
    'color-secondary-foreground': '255 255 0',
    'color-muted': '128 0 255',
    'color-muted-foreground': '255 192 203',
    'color-accent': '255 0 128',
    'color-accent-foreground': '16 4 51',
    'color-destructive': '255 0 0',
    'color-destructive-foreground': '255 255 0',
    'color-border': '128 0 255',
    'color-input': '128 0 255',
    'color-ring': '255 255 0',
  },
  corporate: {
    'color-background': '255 255 255',
    'color-foreground': '37 50 66',
    'color-card': '255 255 255',
    'color-card-foreground': '37 50 66',
    'color-primary': '0 123 255',
    'color-primary-foreground': '255 255 255',
    'color-secondary': '230 236 243',
    'color-secondary-foreground': '37 50 66',
    'color-muted': '230 236 243',
    'color-muted-foreground': '108 117 125',
    'color-accent': '218 225 232',
    'color-accent-foreground': '37 50 66',
    'color-destructive': '220 53 69',
    'color-destructive-foreground': '255 255 255',
    'color-border': '222 226 230',
    'color-input': '222 226 230',
    'color-ring': '0 123 255',
  },
  business: {
    'color-background': '237 240 245',
    'color-foreground': '33 37 41',
    'color-card': '248 249 250',
    'color-card-foreground': '33 37 41',
    'color-primary': '40 96 144',
    'color-primary-foreground': '248 249 250',
    'color-secondary': '222 226 230',
    'color-secondary-foreground': '33 37 41',
    'color-muted': '222 226 230',
    'color-muted-foreground': '108 117 125',
    'color-accent': '206 212 218',
    'color-accent-foreground': '33 37 41',
    'color-destructive': '185 74 72',
    'color-destructive-foreground': '248 249 250',
    'color-border': '206 212 218',
    'color-input': '206 212 218',
    'color-ring': '40 96 144',
  },
  fantasy: {
    'color-background': '245 243 255',
    'color-foreground': '74 29 78',
    'color-card': '250 245 255',
    'color-card-foreground': '74 29 78',
    'color-primary': '147 51 234',
    'color-primary-foreground': '250 245 255',
    'color-secondary': '233 213 255',
    'color-secondary-foreground': '74 29 78',
    'color-muted': '233 213 255',
    'color-muted-foreground': '124 58 237',
    'color-accent': '196 181 253',
    'color-accent-foreground': '74 29 78',
    'color-destructive': '220 38 127',
    'color-destructive-foreground': '250 245 255',
    'color-border': '208 188 255',
    'color-input': '208 188 255',
    'color-ring': '147 51 234',
  },
  luxury: {
    'color-background': '235 229 214',
    'color-foreground': '41 37 36',
    'color-card': '245 240 230',
    'color-card-foreground': '41 37 36',
    'color-primary': '168 85 24',
    'color-primary-foreground': '245 240 230',
    'color-secondary': '217 204 185',
    'color-secondary-foreground': '41 37 36',
    'color-muted': '217 204 185',
    'color-muted-foreground': '120 113 108',
    'color-accent': '200 180 150',
    'color-accent-foreground': '41 37 36',
    'color-destructive': '185 74 72',
    'color-destructive-foreground': '245 240 230',
    'color-border': '204 186 165',
    'color-input': '204 186 165',
    'color-ring': '168 85 24',
  },
}

// Theme application function
export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement
  const colors = themeDefinitions[theme]
  
  // Apply all color variables
  Object.entries(colors).forEach(([property, value]) => {
    root.style.setProperty(`--${property}`, value)
  })
  
  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme)
}

// Get current theme from data attribute
export const getCurrentTheme = (): Theme => {
  const theme = document.documentElement.getAttribute('data-theme') as Theme
  return THEMES.includes(theme) ? theme : 'light'
}

// Theme validation
export const isValidTheme = (theme: string): theme is Theme => {
  return THEMES.includes(theme as Theme)
}