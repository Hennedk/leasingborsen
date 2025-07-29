import { faker } from '@faker-js/faker';

export const vehicleFactory = {
  // VW ID.4 with multiple offers - representative of electric luxury SUV
  vwId4: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: 'test-vw-dealer',
    make: 'Volkswagen',
    model: 'ID.4',
    variant: 'GTX Performance',
    year: 2024,
    fuel_type: 'Electric',
    transmission: 'Automatic',
    body_type: 'SUV',
    colour: 'Moonstone Grey Metallic',
    doors: 5,
    seats: 5,
    horsepower: 299,
    range_km: 520,
    retail_price: 475000,
    monthly_price: 4999,
    status: 'active',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    images: [
      'https://mock-image-url.com/vw-id4-front.jpg',
      'https://mock-image-url.com/vw-id4-side.jpg',
    ],
    offers: [
      {
        id: faker.string.uuid(),
        monthly_price: 4999,
        period_months: 36,
        mileage_per_year: 15000,
        first_payment: 35000,
        total_price: 214964,
      },
      {
        id: faker.string.uuid(),
        monthly_price: 5499,
        period_months: 24,
        mileage_per_year: 20000,
        first_payment: 35000,
        total_price: 166976,
      },
    ],
    ...overrides,
  }),
  
  // Toyota Aygo with transmission variants
  toyotaAygo: {
    manual: (overrides = {}) => ({
      id: faker.string.uuid(),
      dealer_id: 'test-toyota-dealer',
      make: 'Toyota',
      model: 'Aygo X',
      variant: 'Active 72 HK',
      year: 2024,
      fuel_type: 'Petrol',
      transmission: 'Manual',
      tr: 2, // Manual code for Toyota system
      body_type: 'Hatchback',
      colour: 'Pure White',
      doors: 5,
      seats: 4,
      horsepower: 72,
      fuel_consumption: 4.6,
      retail_price: 185000,
      monthly_price: 2195,
      status: 'active',
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      offers: [
        {
          id: faker.string.uuid(),
          monthly_price: 2195,
          period_months: 36,
          mileage_per_year: 15000,
          first_payment: 15000,
          total_price: 94020,
        }
      ],
      ...overrides,
    }),
    
    automatic: (overrides = {}) => ({
      id: faker.string.uuid(),
      dealer_id: 'test-toyota-dealer',
      make: 'Toyota',
      model: 'Aygo X',
      variant: 'Active 72 HK', // Same variant name
      year: 2024,
      fuel_type: 'Petrol',
      transmission: 'Automatic',
      tr: 1, // Automatic code for Toyota system
      body_type: 'Hatchback',
      colour: 'Pure White',
      doors: 5,
      seats: 4,
      horsepower: 72,
      fuel_consumption: 4.8,
      retail_price: 195000,
      monthly_price: 2395,
      status: 'active',
      created_at: faker.date.past().toISOString(),
      updated_at: faker.date.recent().toISOString(),
      offers: [
        {
          id: faker.string.uuid(),
          monthly_price: 2395,
          period_months: 36,
          mileage_per_year: 15000,
          first_payment: 15000,
          total_price: 101220,
        }
      ],
      ...overrides,
    }),
  },
  
  // Ford with merpris (multiple mileage pricing)
  fordFiesta: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: 'test-ford-dealer',
    make: 'Ford',
    model: 'Fiesta',
    variant: 'Active 1.0 EcoBoost',
    year: 2024,
    fuel_type: 'Petrol',
    transmission: 'Manual',
    body_type: 'Hatchback',
    colour: 'Blazer Blue Metallic',
    doors: 5,
    seats: 5,
    horsepower: 125,
    fuel_consumption: 5.2,
    retail_price: 225000,
    monthly_price: 2495, // Base price
    base_mileage: 10000,
    status: 'active',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    offers: [
      {
        id: faker.string.uuid(),
        monthly_price: 2495,
        mileage_per_year: 10000,
        period_months: 36,
        first_payment: 20000,
        total_price: 109820,
      },
    ],
    merpris_options: [
      { mileage: 15000, supplement: 200 },
      { mileage: 20000, supplement: 400 },
      { mileage: 25000, supplement: 600 },
    ],
    ...overrides,
  }),

  // Hyundai with equipment variants
  hyundaiIoniq5: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: 'test-hyundai-dealer',
    make: 'Hyundai',
    model: 'IONIQ 5',
    variant: 'Ultimate 325 HK 4WD',
    year: 2024,
    fuel_type: 'Electric',
    transmission: 'Automatic',
    body_type: 'SUV',
    colour: 'Gravity Gold Metallic',
    doors: 5,
    seats: 5,
    horsepower: 325,
    range_km: 481,
    retail_price: 565000,
    monthly_price: 5995,
    status: 'active',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    offers: [
      {
        id: faker.string.uuid(),
        monthly_price: 5995,
        period_months: 36,
        mileage_per_year: 15000,
        first_payment: 45000,
        total_price: 260820,
      }
    ],
    equipment_variants: [
      {
        variant: 'Ultimate 325 HK 4WD',
        monthly_price: 5995,
        equipment: 'Standard equipment'
      },
      {
        variant: 'Ultimate 325 HK 4WD – 20" alufælge, soltag',
        monthly_price: 6295,
        equipment: '20" alloy wheels, sunroof'
      },
    ],
    ...overrides,
  }),

  // Generic vehicle generator for testing
  generic: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: faker.string.uuid(),
    make: faker.helpers.arrayElement(['Volkswagen', 'Toyota', 'Ford', 'BMW', 'Mercedes', 'Audi']),
    model: faker.vehicle.model(),
    variant: faker.helpers.arrayElement(['Base', 'Sport', 'Luxury', 'Premium', 'Ultimate']),
    year: faker.number.int({ min: 2020, max: 2024 }),
    fuel_type: faker.helpers.arrayElement(['Petrol', 'Diesel', 'Electric', 'Hybrid']),
    transmission: faker.helpers.arrayElement(['Manual', 'Automatic']),
    body_type: faker.helpers.arrayElement(['Hatchback', 'Sedan', 'SUV', 'Station wagon', 'Coupe']),
    colour: faker.vehicle.color(),
    doors: faker.helpers.arrayElement([3, 5]),
    seats: faker.number.int({ min: 2, max: 7 }),
    horsepower: faker.number.int({ min: 75, max: 400 }),
    fuel_consumption: faker.number.float({ min: 3.5, max: 12.0, fractionDigits: 1 }),
    retail_price: faker.number.int({ min: 150000, max: 800000 }),
    monthly_price: faker.number.int({ min: 2000, max: 8000 }),
    status: faker.helpers.arrayElement(['active', 'sold', 'reserved']),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    offers: [
      {
        id: faker.string.uuid(),
        monthly_price: faker.number.int({ min: 2000, max: 8000 }),
        period_months: faker.helpers.arrayElement([24, 36, 48]),
        mileage_per_year: faker.helpers.arrayElement([10000, 15000, 20000, 25000]),
        first_payment: faker.number.int({ min: 10000, max: 50000 }),
        total_price: faker.number.int({ min: 80000, max: 350000 }),
      }
    ],
    ...overrides,
  }),

  // Factory for creating vehicles with specific characteristics
  withCharacteristics: (characteristics: any) => {
    return vehicleFactory.generic(characteristics);
  },

  // Create multiple vehicles at once
  createMultiple: (count: number, type?: string) => {
    const vehicles = [];
    for (let i = 0; i < count; i++) {
      if (type && vehicleFactory[type as keyof typeof vehicleFactory]) {
        vehicles.push(vehicleFactory[type as keyof typeof vehicleFactory]());
      } else {
        vehicles.push(vehicleFactory.generic());
      }
    }
    return vehicles;
  },

  // Create vehicles for a specific dealer
  forDealer: (dealerId: string, count: number = 1) => {
    const vehicles = [];
    for (let i = 0; i < count; i++) {
      vehicles.push(vehicleFactory.generic({ dealer_id: dealerId }));
    }
    return vehicles;
  },

  // Create vehicles with pricing scenarios for testing
  pricingScenarios: {
    lowPrice: () => vehicleFactory.generic({
      monthly_price: faker.number.int({ min: 1500, max: 2500 }),
      retail_price: faker.number.int({ min: 120000, max: 200000 }),
    }),
    
    highPrice: () => vehicleFactory.generic({
      monthly_price: faker.number.int({ min: 6000, max: 10000 }),
      retail_price: faker.number.int({ min: 600000, max: 1000000 }),
    }),
    
    midRange: () => vehicleFactory.generic({
      monthly_price: faker.number.int({ min: 3000, max: 5000 }),
      retail_price: faker.number.int({ min: 300000, max: 500000 }),
    }),
  },
};