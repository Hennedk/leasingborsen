import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Danish error messages
const errorMessages = {
  saveError: 'Kunne ikke gemme ændringerne',
  createError: 'Der opstod en fejl ved oprettelse',
  updateError: 'Der opstod en fejl ved opdatering',
  deleteError: 'Der opstod en fejl ved sletning',
  notFound: 'Ressourcen blev ikke fundet',
  validationError: 'Ugyldige data - kontroller indtastning',
  unauthorizedError: 'Du har ikke tilladelse til denne handling',
  generalError: 'Der opstod en fejl ved behandling af anmodningen',
  hasReferencesError: 'Kan ikke slette da ressourcen er i brug',
  invalidTableError: 'Ugyldig tabel angivet'
}

// Allowed reference tables for security
const ALLOWED_TABLES = [
  'makes',
  'models', 
  'body_types',
  'fuel_types',
  'transmissions',
  'colours'
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

// Request/response types
interface AdminReferenceRequest {
  operation: 'create' | 'update' | 'delete' | 'bulkDelete'
  table: string
  referenceData?: {
    name: string
    make_id?: string // For models
    slug?: string
    [key: string]: any
  }
  referenceId?: string
  referenceIds?: string[]
}

interface AdminReferenceResponse {
  success: boolean
  reference?: any
  references?: any[]
  referenceId?: string
  error?: string
  validationErrors?: string[]
}

// Validation functions
function validateTable(table: string): table is AllowedTable {
  return ALLOWED_TABLES.includes(table as AllowedTable)
}

function validateReferenceData(data: any, table: AllowedTable): string[] {
  const errors: string[] = []
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Navn er påkrævet')
  }
  
  // Table-specific validation
  switch (table) {
    case 'models':
      if (!data.make_id || typeof data.make_id !== 'string') {
        errors.push('Mærke ID er påkrævet for modeller')
      }
      break
      
    case 'makes':
    case 'body_types':
    case 'fuel_types':
    case 'transmissions':
    case 'colours':
      // Only name is required for these tables
      break
  }
  
  return errors
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'oe')
    .replace(/[å]/g, 'aa')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Database operations
async function createReference(supabase: any, table: AllowedTable, referenceData: any): Promise<AdminReferenceResponse> {
  try {
    // Auto-generate slug if not provided
    const dataWithSlug = {
      ...referenceData,
      slug: referenceData.slug || generateSlug(referenceData.name)
    }
    
    const { data: reference, error: referenceError } = await supabase
      .from(table)
      .insert(dataWithSlug)
      .select()
      .single()
    
    if (referenceError) {
      console.error(`Error creating ${table}:`, referenceError)
      
      // Handle unique constraint violations
      if (referenceError.code === '23505') {
        if (referenceError.message.includes('name')) {
          throw new Error('Dette navn eksisterer allerede')
        }
        if (referenceError.message.includes('slug')) {
          throw new Error('Dette navn genererer en slug der allerede eksisterer')
        }
      }
      
      throw new Error(errorMessages.createError)
    }
    
    console.log(`✅ ${table} created successfully:`, reference.id)
    
    return {
      success: true,
      reference: reference,
      referenceId: reference.id
    }
    
  } catch (error) {
    console.error(`Error in create${table}:`, error)
    return {
      success: false,
      error: error.message || errorMessages.createError
    }
  }
}

async function updateReference(supabase: any, table: AllowedTable, referenceId: string, referenceData: any): Promise<AdminReferenceResponse> {
  try {
    // Check if reference exists
    const { data: existingReference, error: checkError } = await supabase
      .from(table)
      .select('id')
      .eq('id', referenceId)
      .single()
    
    if (checkError || !existingReference) {
      return {
        success: false,
        error: errorMessages.notFound
      }
    }
    
    // Auto-generate slug if name is being updated and slug not provided
    const dataWithSlug = {
      ...referenceData
    }
    
    if (referenceData.name && !referenceData.slug) {
      dataWithSlug.slug = generateSlug(referenceData.name)
    }
    
    // Update reference
    const { data: reference, error: referenceError } = await supabase
      .from(table)
      .update(dataWithSlug)
      .eq('id', referenceId)
      .select()
      .single()
    
    if (referenceError) {
      console.error(`Error updating ${table}:`, referenceError)
      
      // Handle unique constraint violations
      if (referenceError.code === '23505') {
        if (referenceError.message.includes('name')) {
          throw new Error('Dette navn eksisterer allerede')
        }
        if (referenceError.message.includes('slug')) {
          throw new Error('Dette navn genererer en slug der allerede eksisterer')
        }
      }
      
      throw new Error(errorMessages.updateError)
    }
    
    console.log(`✅ ${table} updated successfully:`, referenceId)
    
    return {
      success: true,
      reference: reference,
      referenceId: referenceId
    }
    
  } catch (error) {
    console.error(`Error in update${table}:`, error)
    return {
      success: false,
      error: error.message || errorMessages.updateError
    }
  }
}

async function deleteReference(supabase: any, table: AllowedTable, referenceId: string): Promise<AdminReferenceResponse> {
  try {
    // Check if reference exists
    const { data: existingReference, error: checkError } = await supabase
      .from(table)
      .select('id')
      .eq('id', referenceId)
      .single()
    
    if (checkError || !existingReference) {
      return {
        success: false,
        error: errorMessages.notFound
      }
    }
    
    // Check for references based on table type
    let hasReferences = false
    let referenceCheck
    
    switch (table) {
      case 'makes':
        // Check if make has models or listings
        referenceCheck = await supabase
          .from('models')
          .select('id')
          .eq('make_id', referenceId)
          .limit(1)
        
        if (!referenceCheck.error && referenceCheck.data?.length > 0) {
          hasReferences = true
        } else {
          // Also check listings directly
          referenceCheck = await supabase
            .from('listings')
            .select('id')
            .eq('make_id', referenceId)
            .limit(1)
          
          if (!referenceCheck.error && referenceCheck.data?.length > 0) {
            hasReferences = true
          }
        }
        break
        
      case 'models':
        // Check if model has listings
        referenceCheck = await supabase
          .from('listings')
          .select('id')
          .eq('model_id', referenceId)
          .limit(1)
        
        if (!referenceCheck.error && referenceCheck.data?.length > 0) {
          hasReferences = true
        }
        break
        
      case 'body_types':
        referenceCheck = await supabase
          .from('listings')
          .select('id')
          .eq('body_type_id', referenceId)
          .limit(1)
        
        if (!referenceCheck.error && referenceCheck.data?.length > 0) {
          hasReferences = true
        }
        break
        
      case 'fuel_types':
        referenceCheck = await supabase
          .from('listings')
          .select('id')
          .eq('fuel_type_id', referenceId)
          .limit(1)
        
        if (!referenceCheck.error && referenceCheck.data?.length > 0) {
          hasReferences = true
        }
        break
        
      case 'transmissions':
        referenceCheck = await supabase
          .from('listings')
          .select('id')
          .eq('transmission_id', referenceId)
          .limit(1)
        
        if (!referenceCheck.error && referenceCheck.data?.length > 0) {
          hasReferences = true
        }
        break
        
      case 'colours':
        // Colours might be referenced in multiple places, check listings
        referenceCheck = await supabase
          .from('listings')
          .select('id')
          .eq('colour_id', referenceId)
          .limit(1)
        
        if (!referenceCheck.error && referenceCheck.data?.length > 0) {
          hasReferences = true
        }
        break
    }
    
    if (hasReferences) {
      return {
        success: false,
        error: errorMessages.hasReferencesError
      }
    }
    
    // Delete reference
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', referenceId)
    
    if (deleteError) {
      console.error(`Error deleting ${table}:`, deleteError)
      throw new Error(errorMessages.deleteError)
    }
    
    console.log(`✅ ${table} deleted successfully:`, referenceId)
    
    return {
      success: true,
      referenceId: referenceId
    }
    
  } catch (error) {
    console.error(`Error in delete${table}:`, error)
    return {
      success: false,
      error: error.message || errorMessages.deleteError
    }
  }
}

async function bulkDeleteReferences(supabase: any, table: AllowedTable, referenceIds: string[]): Promise<AdminReferenceResponse> {
  try {
    const deletedReferences: string[] = []
    const failedReferences: string[] = []
    
    // Process each reference individually to check for dependencies
    for (const referenceId of referenceIds) {
      try {
        const result = await deleteReference(supabase, table, referenceId)
        
        if (result.success) {
          deletedReferences.push(referenceId)
        } else {
          console.warn(`${table} ${referenceId} deletion failed:`, result.error)
          failedReferences.push(referenceId)
        }
        
      } catch (error) {
        console.error(`Error processing ${table} ${referenceId}:`, error)
        failedReferences.push(referenceId)
      }
    }
    
    console.log(`✅ Bulk delete completed: ${deletedReferences.length} deleted, ${failedReferences.length} failed`)
    
    return {
      success: true,
      references: {
        deleted: deletedReferences,
        failed: failedReferences
      }
    }
    
  } catch (error) {
    console.error(`Error in bulkDelete${table}:`, error)
    return {
      success: false,
      error: error.message || errorMessages.deleteError
    }
  }
}

// Main handler
serve(async (req) => {
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
    const request: AdminReferenceRequest = await req.json()
    const { operation, table, referenceData, referenceId, referenceIds } = request
    
    console.log(`[admin-reference-operations] Processing ${operation} operation on ${table}`)
    
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!table || !validateTable(table)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessages.invalidTableError,
          validationErrors: [`Ugyldig tabel: ${table}. Tilladte tabeller: ${ALLOWED_TABLES.join(', ')}`]
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Route operation
    let result: AdminReferenceResponse
    
    switch (operation) {
      case 'create': {
        if (!referenceData) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Reference data er påkrævet for oprettelse']
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        const validationErrors = validateReferenceData(referenceData, table)
        
        if (validationErrors.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await createReference(supabase, table, referenceData)
        break
      }
      
      case 'update': {
        if (!referenceId) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Reference ID er påkrævet for opdatering']
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        if (!referenceData) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Reference data er påkrævet for opdatering']
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        const validationErrors = validateReferenceData(referenceData, table)
        
        if (validationErrors.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await updateReference(supabase, table, referenceId, referenceData)
        break
      }
      
      case 'delete': {
        if (!referenceId) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Reference ID er påkrævet for sletning']
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await deleteReference(supabase, table, referenceId)
        break
      }
      
      case 'bulkDelete': {
        if (!referenceIds || !Array.isArray(referenceIds) || referenceIds.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessages.validationError,
              validationErrors: ['Reference IDs er påkrævet for bulk sletning']
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        result = await bulkDeleteReferences(supabase, table, referenceIds)
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
    console.error('[admin-reference-operations] Unexpected error:', error)
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