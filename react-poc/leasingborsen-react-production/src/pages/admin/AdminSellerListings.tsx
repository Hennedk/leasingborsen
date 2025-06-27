import React, { useState, useMemo } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Search, Car, Eye, Edit, RefreshCw, Download, Upload } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useSellers } from '@/hooks/useSellers'
import { useAdminListings } from '@/hooks/useAdminListings'

interface SellerListingsFilters {
  sellerId: string
  search: string
  make: string
  status: 'all' | 'active' | 'inactive' | 'pending'
}

const AdminSellerListings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<SellerListingsFilters>({
    sellerId: searchParams.get('seller') || '',
    search: '',
    make: '',
    status: 'all'
  })

  // Data fetching
  const { data: sellers = [], isLoading: sellersLoading } = useSellers()
  const { 
    data: listingsResponse, 
    isLoading: listingsLoading, 
    refetch 
  } = useAdminListings()
  
  const allListings = listingsResponse?.data || []

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let filtered = allListings

    if (filters.sellerId) {
      filtered = filtered.filter(listing => listing.seller_id === filters.sellerId)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(listing => 
        listing.make.toLowerCase().includes(searchLower) ||
        listing.model.toLowerCase().includes(searchLower) ||
        listing.variant?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.make) {
      filtered = filtered.filter(listing => listing.make === filters.make)
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(listing => listing.status === filters.status)
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [allListings, filters])

  // Get unique makes for filter
  const availableMakes = useMemo(() => {
    const makes = new Set(allListings.map(listing => listing.make))
    return Array.from(makes).sort()
  }, [allListings])

  // Get selected seller info
  const selectedSeller = useMemo(() => {
    return sellers.find(seller => seller.id === filters.sellerId)
  }, [sellers, filters.sellerId])

  // Statistics
  const stats = useMemo(() => {
    if (!filters.sellerId) return null
    
    const sellerListings = allListings.filter(listing => listing.seller_id === filters.sellerId)
    return {
      total: sellerListings.length,
      active: sellerListings.filter(l => l.status === 'active').length,
      inactive: sellerListings.filter(l => l.status === 'inactive').length,
      pending: sellerListings.filter(l => l.status === 'pending').length,
      avgPrice: sellerListings.length > 0 
        ? Math.round(sellerListings.reduce((sum, l) => sum + (l.monthly_price || 0), 0) / sellerListings.length)
        : 0
    }
  }, [allListings, filters.sellerId])

  const handleSellerChange = (sellerId: string) => {
    const actualSellerId = sellerId === 'all' ? '' : sellerId
    setFilters(prev => ({ ...prev, sellerId: actualSellerId }))
    if (actualSellerId) {
      setSearchParams({ seller: actualSellerId })
    } else {
      setSearchParams({})
    }
  }

  const formatPrice = (price?: number) => {
    return price ? `${price.toLocaleString('da-DK')} kr/md` : '–'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK')
  }

  const handleRefresh = () => {
    refetch()
    toast.success('Data opdateret')
  }

  const isLoading = sellersLoading || listingsLoading

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Breadcrumb 
              className="mb-2"
              items={[
                { label: 'Admin', href: '/admin' },
                { label: 'Sælger Annoncer' }
              ]}
            />
            <h1 className="text-3xl font-bold tracking-tight">Sælger Annoncer</h1>
            <p className="text-muted-foreground">
              Se alle annoncer for en specifik sælger
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={isLoading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Opdater
          </Button>
        </div>

        {/* Seller Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vælg Sælger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seller">Sælger</Label>
                <Select value={filters.sellerId || 'all'} onValueChange={handleSellerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg en sælger..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle sælgere</SelectItem>
                    {sellers.map(seller => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name} {seller.email && `(${seller.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSeller && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {selectedSeller.name}
                  </Badge>
                  {selectedSeller.email && (
                    <Badge variant="secondary" className="text-sm">
                      {selectedSeller.email}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total annoncer</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Aktive</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
                <p className="text-xs text-muted-foreground">Inaktive</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Afventende</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatPrice(stats.avgPrice)}</div>
                <p className="text-xs text-muted-foreground">Gns. pris</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {filters.sellerId && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Søg i annoncer..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-8"
                  />
                </div>
                <Select value={filters.make || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, make: value === 'all' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle mærker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle mærker</SelectItem>
                    {availableMakes.map(make => (
                      <SelectItem key={make} value={make}>{make}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle statusser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statusser</SelectItem>
                    <SelectItem value="active">Aktive</SelectItem>
                    <SelectItem value="inactive">Inaktive</SelectItem>
                    <SelectItem value="pending">Afventende</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Annoncer 
                {filteredListings.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredListings.length}
                  </Badge>
                )}
              </span>
              {filters.sellerId && (
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex items-center gap-2"
                    asChild
                  >
                    <Link to={`/admin/pdf-extraction?seller=${filters.sellerId}`}>
                      <Upload className="h-4 w-4" />
                      Opdater annoncer
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Eksporter
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!filters.sellerId ? (
              <div className="text-center py-8 text-muted-foreground">
                Vælg en sælger for at se deres annoncer
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Indlæser annoncer...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ingen annoncer fundet for valgte kriterier
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Månedlig pris</TableHead>
                      <TableHead>Brændstof</TableHead>
                      <TableHead>Oprettet</TableHead>
                      <TableHead className="text-right">Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.map((listing) => (
                      <TableRow key={listing.listing_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {listing.make} {listing.model}
                            </div>
                            {listing.variant && (
                              <div className="text-sm text-muted-foreground">
                                {listing.variant}
                              </div>
                            )}
                            {listing.year && (
                              <div className="text-xs text-muted-foreground">
                                {listing.year}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              listing.status === 'active' ? 'default' :
                              listing.status === 'pending' ? 'secondary' : 'outline'
                            }
                          >
                            {listing.status === 'active' ? 'Aktiv' :
                             listing.status === 'pending' ? 'Afventende' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(listing.monthly_price)}
                        </TableCell>
                        <TableCell>
                          {listing.fuel_type || '–'}
                        </TableCell>
                        <TableCell>
                          {formatDate(listing.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link to={`/listing/${listing.listing_id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link to={`/admin/listings/edit/${listing.listing_id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminSellerListings