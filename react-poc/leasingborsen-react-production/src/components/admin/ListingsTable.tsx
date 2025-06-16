import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Car
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
      header: "Mærke",
      meta: { displayName: "Mærke" },
      cell: ({ row }) => {
        const listing = row.original
        return (
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{listing.make}</div>
              <div className="text-sm text-muted-foreground">{listing.model}</div>
            </div>
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
        return (
          <div className="font-medium">
            {price?.toLocaleString('da-DK')} kr/md
          </div>
        )
      },
    },
    {
      accessorKey: "body_type",
      header: "Type",
      meta: { displayName: "Biltype" },
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue("body_type")}
        </Badge>
      ),
    },
    {
      accessorKey: "fuel_type",
      header: "Brændstof",
      meta: { displayName: "Brændstof" },
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.getValue("fuel_type")}
        </Badge>
      ),
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Åbn menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Handlinger</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onView?.(listing)}>
                <Eye className="mr-2 h-4 w-4" />
                Se på hjemmeside
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link to={`/admin/listings/edit/${listing.listing_id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Rediger
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onDelete?.(listing)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Slet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

  return (
    <div className="space-y-4">
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
        columns={columns}
        data={listings}
        searchPlaceholder="Søg efter mærke, model eller type..."
        searchColumn="make"
        onRowSelection={setSelectedListings}
        loading={loading}
      />
    </div>
  )
}

export default ListingsTable