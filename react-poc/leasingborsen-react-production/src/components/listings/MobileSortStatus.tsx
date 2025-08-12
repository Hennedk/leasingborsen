import React from 'react'

interface MobileSortStatusProps {
  currentSortLabel: string
  className?: string
}

const MobileSortStatus: React.FC<MobileSortStatusProps> = ({ 
  currentSortLabel, 
  className = "" 
}) => {
  return (
    <div className={`lg:hidden text-sm text-muted-foreground ${className}`}>
      Sorteret efter {currentSortLabel.toLowerCase()}
    </div>
  )
}

export default MobileSortStatus