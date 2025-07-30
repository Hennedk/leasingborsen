export const toyotaBZ4XScenario = {
  dealer: {
    id: 'demo-bilhus',
    name: 'Demo Bilhus ApS',
    config: {
      transmission_handling: 'separate_field',
    },
  },
  
  existingListings: [
    {
      id: 'bzx4-manual-1',
      make: 'Toyota',
      model: 'bZ4X',
      variant: 'Executive',
      transmission: 'manual',
      fuel_type: 'el',
      body_type: 'suv',
      dealer_id: 'demo-bilhus',
      monthly_price: 5799,
      year: 2024,
    },
  ],
  
  extractedVehicles: [
    {
      make: 'Toyota',
      model: 'bZ4X',
      variant: 'Executive',
      transmission: 'automatic',
      fuel_type: 'el',
      body_type: 'suv',
      monthly_price: 5999,
      year: 2024,
    },
  ],
  
  expectedResult: {
    changes: {
      creates: 0, // Should NOT create duplicate
      updates: 1, // Should update existing since transmission no longer part of key
      deletes: 0,
    },
    matchMethod: 'exact', // Should match via exact key
    exactKey: 'toyota|bz4x|executive',
  },
};

export const toyotaMultipleTransmissions = {
  dealer: {
    id: 'toyota-dealer',
    name: 'Toyota Denmark',
    config: {
      transmission_handling: 'separate_field',
      patterns: {
        variant_cleanup: /\s*(Automatik|Manuel|aut\.)$/,
      },
    },
  },
  
  existingListings: [
    {
      id: 'aygo-manual',
      make: 'Toyota',
      model: 'AYGO X',
      variant: 'Pulse',
      transmission: 'manual',
      tr: 2, // Toyota manual code
      monthly_price: 2195,
    },
  ],
  
  extractedVehicles: [
    {
      make: 'Toyota',
      model: 'AYGO X',
      variant: 'Pulse',
      transmission: 'manual',
      monthly_price: 2195,
    },
    {
      make: 'Toyota',
      model: 'AYGO X',
      variant: 'Pulse Automatik', // Will be cleaned to 'Pulse'
      transmission: 'automatic',
      monthly_price: 2395,
    },
  ],
  
  expectedResult: {
    changes: {
      creates: 0, // Both should match existing
      updates: 1, // Update existing with new offers/prices
      deletes: 0,
    },
    processedVariants: {
      manual: 'Pulse',
      automatic: 'Pulse', // 'Automatik' stripped
    },
  },
};

export const toyotaDeletionScenario = {
  sessionId: '290915a6-0fc9-4da7-b1c6-1ebd3c86becf',
  
  existingListings: [
    {
      id: '22bf5261-322a-47c7-afe0-4e3872841f4b',
      make: 'Toyota',
      model: 'bZ4X',
      variant: 'Executive',
      dealer_id: 'demo-bilhus',
    },
    {
      id: 'other-toyota-1',
      make: 'Toyota',
      model: 'Corolla',
      variant: 'Active',
      dealer_id: 'demo-bilhus',
    },
  ],
  
  extractedVehicles: [
    // Only Corolla in new extraction - bZ4X should be marked for deletion
    {
      make: 'Toyota',
      model: 'Corolla',
      variant: 'Active',
      monthly_price: 2995,
    },
  ],
  
  multipleReferences: [
    {
      id: 'bd613c0f-cb0d-4215-a2f3-66158d633bfd',
      session_id: '290915a6-0fc9-4da7-b1c6-1ebd3c86becf',
      change_type: 'DELETE',
      existing_listing_id: '22bf5261-322a-47c7-afe0-4e3872841f4b',
    },
    {
      id: 'other-reference-1',
      session_id: 'different-session',
      change_type: 'UPDATE',
      existing_listing_id: '22bf5261-322a-47c7-afe0-4e3872841f4b',
    },
  ],
  
  expectedResult: {
    deletionSuccess: true,
    referencesCleared: 2, // All references should be cleared
    listingDeleted: true,
  },
};