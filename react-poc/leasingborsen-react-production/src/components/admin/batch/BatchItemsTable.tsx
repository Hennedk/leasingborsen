import React from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BatchItemRow } from './BatchItemRow'
import { ComponentErrorBoundary } from '@/components/ErrorBoundaries'
import type { BatchItem } from '@/types/admin'

interface BatchItemsTableProps {
  items: BatchItem[]
  selectedItems: string[]
  expandedItems: Set<string>
  processingItems: Set<string>
  isAllSelected: boolean
  onToggleSelectAll: () => void
  onToggleItemSelection: (itemId: string) => void
  onToggleItemExpansion: (itemId: string) => void
  formatPrice: (price?: number) => string
  getConfidenceColor: (score: number) => string
  getConfidenceLabel: (score: number) => string
}

/**
 * Tabbed table view for batch items with filtering and selection
 */
export const BatchItemsTable: React.FC<BatchItemsTableProps> = ({
  items,
  selectedItems,
  expandedItems,
  processingItems,
  isAllSelected,
  onToggleSelectAll,
  onToggleItemSelection,
  onToggleItemExpansion,
  formatPrice,
  getConfidenceColor,
  getConfidenceLabel
}) => {
  // Filter items by action type
  const itemsByAction = {
    all: items,
    new: items.filter(item => item.action === 'new'),
    update: items.filter(item => item.action === 'update'),
    delete: items.filter(item => item.action === 'delete')
  }

  const renderTable = (filteredItems: BatchItem[]) => {
    if (filteredItems.length === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Ingen annoncer at vise</p>
        </Card>
      )
    }

    return (
      <Card className="border-0 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Vælg alle annoncer"
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Bil</TableHead>
              <TableHead>Handling</TableHead>
              <TableHead className="text-right">Pris</TableHead>
              <TableHead className="text-right">Konfidens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <ComponentErrorBoundary
                key={item.id}
                componentName={`BatchItem-${item.id}`}
              >
                <BatchItemRow
                  item={item}
                  isSelected={selectedItems.includes(item.id)}
                  isExpanded={expandedItems.has(item.id)}
                  isProcessing={processingItems.has(item.id)}
                  onToggleSelection={() => onToggleItemSelection(item.id)}
                  onToggleExpansion={() => onToggleItemExpansion(item.id)}
                  formatPrice={formatPrice}
                  getConfidenceColor={getConfidenceColor}
                  getConfidenceLabel={getConfidenceLabel}
                />
              </ComponentErrorBoundary>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            Alle
            <Badge variant="secondary" className="ml-1">
              {itemsByAction.all.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            Nye
            <Badge variant="default" className="ml-1 bg-green-100 text-green-800">
              {itemsByAction.new.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="update" className="flex items-center gap-2">
            Opdateringer
            <Badge variant="outline" className="ml-1 border-yellow-300 text-yellow-700">
              {itemsByAction.update.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="delete" className="flex items-center gap-2">
            Sletninger
            <Badge variant="destructive" className="ml-1 bg-red-100 text-red-800">
              {itemsByAction.delete.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {renderTable(itemsByAction.all)}
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          {renderTable(itemsByAction.new)}
        </TabsContent>

        <TabsContent value="update" className="mt-4">
          {renderTable(itemsByAction.update)}
        </TabsContent>

        <TabsContent value="delete" className="mt-4">
          {renderTable(itemsByAction.delete)}
        </TabsContent>
      </Tabs>
    </div>
  )
}