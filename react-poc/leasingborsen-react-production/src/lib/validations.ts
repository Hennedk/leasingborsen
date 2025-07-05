import { z } from "zod"

// Vehicle Information Schema
export const vehicleInformationSchema = z.object({
  // Basic Information - Required
  make: z.string().min(1, "Mærke er påkrævet"),
  model: z.string().min(1, "Model er påkrævet"),
  body_type: z.string().min(1, "Biltype er påkrævet"),
  fuel_type: z.string().min(1, "Brændstof er påkrævet"),
  transmission: z.string().min(1, "Transmission er påkrævet"),

  // Basic Information - Optional
  variant: z.string().optional(),
  horsepower: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(0, "Hestekræfter skal være mindst 0")
      .max(2000, "Hestekræfter må ikke overstige 2000")
      .optional()
  ),
  seats: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(2, "Antal sæder skal være mindst 2")
      .max(9, "Antal sæder må ikke overstige 9")
      .optional()
  ),
  doors: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(2, "Antal døre skal være mindst 2")
      .max(5, "Antal døre må ikke overstige 5")
      .optional()
  ),
  description: z.string()
    .max(1000, "Beskrivelse må ikke overstige 1000 tegn")
    .optional(),

  // Environmental & Consumption - Optional
  co2_emission: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(0, "CO2 udslip skal være mindst 0")
      .max(1000, "CO2 udslip må ikke overstige 1000")
      .optional()
  ),
  co2_tax_half_year: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(0, "CO2 afgift skal være mindst 0")
      .max(50000, "CO2 afgift må ikke overstige 50.000 kr")
      .optional()
  ),
  consumption_l_100km: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(0, "Forbrug skal være mindst 0")
      .max(50, "Forbrug må ikke overstige 50 L/100km")
      .optional()
  ),
  consumption_kwh_100km: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(0, "Forbrug skal være mindst 0")
      .max(100, "Forbrug må ikke overstige 100 kWh/100km")
      .optional()
  ),
  wltp: z.preprocess(
    (val) => val === '' ? undefined : Number(val),
    z.number()
      .min(0, "WLTP skal være mindst 0")
      .max(1000, "WLTP må ikke overstige 1000 km")
      .optional()
  ),
})

// Seller Schema
export const sellerSchema = z.object({
  seller_id: z.string().optional(), // Temporarily make optional for debugging
})

// Media Schema
export const mediaSchema = z.object({
  images: z.array(z.string().url("Billede URL skal være en gyldig URL")).optional(),
  image_urls: z.array(z.string().url("Billede URL skal være en gyldig URL")).optional(),
  processed_image_grid: z.string().url("Grid billede URL skal være en gyldig URL").optional(),
  processed_image_detail: z.string().url("Detail billede URL skal være en gyldig URL").optional(),
})

// Individual Offer Schema - flexible to handle both string and number inputs
export const offerSchema = z.object({
  monthly_price: z.coerce.number()
    .min(1, "Månedspris skal være større end 0")
    .max(50000, "Månedspris må ikke overstige 50.000 kr"),
  first_payment: z.coerce.number()
    .min(0, "Udbetaling skal være mindst 0")
    .max(500000, "Udbetaling må ikke overstige 500.000 kr")
    .optional(),
  period_months: z.coerce.number()
    .min(1, "Periode skal være mindst 1 måned")
    .max(120, "Periode må ikke overstige 120 måneder")
    .optional(),
  mileage_per_year: z.coerce.number()
    .min(5000, "Km/år skal være mindst 5.000")
    .max(50000, "Km/år må ikke overstige 50.000")
    .optional(),
})

// Offers Schema
export const offersSchema = z.object({
  offers: z.array(offerSchema).min(1, "Mindst et tilbud er påkrævet"),
})

// Car Listing Schema (without offers for separated architecture)
export const carListingSchema = z.object({
  ...vehicleInformationSchema.shape,
  ...sellerSchema.shape,
  ...mediaSchema.shape,
})

// Complete Car Listing Schema (with offers for backward compatibility)
export const carListingWithOffersSchema = z.object({
  ...vehicleInformationSchema.shape,
  ...sellerSchema.shape,
  ...mediaSchema.shape,
  ...offersSchema.shape,
})

// Legacy schema for backward compatibility
export const legacyCarListingSchema = z.object({
  // Basic Information - Required
  make: z.string().min(1, "Mærke er påkrævet"),
  model: z.string().min(1, "Model er påkrævet"),
  year: z.number()
    .min(1990, "Årgang skal være mindst 1990")
    .max(new Date().getFullYear() + 1, "Årgang kan ikke være i fremtiden"),
  monthly_price: z.number()
    .min(1, "Månedspris skal være større end 0")
    .max(50000, "Månedspris må ikke overstige 50.000 kr"),

  // Basic Information - Optional
  variant: z.string().optional(),

  // Specifications - Required
  fuel_type: z.string().min(1, "Brændstof er påkrævet"),
  transmission: z.string().min(1, "Transmission er påkrævet"),
  body_type: z.string().min(1, "Biltype er påkrævet"),

  // Specifications - Optional with validation
  horsepower: z.number()
    .min(0, "Hestekræfter skal være mindst 0")
    .max(2000, "Hestekræfter må ikke overstige 2000")
    .optional(),
  seats: z.number()
    .min(2, "Antal sæder skal være mindst 2")
    .max(9, "Antal sæder må ikke overstige 9")
    .optional(),
  mileage: z.number()
    .min(0, "Kilometerstand skal være mindst 0")
    .max(1000000, "Kilometerstand må ikke overstige 1.000.000 km")
    .optional(),

  // Pricing & Leasing - Optional with validation
  first_payment: z.number()
    .min(0, "Udbetaling skal være mindst 0")
    .max(500000, "Udbetaling må ikke overstige 500.000 kr")
    .optional(),
  mileage_per_year: z.number()
    .min(5000, "Km/år skal være mindst 5.000")
    .max(100000, "Km/år må ikke overstige 100.000")
    .optional(),
  period_months: z.number()
    .min(1, "Periode skal være mindst 1 måned")
    .max(120, "Periode må ikke overstige 120 måneder")
    .optional(),

  // Technical - Optional
  wltp: z.number()
    .min(0, "WLTP skal være mindst 0")
    .max(50, "WLTP må ikke overstige 50")
    .optional(),
  co2_emission: z.number()
    .min(0, "CO2 udslip skal være mindst 0")
    .max(1000, "CO2 udslip må ikke overstige 1000")
    .optional(),
  co2_tax_half_year: z.number()
    .min(0, "CO2 afgift skal være mindst 0")
    .max(50000, "CO2 afgift må ikke overstige 50.000 kr")
    .optional(),
  drive_type: z.enum(['fwd', 'rwd', 'awd']).optional(),

  // Additional Information - Optional
  image: z.string()
    .url("Billede URL skal være en gyldig URL")
    .optional()
    .or(z.literal("")),
  colour: z.string().optional(),
  description: z.string()
    .max(1000, "Beskrivelse må ikke overstige 1000 tegn")
    .optional(),
})

export type VehicleInformationFormData = z.infer<typeof vehicleInformationSchema>
export type SellerFormData = z.infer<typeof sellerSchema>
export type MediaFormData = z.infer<typeof mediaSchema>
export type OfferFormData = z.infer<typeof offerSchema>
export type OffersFormData = z.infer<typeof offersSchema>
export type CarListingFormData = z.infer<typeof carListingSchema>
export type LegacyCarListingFormData = z.infer<typeof legacyCarListingSchema>