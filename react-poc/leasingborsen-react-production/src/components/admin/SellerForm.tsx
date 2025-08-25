import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useCreateSeller, useUpdateSeller, type CreateSellerData } from '@/hooks/useSellerMutations'
import type { Seller } from '@/hooks/useSellers'
import { useMakes } from '@/hooks/useReferenceData'
import { useNavigate } from '@tanstack/react-router'

const sellerSchema = z.object({
  name: z.string().min(1, 'Navn er påkrævet'),
  email: z.string().email('Ugyldig e-mail adresse').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  logo_url: z.string().url('Ugyldig URL').optional().or(z.literal('')),
  pdf_url: z.string().url('Ugyldig URL').optional().or(z.literal('')),
  pdf_urls: z.array(z.object({
    name: z.string().min(1, 'Navn er påkrævet'),
    url: z.string().url('Ugyldig URL')
  })).optional(),
  make_id: z.string().optional()
})

type SellerFormData = z.infer<typeof sellerSchema>

interface SellerFormProps {
  seller?: Seller
  isEditing?: boolean
}

const SellerForm = React.memo<SellerFormProps>(({ 
  seller, 
  isEditing = false 
}) => {
  const navigate = useNavigate()
  const createMutation = useCreateSeller()
  const updateMutation = useUpdateSeller()
  const { data: makes, isLoading: makesLoading } = useMakes()

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      name: seller?.name || '',
      email: seller?.email || '',
      phone: seller?.phone || '',
      company: seller?.company || '',
      address: seller?.address || '',
      country: seller?.country || 'Denmark',
      logo_url: seller?.logo_url || '',
      pdf_url: seller?.pdf_url || '',
      pdf_urls: seller?.pdf_urls || [],
      make_id: seller?.make_id || 'none'
    }
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const onSubmit = async (data: SellerFormData) => {
    try {
      // Clean empty strings to undefined for optional fields
      const cleanData: CreateSellerData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company: data.company || undefined,
        address: data.address || undefined,
        country: data.country || undefined,
        logo_url: data.logo_url || undefined,
        pdf_url: data.pdf_url || undefined,
        pdf_urls: data.pdf_urls && data.pdf_urls.length > 0 ? data.pdf_urls : undefined,
        make_id: data.make_id && data.make_id !== 'none' ? data.make_id : undefined
      }

      if (isEditing && seller) {
        await updateMutation.mutateAsync({
          id: seller.id,
          ...cleanData
        })
      } else {
        await createMutation.mutateAsync(cleanData)
      }

      // Navigate back to sellers list on success
      navigate({ to: '/admin/sellers' })
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate({ to: '/admin/sellers' })
  }

  const countries = [
    'Denmark',
    'Sweden',
    'Norway',
    'Germany',
    'Netherlands',
    'Belgium',
    'France',
    'United Kingdom',
    'Other'
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til sælgere
          </Button>
          
          <Button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Gemmer...' : (isEditing ? 'Opdater sælger' : 'Opret sælger')}
          </Button>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Grundlæggende Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Navn *</FormLabel>
                    <FormControl>
                      <Input placeholder="f.eks. ABC Bilforhandler" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company */}
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Virksomhed</FormLabel>
                    <FormControl>
                      <Input placeholder="f.eks. ABC ApS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Make Selection */}
            <FormField
              control={form.control}
              name="make_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bilmærke (Specialisering)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vælg bilmærke (valgfrit)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Intet specifikt mærke</SelectItem>
                      {!makesLoading && makes?.map((make) => (
                        <SelectItem key={make.id} value={make.id}>
                          {make.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Kontakt Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="f.eks. kontakt@abc.dk" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="f.eks. +45 12 34 56 78" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="f.eks. Hovedgade 123&#10;2000 Frederiksberg" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Land</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vælg land" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo URL */}
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="f.eks. https://example.com/logo.png" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* PDF Import */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Multiple PDF URLs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>PDF URLs til Prislister</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentPdfUrls = form.getValues('pdf_urls') || []
                    form.setValue('pdf_urls', [...currentPdfUrls, { name: '', url: '' }])
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tilføj PDF URL
                </Button>
              </div>
              
              {form.watch('pdf_urls')?.map((_, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <FormField
                        control={form.control}
                        name={`pdf_urls.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Navn</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="f.eks. VW Personbiler, Audi Q-Series, Erhverv 2024" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`pdf_urls.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL</FormLabel>
                            <FormControl>
                              <Input 
                                type="url" 
                                placeholder="f.eks. https://prislister.volkswagen.dk/leasingpriser" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const currentPdfUrls = form.getValues('pdf_urls') || []
                        form.setValue('pdf_urls', currentPdfUrls.filter((_, i) => i !== index))
                      }}
                      className="mt-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {(!form.watch('pdf_urls') || form.watch('pdf_urls')?.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Ingen PDF URLs tilføjet. Klik "Tilføj PDF URL" for at tilføje prisliste URLs.
                </p>
              )}
              
              <FormDescription>
                Tilføj en eller flere PDF URLs til forhandlerens prislister. 
                Giv hver URL et beskrivende navn for nem identifikation.
              </FormDescription>
            </div>

            {/* Legacy single PDF URL (hidden if pdf_urls exist) */}
            {(!form.watch('pdf_urls') || form.watch('pdf_urls')?.length === 0) && (
              <FormField
                control={form.control}
                name="pdf_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enkelt PDF URL (Legacy)</FormLabel>
                    <FormControl>
                      <Input 
                        type="url" 
                        placeholder="f.eks. https://prislister.volkswagen.dk/leasingpriser" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
          >
            Annuller
          </Button>
          
          <Button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Gemmer...' : (isEditing ? 'Opdater sælger' : 'Opret sælger')}
          </Button>
        </div>
      </form>
    </Form>
  )
})

SellerForm.displayName = 'SellerForm'

export default SellerForm