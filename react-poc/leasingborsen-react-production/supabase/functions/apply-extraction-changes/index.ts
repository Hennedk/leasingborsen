import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Initialize Supabase client with service role for database operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Type definitions for comprehensive change support
interface ApplyChangesRequest {
  sessionId: string
  selectedChangeIds: string[]
  appliedBy?: string
}

interface ChangeError {
  change_id: string
  change_type: 'create' | 'update' | 'delete' | 'unchanged'
  error: string
  listing_id?: string
}

interface ApplyResponse {
  applied_creates: number
  applied_updates: number
  applied_deletes: number
  discarded_count: number
  total_processed: number
  error_count: number
  errors: ChangeError[]
  session_id: string
  applied_by: string
  applied_at: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse and validate request body
    const requestBody: ApplyChangesRequest = await req.json()
    const { sessionId, selectedChangeIds, appliedBy = 'admin' } = requestBody

    // Input validation
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid sessionId',
          details: 'sessionId must be a valid string'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!selectedChangeIds || !Array.isArray(selectedChangeIds) || selectedChangeIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid selectedChangeIds',
          details: 'selectedChangeIds must be a non-empty array of strings'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate that all selectedChangeIds are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const invalidIds = selectedChangeIds.filter(id => !uuidRegex.test(id))
    if (invalidIds.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid change IDs',
          details: `The following IDs are not valid UUIDs: ${invalidIds.join(', ')}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[apply-extraction-changes] Processing session: ${sessionId}`)
    console.log(`[apply-extraction-changes] Selected changes: ${selectedChangeIds.length} items`)
    console.log(`[apply-extraction-changes] Applied by: ${appliedBy}`)

    // Verify session exists and get change summary
    const { data: sessionData, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('id, session_name, seller_id, status, total_extracted')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('[apply-extraction-changes] Session lookup error:', sessionError)
      return new Response(
        JSON.stringify({ 
          error: 'Session not found',
          details: sessionError.message
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[apply-extraction-changes] Session found: ${sessionData.session_name} (${sessionData.status})`)

    // Get change details for logging
    const { data: changeDetails, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('id, change_type, change_status, extracted_data')
      .eq('session_id', sessionId)
      .in('id', selectedChangeIds)

    if (changesError) {
      console.error('[apply-extraction-changes] Changes lookup error:', changesError)
    } else {
      const changeTypeCounts = changeDetails?.reduce((acc, change) => {
        acc[change.change_type] = (acc[change.change_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
      
      console.log(`[apply-extraction-changes] Change types to process:`, changeTypeCounts)
    }

    // Call the PostgreSQL function with service role permissions
    console.log(`[apply-extraction-changes] Calling apply_selected_extraction_changes...`)
    const { data, error } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: selectedChangeIds,
        p_applied_by: appliedBy
      })

    if (error) {
      console.error('[apply-extraction-changes] PostgreSQL function error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Database operation failed',
          details: error.message,
          code: error.code
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process the response from PostgreSQL function
    let result: ApplyResponse
    if (Array.isArray(data) && data.length > 0) {
      result = data[0] as ApplyResponse
    } else if (data && typeof data === 'object') {
      result = data as ApplyResponse
    } else {
      console.warn('[apply-extraction-changes] Unexpected response format:', data)
      return new Response(
        JSON.stringify({ 
          error: 'Unexpected response format from database function',
          details: 'Expected object or array with result data'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log comprehensive results
    console.log(`[apply-extraction-changes] Operation completed successfully:`)
    console.log(`  - Creates applied: ${result.applied_creates}`)
    console.log(`  - Updates applied: ${result.applied_updates}`) 
    console.log(`  - Deletes applied: ${result.applied_deletes}`)
    console.log(`  - Changes discarded: ${result.discarded_count}`)
    console.log(`  - Errors encountered: ${result.error_count}`)
    
    if (result.error_count > 0 && result.errors) {
      console.log(`[apply-extraction-changes] Error details:`)
      result.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.change_type} change ${err.change_id}: ${err.error}`)
      })
    }

    // Return successful response with comprehensive details
    return new Response(
      JSON.stringify({
        success: true,
        result: {
          applied_creates: result.applied_creates,
          applied_updates: result.applied_updates,
          applied_deletes: result.applied_deletes,
          discarded_count: result.discarded_count,
          total_processed: result.total_processed,
          error_count: result.error_count,
          errors: result.errors || [],
          session_id: result.session_id,
          applied_by: result.applied_by,
          applied_at: result.applied_at,
          // Additional metadata for frontend
          session_name: sessionData.session_name,
          seller_id: sessionData.seller_id
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[apply-extraction-changes] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})