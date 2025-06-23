export interface CarListing {
  listing_id: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  mileage: number;
  fuel_type: string;
  transmission: string;
  body_type: string;
  color?: string;
  monthly_price: number;
  down_payment?: number;
  lease_term_months: number;
  images?: string[];
  description?: string;
  location?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at?: Date;
  updated_at?: Date;
  status: 'active' | 'inactive' | 'sold';
  
  // Technical specifications
  specifications?: {
    engine_size?: number;
    power_hp?: number;
    power_kw?: number;
    torque_nm?: number;
    top_speed_kmh?: number;
    acceleration_0_100?: number;
    fuel_consumption_l_100km?: number;
    co2_emissions_g_km?: number;
    euro_norm?: string;
    drive_type?: string;
    num_doors?: number;
    num_seats?: number;
    luggage_capacity_l?: number;
  };
  
  // Lease pricing details
  lease_pricing?: {
    monthly_payment: number;
    down_payment?: number;
    final_payment?: number;
    mileage_allowance_km?: number;
    excess_mileage_cost_per_km?: number;
    lease_term_months: number;
    total_cost?: number;
    monthly_cost_per_km?: number;
  };
  
  // Equipment and features
  equipment?: {
    standard_equipment?: string[];
    optional_equipment?: string[];
    safety_features?: string[];
    comfort_features?: string[];
    technology_features?: string[];
  };
}