import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListingsErrorStateProps {
  error?: Error | string
  onRetry?: () => void
  className?: string
}

/**
 * Enhanced error state component for listings
 * Uses Card component for consistent styling
 */
const ListingsErrorState: React.FC<ListingsErrorStateProps> = ({
  error,
  onRetry,
  className
}) => {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Der opstod en uventet fejl'
  
  return (
    <Card className={cn("border-destructive bg-destructive/10 mb-8", className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-2">Der opstod en fejl</h3>
            <p className="text-destructive/90 mb-4">
              {errorMessage === 'Der opstod en uventet fejl' 
                ? 'Der opstod en fejl ved indlæsning af biler. Prøv igen senere.'
                : errorMessage
              }
            </p>
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <RefreshCw className="w-4 h-4" />
                Prøv igen
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ListingsErrorState