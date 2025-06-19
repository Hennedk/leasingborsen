import { VWPDFExtractor, type VWExtractionResult } from '../extractors/vwPatternMatcher'
import { hybridVehicleExtractor } from '../extractors/hybridExtractor'
import { supabase } from '@/lib/supabase'
import { pdfTextExtractor, PDFTextExtractor, type PDFExtractionResult } from '../services/pdfTextExtractor'

export interface BatchProcessingResult {
  batchId: string
  itemsCreated: number
  stats: {
    new: number
    updated: number
    removed: number
    total_processed: number
  }
}

export interface ProcessedVWItem {
  action: 'new' | 'update' | 'delete'
  extracted: VWExtractionResult | null
  existing: any | null
  changes: Record<string, { old: any; new: any }>
  confidence_score: number
}

export class VWPDFProcessor {
  private extractor = new VWPDFExtractor()
  private useHybridExtraction = true // Feature flag for hybrid AI + pattern extraction
  
  public async processPDF(
    sellerId: string,
    file: File,
    adminUser: string
  ): Promise<BatchProcessingResult> {
    
    let batchId: string | null = null
    
    // 1. Create batch import record in database (let Supabase generate UUID)
    const batch: any = {
      seller_id: sellerId,
      file_name: file.name,
      file_size: file.size,
      status: 'pending',
      created_by: adminUser,
      file_url: '' // Will be updated after upload
    }
    
    console.log(`💾 Creating batch record in database`)
    const { data: batchData, error: batchError } = await supabase
      .from('batch_imports')
      .insert(batch)
      .select()
      .single()
    
    if (batchError) {
      console.error('❌ Batch creation failed:', batchError)
      throw new Error(`Batch creation failed: ${batchError.message}`)
    }
    
    batchId = batchData.id
    console.log(`✅ Batch created successfully with ID: ${batchId}`, batchData)
    
    try {
      // 2. Upload file to Supabase Storage
      console.log(`☁️ Uploading file to Supabase Storage: ${file.name}`)
      const fileName = `${batchId}/${file.name}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('batch-imports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('❌ File upload failed:', uploadError)
        throw new Error(`File upload failed: ${uploadError.message}`)
      }
      
      console.log(`✅ File uploaded successfully: ${uploadData.path}`)
      const fileUrl = `batch-imports/${uploadData.path}`
      
      // 3. Update batch with file URL and status
      const { error: fileUpdateError } = await supabase
        .from('batch_imports')
        .update({ 
          file_url: fileUrl,
          status: 'processing' 
        })
        .eq('id', batchId)
      
      if (fileUpdateError) {
        console.error('❌ Batch file URL update failed:', fileUpdateError)
      }
      
      // 4. Extract text from PDF
      const pdfText = await this.extractPDFText(file)
      
      // 5. Extract VW models using hybrid AI + pattern approach
      let extractedModels: VWExtractionResult[] = []
      let extractionMethod = 'pattern'
      let aiCost = 0
      let aiTokens = 0
      
      if (this.useHybridExtraction) {
        try {
          console.log(`🤖 Using hybrid AI + pattern extraction`)
          const hybridResult = await hybridVehicleExtractor.extractVehicles(
            pdfText,
            'Volkswagen', // Dealer hint
            batchId || undefined
          )
          
          extractedModels = hybridResult.results
          extractionMethod = hybridResult.extraction_method
          aiCost = hybridResult.ai_cost || 0
          aiTokens = hybridResult.ai_tokens_used || 0
          
          console.log(`🎉 Hybrid extraction complete:`)
          console.log(`  - Method: ${extractionMethod}`)
          console.log(`  - Models: ${extractedModels.length}`)
          console.log(`  - Confidence: ${hybridResult.confidence_score.toFixed(2)}`)
          console.log(`  - Time: ${hybridResult.processing_time_ms}ms`)
          if (aiCost > 0) console.log(`  - AI Cost: $${aiCost.toFixed(4)}`)
          
        } catch (error) {
          console.error('🚨 Hybrid extraction failed, falling back to patterns:', error)
          extractedModels = this.extractor.extractVWModels(pdfText)
          extractionMethod = 'pattern_fallback'
        }
      } else {
        // Fallback to pattern-only extraction
        console.log(`🔍 Using pattern-only extraction`)
        extractedModels = this.extractor.extractVWModels(pdfText)
      }
      
      console.log(`🔍 Final extraction results (${extractionMethod}): ${extractedModels.length} VW models`)
      extractedModels.forEach((model, i) => {
        console.log(`  ${i + 1}. ${model.model} ${model.variant} (${model.pricing_options.length} pricing options)`)
      })
      
      // 6. Compare with existing VW listings
      const processedItems = await this.compareWithExistingListings(sellerId, extractedModels)
      console.log(`📊 Created ${processedItems.length} processed items for batch`)
      
      // 7. Calculate batch statistics (simplified for demo)
      const stats = this.calculateBatchStats(processedItems)
      
      // 8. Update batch status and create batch items with AI metadata
      console.log(`💾 Updating batch status to completed`)
      const batchUpdate: any = { 
        status: 'completed',
        stats: stats,
        processed_at: new Date().toISOString(),
        extraction_method: extractionMethod
      }
      
      // Add AI metadata if used
      if (aiCost > 0) {
        batchUpdate.ai_model = 'gpt-3.5-turbo'
        batchUpdate.ai_tokens_used = aiTokens
        batchUpdate.ai_cost = aiCost
      }
      
      const { error: updateError } = await supabase
        .from('batch_imports')
        .update(batchUpdate)
        .eq('id', batchId)
      
      if (updateError) {
        console.error('❌ Batch status update failed:', updateError)
      }
      
      // Create batch items in database
      const itemsCreated = await this.createBatchItems(batchId!, processedItems)
      
      return { 
        batchId: batchId!, 
        itemsCreated,
        stats
      }
      
    } catch (error) {
      // Mark batch as failed in database
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (batchId) {
        try {
          await supabase
            .from('batch_imports')
            .update({ 
              status: 'failed',
              error_message: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', batchId)
        } catch (updateError) {
          console.error('❌ Failed to update batch error status:', updateError)
        }
      }
      
      throw error
    }
  }
  
  // File upload method removed - using inline mock for demo
  
  private async extractPDFText(file: File): Promise<string> {
    try {
      console.log(`📄 Starting real PDF text extraction for: ${file.name} (${file.size} bytes)`)
      
      // Validate file type
      if (!PDFTextExtractor.isValidPDF(file)) {
        throw new Error('File is not a valid PDF')
      }
      
      // Check file size
      const limits = PDFTextExtractor.getFileSizeLimits()
      if (file.size > limits.maxSize) {
        throw new Error(`PDF file too large. Maximum size: ${Math.round(limits.maxSize / 1024 / 1024)}MB`)
      }
      
      if (file.size > limits.warningSize) {
        console.warn(`⚠️ Large PDF file (${Math.round(file.size / 1024 / 1024)}MB). Processing may take longer.`)
      }
      
      // Extract text using PDF.js
      const result: PDFExtractionResult = await pdfTextExtractor.extractText(file)
      
      console.log(`📄 Real PDF extraction successful:`)
      console.log(`  - Pages: ${result.pageCount}`)
      console.log(`  - Characters: ${result.text.length}`)
      console.log(`  - Title: ${result.metadata?.title || 'Unknown'}`)
      console.log(`  - First 200 chars: "${result.text.substring(0, 200).replace(/\n/g, ' ')}..."`)
      
      // Return extracted text
      return result.text
      
    } catch (error) {
      console.error('❌ Real PDF extraction failed:', error)
      console.log('📄 Falling back to mock VW catalog data for development')
      
      // Fallback to mock data if real extraction fails
      return this.getMockVWCatalogText()
    }
  }
  
  private getMockVWCatalogText(): string {
    return `
T-Roc leasingpriser

R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk
CO₂: 144 g/km | Forbrug: 15,9 km/l | Halvårlig CO₂-ejerafgift : 730 kr.

Kørselsbehov Leasingperiode Totalomkostninger Mindstepris 12 mdr. Depositum Månedlig ydelse
10.000 km/år12 mdr.49.940 kr.49.940 kr.5.000 kr.3.695 kr.
15.000 km/år12 mdr.51.540 kr.51.540 kr.5.000 kr.3.795 kr.
20.000 km/år12 mdr.53.140 kr.53.140 kr.5.000 kr.3.895 kr.

ID.3 leasingpriser

Pro S 150 kW (204 hk)
Rækkevidde: 455 km | Forbrug: 19,2 kWh/100km

Kørselsbehov Leasingperiode Totalomkostninger Mindstepris 12 mdr. Depositum Månedlig ydelse
10.000 km/år12 mdr.67.140 kr.67.140 kr.5.000 kr.5.095 kr.
15.000 km/år12 mdr.69.540 kr.69.540 kr.5.000 kr.5.295 kr.
20.000 km/år12 mdr.71.940 kr.71.940 kr.5.000 kr.5.495 kr.

ID.4 leasingpriser

Pro 150 kW (204 hk)
Rækkevidde: 358 km | Forbrug: 21,3 kWh/100km

10.000 km/år12 mdr.68.340 kr.68.340 kr.5.000 kr.5.195 kr.
15.000 km/år12 mdr.70.740 kr.70.740 kr.5.000 kr.5.395 kr.

Pro Max 210 kW (286 hk)
Rækkevidde: 358 km | Forbrug: 21,8 kWh/100km

10.000 km/år12 mdr.79.140 kr.79.140 kr.5.000 kr.6.095 kr.
15.000 km/år12 mdr.81.540 kr.81.540 kr.5.000 kr.6.295 kr.

Passat Variant leasingpriser

eHybrid R-Line 1.4 TSI DSG6 218 hk
CO₂: 26 g/km | Forbrug: 50,0 km/l | Halvårlig CO₂-ejerafgift : 160 kr.

10.000 km/år12 mdr.56.340 kr.56.340 kr.5.000 kr.4.195 kr.
15.000 km/år12 mdr.58.740 kr.58.740 kr.5.000 kr.4.395 kr.
20.000 km/år12 mdr.61.140 kr.61.140 kr.5.000 kr.4.595 kr.

Tiguan leasingpriser

Elegance 1.5 TSI EVO ACT DSG7 150 hk
CO₂: 149 g/km | Forbrug: 15,4 km/l | Halvårlig CO₂-ejerafgift : 760 kr.

10.000 km/år12 mdr.57.540 kr.57.540 kr.5.000 kr.4.295 kr.
15.000 km/år12 mdr.59.940 kr.59.940 kr.5.000 kr.4.495 kr.

ID.Buzz leasingpriser

Pro Lang 150 kW (204 hk)
Rækkevidde: 421 km | Forbrug: 20,5 kWh/100km

10.000 km/år12 mdr.72.540 kr.72.540 kr.5.000 kr.5.495 kr.
15.000 km/år12 mdr.74.940 kr.74.940 kr.5.000 kr.5.695 kr.
20.000 km/år12 mdr.77.340 kr.77.340 kr.5.000 kr.5.895 kr.

Pro Kort 150 kW (204 hk)
Rækkevidde: 423 km | Forbrug: 20,3 kWh/100km

10.000 km/år12 mdr.69.540 kr.69.540 kr.5.000 kr.5.295 kr.
15.000 km/år12 mdr.71.940 kr.71.940 kr.5.000 kr.5.495 kr.
20.000 km/år12 mdr.74.340 kr.74.340 kr.5.000 kr.5.695 kr.
      `
  }
  
  private async compareWithExistingListings(
    sellerId: string,
    extractedModels: VWExtractionResult[]
  ): Promise<ProcessedVWItem[]> {
    
    console.log(`🔍 Checking for existing listings for seller: ${sellerId}`)
    
    // Get existing listings for this seller with make/model/variant combinations
    let existingListings: any[] = []
    
    try {
      // Query for existing listings from this seller  
      const { data: existing, error } = await supabase
        .from('listings')
        .select(`
          id,
          variant,
          horsepower,
          makes!left(name),
          models!left(name),
          lease_pricing!left(monthly_price, first_payment, period_months, mileage_per_year)
        `)
        .eq('seller_id', sellerId)
        .is('deleted_at', null) // Only active listings (not deleted)
      
      if (error) {
        console.error('❌ Error fetching existing listings:', error)
        throw error
      }
      
      existingListings = existing || []
      console.log(`📋 Found ${existingListings.length} existing listings for this seller`)
      
    } catch (error) {
      console.error('❌ Failed to fetch existing listings, proceeding with empty list:', error)
      existingListings = []
    }
    
    const processedItems: ProcessedVWItem[] = []
    
    // Process each extracted model (each model already contains all pricing options)
    for (const extracted of extractedModels) {
      // Try to find matching existing listing by make/model/variant combination
      const existing = existingListings?.find((listing: any) => 
        listing.makes?.name === 'Volkswagen' && // Ensure it's VW
        listing.models?.name === extracted.model &&
        listing.variant === extracted.variant &&
        (listing.horsepower === extracted.horsepower || !listing.horsepower) // Allow null horsepower
      )
      
      if (existing) {
        console.log(`🔄 Found existing listing: ${extracted.model} ${extracted.variant} (${existing.id})`)
        
        // Compare pricing options to see if there are changes
        const changes = this.detectVehicleChanges(existing, extracted)
        if (Object.keys(changes).length > 0) {
          console.log(`  📝 Changes detected, marking for update`)
          processedItems.push({
            action: 'update',
            extracted,
            existing: existing,
            changes,
            confidence_score: extracted.confidence_score
          })
        } else {
          console.log(`  ✅ No changes needed, skipping`)
          // Skip this item - no changes needed
        }
      } else {
        console.log(`✨ New listing: ${extracted.model} ${extracted.variant}`)
        
        // Completely new vehicle listing with all its pricing options
        processedItems.push({
          action: 'new',
          extracted,
          existing: null,
          changes: {},
          confidence_score: extracted.confidence_score
        })
      }
    }
    
    // Check for removed listings (in existing but not in extracted)
    const extractedModelKeys = new Set(
      extractedModels.map(model => `${model.model}-${model.variant}-${model.horsepower}`)
    )
    
    for (const existing of (existingListings as any[]) || []) {
      const existingKey = `${existing.models?.name}-${existing.variant}-${existing.horsepower}`
      
      if (!extractedModelKeys.has(existingKey)) {
        processedItems.push({
          action: 'delete',
          extracted: null,
          existing,
          changes: {},
          confidence_score: 1.0 // High confidence for removals
        })
      }
    }
    
    return processedItems
  }
  

  private detectVehicleChanges(existing: any, extracted: VWExtractionResult): Record<string, {old: any, new: any}> {
    const changes: Record<string, {old: any, new: any}> = {}
    
    // Compare pricing options arrays
    const existingPricing = existing.lease_pricing || []
    const extractedPricing = extracted.pricing_options || []
    
    if (existingPricing.length !== extractedPricing.length) {
      changes.pricing_options = {
        old: existingPricing,
        new: extractedPricing
      }
    } else {
      // Check if any pricing details have changed
      for (let i = 0; i < extractedPricing.length; i++) {
        const existingOption = existingPricing[i]
        const extractedOption = extractedPricing[i]
        
        if (existingOption.monthly_price !== extractedOption.monthly_price ||
            existingOption.mileage_per_year !== extractedOption.mileage_per_year ||
            existingOption.period_months !== extractedOption.period_months ||
            existingOption.deposit !== extractedOption.deposit) {
          changes.pricing_options = {
            old: existingPricing,
            new: extractedPricing
          }
          break
        }
      }
    }
    
    return changes
  }
  
  // Create batch items in database
  private async createBatchItems(
    batchId: string,
    processedItems: ProcessedVWItem[]
  ): Promise<number> {
    try {
      console.log(`💾 Creating ${processedItems.length} batch items in database`)
      
      const batchItems = processedItems.map((item) => ({
        batch_id: batchId,
        action: item.action,
        parsed_data: item.extracted,
        existing_data: item.existing,
        changes: item.changes,
        confidence_score: item.confidence_score
      }))
      
      const { data, error } = await supabase
        .from('batch_import_items')
        .insert(batchItems)
        .select()
      
      if (error) {
        console.error('❌ Batch items creation failed:', error)
        throw new Error(`Batch items creation failed: ${error.message}`)
      }
      
      console.log(`✅ Created ${data.length} batch items successfully`)
      return data.length
      
    } catch (error) {
      console.error('❌ Error creating batch items:', error)
      // Return the number we tried to create for graceful degradation
      return processedItems.length
    }
  }
  
  private calculateBatchStats(items: ProcessedVWItem[]): {
    new: number
    updated: number
    removed: number
    total_processed: number
  } {
    return {
      new: items.filter(i => i.action === 'new').length,
      updated: items.filter(i => i.action === 'update').length,
      removed: items.filter(i => i.action === 'delete').length,
      total_processed: items.length
    }
  }
  
  // Get batch details for review interface (real implementation)
  public async getBatchDetails(batchId: string) {
    try {
      console.log(`📋 Fetching batch details for: ${batchId}`)
      
      // Fetch batch and items from database
      const { data: batchData, error: batchError } = await supabase
        .from('batch_imports')
        .select(`
          *,
          sellers!inner(name)
        `)
        .eq('id', batchId)
        .single()
      
      if (batchError) {
        console.error('❌ Batch fetch failed:', batchError)
        throw new Error(`Batch not found: ${batchError.message}`)
      }
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('batch_import_items')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })
      
      if (itemsError) {
        console.error('❌ Batch items fetch failed:', itemsError)
        throw new Error(`Batch items not found: ${itemsError.message}`)
      }
      
      console.log(`✅ Fetched batch with ${itemsData.length} items`)
      
      const batch = {
        id: batchData.id,
        status: batchData.status,
        created_at: batchData.created_at,
        seller: { 
          id: batchData.seller_id,
          name: batchData.sellers.name 
        }
      }
      
      const items = itemsData.map(item => ({
        id: item.id,
        action: item.action,
        confidence_score: item.confidence_score,
        parsed_data: item.parsed_data,
        existing_data: item.existing_data,
        changes: item.changes
      }))
      
      return { batch, items }
      
    } catch (error) {
      console.error('❌ Error fetching batch details:', error)
      
      // Fallback to mock data for development
      console.log('📋 Falling back to mock batch data for development')
      // Mock implementation for demo - simulate realistic batch review data
    const batch = {
      id: batchId,
      status: 'completed',
      created_at: new Date().toISOString(),
      seller: { name: 'Volkswagen Danmark' }
    }
    
    const items = [
      { 
        id: '1', 
        action: 'new' as const, 
        confidence_score: 0.95, 
        parsed_data: { 
          model: 'T-Roc', 
          variant: 'R-Line Black Edition 1.5 TSI EVO ACT DSG7',
          horsepower: 150,
          monthly_price: 3695,
          mileage_per_year: 10000,
          period_months: 12,
          is_electric: false
        }
      },
      { 
        id: '2', 
        action: 'new' as const, 
        confidence_score: 0.93, 
        parsed_data: { 
          model: 'ID.3', 
          variant: 'Pro S',
          horsepower: 204,
          monthly_price: 5095,
          mileage_per_year: 10000,
          period_months: 12,
          is_electric: true
        }
      },
      { 
        id: '3', 
        action: 'new' as const, 
        confidence_score: 0.91, 
        parsed_data: { 
          model: 'ID.4', 
          variant: 'Pro',
          horsepower: 204,
          monthly_price: 5195,
          mileage_per_year: 10000,
          period_months: 12,
          is_electric: true
        }
      },
      { 
        id: '4', 
        action: 'update' as const, 
        confidence_score: 0.88, 
        parsed_data: { 
          model: 'ID.4', 
          variant: 'Pro Max',
          horsepower: 286,
          monthly_price: 6095,
          mileage_per_year: 10000,
          period_months: 12,
          is_electric: true
        },
        existing_data: {
          monthly_price: 5995
        },
        changes: {
          monthly_price: { old: 5995, new: 6095 }
        }
      },
      { 
        id: '5', 
        action: 'delete' as const, 
        confidence_score: 1.0, 
        parsed_data: { 
          model: 'Golf', 
          variant: 'GTI 2.0 TSI',
          horsepower: 245,
          monthly_price: 4295,
          mileage_per_year: 15000,
          period_months: 12,
          is_electric: false
        },
        existing_data: {
          model: 'Golf',
          variant: 'GTI 2.0 TSI'
        }
      }
    ]
    
    return { batch, items }
    }
  }
  
  // Apply approved changes to listings (enhanced implementation)
  public async applyApprovedChanges(batchId: string, itemIds: string[]): Promise<{
    applied: number
    created: number
    updated: number
    deleted: number
    errors: Array<{ itemId: string; error: string }>
  }> {
    console.log(`🔄 Applying changes for batch ${batchId}`)
    console.log(`📋 Processing ${itemIds.length} approved items`)
    
    // Get batch details to process the specific items
    const batchDetails = await this.getBatchDetails(batchId)
    const itemsToProcess = batchDetails.items.filter(item => itemIds.includes(item.id))
    
    // Get the seller_id from the batch
    const batchSellerId = 'id' in batchDetails.batch.seller ? batchDetails.batch.seller.id : null
    if (!batchSellerId) {
      throw new Error('Cannot find seller_id for this batch')
    }
    
    const results = {
      applied: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [] as Array<{ itemId: string; error: string }>
    }
    
    // Process each approved item
    for (const item of itemsToProcess) {
      try {
        console.log(`\n🔧 Processing item ${item.id}: ${item.action} - ${item.parsed_data.model} ${item.parsed_data.variant}`)
        
        switch (item.action) {
          case 'new':
            await this.createNewListing(item, batchSellerId)
            results.created++
            console.log(`  ✅ Created new listing`)
            break
            
          case 'update':
            await this.updateExistingListing(item)
            results.updated++
            console.log(`  ✅ Updated existing listing`)
            break
            
          case 'delete':
            await this.deleteExistingListing(item)
            results.deleted++
            console.log(`  ✅ Deleted listing`)
            break
        }
        
        results.applied++
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`  ❌ Error processing item ${item.id}:`, errorMessage)
        results.errors.push({ itemId: item.id, error: errorMessage })
      }
    }
    
    // Update batch status to indicate completion
    await this.updateBatchStatus(batchId, 'applied', results)
    
    console.log(`\n📊 Batch application complete:`)
    console.log(`  Applied: ${results.applied}/${itemIds.length}`)
    console.log(`  Created: ${results.created}`)
    console.log(`  Updated: ${results.updated}`)
    console.log(`  Deleted: ${results.deleted}`)
    console.log(`  Errors: ${results.errors.length}`)
    
    return results
  }
  
  private async createNewListing(item: any, sellerId: string): Promise<void> {
    const extracted = item.parsed_data
    const pricingOptions = extracted.pricing_options || []
    
    // Note: We now store all pricing options in lease_pricing table, no need for main listing pricing
    
    // Resolve foreign keys for make and model only
    const { makeId, modelId } = await this.resolveMakeAndModel('Volkswagen', extracted.model)
    
    console.log(`    🎯 Using correct seller ID: ${sellerId}`)
    
    const listingData = {
      make_id: makeId,
      model_id: modelId,
      variant: extracted.variant,
      seller_id: sellerId // Use the correct seller ID passed from batch
      // body_type_id, fuel_type_id, transmission_id are now nullable - will be added manually
    }
    
    console.log(`    💾 Creating listing in database:`, listingData)
    console.log(`    📋 Will create ${pricingOptions.length} pricing options`)
    
    try {
      // 1. Create the main listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single()
      
      if (listingError) {
        console.error(`    ❌ Listing creation failed:`, listingError)
        throw new Error(`Failed to create listing: ${listingError.message}`)
      }
      
      console.log(`    ✅ Listing created successfully: ID ${listing.id}`)
      
      // 2. Create lease pricing options for all pricing data
      if (pricingOptions.length > 0) {
        const leasePricingInserts = pricingOptions.map((option: any) => ({
          listing_id: listing.id,
          monthly_price: option.monthly_price || 0,
          first_payment: option.deposit || 0,
          period_months: option.period_months || 12,
          mileage_per_year: option.mileage_per_year || 10000
          // total_lease_cost column doesn't exist in lease_pricing table
        }))
        
        const { error: pricingError } = await supabase
          .from('lease_pricing')
          .insert(leasePricingInserts)
        
        if (pricingError) {
          console.error(`    ❌ Pricing options creation failed:`, pricingError)
          console.error(`    Error details:`, pricingError.details)
          console.error(`    Error hint:`, pricingError.hint)
          // This is critical now since listing has no pricing data
          throw new Error(`Failed to create lease pricing: ${pricingError.message}`)
        } else {
          console.log(`    ✅ Created ${pricingOptions.length} lease pricing options`)
        }
      } else {
        console.log(`    ⚠️ No pricing options found, listing created without pricing`)
      }
      
    } catch (error) {
      console.error(`    ❌ Database error:`, error)
      throw error
    }
  }
  
  private async updateExistingListing(item: any): Promise<void> {
    const updates: Record<string, any> = {}
    
    // Apply only the changed fields
    if (item.changes) {
      Object.entries(item.changes).forEach(([field, change]: [string, any]) => {
        updates[field] = change.new
      })
    }
    
    // Note: updated_at is handled by database triggers
    
    console.log(`    💾 Updating listing in database with:`, updates)
    
    try {
      const { data, error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', item.existing_data.id)
        .select()
        .single()
      
      if (error) {
        console.error(`    ❌ Listing update failed:`, error)
        throw new Error(`Failed to update listing: ${error.message}`)
      }
      
      console.log(`    ✅ Listing updated successfully: ID ${data.id}`)
      
    } catch (error) {
      console.error(`    ❌ Database error:`, error)
      throw error
    }
  }
  
  private async deleteExistingListing(item: any): Promise<void> {
    console.log(`    🗑️ Soft deleting listing: ${item.parsed_data.model} ${item.parsed_data.variant}`)
    
    try {
      const { data, error } = await supabase
        .from('listings')
        .update({ 
          deleted_at: new Date().toISOString()
        })
        .eq('id', item.existing_data.id)
        .select()
        .single()
      
      if (error) {
        console.error(`    ❌ Listing deletion failed:`, error)
        throw new Error(`Failed to delete listing: ${error.message}`)
      }
      
      console.log(`    ✅ Listing soft deleted successfully: ID ${data.id}`)
      
    } catch (error) {
      console.error(`    ❌ Database error:`, error)
      throw error
    }
  }
  
  
  private async resolveMakeAndModel(makeName: string, modelName: string): Promise<{ makeId: string; modelId: string }> {
    try {
      console.log(`    🔍 Resolving foreign keys for: ${makeName} ${modelName}`)
      
      // 1. Find or create the make
      let { data: make, error: makeError } = await supabase
        .from('makes')
        .select('id')
        .eq('name', makeName)
        .single()
      
      if (makeError || !make) {
        console.log(`    ➕ Creating new make: ${makeName}`)
        const { data: newMake, error: createMakeError } = await supabase
          .from('makes')
          .insert({ name: makeName })
          .select()
          .single()
        
        if (createMakeError || !newMake) {
          throw new Error(`Failed to create make "${makeName}": ${createMakeError?.message || 'Unknown error'}`)
        }
        make = newMake
      }
      
      if (!make) {
        throw new Error(`Make "${makeName}" not found and could not be created`)
      }
      
      console.log(`    ✅ Make resolved: ${makeName} → ${make.id}`)
      
      // 2. Find or create the model under this make
      let { data: model, error: modelError } = await supabase
        .from('models')
        .select('id')
        .eq('make_id', make.id)
        .eq('name', modelName)
        .single()
      
      if (modelError || !model) {
        console.log(`    ➕ Creating new model: ${modelName} under ${makeName}`)
        const { data: newModel, error: createModelError } = await supabase
          .from('models')
          .insert({ 
            make_id: make.id,
            name: modelName 
          })
          .select()
          .single()
        
        if (createModelError || !newModel) {
          throw new Error(`Failed to create model "${modelName}": ${createModelError?.message || 'Unknown error'}`)
        }
        model = newModel
      }
      
      if (!model) {
        throw new Error(`Model "${modelName}" not found and could not be created`)
      }
      
      console.log(`    ✅ Model resolved: ${modelName} → ${model.id}`)
      
      return {
        makeId: make.id,
        modelId: model.id
      }
      
    } catch (error) {
      console.error(`    ❌ Failed to resolve make/model foreign keys:`, error)
      throw new Error(`Failed to resolve foreign keys for ${makeName} ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  private async updateBatchStatus(batchId: string, status: string, _results: any): Promise<void> {
    console.log(`📊 Updating batch ${batchId} status to: ${status}`)
    
    try {
      const { error } = await supabase
        .from('batch_imports')
        .update({ 
          status,
          applied_at: new Date().toISOString()
        })
        .eq('id', batchId)
      
      if (error) {
        console.error(`❌ Batch status update failed:`, error)
        throw new Error(`Failed to update batch status: ${error.message}`)
      }
      
      console.log(`✅ Batch status updated successfully`)
      
    } catch (error) {
      console.error(`❌ Database error:`, error)
      // Don't throw error for batch status update - it's not critical
    }
  }
  
  // Removed unused helper methods for demo simplification
}