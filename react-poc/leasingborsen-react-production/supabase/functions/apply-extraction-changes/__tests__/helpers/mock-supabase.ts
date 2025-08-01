export type TestDatabase = Map<string, Map<string, any>>

export function createMockSupabaseClient(database: TestDatabase) {
  return {
    from: (table: string) => ({
      select: (fields?: string) => ({
        eq: (field: string, value: any) => ({
          single: async () => {
            const tableData = database.get(table)
            if (!tableData) return { data: null, error: new Error("Table not found") }
            
            const record = Array.from(tableData.values()).find(r => r[field] === value)
            return { data: record || null, error: record ? null : new Error("Not found") }
          }
        }),
        in: (field: string, values: any[]) => ({
          data: Array.from(database.get(table)?.values() || [])
            .filter(r => values.includes(r[field])),
          error: null
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            const id = crypto.randomUUID()
            const record = { id, ...data }
            database.get(table)?.set(id, record)
            return { data: record, error: null }
          }
        })
      }),
      update: (data: any) => ({
        eq: (field: string, value: any) => ({
          data: data,
          error: null
        })
      }),
      delete: () => ({
        eq: (field: string, value: any) => ({
          data: null,
          error: null
        })
      })
    }),
    
    rpc: async (fnName: string, params: any) => {
      if (fnName === "apply_selected_extraction_changes") {
        return mockApplyChangesFunction(database, params)
      }
      throw new Error(`Unknown RPC function: ${fnName}`)
    }
  }
}

function mockApplyChangesFunction(database: TestDatabase, params: any) {
  const { p_session_id, p_selected_change_ids, p_applied_by } = params
  
  const results = {
    applied_creates: 0,
    applied_updates: 0,
    applied_deletes: 0,
    discarded_count: 0,
    total_processed: p_selected_change_ids.length,
    error_count: 0,
    errors: [] as any[],
    session_id: p_session_id,
    applied_by: p_applied_by,
    applied_at: new Date().toISOString(),
  }
  
  // Process each selected change
  p_selected_change_ids.forEach((changeId: string) => {
    const change = database.get("extraction_listing_changes")?.get(changeId)
    if (!change) {
      results.error_count++
      results.errors.push({
        change_id: changeId,
        change_type: 'unknown',
        error: 'Change not found',
      })
      return
    }

    try {
      switch (change.change_type) {
        case 'create':
          // Create new listing
          const newListingId = crypto.randomUUID()
          const newListing = {
            id: newListingId,
            ...change.extracted_data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          database.get("listings")?.set(newListingId, newListing)
          
          // Create lease pricing if offers exist
          if (change.extracted_data.offers) {
            change.extracted_data.offers.forEach((offer: any) => {
              const pricingId = crypto.randomUUID()
              database.get("lease_pricing")?.set(pricingId, {
                id: pricingId,
                listing_id: newListingId,
                ...offer
              })
            })
          }
          
          results.applied_creates++
          break
          
        case 'update':
          if (!change.existing_listing_id) {
            throw new Error('No existing listing ID for update')
          }
          
          const existingListing = database.get("listings")?.get(change.existing_listing_id)
          if (!existingListing) {
            throw new Error('Existing listing not found')
          }
          
          // Update the listing
          const updatedListing = {
            ...existingListing,
            ...change.extracted_data,
            updated_at: new Date().toISOString()
          }
          database.get("listings")?.set(change.existing_listing_id, updatedListing)
          
          results.applied_updates++
          break
          
        case 'delete':
          if (!change.existing_listing_id) {
            throw new Error('No existing listing ID for delete')
          }
          
          // Delete related lease pricing first (cascade)
          const pricingToDelete = Array.from(database.get("lease_pricing")?.entries() || [])
            .filter(([_, pricing]) => pricing.listing_id === change.existing_listing_id)
          
          pricingToDelete.forEach(([pricingId, _]) => {
            database.get("lease_pricing")?.delete(pricingId)
          })
          
          // Clear all foreign key references
          const allChanges = Array.from(database.get("extraction_listing_changes")?.values() || [])
          allChanges.forEach(otherChange => {
            if (otherChange.existing_listing_id === change.existing_listing_id) {
              otherChange.existing_listing_id = null
            }
          })
          
          // Delete the listing
          database.get("listings")?.delete(change.existing_listing_id)
          
          results.applied_deletes++
          break
          
        default:
          throw new Error(`Unknown change type: ${change.change_type}`)
      }
      
      // Mark change as applied
      change.change_status = 'applied'
      change.applied_at = new Date().toISOString()
      change.applied_by = p_applied_by
      
    } catch (error) {
      results.error_count++
      results.errors.push({
        change_id: changeId,
        change_type: change.change_type,
        error: error instanceof Error ? error.message : 'Unknown error',
        listing_id: change.existing_listing_id || undefined
      })
    }
  })
  
  return { data: [results], error: null }
}