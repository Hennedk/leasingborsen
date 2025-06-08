import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types based on the existing Vue.js app
export interface CarListing {
  listing_id: string
  make: string
  model: string
  variant?: string
  monthly_price: number
  body_type?: string
  fuel_type?: string
  transmission?: string
  image?: string
}

export interface FilterOptions {
  make: string
  model: string
  body_type: string
  price_max: number | null
}

export interface Make {
  id: string
  name: string
}

export interface Model {
  id: string
  name: string
  make_id: string
}

export interface BodyType {
  name: string
}