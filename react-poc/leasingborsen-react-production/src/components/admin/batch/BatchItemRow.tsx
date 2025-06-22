import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import { Table, TableBody, TableHead, TableHeader } from '@/components/ui/table'
import { 
  ChevronDown, 
  ChevronRight, 
  Car, 
  Zap, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BatchItem } from '@/types/admin'

interface BatchItemRowProps {
  item: BatchItem
  isSelected: boolean
  isExpanded: boolean
  isProcessing: boolean
  onToggleSelection: () => void
  onToggleExpansion: () => void
  formatPrice: (price?: number) => string
  getConfidenceColor: (score: number) => string
  getConfidenceLabel: (score: number) => string
}

/**
 * Individual batch item row with expansion for detailed information
 */
export const BatchItemRow: React.FC<BatchItemRowProps> = React.memo(({
  item,
  isSelected,
  isExpanded,
  isProcessing,
  onToggleSelection,
  onToggleExpansion,
  formatPrice,
  getConfidenceColor,
  getConfidenceLabel
}) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'new':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'update':
        return <RefreshCw className="h-4 w-4 text-yellow-600" />
      case 'delete':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'new':
        return 'Ny'
      case 'update':
        return 'Opdater'
      case 'delete':
        return 'Slet'
      default:
        return action
    }
  }

  const getActionVariant = (action: string) => {
    switch (action) {
      case 'new':
        return 'default'
      case 'update':
        return 'secondary'
      case 'delete':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <>
      {/* Main Row */}
      <TableRow
        className={cn(
          "cursor-pointer hover:bg-muted/50",
          isSelected && "bg-blue-50",
          isProcessing && "opacity-50"
        )}
      >
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelection}
            disabled={isProcessing}
            aria-label={`Vælg ${item.parsed_data.model} ${item.parsed_data.variant}`}
          />
        </TableCell>
        
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpansion}
            className="h-6 w-6 p-0"
            aria-label={isExpanded ? "Skjul detaljer" : "Vis detaljer"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </TableCell>

        <TableCell>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {item.parsed_data.model}
                  {item.parsed_data.variant ? ` ${item.parsed_data.variant}` : ''}
                </span>
                {item.parsed_data.is_electric && (
                  <Zap className="h-3 w-3 text-green-600" aria-label="Elektrisk" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {item.parsed_data.horsepower} HK
              </div>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <Badge variant={getActionVariant(item.action) as any} className="flex items-center gap-1 w-fit">
            {getActionIcon(item.action)}
            {getActionLabel(item.action)}
          </Badge>
        </TableCell>

        <TableCell>
          <div className="text-right">
            <div className="font-medium">
              {formatPrice(
                item.parsed_data.pricing_options?.[0]?.monthly_price || 
                item.parsed_data.monthly_price
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {item.parsed_data.pricing_options?.[0]?.mileage_per_year?.toLocaleString('da-DK') || 
               item.parsed_data.mileage_per_year?.toLocaleString('da-DK') || '–'} km/år
            </div>
          </div>
        </TableCell>

        <TableCell>
          <div className="text-right">
            <div className={cn("font-medium", getConfidenceColor(item.confidence_score))}>
              {Math.round(item.confidence_score * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {getConfidenceLabel(item.confidence_score)}
            </div>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Row Details */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <div className="p-4 bg-muted/30 border-t">
              <div className="space-y-4">
                {/* Pricing Options */}
                {item.parsed_data.pricing_options && item.parsed_data.pricing_options.length > 0 ? (
                  <div>
                    <h4 className="font-medium mb-2">Prisindstillinger:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-background">
                          <TableHead className="h-8 text-xs">Månedlig pris</TableHead>
                          <TableHead className="h-8 text-xs">Kørsel per år</TableHead>
                          <TableHead className="h-8 text-xs">Periode</TableHead>
                          <TableHead className="h-8 text-xs">Udbetaling</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {item.parsed_data.pricing_options.map((pricing, index) => (
                          <TableRow key={index} className="h-8">
                            <TableCell className="py-1 font-medium text-sm">
                              {formatPrice(pricing.monthly_price)}
                            </TableCell>
                            <TableCell className="py-1 text-sm">
                              {pricing.mileage_per_year?.toLocaleString('da-DK')} km/år
                            </TableCell>
                            <TableCell className="py-1 text-sm">
                              {pricing.period_months} mdr
                            </TableCell>
                            <TableCell className="py-1 text-sm">
                              {formatPrice(pricing.deposit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  /* Fallback for single pricing */
                  <div>
                    <h4 className="font-medium mb-2">Prisoplysninger:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-background">
                          <TableHead className="h-8 text-xs">Månedlig pris</TableHead>
                          <TableHead className="h-8 text-xs">Kørsel per år</TableHead>
                          <TableHead className="h-8 text-xs">Periode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="h-8">
                          <TableCell className="py-1 font-medium text-sm">
                            {formatPrice(item.parsed_data.monthly_price)}
                          </TableCell>
                          <TableCell className="py-1 text-sm">
                            {item.parsed_data.mileage_per_year?.toLocaleString('da-DK') || '–'} km/år
                          </TableCell>
                          <TableCell className="py-1 text-sm">
                            {item.parsed_data.period_months} mdr
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Show changes for update items */}
                {item.action === 'update' && item.changes && Object.keys(item.changes).length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Ændringer:</h4>
                    <div className="space-y-2">
                      {Object.entries(item.changes).map(([field, change]) => (
                        <div key={field} className="flex justify-between text-sm">
                          <span className="font-medium">{field}:</span>
                          <span>
                            <span className="text-red-600 line-through">
                              {typeof change.old === 'object' ? JSON.stringify(change.old) : String(change.old)}
                            </span>
                            {' → '}
                            <span className="text-green-600">
                              {typeof change.new === 'object' ? JSON.stringify(change.new) : String(change.new)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}, (prevProps, nextProps) => {
  // Optimized memoization comparison
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isProcessing === nextProps.isProcessing
  )
})