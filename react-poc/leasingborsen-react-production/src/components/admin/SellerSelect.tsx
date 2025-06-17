import React from 'react'
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSellers } from '@/hooks/useSellers'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SellerSelectProps {
  value: string
  onValueChange: (value: string) => void
  required?: boolean
  className?: string
}

export const SellerSelect: React.FC<SellerSelectProps> = ({
  value,
  onValueChange,
  required = false,
  className
}) => {
  const { data: sellers, isLoading, error } = useSellers()


  const handleCreateNewSeller = () => {
    // Open create seller page in new tab to avoid losing current form data
    window.open('/admin/sellers/create', '_blank')
  }

  if (error) {
    return (
      <FormItem className={className}>
        <FormLabel>Sælger {required && '*'}</FormLabel>
        <div className="text-sm text-destructive">
          Fejl ved indlæsning af sælgere: {error.message}
        </div>
        <FormMessage />
      </FormItem>
    )
  }

  return (
    <FormItem className={className}>
      <FormLabel>Sælger {required && '*'}</FormLabel>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
            <FormControl>
              <SelectTrigger>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Indlæser sælgere...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Vælg sælger" />
                )}
              </SelectTrigger>
            </FormControl>
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
      <FormMessage />
    </FormItem>
  )
}