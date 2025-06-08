// shadcn/ui compatible theme system
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

// Theme definitions using shadcn/ui HSL format
export const themeDefinitions: Record<Theme, Record<string, string>> = {
  light: {
    'background': '0 0% 100%',
    'foreground': '222.2 84% 4.9%',
    'card': '0 0% 100%',
    'card-foreground': '222.2 84% 4.9%',
    'popover': '0 0% 100%',
    'popover-foreground': '222.2 84% 4.9%',
    'primary': '262.1 83.3% 57.8%',
    'primary-foreground': '210 40% 98%',
    'secondary': '210 40% 96%',
    'secondary-foreground': '222.2 84% 4.9%',
    'muted': '210 40% 96%',
    'muted-foreground': '215.4 16.3% 46.9%',
    'accent': '210 40% 96%',
    'accent-foreground': '222.2 84% 4.9%',
    'destructive': '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    'border': '214.3 31.8% 91.4%',
    'input': '214.3 31.8% 91.4%',
    'ring': '262.1 83.3% 57.8%',
  },
  dark: {
    'background': '222.2 84% 4.9%',
    'foreground': '210 40% 98%',
    'card': '222.2 84% 4.9%',
    'card-foreground': '210 40% 98%',
    'popover': '222.2 84% 4.9%',
    'popover-foreground': '210 40% 98%',
    'primary': '217.2 91.2% 59.8%',
    'primary-foreground': '222.2 84% 4.9%',
    'secondary': '217.2 32.6% 17.5%',
    'secondary-foreground': '210 40% 98%',
    'muted': '217.2 32.6% 17.5%',
    'muted-foreground': '215 20.2% 65.1%',
    'accent': '217.2 32.6% 17.5%',
    'accent-foreground': '210 40% 98%',
    'destructive': '0 62.8% 30.6%',
    'destructive-foreground': '210 40% 98%',
    'border': '217.2 32.6% 17.5%',
    'input': '217.2 32.6% 17.5%',
    'ring': '224.3 76.3% 94.0%',
  },
  synthwave: {
    'background': '345 100% 4%',
    'foreground': '317 100% 85%',
    'card': '345 100% 6%',
    'card-foreground': '317 100% 85%',
    'popover': '345 100% 4%',
    'popover-foreground': '317 100% 85%',
    'primary': '317 100% 54%',
    'primary-foreground': '345 100% 4%',
    'secondary': '292 84% 15%',
    'secondary-foreground': '317 100% 85%',
    'muted': '292 84% 15%',
    'muted-foreground': '317 30% 65%',
    'accent': '180 100% 50%',
    'accent-foreground': '345 100% 4%',
    'destructive': '0 100% 50%',
    'destructive-foreground': '317 100% 85%',
    'border': '292 84% 20%',
    'input': '292 84% 15%',
    'ring': '317 100% 54%',
  },
  cyberpunk: {
    'background': '280 100% 6%',
    'foreground': '60 100% 85%',
    'card': '280 100% 8%',
    'card-foreground': '60 100% 85%',
    'popover': '280 100% 6%',
    'popover-foreground': '60 100% 85%',
    'primary': '60 100% 50%',
    'primary-foreground': '280 100% 6%',
    'secondary': '300 100% 15%',
    'secondary-foreground': '60 100% 85%',
    'muted': '300 100% 15%',
    'muted-foreground': '60 30% 65%',
    'accent': '320 100% 50%',
    'accent-foreground': '280 100% 6%',
    'destructive': '0 100% 60%',
    'destructive-foreground': '60 100% 85%',
    'border': '300 100% 20%',
    'input': '300 100% 15%',
    'ring': '60 100% 50%',
  },
  corporate: {
    'background': '0 0% 100%',
    'foreground': '210 11% 15%',
    'card': '0 0% 100%',
    'card-foreground': '210 11% 15%',
    'popover': '0 0% 100%',
    'popover-foreground': '210 11% 15%',
    'primary': '210 100% 56%',
    'primary-foreground': '0 0% 100%',
    'secondary': '210 11% 90%',
    'secondary-foreground': '210 11% 15%',
    'muted': '210 11% 90%',
    'muted-foreground': '210 11% 45%',
    'accent': '210 11% 85%',
    'accent-foreground': '210 11% 15%',
    'destructive': '0 100% 50%',
    'destructive-foreground': '0 0% 100%',
    'border': '214.3 31.8% 91.4%',
    'input': '214.3 31.8% 91.4%',
    'ring': '210 100% 56%',
  },
  business: {
    'background': '210 6% 93%',
    'foreground': '210 6% 10%',
    'card': '210 6% 98%',
    'card-foreground': '210 6% 10%',
    'popover': '210 6% 98%',
    'popover-foreground': '210 6% 10%',
    'primary': '210 60% 45%',
    'primary-foreground': '210 6% 98%',
    'secondary': '210 6% 88%',
    'secondary-foreground': '210 6% 10%',
    'muted': '210 6% 88%',
    'muted-foreground': '210 6% 40%',
    'accent': '210 6% 82%',
    'accent-foreground': '210 6% 10%',
    'destructive': '0 70% 50%',
    'destructive-foreground': '210 6% 98%',
    'border': '210 6% 82%',
    'input': '210 6% 82%',
    'ring': '210 60% 45%',
  },
  fantasy: {
    'background': '290 30% 96%',
    'foreground': '290 30% 10%',
    'card': '290 30% 98%',
    'card-foreground': '290 30% 10%',
    'popover': '290 30% 98%',
    'popover-foreground': '290 30% 10%',
    'primary': '280 80% 55%',
    'primary-foreground': '290 30% 98%',
    'secondary': '290 30% 88%',
    'secondary-foreground': '290 30% 10%',
    'muted': '290 30% 88%',
    'muted-foreground': '290 30% 40%',
    'accent': '320 70% 65%',
    'accent-foreground': '290 30% 10%',
    'destructive': '0 80% 55%',
    'destructive-foreground': '290 30% 98%',
    'border': '290 30% 82%',
    'input': '290 30% 82%',
    'ring': '280 80% 55%',
  },
  luxury: {
    'background': '40 15% 92%',
    'foreground': '40 15% 8%',
    'card': '40 15% 96%',
    'card-foreground': '40 15% 8%',
    'popover': '40 15% 96%',
    'popover-foreground': '40 15% 8%',
    'primary': '25 70% 40%',
    'primary-foreground': '40 15% 96%',
    'secondary': '40 15% 85%',
    'secondary-foreground': '40 15% 8%',
    'muted': '40 15% 85%',
    'muted-foreground': '40 15% 35%',
    'accent': '35 60% 55%',
    'accent-foreground': '40 15% 8%',
    'destructive': '0 70% 45%',
    'destructive-foreground': '40 15% 96%',
    'border': '40 15% 80%',
    'input': '40 15% 80%',
    'ring': '25 70% 40%',
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