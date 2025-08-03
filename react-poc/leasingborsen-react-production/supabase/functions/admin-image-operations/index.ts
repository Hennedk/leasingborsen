import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Danish error messages
const errorMessages = {
  uploadError: 'Der opstod en fejl ved upload af billeder',
  deleteError: 'Der opstod en fejl ved sletning af billede',
  updateError: 'Der opstod en fejl ved opdatering af billeder',
  validationError: 'Ugyldige data - kontroller billede format',
  notFound: 'Billedet blev ikke fundet',
  unauthorizedError: 'Du har ikke tilladelse til denne handling',
  generalError: 'Der opstod en fejl ved behandling af billeder'
}

// Request/response types
interface AdminImageRequest {
  operation: 'upload' | 'delete' | 'updateListingImages' | 'processBackground'
  listingId?: string
  imageUrl?: string
  imageUrls?: string[]
  imageData?: {
    file: string // Base64 encoded file
    fileName: string
    contentType: string
  }
  processBackground?: boolean
}

interface AdminImageResponse {
  success: boolean
  imageUrl?: string
  imageUrls?: string[]
  processedImageUrl?: string
  error?: string
}

// Helper functions
function validateImageFile(contentType: string, fileName: string): string[] {
  const errors: string[] = []
  
  // Allowed image types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(contentType.toLowerCase())) {
    errors.push('Kun JPEG, PNG og WebP billeder er tilladt')
  }
  
  // File extension validation
  const extension = fileName.toLowerCase().split('.').pop()
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']
  if (!extension || !allowedExtensions.includes(extension)) {
    errors.push('Ugyldigt filformat - brug .jpg, .jpeg, .png eller .webp')
  }
  
  return errors
}

function generateImagePath(fileName: string, listingId?: string): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const extension = fileName.split('.').pop()
  
  if (listingId) {
    return `listings/${listingId}/${timestamp}_${randomSuffix}.${extension}`
  } else {
    return `temp/${timestamp}_${randomSuffix}.${extension}`
  }
}

// Image operations
async function uploadImage(supabase: any, imageData: any): Promise<AdminImageResponse> {
  try {
    const { file, fileName, contentType } = imageData
    
    // Validate image
    const validationErrors = validateImageFile(contentType, fileName)
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join(', ')
      }
    }
    
    // Convert base64 to Uint8Array
    const base64Data = file.split(',')[1] || file
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Generate storage path
    const storagePath = generateImagePath(fileName)
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, bytes, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(errorMessages.uploadError)
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath)
    
    const imageUrl = urlData.publicUrl
    
    console.log('✅ Image uploaded successfully:', storagePath)
    
    return {
      success: true,
      imageUrl: imageUrl
    }
    
  } catch (error) {
    console.error('Error in uploadImage:', error)
    return {
      success: false,
      error: error.message || errorMessages.uploadError
    }
  }
}

async function deleteImage(supabase: any, imageUrl: string): Promise<AdminImageResponse> {
  try {
    // Extract storage path from URL
    const url = new URL(imageUrl)
    const pathSegments = url.pathname.split('/')
    const storageIndex = pathSegments.indexOf('images')
    
    if (storageIndex === -1) {
      throw new Error('Ugyldig billede URL')
    }
    
    const storagePath = pathSegments.slice(storageIndex + 1).join('/')
    
    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([storagePath])
    
    if (deleteError) {
      console.error('Storage delete error:', deleteError)
      throw new Error(errorMessages.deleteError)
    }
    
    console.log('✅ Image deleted successfully:', storagePath)
    
    return {
      success: true
    }
    
  } catch (error) {
    console.error('Error in deleteImage:', error)
    return {
      success: false,
      error: error.message || errorMessages.deleteError
    }
  }
}

async function updateListingImages(supabase: any, listingId: string, imageUrls: string[]): Promise<AdminImageResponse> {
  try {
    // Update listing with new image URLs
    // For now, we'll store the first image as the primary image
    const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null
    const allImages = imageUrls
    
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        image: primaryImage,
        images: allImages, // Store all images in JSONB array
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', listingId)
    
    if (updateError) {
      console.error('Error updating listing images:', updateError)
      throw new Error(errorMessages.updateError)
    }
    
    console.log('✅ Listing images updated successfully:', listingId)
    
    return {
      success: true,
      imageUrls: imageUrls
    }
    
  } catch (error) {
    console.error('Error in updateListingImages:', error)
    return {
      success: false,
      error: error.message || errorMessages.updateError
    }
  }
}

async function processBackground(supabase: any, imageUrl: string): Promise<AdminImageResponse> {
  try {
    console.log('🎨 Starting background removal for:', imageUrl)
    
    // Fetch the image from URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`)
    }
    
    // Get the array buffer
    const arrayBuffer = await imageResponse.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    
    // Robust base64 conversion for large files
    let base64String = ''
    const chunkSize = 32768 // 32KB chunks to avoid call stack issues
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize)
      base64String += String.fromCharCode.apply(null, Array.from(chunk))
    }
    
    // Use Deno's btoa for final encoding
    base64String = btoa(base64String)
    
    // Get content type and create data URL
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const imageData = `data:${contentType};base64,${base64String}`
    
    // Extract filename from URL
    const urlPath = new URL(imageUrl).pathname
    const fileName = urlPath.split('/').pop() || 'image.jpg'
    
    console.log('📤 Calling remove-bg with:', {
      fileName,
      dataLength: imageData.length,
      contentType,
      imageDataPreview: imageData.substring(0, 100) + '...'
    })
    
    // Call remove-bg with correct format
    const requestBody = { 
      imageData,
      fileName 
    };
    
    console.log('📤 Request body structure:', {
      hasImageData: !!requestBody.imageData,
      hasFileName: !!requestBody.fileName,
      bodyKeys: Object.keys(requestBody)
    });
    
    const { data: bgData, error: bgError } = await supabase.functions.invoke('remove-bg', {
      body: requestBody
    })
    
    if (bgError) {
      console.error('❌ Background removal Edge Function error:', bgError)
      throw new Error(`Baggrunds fjernelse fejlede: ${bgError.message}`)
    }
    
    if (!bgData?.success) {
      console.error('❌ Background removal failed:', bgData)
      throw new Error(bgData?.error || 'Baggrunds behandling fejlede')
    }
    
    console.log('✅ Background removal completed:', {
      processed: bgData.processed,
      standardized: bgData.standardizedImages
    })
    
    // Return the high-quality detail image if available, otherwise processed
    const processedUrl = bgData.standardizedImages?.detail?.url || bgData.processed
    
    return {
      success: true,
      processedImageUrl: processedUrl
    }
    
  } catch (error) {
    console.error('❌ Error in processBackground:', error)
    return {
      success: false,
      error: error.message || 'Der opstod en fejl ved baggrunds behandling'
    }
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
      // Initialize Supabase with service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration')
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Parse request
      const request: AdminImageRequest = await req.json()
      const { operation, listingId, imageUrl, imageUrls, imageData, processBackground: shouldProcessBackground } = request
      
      console.log(`[admin-image-operations] Processing ${operation} operation`)
      
      // Validate request
      if (!operation) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: errorMessages.validationError
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      // Route operation
      let result: AdminImageResponse
      
      switch (operation) {
        case 'upload': {
          if (!imageData) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Billede data er påkrævet for upload'
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          result = await uploadImage(supabase, imageData)
          
          // If background processing is requested and upload was successful
          if (result.success && shouldProcessBackground === true && result.imageUrl) {
            console.log('🎨 Background processing requested')
            const bgResult = await processBackground(supabase, result.imageUrl)
            
            if (bgResult.success && bgResult.processedImageUrl) {
              result.processedImageUrl = bgResult.processedImageUrl
              console.log('✅ Background removed successfully')
            } else {
              // Make error more visible
              console.error('⚠️ Background processing failed:', bgResult.error)
              // Still return success but with a flag
              result.backgroundProcessingFailed = true
              result.backgroundProcessingError = bgResult.error
            }
          }
          
          break
        }
        
        case 'delete': {
          if (!imageUrl) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Billede URL er påkrævet for sletning'
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          result = await deleteImage(supabase, imageUrl)
          break
        }
        
        case 'updateListingImages': {
          if (!listingId || !imageUrls) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Listing ID og billede URLs er påkrævet for opdatering'
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          result = await updateListingImages(supabase, listingId, imageUrls)
          break
        }
        
        case 'processBackground': {
          if (!imageUrl) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Billede URL er påkrævet for baggrunds behandling'
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          result = await processBackground(supabase, imageUrl)
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
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
      }
      
      // Return result
      const statusCode = result.success ? 200 : 400
      return new Response(
        JSON.stringify(result),
        { 
          status: statusCode, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
      
  } catch (error) {
    console.error('[admin-image-operations] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessages.generalError 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})