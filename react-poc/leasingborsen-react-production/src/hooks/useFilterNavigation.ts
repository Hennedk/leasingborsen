import { useState, useCallback } from 'react'

type MobileView = 'filters' | 'makes' | 'makeSelection' | 'models'

interface UseFilterNavigationProps {
  onClose: () => void
}

/**
 * useFilterNavigation - Manages navigation state for mobile filter overlay
 * 
 * Handles view transitions, search terms, and navigation logic
 */
export const useFilterNavigation = ({ onClose }: UseFilterNavigationProps) => {
  const [currentView, setCurrentView] = useState<MobileView>('filters')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMakeForModels, setSelectedMakeForModels] = useState<string | null>(null)

  const navigateToView = useCallback((view: MobileView, makeName?: string) => {
    if (view === 'models' && makeName) {
      setSelectedMakeForModels(makeName)
    }
    setCurrentView(view)
    // Clear search when changing views
    if (view !== currentView) {
      setSearchTerm('')
    }
  }, [currentView])

  const goBack = useCallback(() => {
    switch (currentView) {
      case 'makes':
      case 'makeSelection':
        setCurrentView('filters')
        break
      case 'models':
        setCurrentView('makeSelection')
        setSelectedMakeForModels(null)
        break
      default:
        onClose()
    }
  }, [currentView, onClose])

  const canGoBack = currentView !== 'filters'

  const resetNavigation = useCallback(() => {
    setCurrentView('filters')
    setSearchTerm('')
    setSelectedMakeForModels(null)
  }, [])

  return {
    currentView,
    searchTerm,
    selectedMakeForModels,
    setSearchTerm,
    navigateToView,
    goBack,
    canGoBack,
    resetNavigation
  }
}