import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { withAdminAuth, type AuthResult } from '../_shared/authMiddleware.ts'

// Danish error messages
const errorMessages = {
  saveError: 'Kunne ikke gemme ændringerne',
  createError: 'Der opstod en fejl ved oprettelse af sælger',
  updateError: 'Der opstod en fejl ved opdatering af sælger',
  deleteError: 'Der opstod en fejl ved sletning af sælger',
  notFound: 'Sælgeren blev ikke fundet',
  validationError: 'Ugyldige data - kontroller indtastning',
  unauthorizedError: 'Du har ikke tilladelse til denne handling',
  generalError: 'Der opstod en fejl ved behandling af anmodningen',
  hasListingsError: 'Kan ikke slette sælger med eksisterende annoncer'
}

// Request/response types
interface SellerPDFUrl {
  name: string
  url: string
}

interface AdminSellerRequest {
  operation: 'create' | 'update' | 'delete' | 'bulkDelete'
  sellerData?: {
    name: string
    email?: string
    phone?: string
    company?: string
    address?: string
    country?: string
    logo_url?: string
    pdf_url?: string
    pdf_urls?: SellerPDFUrl[]
    make_id?: string
  }
  sellerId?: string
  sellerIds?: string[]
}

interface AdminSellerResponse {
  success: boolean
  seller?: any
  sellers?: any[]
  sellerId?: string
  error?: string
  validationErrors?: string[]
}

// Validation functions
function validateSellerData(data: any): string[] {
  const errors: string[] = []
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Navn er påkrævet')
  }
  
  if (data.email && data.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      errors.push('Ugyldig e-mail adresse')
    }
  }
  
  if (data.logo_url && data.logo_url.trim() !== '') {
    try {
      new URL(data.logo_url)
    } catch {
      errors.push('Ugyldig logo URL')
    }
  }
  
  if (data.pdf_url && data.pdf_url.trim() !== '') {
    try {
      new URL(data.pdf_url)
    } catch {
      errors.push('Ugyldig PDF URL')
    }
  }
  
  if (data.pdf_urls && Array.isArray(data.pdf_urls)) {
    data.pdf_urls.forEach((pdfUrl: any, index: number) => {
      if (!pdfUrl.name || typeof pdfUrl.name !== 'string' || pdfUrl.name.trim().length === 0) {
        errors.push(`PDF URL ${index + 1}: Navn er påkrævet`)
      }
      if (!pdfUrl.url || typeof pdfUrl.url !== 'string') {
        errors.push(`PDF URL ${index + 1}: URL er påkrævet`)
      } else {
        try {
          new URL(pdfUrl.url)
        } catch {
          errors.push(`PDF URL ${index + 1}: Ugyldig URL`)
        }
      }
    })
  }
  
  return errors
}

// Database operations
async function createSeller(supabase: any, sellerData: any): Promise<AdminSellerResponse> {
  try {
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .insert(sellerData)
      .select()
      .single()
    
    if (sellerError) {
      console.error('Error creating seller:', sellerError)
      throw new Error(errorMessages.createError)
    }
    
    console.log('✅ Seller created successfully:', seller.id)
    
    return {
      success: true,
      seller: seller,
      sellerId: seller.id
    }
    
  } catch (error) {
    console.error('Error in createSeller:', error)
    return {
      success: false,
      error: error.message || errorMessages.createError
    }
  }
}

async function updateSeller(supabase: any, sellerId: string, sellerData: any): Promise<AdminSellerResponse> {
  try {
    // Check if seller exists
    const { data: existingSeller, error: checkError } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', sellerId)
      .single()
    
    if (checkError || !existingSeller) {
      return {
        success: false,
        error: errorMessages.notFound
      }
    }
    
    // Update seller
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .update(sellerData)
      .eq('id', sellerId)
      .select()
      .single()
    
    if (sellerError) {
      console.error('Error updating seller:', sellerError)
      throw new Error(errorMessages.updateError)
    }
    
    console.log('✅ Seller updated successfully:', sellerId)
    
    return {
      success: true,
      seller: seller,
      sellerId: sellerId
    }
    
  } catch (error) {
    console.error('Error in updateSeller:', error)
    return {
      success: false,
      error: error.message || errorMessages.updateError
    }
  }
}

async function deleteSeller(supabase: any, sellerId: string): Promise<AdminSellerResponse> {
  try {
    // Check if seller exists
    const { data: existingSeller, error: checkError } = await supabase
      .from('sellers')
      .select('id')
      .eq('id', sellerId)
      .single()
    
    if (checkError || !existingSeller) {
      return {
        success: false,
        error: errorMessages.notFound
      }
    }
    
    // Check if seller has any listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id')
      .eq('seller_id', sellerId)
      .limit(1)
    
    if (listingsError) {
      console.error('Error checking seller listings:', listingsError)
      throw new Error('Kunne ikke kontrollere sælgerens annoncer')
    }
    
    if (listings && listings.length > 0) {
      return {
        success: false,
        error: errorMessages.hasListingsError
      }
    }
    
    // Delete seller
    const { error: deleteError } = await supabase
      .from('sellers')
      .delete()
      .eq('id', sellerId)
    
    if (deleteError) {
      console.error('Error deleting seller:', deleteError)
      throw new Error(errorMessages.deleteError)
    }
    
    console.log('✅ Seller deleted successfully:', sellerId)
    
    return {
      success: true,
      sellerId: sellerId
    }
    
  } catch (error) {
    console.error('Error in deleteSeller:', error)
    return {
      success: false,
      error: error.message || errorMessages.deleteError
    }
  }
}

async function bulkDeleteSellers(supabase: any, sellerIds: string[]): Promise<AdminSellerResponse> {
  try {
    const deletedSellers: string[] = []
    const failedSellers: string[] = []
    
    // Process each seller individually to check for listings
    for (const sellerId of sellerIds) {
      try {
        // Check if seller has any listings
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('id')
          .eq('seller_id', sellerId)
          .limit(1)
        
        if (listingsError) {
          console.error(`Error checking listings for seller ${sellerId}:`, listingsError)
          failedSellers.push(sellerId)
          continue
        }
        
        if (listings && listings.length > 0) {
          console.warn(`Seller ${sellerId} has listings, skipping delete`)
          failedSellers.push(sellerId)
          continue
        }
        
        // Delete seller
        const { error: deleteError } = await supabase
          .from('sellers')
          .delete()
          .eq('id', sellerId)
        
        if (deleteError) {
          console.error(`Error deleting seller ${sellerId}:`, deleteError)
          failedSellers.push(sellerId)
        } else {
          deletedSellers.push(sellerId)
        }
        
      } catch (error) {
        console.error(`Error processing seller ${sellerId}:`, error)
        failedSellers.push(sellerId)
      }
    }
    
    console.log(`✅ Bulk delete completed: ${deletedSellers.length} deleted, ${failedSellers.length} failed`)
    
    return {
      success: true,
      sellers: {
        deleted: deletedSellers,
        failed: failedSellers
      }
    }
    
  } catch (error) {
    console.error('Error in bulkDeleteSellers:', error)
    return {
      success: false,
      error: error.message || errorMessages.deleteError
    }
  }
}

// Main handler with admin authentication
const adminSellerHandler = async (req: Request, authResult: AuthResult): Promise<Response> => {
  try {
    const { supabase, user } = authResult
    
    // Parse request
    const request: AdminSellerRequest = await req.json()
    const { operation, sellerData, sellerId, sellerIds } = request
    
    console.log(`[admin-seller-operations] Processing ${operation} operation for user: ${user.email}`)
    
    // Validate request
    if (!operation) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessages.validationError,
          validationErrors: ['Operation er påkrævet']
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Route operation
    let result: AdminSellerResponse
    
    switch (operation) {
      case 'create': {
        if (!sellerData) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Sælger data er påkrævet for oprettelse']
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        const validationErrors = validateSellerData(sellerData)
        
        if (validationErrors.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await createSeller(supabase, sellerData)
        break
      }
      
      case 'update': {
        if (!sellerId) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Sælger ID er påkrævet for opdatering']
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        if (!sellerData) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Sælger data er påkrævet for opdatering']
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        const validationErrors = validateSellerData(sellerData)
        
        if (validationErrors.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await updateSeller(supabase, sellerId, sellerData)
        break
      }
      
      case 'delete': {
        if (!sellerId) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Sælger ID er påkrævet for sletning']
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await deleteSeller(supabase, sellerId)
        break
      }
      
      case 'bulkDelete': {
        if (!sellerIds || !Array.isArray(sellerIds) || sellerIds.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Sælger IDs er påkrævet for bulk sletning']
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await bulkDeleteSellers(supabase, sellerIds)
        break
      }
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Ugyldig operation: ${operation}` 
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
    }
    
    // Return result
    const statusCode = result.success ? 200 : 400
    return new Response(
      JSON.stringify(result),
      { 
        status: statusCode, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('[admin-seller-operations] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessages.generalError 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}

// Wrap the handler with admin authentication middleware
serve(withAdminAuth(adminSellerHandler))
