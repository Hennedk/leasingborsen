import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface ExtractedCar {
  make: string
  model: string
  variant: string
  horsepower?: number
  engine_info?: string
  fuel_type?: string
  transmission?: string
  body_type?: string
  seats?: number
  doors?: number
  year?: number
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  offers?: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
}

export interface ListingMatch {
  extracted?: ExtractedCar
  existing?: {
    id: string
    make: string
    model: string
    variant: string
    [key: string]: any
  }
  matchType: 'exact' | 'fuzzy' | 'unmatched'
  confidence: number
  changeType: 'create' | 'update' | 'unchanged' | 'delete'
  changes?: Record<string, { old: any; new: any }>
}

export interface ComparisonSummary {
  totalExtracted: number
  totalExisting: number
  totalMatched: number
  totalNew: number
  totalUpdated: number
  totalUnchanged: number
  totalDeleted: number
  exactMatches: number
  fuzzyMatches: number
}

export interface ExtractionSession {
  id: string
  session_name: string
  seller_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extraction_type: 'create' | 'update'
  total_extracted: number
  total_matched: number
  total_new: number
  total_updated: number
  total_unchanged: number
  total_deleted: number
  created_at: string
  reviewed_at?: string
  applied_at?: string
}

export interface ListingChange {
  id: string
  session_id: string
  existing_listing_id?: string
  change_type: 'create' | 'update' | 'delete' | 'unchanged'
  change_status: 'pending' | 'approved' | 'rejected' | 'applied' | 'discarded'
  confidence_score?: number
  extracted_data: any
  field_changes?: Record<string, { old: any; new: any }>
  change_summary?: string
  match_method?: 'exact' | 'fuzzy' | 'manual' | 'unmatched'
  match_details?: any
  reviewed_at?: string
  review_notes?: string
}

/**
 * Hook for getting extraction sessions
 */
export const useExtractionSessions = (sellerId?: string) => {
  return useQuery({
    queryKey: ['extraction-sessions', sellerId],
    queryFn: async () => {
      let query = supabase
        .from('extraction_session_summary')
        .select('*')
        .order('created_at', { ascending: false })

      if (sellerId) {
        query = query.eq('seller_id', sellerId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as ExtractionSession[]
    }
  })
}

/**
 * Hook for getting changes for a session
 */
export const useSessionChanges = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['session-changes', sessionId],
    queryFn: async () => {
      if (!sessionId) return []

      const { data, error } = await supabase
        .from('extraction_listing_changes')
        .select('*')
        .eq('session_id', sessionId)
        .order('change_type')

      if (error) throw error
      return data as ListingChange[]
    },
    enabled: !!sessionId
  })
}

/**
 * Hook for comparing extracted listings with existing ones
 */
export const useListingComparison = () => {
  const queryClient = useQueryClient()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Compare extracted listings with existing ones
  const compareListingsMutation = useMutation({
    mutationFn: async ({
      extractedCars,
      sellerId,
      sessionName
    }: {
      extractedCars: ExtractedCar[]
      sellerId: string
      sessionName?: string
    }) => {
      // Call the comparison edge function
      const { data, error } = await supabase.functions.invoke('compare-extracted-listings', {
        body: { extractedCars, sellerId, sessionName }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      return {
        matches: data.matches as ListingMatch[],
        summary: data.summary as ComparisonSummary
      }
    },
    onSuccess: () => {
      toast.success('Sammenligning fuldført')
    },
    onError: (error) => {
      console.error('Comparison error:', error)
      toast.error('Fejl ved sammenligning', {
        description: error instanceof Error ? error.message : 'Ukendt fejl'
      })
    }
  })

  // Create a new extraction session
  const createSessionMutation = useMutation({
    mutationFn: async ({
      sessionName,
      pdfUrl,
      sellerId,
      extractionType = 'update',
      comparisonResult
    }: {
      sessionName: string
      pdfUrl: string
      sellerId: string
      extractionType?: 'create' | 'update'
      comparisonResult: {
        matches: ListingMatch[]
        summary: ComparisonSummary
      }
    }) => {
      // Create the session
      const { data: session, error: sessionError } = await supabase
        .from('extraction_sessions')
        .insert({
          session_name: sessionName,
          pdf_url: pdfUrl,
          seller_id: sellerId,
          extraction_type: extractionType,
          status: 'processing',
          total_extracted: comparisonResult.summary.totalExtracted,
          total_matched: comparisonResult.summary.totalMatched,
          total_new: comparisonResult.summary.totalNew,
          total_updated: comparisonResult.summary.totalUpdated,
          total_unchanged: comparisonResult.summary.totalUnchanged,
          total_deleted: comparisonResult.summary.totalDeleted,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Create listing changes
      const changes = comparisonResult.matches.map(match => ({
        session_id: session.id,
        existing_listing_id: match.existing?.id || null,
        change_type: match.changeType,
        change_status: 'pending' as const,
        confidence_score: match.confidence,
        extracted_data: match.extracted || {},
        field_changes: match.changes || null,
        change_summary: generateChangeSummary(match),
        match_method: match.matchType || 'unmatched',
        match_details: {
          matchType: match.matchType,
          confidence: match.confidence
        }
      }))

      const { error: changesError } = await supabase
        .from('extraction_listing_changes')
        .insert(changes)

      if (changesError) throw changesError

      // Update session status
      const { error: updateError } = await supabase
        .from('extraction_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (updateError) throw updateError

      return session
    },
    onSuccess: (session) => {
      setCurrentSessionId(session.id)
      queryClient.invalidateQueries({ queryKey: ['extraction-sessions'] })
      toast.success('Extraction session oprettet', {
        description: `${session.total_new} nye, ${session.total_updated} opdateringer, ${session.total_deleted} sletninger`
      })
    },
    onError: (error) => {
      console.error('Session creation error:', error)
      toast.error('Fejl ved oprettelse af session')
    }
  })


  // Update change status
  const updateChangeStatusMutation = useMutation({
    mutationFn: async ({
      changeId,
      status,
      reviewNotes
    }: {
      changeId: string
      status: 'approved' | 'rejected'
      reviewNotes?: string
    }) => {
      const { error } = await supabase
        .from('extraction_listing_changes')
        .update({
          change_status: status,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
        .eq('id', changeId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-changes'] })
      toast.success('Status opdateret')
    }
  })

  // Bulk update change statuses
  const bulkUpdateChangesMutation = useMutation({
    mutationFn: async ({
      changeIds,
      status
    }: {
      changeIds: string[]
      status: 'approved' | 'rejected'
    }) => {
      const { error } = await supabase
        .from('extraction_listing_changes')
        .update({
          change_status: status,
          reviewed_at: new Date().toISOString()
        })
        .in('id', changeIds)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-changes'] })
      toast.success('Status opdateret for valgte ændringer')
    }
  })

  // Apply approved changes
  const applyChangesMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .rpc('apply_extraction_session_changes', {
          p_session_id: sessionId,
          p_applied_by: 'admin' // TODO: Get from auth context
        })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['extraction-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['listing'] }) // Invalidate individual listing caches
      queryClient.invalidateQueries({ queryKey: ['admin', 'listing'], type: 'all' }) // Invalidate all admin listing caches
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] }) // Invalidate admin listings list
      
      console.log('Apply changes response:', data)
      
      // Handle the response structure from the PostgreSQL function
      let result
      if (Array.isArray(data) && data.length > 0) {
        result = data[0]
      } else if (data && typeof data === 'object') {
        result = data
      } else {
        console.warn('Unexpected response format:', data)
        toast.success('Ændringer anvendt')
        return
      }
      
      // Check if result has summary property (our function returns this structure)
      if (result.summary) {
        const summary = result.summary
        toast.success('Ændringer anvendt', {
          description: `${summary.creates_applied || 0} oprettet, ${summary.updates_applied || 0} opdateret, ${summary.deletes_applied || 0} slettet`
        })
      } else if (result.applied_creates !== undefined) {
        // Legacy format
        toast.success('Ændringer anvendt', {
          description: `${result.applied_creates} oprettet, ${result.applied_updates} opdateret, ${result.applied_deletes} slettet`
        })
      } else {
        // Fallback
        toast.success('Ændringer anvendt', {
          description: 'Session changes har been successfully applied'
        })
      }
    },
    onError: (error) => {
      console.error('Apply changes error:', error)
      toast.error('Fejl ved anvendelse af ændringer')
    }
  })

  // Apply selected changes (MVP streamlined workflow)
  const applySelectedChangesMutation = useMutation({
    mutationFn: async ({
      sessionId,
      selectedChangeIds,
      appliedBy = 'admin'
    }: {
      sessionId: string
      selectedChangeIds: string[]
      appliedBy?: string
    }) => {
      const { data, error } = await supabase
        .rpc('apply_selected_extraction_changes', {
          p_session_id: sessionId,
          p_selected_change_ids: selectedChangeIds,
          p_applied_by: appliedBy
        })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['extraction-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['listing'] }) // Invalidate individual listing caches
      queryClient.invalidateQueries({ queryKey: ['admin', 'listing'], type: 'all' }) // Invalidate all admin listing caches
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] }) // Invalidate admin listings list
      
      console.log('Apply selected changes response:', data)
      console.log('Response type:', typeof data)
      console.log('Is array:', Array.isArray(data))
      console.log('Response keys:', data ? Object.keys(data) : 'No keys')
      
      // Handle the response structure from the PostgreSQL function
      let result
      if (Array.isArray(data) && data.length > 0) {
        result = data[0]
        console.log('Using array[0] result:', result)
      } else if (data && typeof data === 'object') {
        result = data
        console.log('Using direct object result:', result)
      } else {
        console.warn('Unexpected response format:', data)
        toast.success('Ændringer anvendt og session afsluttet')
        return
      }
      
      // Check if there are any errors in the result
      if (result && result.error) {
        console.error('Function returned error:', result.error)
        toast.error('Fejl ved anvendelse af ændringer', {
          description: result.error
        })
        return
      }
      
      // Display success message with details
      toast.success('Ændringer anvendt og session afsluttet', {
        description: `${result.applied_creates || 0} oprettet, ${result.applied_updates || 0} opdateret, ${result.applied_deletes || 0} slettet, ${result.discarded_count || 0} forkastet`
      })
    },
    onError: (error) => {
      console.error('Apply selected changes error:', error)
      toast.error('Fejl ved anvendelse af valgte ændringer')
    }
  })

  return {
    // Mutations
    compareListings: compareListingsMutation.mutateAsync,
    createSession: createSessionMutation.mutateAsync,
    updateChangeStatus: updateChangeStatusMutation.mutate,
    bulkUpdateChanges: bulkUpdateChangesMutation.mutate,
    applyChanges: applyChangesMutation.mutate,
    applySelectedChanges: applySelectedChangesMutation.mutate,
    
    // State
    currentSessionId,
    setCurrentSessionId,
    
    // Loading states
    isComparing: compareListingsMutation.isPending,
    isCreatingSession: createSessionMutation.isPending,
    isApplyingChanges: applyChangesMutation.isPending,
    isApplyingSelectedChanges: applySelectedChangesMutation.isPending
  }
}

// Helper function to generate a summary of changes
function generateChangeSummary(match: ListingMatch): string {
  if (match.changeType === 'create') {
    return `Ny bil: ${match.extracted?.make} ${match.extracted?.model} ${match.extracted?.variant}`
  }
  
  if (match.changeType === 'delete') {
    return `Slet: ${match.existing?.make} ${match.existing?.model} ${match.existing?.variant}`
  }
  
  if (match.changeType === 'update' && match.changes) {
    const changedFields = Object.keys(match.changes)
    return `Opdater ${changedFields.length} felter: ${changedFields.join(', ')}`
  }
  
  return 'Ingen ændringer'
}