import React from 'react'
import { Button } from '@/components/ui/button'
import { Save, X } from 'lucide-react'

interface SaveBarProps {
  onSave: () => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

export const SaveBar: React.FC<SaveBarProps> = ({
  onSave,
  onCancel,
  isLoading = false,
  className
}) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 ${className}`}>
      <div className="flex justify-between items-center max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Du har ugemte ændringer</span>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Fortryd
          </Button>
          <Button 
            onClick={onSave}
            disabled={isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Gemmer...' : 'Gem ændringer'}
          </Button>
        </div>
      </div>
    </div>
  )
}