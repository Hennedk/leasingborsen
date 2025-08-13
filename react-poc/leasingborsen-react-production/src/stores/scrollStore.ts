import { create } from 'zustand'

interface ScrollStore {
  positions: Record<string, number>
  savePosition: (path: string, position: number) => void
  getPosition: (path: string) => number
  clearPosition: (path: string) => void
}

export const useScrollStore = create<ScrollStore>((set, get) => ({
  positions: {},
  savePosition: (path, position) => {
    // Also save to sessionStorage for hardware back support
    sessionStorage.setItem(`scroll-${path}`, String(position))
    set((state) => ({ 
      positions: { ...state.positions, [path]: position } 
    }))
  },
  getPosition: (path) => {
    // Try sessionStorage first (survives page refresh)
    const sessionPos = sessionStorage.getItem(`scroll-${path}`)
    if (sessionPos) return parseInt(sessionPos)
    return get().positions[path] || 0
  },
  clearPosition: (path) => {
    sessionStorage.removeItem(`scroll-${path}`)
    set((state) => {
      const { [path]: _, ...rest } = state.positions
      return { positions: rest }
    })
  }
}))