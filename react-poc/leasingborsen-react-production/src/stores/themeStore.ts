import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyTheme, type Theme } from '../lib/themes'

// Re-export for components
export { THEMES, type Theme } from '../lib/themes'

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
          applyTheme(theme)
        }
      },
      
      initTheme: () => {
        const { currentTheme } = get()
        if (typeof document !== 'undefined') {
          applyTheme(currentTheme)
        }
      }
    }),
    {
      name: 'leasingborsen-theme-storage',
      partialize: (state) => ({ currentTheme: state.currentTheme }),
      onRehydrateStorage: () => (state) => {
        // Immediately apply theme when store rehydrates
        if (state && typeof document !== 'undefined') {
          applyTheme(state.currentTheme)
        }
      }
    }
  )
)