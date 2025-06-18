import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  Building2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Seller } from '@/hooks/useSellers'

interface SellersTableProps {
  sellers: Seller[]
  loading?: boolean
  onDelete?: (seller: Seller) => void
  onBulkAction?: (selectedSellers: Seller[], action: string) => void
}

const SellersTable: React.FC<SellersTableProps> = ({
  sellers,
  loading = false,
  onDelete,
  onBulkAction
}) => {
  const [selectedSellers, setSelectedSellers] = React.useState<Seller[]>([])

  const columns: ColumnDef<Seller>[] = [
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
      accessorKey: "name",
      header: "Navn",
      meta: { displayName: "Navn" },
      cell: ({ row }) => {
        const seller = row.original
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {seller.name}
              </div>
              {seller.company && (
                <div className="text-xs text-muted-foreground">
                  {seller.company}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: "E-mail",
      meta: { displayName: "E-mail" },
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a 
              href={`mailto:${email}`}
              className="text-primary hover:underline"
            >
              {email}
            </a>
          </div>
        ) : (
          <span className="text-muted-foreground">–</span>
        )
      },
    },
    {
      accessorKey: "phone",
      header: "Telefon",
      meta: { displayName: "Telefon" },
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a 
              href={`tel:${phone}`}
              className="text-primary hover:underline"
            >
              {phone}
            </a>
          </div>
        ) : (
          <span className="text-muted-foreground">–</span>
        )
      },
    },
    {
      accessorKey: "address",
      header: "Adresse",
      meta: { displayName: "Adresse" },
      cell: ({ row }) => {
        const address = row.getValue("address") as string
        return address ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{address}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">–</span>
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
        const seller = row.original

        return (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              asChild
              title="Rediger sælger"
            >
              <Link to={`/admin/sellers/edit/${seller.id}`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Slet sælger"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Denne handling kan ikke fortrydes. Dette vil permanent slette sælgeren 
                    <strong> {seller.name}</strong> fra databasen.
                    {seller.company && (
                      <span> ({seller.company})</span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete?.(seller)}
                  >
                    Slet sælger
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
    if (selectedSellers.length > 0 && onBulkAction) {
      onBulkAction(selectedSellers, action)
    }
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      {selectedSellers.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedSellers.length} sælger(e) valgt:
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
        data={sellers as any}
        searchPlaceholder="Søg efter navn, e-mail eller telefon..."
        searchColumn="name"
        onRowSelection={setSelectedSellers as any}
        loading={loading}
      />
    </div>
  )
}

export default SellersTable