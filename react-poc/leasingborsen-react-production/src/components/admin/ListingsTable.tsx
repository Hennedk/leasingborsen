import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Car,
  AlertTriangle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CarListing } from '@/lib/supabase'

interface ListingsTableProps {
  listings: CarListing[]
  loading?: boolean
  onDelete?: (listing: CarListing) => void
  onView?: (listing: CarListing) => void
  onBulkAction?: (selectedListings: CarListing[], action: string) => void
}

const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  loading = false,
  onDelete,
  onView,
  onBulkAction
}) => {
  const [selectedListings, setSelectedListings] = React.useState<CarListing[]>([])

  const columns: ColumnDef<CarListing>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Vælg alle"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Vælg række"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "make",
      header: "Bil",
      meta: { displayName: "Bil" },
      cell: ({ row }) => {
        const listing = row.original as any
        const variant = listing.variant ? ` ${listing.variant}` : ''
        const isDraft = listing.is_draft
        const missingFields = listing.missing_fields || []
        
        return (
          <div className={`flex items-center gap-2 ${isDraft ? 'opacity-75' : ''}`}>
            <Car className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {listing.make} {listing.model}{variant}
                </span>
                {isDraft && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Kladde
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium mb-1">Manglende data:</p>
                        <ul className="text-xs space-y-1">
                          {missingFields.map((field: string) => (
                            <li key={field}>• {field}</li>
                          ))}
                        </ul>
                        <p className="text-xs mt-2 opacity-75">Vises ikke til forbrugere</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "body_type",
      header: "Type",
      meta: { displayName: "Biltype" },
      cell: ({ row }) => {
        const bodyType = row.getValue("body_type") as string
        return bodyType ? (
          <Badge variant="outline">
            {bodyType}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-dashed">
            Ikke angivet
          </Badge>
        )
      },
    },
    {
      accessorKey: "fuel_type",
      header: "Brændstof",
      meta: { displayName: "Brændstof" },
      cell: ({ row }) => {
        const fuelType = row.getValue("fuel_type") as string
        return fuelType ? (
          <Badge variant="secondary">
            {fuelType}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-dashed">
            Ikke angivet
          </Badge>
        )
      },
    },
    {
      accessorKey: "seller_name",
      header: "Sælger",
      meta: { displayName: "Sælger" },
      cell: ({ row }) => {
        const listing = row.original
        return (
          <div>
            <div className="font-medium text-sm">
              {listing.seller_name || "–"}
            </div>
            {listing.seller_phone && (
              <div className="text-xs text-muted-foreground">
                {listing.seller_phone}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "year",
      header: "År",
      meta: { displayName: "År" },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {row.getValue("year")}
        </div>
      ),
    },
    {
      accessorKey: "monthly_price",
      header: "Månedspris",
      meta: { displayName: "Månedspris" },
      cell: ({ row }) => {
        const price = row.getValue("monthly_price") as number
        const listing = row.original as any
        
        return price ? (
          <div className="font-medium">
            {price.toLocaleString('da-DK')} kr/md
          </div>
        ) : (
          <div className="text-muted-foreground text-sm italic">
            {listing.offer_count > 0 ? 'Ingen hovedpris' : 'Ingen tilbud'}
          </div>
        )
      },
    },
    {
      accessorKey: "offer_count",
      header: "Tilbud",
      meta: { displayName: "Tilbud" },
      cell: ({ row }) => {
        const count = (row.original as any).offer_count || 0
        return (
          <div className="text-sm font-medium">
            {count}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Oprettet",
      meta: { displayName: "Oprettet" },
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string
        return (
          <div className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString('da-DK')}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Handlinger",
      meta: { displayName: "Handlinger" },
      cell: ({ row }) => {
        const listing = row.original

        return (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onView?.(listing)}
              title="Se på hjemmeside"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              asChild
              title="Rediger annonce"
            >
              <Link to={`/admin/listings/edit/${listing.listing_id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Slet annonce"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Denne handling kan ikke fortrydes. Dette vil permanent slette annoncen for 
                    <strong> {listing.make} {listing.model} ({listing.year})</strong> fra databasen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete?.(listing)}
                  >
                    Slet annonce
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedListings.length > 0 && onBulkAction) {
      onBulkAction(selectedListings, action)
    }
  }

  // Calculate draft statistics
  const draftCount = listings.filter((l: any) => l.is_draft).length
  const publishedCount = listings.length - draftCount

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Status summary */}
        {draftCount > 0 && (
          <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div className="text-sm">
              <span className="font-medium text-orange-800">
                {draftCount} kladde{draftCount !== 1 ? 'r' : ''}
              </span>
              <span className="text-orange-700 ml-2">
                • {publishedCount} publiceret{publishedCount !== 1 ? 'e' : ''}
              </span>
              <span className="text-orange-600 ml-2 text-xs">
                Kladder vises kun i admin og mangler data før publicering
              </span>
            </div>
          </div>
        )}

        {/* Bulk actions */}
        {selectedListings.length > 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedListings.length} annonce(r) valgt:
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Slet valgte
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('export')}
            >
              Eksporter valgte
            </Button>
          </div>
        )}

        {/* Data table */}
        <DataTable
          columns={columns as any}
          data={listings as any}
          searchPlaceholder="Søg efter mærke, model eller type..."
          searchColumn="make"
          onRowSelection={setSelectedListings as any}
          loading={loading}
        />
      </div>
    </TooltipProvider>
  )
}

export default ListingsTable