import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ErrorStateProps {
  className?: string
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  className,
  title = 'Der opstod en fejl',
  description = 'Noget gik galt. Prøv igen senere.',
  action
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        </div>
        
        {action && (
          <Button onClick={action.onClick} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}