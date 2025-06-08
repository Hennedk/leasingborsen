import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyEmergencyTheme } from '../emergency-styles'

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

interface ThemeState {
  currentTheme: Theme
  setTheme: (theme: Theme) => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: 'light',
      
      setTheme: (theme: Theme) => {
        set({ currentTheme: theme })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme)
          // Also apply emergency theme for bulletproof styling
          applyEmergencyTheme(theme)
        }
      },
      
      initTheme: () => {
        const { currentTheme } = get()
        if (typeof document !== 'undefined') {
          const currentAttr = document.documentElement.getAttribute('data-theme')
          if (currentAttr !== currentTheme) {
            document.documentElement.setAttribute('data-theme', currentTheme)
            // Also apply emergency theme for bulletproof styling
            applyEmergencyTheme(currentTheme)
          }
        }
      }
    }),
    {
      name: 'leasingborsen-theme-storage',
      partialize: (state) => ({ currentTheme: state.currentTheme }),
      onRehydrateStorage: () => (state) => {
        // Immediately apply theme when store rehydrates
        if (state && typeof document !== 'undefined') {
          const currentAttr = document.documentElement.getAttribute('data-theme')
          if (currentAttr !== state.currentTheme) {
            document.documentElement.setAttribute('data-theme', state.currentTheme)
            // Also apply emergency theme for bulletproof styling
            applyEmergencyTheme(state.currentTheme)
          }
        }
      }
    }
  )
)