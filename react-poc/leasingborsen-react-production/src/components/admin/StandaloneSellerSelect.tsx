import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSellers } from '@/hooks/useSellers'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StandaloneSellerSelectProps {
  value: string
  onValueChange: (value: string) => void
  required?: boolean
  className?: string
  label?: string
}

/**
 * StandaloneSellerSelect - Seller selection component that works outside of React Hook Form
 * 
 * This is a standalone version of SellerSelect that doesn't require form context.
 * Use this for components that aren't part of a form structure.
 */
export const StandaloneSellerSelect: React.FC<StandaloneSellerSelectProps> = ({
  value,
  onValueChange,
  required = false,
  className = '',
  label = 'Sælger'
}) => {
  const { data: sellers, isLoading, error } = useSellers()
  

  const handleCreateNewSeller = () => {
    // Open create seller page in new tab to avoid losing current form data
    window.open('/admin/sellers/create', '_blank')
  }

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{label} {required && '*'}</Label>
        <div className="text-sm text-destructive">
          Fejl ved indlæsning af sælgere: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="seller-select">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
            <SelectTrigger id="seller-select">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Indlæser sælgere...</span>
                </div>
              ) : (
                <SelectValue placeholder="Vælg sælger" />
              )}
            </SelectTrigger>
            <SelectContent>
              {sellers?.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{seller.name}</span>
                    {seller.company && (
                      <span className="text-xs text-muted-foreground">{seller.company}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {sellers && sellers.length === 0 && (
                <div className="py-2 px-3 text-sm text-muted-foreground">
                  Ingen sælgere fundet
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCreateNewSeller}
          disabled={isLoading}
          title="Opret ny sælger"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}