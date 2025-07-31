import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Danish error messages (matching frontend patterns)
const errorMessages = {
  saveError: 'Kunne ikke gemme ændringerne',
  createError: 'Der opstod en fejl ved oprettelse',
  updateError: 'Der opstod en fejl ved opdatering',
  deleteError: 'Der opstod en fejl ved sletning',
  notFound: 'Ressourcen blev ikke fundet',
  validationError: 'Ugyldige data - kontroller indtastning',
  unauthorizedError: 'Du har ikke tilladelse til denne handling',
  generalError: 'Der opstod en fejl ved behandling af anmodningen'
}

// Request/response types
interface AdminListingRequest {
  operation: 'create' | 'update' | 'delete'
  listingData?: {
    seller_id: string
    make_id: string
    model_id: string
    variant?: string
    body_type_id?: string
    fuel_type_id?: string
    transmission_id?: string
    year?: number
    mileage?: number
    horsepower?: number
    engine_displacement?: number
    doors?: number
    seats?: number
    co2_emissions?: number
    wltp_range?: number
    color?: string
    exterior_color?: string
    interior_color?: string
    drivetrain?: string
    acceleration?: number
    max_speed?: number
    description?: string
    features?: string[]
    images?: string[]
    // Additional fields following existing patterns
    owner_type?: string
    first_registration?: string
    last_service?: string
    next_service?: string
    warranty_type?: string
    warranty_end?: string
    leasing_company?: string
    financing_options?: string[]
    delivery_time?: string
    location?: string
    contact_person?: string
    availability?: string
    condition?: string
    service_history?: string
    modifications?: string
    damage_history?: string
    previous_owners?: number
    registration_number?: string
    vin?: string
    inspection_date?: string
    insurance_group?: string
    eco_label?: string
    noise_level?: number
    euro_norm?: string
    particle_filter?: boolean
    adblue?: boolean
    start_stop?: boolean
    cruise_control?: boolean
    air_conditioning?: boolean
    gps_navigation?: boolean
    parking_sensors?: boolean
    backup_camera?: boolean
    bluetooth?: boolean
    usb_ports?: number
    charging_ports?: string[]
    roof_type?: string
    window_tint?: boolean
    alloy_wheels?: boolean
    tire_size?: string
    spare_tire?: boolean
    floor_mats?: boolean
    cargo_cover?: boolean
    roof_rack?: boolean
    towing_capacity?: number
    payload_capacity?: number
    trunk_capacity?: number
    fuel_tank_capacity?: number
    battery_capacity?: number
    charging_time?: string
    consumption_combined?: number
    consumption_city?: number
    consumption_highway?: number
    electric_range?: number
    top_speed_electric?: number
    recovery_brake?: boolean
    heat_pump?: boolean
    preheating?: boolean
    solar_roof?: boolean
    keyless_entry?: boolean
    keyless_start?: boolean
    smart_key?: number
    valet_mode?: boolean
    sport_mode?: boolean
    eco_mode?: boolean
    comfort_mode?: boolean
    individual_mode?: boolean
    adaptive_suspension?: boolean
    electronic_stability?: boolean
    traction_control?: boolean
    abs_brakes?: boolean
    brake_assist?: boolean
    emergency_brake?: boolean
    blind_spot_warning?: boolean
    lane_assist?: boolean
    traffic_sign_recognition?: boolean
    adaptive_cruise_control?: boolean
    collision_warning?: boolean
    driver_fatigue_detection?: boolean
    parking_assistant?: boolean
    surround_view?: boolean
    heads_up_display?: boolean
    digital_cockpit?: boolean
    ambient_lighting?: boolean
    wireless_charging?: boolean
    premium_sound?: boolean
    sound_system_brand?: string
    speakers_count?: number
    smartphone_integration?: string[]
    voice_control?: boolean
    remote_control?: boolean
    mobile_app?: boolean
    over_air_updates?: boolean
    internet_connection?: boolean
    wifi_hotspot?: boolean
    emergency_call?: boolean
    stolen_vehicle_tracking?: boolean
    immobilizer?: boolean
    alarm_system?: boolean
    central_locking?: boolean
    child_safety_locks?: boolean
    isofix_mounts?: number
    airbags_count?: number
    airbag_locations?: string[]
    seatbelt_pretensioners?: boolean
    seat_heating?: string[]
    seat_cooling?: string[]
    seat_massage?: string[]
    seat_memory?: string[]
    steering_wheel_heating?: boolean
    steering_wheel_adjustment?: string[]
    mirrors_heating?: boolean
    mirrors_folding?: boolean
    mirrors_memory?: boolean
    window_electric?: string[]
    sunroof?: boolean
    panoramic_roof?: boolean
    convertible_top?: string
    privacy_glass?: boolean
    rain_sensor?: boolean
    light_sensor?: boolean
    automatic_lights?: boolean
    led_lights?: string[]
    xenon_lights?: boolean
    laser_lights?: boolean
    cornering_lights?: boolean
    high_beam_assist?: boolean
    fog_lights?: boolean
    additional_lights?: string[]
  }
  listingId?: string
  offers?: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
    delivery_date?: string
    offer_valid_until?: string
    description?: string
    special_conditions?: string
    insurance_included?: boolean
    maintenance_included?: boolean
    roadside_assistance?: boolean
    replacement_car?: boolean
    early_termination_fee?: number
    excess_mileage_fee?: number
    damage_fee_limit?: number
  }>
}

interface AdminListingResponse {
  success: boolean
  listingId?: string
  error?: string
  validationErrors?: string[]
}

// Validation functions
function validateListingData(data: any): string[] {
  const errors: string[] = []
  
  if (!data.seller_id) errors.push('Sælger er påkrævet')
  if (!data.make_id) errors.push('Mærke er påkrævet')
  if (!data.model_id) errors.push('Model er påkrævet')
  
  // Year validation
  if (data.year && (data.year < 1900 || data.year > new Date().getFullYear() + 2)) {
    errors.push('Årstal skal være mellem 1900 og nuværende år + 2')
  }
  
  // Mileage validation
  if (data.mileage && data.mileage < 0) {
    errors.push('Kilometerstand kan ikke være negativ')
  }
  
  // Horsepower validation
  if (data.horsepower && (data.horsepower < 1 || data.horsepower > 2000)) {
    errors.push('Hestekræfter skal være mellem 1 og 2000')
  }
  
  return errors
}

function validateOffers(offers: any[]): string[] {
  const errors: string[] = []
  
  if (!offers || offers.length === 0) {
    return errors // Offers are optional
  }
  
  offers.forEach((offer, index) => {
    if (!offer.monthly_price || offer.monthly_price <= 0) {
      errors.push(`Tilbud ${index + 1}: Månedlig pris skal være større end 0`)
    }
    
    if (offer.period_months && (offer.period_months < 1 || offer.period_months > 120)) {
      errors.push(`Tilbud ${index + 1}: Periode skal være mellem 1 og 120 måneder`)
    }
    
    if (offer.mileage_per_year && (offer.mileage_per_year < 1000 || offer.mileage_per_year > 100000)) {
      errors.push(`Tilbud ${index + 1}: Kilometerstand pr. år skal være mellem 1.000 og 100.000`)
    }
    
    if (offer.first_payment && offer.first_payment < 0) {
      errors.push(`Tilbud ${index + 1}: Førsteudbetaling kan ikke være negativ`)
    }
  })
  
  return errors
}

// Database operations
async function createListing(supabase: any, listingData: any, offers?: any[]): Promise<AdminListingResponse> {
  try {
    // Start transaction-like operation
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingData)
      .select('id')
      .single()
    
    if (listingError) {
      console.error('Error creating listing:', listingError)
      throw new Error(errorMessages.createError)
    }
    
    const listingId = listing.id
    
    // Create offers if provided
    if (offers && offers.length > 0) {
      const offersToInsert = offers.map(offer => ({
        ...offer,
        listing_id: listingId
      }))
      
      const { error: offersError } = await supabase
        .from('lease_pricing')
        .insert(offersToInsert)
      
      if (offersError) {
        console.error('Error creating offers:', offersError)
        // Try to rollback listing creation
        await supabase
          .from('listings')
          .delete()
          .eq('id', listingId)
        
        throw new Error(errorMessages.createError)
      }
    }
    
    return {
      success: true,
      listingId: listingId
    }
    
  } catch (error) {
    console.error('Error in createListing:', error)
    return {
      success: false,
      error: error.message || errorMessages.createError
    }
  }
}

async function updateListing(supabase: any, listingId: string, listingData: any, offers?: any[]): Promise<AdminListingResponse> {
  try {
    // Check if listing exists
    const { data: existingListing, error: checkError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .single()
    
    if (checkError || !existingListing) {
      return {
        success: false,
        error: errorMessages.notFound
      }
    }
    
    // Update listing
    const { error: listingError } = await supabase
      .from('listings')
      .update(listingData)
      .eq('id', listingId)
    
    if (listingError) {
      console.error('Error updating listing:', listingError)
      throw new Error(errorMessages.updateError)
    }
    
    // Update offers if provided
    if (offers && offers.length > 0) {
      // Delete existing offers
      await supabase
        .from('lease_pricing')
        .delete()
        .eq('listing_id', listingId)
      
      // Insert new offers
      const offersToInsert = offers.map(offer => ({
        ...offer,
        listing_id: listingId
      }))
      
      const { error: offersError } = await supabase
        .from('lease_pricing')
        .insert(offersToInsert)
      
      if (offersError) {
        console.error('Error updating offers:', offersError)
        throw new Error(errorMessages.updateError)
      }
    }
    
    return {
      success: true,
      listingId: listingId
    }
    
  } catch (error) {
    console.error('Error in updateListing:', error)
    return {
      success: false,
      error: error.message || errorMessages.updateError
    }
  }
}

async function duplicateListing(supabase: any, listingId: string): Promise<AdminListingResponse> {
  try {
    // Fetch the original listing with all data
    const { data: originalListing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()
    
    if (fetchError || !originalListing) {
      return {
        success: false,
        error: errorMessages.notFound
      }
    }
    
    // Remove fields that shouldn't be duplicated
    const { id, created_at, updated_at, ...listingData } = originalListing
    
    // Modify variant to indicate it's a copy
    const duplicatedListing = {
      ...listingData,
      variant: listingData.variant ? `${listingData.variant} (Kopi)` : 'Kopi',
      description: listingData.description 
        ? `${listingData.description}\n\n[Kopieret fra original annonce]` 
        : '[Kopieret fra original annonce]'
    }
    
    // Create the new listing
    const { data: newListing, error: insertError } = await supabase
      .from('listings')
      .insert(duplicatedListing)
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating duplicate listing:', insertError)
      throw new Error(errorMessages.createError)
    }
    
    // Fetch and duplicate lease pricing
    const { data: originalPricing, error: pricingFetchError } = await supabase
      .from('lease_pricing')
      .select('*')
      .eq('listing_id', listingId)
    
    if (!pricingFetchError && originalPricing && originalPricing.length > 0) {
      const pricingData = originalPricing.map(pricing => {
        const { id, listing_id, created_at, updated_at, ...pricingFields } = pricing
        return {
          ...pricingFields,
          listing_id: newListing.id
        }
      })
      
      const { error: pricingError } = await supabase
        .from('lease_pricing')
        .insert(pricingData)
      
      if (pricingError) {
        console.error('Error duplicating pricing:', pricingError)
        // Don't fail the whole operation if pricing fails
      }
    }
    
    console.log('✅ Listing duplicated successfully:', newListing.id)
    
    return {
      success: true,
      listing: newListing,
      listingId: newListing.id
    }
    
  } catch (error) {
    console.error('Error in duplicateListing:', error)
    return {
      success: false,
      error: error.message || errorMessages.createError
    }
  }
}

async function deleteListing(supabase: any, listingId: string): Promise<AdminListingResponse> {
  try {
    // Check if listing exists
    const { data: existingListing, error: checkError } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .single()
    
    if (checkError || !existingListing) {
      return {
        success: false,
        error: errorMessages.notFound
      }
    }
    
    // Delete all related records in the correct order to handle foreign key constraints
    
    // 1. Delete extraction_listing_changes references
    const { error: extractionError } = await supabase
      .from('extraction_listing_changes')
      .delete()
      .eq('existing_listing_id', listingId)
    
    if (extractionError) {
      console.error('Error deleting extraction listing changes:', extractionError)
    }
    
    // 2. Delete lease_pricing records
    const { error: pricingError } = await supabase
      .from('lease_pricing')
      .delete()
      .eq('listing_id', listingId)
    
    if (pricingError) {
      console.error('Error deleting lease pricing:', pricingError)
    }
    
    // 3. Finally delete the listing
    const { error: listingError } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
    
    if (listingError) {
      console.error('Error deleting listing:', listingError)
      throw new Error(errorMessages.deleteError)
    }
    
    return {
      success: true,
      listingId: listingId
    }
    
  } catch (error) {
    console.error('Error in deleteListing:', error)
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

  return rateLimiters.general(req, async (req) => {
    try {
      // Initialize Supabase with service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration')
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Parse request
      const request: AdminListingRequest = await req.json()
      const { operation, listingData, listingId, offers } = request
      
      console.log(`[admin-listing-operations] Processing ${operation} operation`)
      
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
      
      // Route operation
      let result: AdminListingResponse
      
      switch (operation) {
        case 'create': {
          if (!listingData) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: errorMessages.validationError,
                validationErrors: ['Listing data er påkrævet for oprettelse']
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          const validationErrors = [
            ...validateListingData(listingData),
            ...validateOffers(offers || [])
          ]
          
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
          
          result = await createListing(supabase, listingData, offers)
          break
        }
        
        case 'update': {
          if (!listingId) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: errorMessages.validationError,
                validationErrors: ['Listing ID er påkrævet for opdatering']
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          if (!listingData) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: errorMessages.validationError,
                validationErrors: ['Listing data er påkrævet for opdatering']
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          const validationErrors = [
            ...validateListingData(listingData),
            ...validateOffers(offers || [])
          ]
          
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
          
          result = await updateListing(supabase, listingId, listingData, offers)
          break
        }
        
        case 'delete': {
          if (!listingId) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: errorMessages.validationError,
                validationErrors: ['Listing ID er påkrævet for sletning']
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          result = await deleteListing(supabase, listingId)
          break
        }
        
        case 'duplicate': {
          if (!listingId) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: errorMessages.validationError,
                validationErrors: ['Listing ID er påkrævet for kopiering']
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          result = await duplicateListing(supabase, listingId)
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
      console.error('[admin-listing-operations] Unexpected error:', error)
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
})