import React from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft } from 'lucide-react'

interface MobileViewHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  onClose: () => void
  showActiveCount?: boolean
  activeCount?: number
}

/**
 * Reusable header component for mobile filter overlay views
 * Provides consistent styling and behavior across all mobile filter screens
 * 
 * Features:
 * - Optional back navigation button
 * - Close button for overlay dismissal
 * - Active filter count badge
 * - Subtitle support
 * - Consistent spacing and typography
 */
const MobileViewHeader: React.FC<MobileViewHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onClose,
  showActiveCount = false,
  activeCount = 0
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0 hover:bg-muted"
            aria-label="Gå tilbage"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            {showActiveCount && activeCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0 hover:bg-muted"
        aria-label="Luk filter"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default MobileViewHeader