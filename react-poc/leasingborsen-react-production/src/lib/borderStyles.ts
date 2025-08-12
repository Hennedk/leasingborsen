/**
 * Standardized border styles for consistent visual hierarchy
 * Ensures uniform border thickness and opacity across mobile and desktop interfaces
 */
export const borderStyles = {
  // Mobile section dividers - optimized for mobile viewport contrast
  mobileDivider: "border-b border-border/50",
  
  // Standard section dividers - default for most use cases
  sectionDivider: "border-b border-border/50", 
  
  // Prominent dividers - for emphasis or separation of major sections
  strongDivider: "border-b border-border/60",
  
  // Subtle dividers - for minimal visual separation
  subtleDivider: "border-b border-border/40",
  
  // Top borders for overlays and sticky elements
  topDivider: "border-t border-border/50",
  
  // Combined top and bottom borders for sticky filter bars
  stickyDivider: "border-t border-b border-border/50"
} as const

/**
 * Border style variants for specific component contexts
 */
export const borderVariants = {
  // Header and navigation borders
  header: {
    standard: borderStyles.sectionDivider,
    mobile: borderStyles.mobileDivider,
    prominent: borderStyles.strongDivider
  },
  
  // Filter and overlay borders  
  filter: {
    overlay: borderStyles.stickyDivider,
    section: borderStyles.sectionDivider,
    mobile: borderStyles.mobileDivider
  },
  
  // Content section borders
  content: {
    section: borderStyles.sectionDivider,
    subtle: borderStyles.subtleDivider,
    emphasis: borderStyles.strongDivider
  }
} as const

/**
 * Helper functions for dynamic border application
 */
export const getBorderStyle = (
  variant: keyof typeof borderStyles,
  context?: 'mobile' | 'desktop'
): string => {
  if (context === 'mobile' && variant === 'sectionDivider') {
    return borderStyles.mobileDivider
  }
  return borderStyles[variant]
}