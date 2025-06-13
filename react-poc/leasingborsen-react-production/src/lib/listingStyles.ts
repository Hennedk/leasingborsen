/**
 * Centralized style utilities for listings page
 * Promotes consistency and maintainability
 */
export const listingStyles = {
  // Grid layouts
  gridContainer: "grid gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  
  // Layout containers
  stickyFilterBar: "lg:hidden sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 z-50",
  mainContent: "lg:col-span-3",
  sidebar: "hidden lg:block",
  
  // State displays
  emptyState: "text-center py-16 lg:py-20",
  errorState: "bg-destructive/10 text-destructive border border-destructive/20 p-6 rounded-lg mb-8",
  loadingSection: "mt-6 lg:mt-8",
  
  // Interactive elements
  filterChip: "flex-shrink-0",
  scrollContainer: "flex-1 overflow-x-auto scrollbar-hide",
  
  // Spacing
  sectionSpacing: "mb-8",
  contentPadding: "py-6 lg:py-12",
  
  // Icons and visual elements
  iconContainer: "w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center",
  largeIconContainer: "w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center"
} as const

/**
 * Compound variants for common pattern combinations
 */
export const listingVariants = {
  stateDisplay: {
    loading: `${listingStyles.gridContainer}`,
    error: listingStyles.errorState,
    empty: listingStyles.emptyState,
    success: listingStyles.gridContainer
  },
  
  contentSection: {
    mobile: "lg:hidden flex items-center mb-6",
    desktop: "hidden lg:block mb-8"
  }
} as const