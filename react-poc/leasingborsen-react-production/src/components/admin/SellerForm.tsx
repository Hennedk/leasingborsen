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
import { Save, ArrowLeft } from 'lucide-react'
import { useCreateSeller, useUpdateSeller, type CreateSellerData } from '@/hooks/useSellerMutations'
import type { Seller } from '@/hooks/useSellers'
import { useNavigate } from 'react-router-dom'

const sellerSchema = z.object({
  name: z.string().min(1, 'Navn er påkrævet'),
  email: z.string().email('Ugyldig e-mail adresse').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  logo_url: z.string().url('Ugyldig URL').optional().or(z.literal(''))
})

type SellerFormData = z.infer<typeof sellerSchema>

interface SellerFormProps {
  seller?: Seller
  isEditing?: boolean
}

const SellerForm: React.FC<SellerFormProps> = ({ 
  seller, 
  isEditing = false 
}) => {
  const navigate = useNavigate()
  const createMutation = useCreateSeller()
  const updateMutation = useUpdateSeller()

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      name: seller?.name || '',
      email: seller?.email || '',
      phone: seller?.phone || '',
      company: seller?.company || '',
      address: seller?.address || '',
      country: seller?.country || 'Denmark',
      logo_url: seller?.logo_url || ''
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
        logo_url: data.logo_url || undefined
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
      navigate('/admin/sellers')
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Form submission error:', error)
    }
  }

  const handleCancel = () => {
    navigate('/admin/sellers')
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
}

export default SellerForm