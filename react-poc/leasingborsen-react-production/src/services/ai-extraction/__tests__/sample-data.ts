/**
 * Sample Data for Testing AI Extraction Service
 * 
 * This file contains realistic Danish car leasing document content
 * for testing the extraction and validation systems.
 */

import type { ExtractedCarData } from '../types'

/**
 * Sample Toyota document content in Danish
 */
export const TOYOTA_SAMPLE_CONTENT = `
Toyota Privatleasing 2024
=========================

Gyldig fra: 1. juni 2024
Priserne er inkl. moms og afgifter

Toyota Aygo X
=============

Løbetid: 48 måneder
Årlig kørsel: 15.000 km
Førstegangsydelse: 3 x månedsydelse

Aygo X 1.0 VVT-i X-trend CVT - 72 hk
Månedsydelse: 2.899 kr
Førstegangsydelse: 8.697 kr
CO2-afgift (halvårlig): 330 kr

Aygo X 1.0 VVT-i X-cite CVT - 72 hk  
Månedsydelse: 3.199 kr
Førstegangsydelse: 9.597 kr
CO2-afgift (halvårlig): 330 kr

Aygo X 1.0 VVT-i X-clusiv CVT - 72 hk
Månedsydelse: 3.399 kr
Førstegangsydelse: 10.197 kr
CO2-afgift (halvårlig): 330 kr

Yaris Cross
===========

Yaris Cross 1.5 Hybrid Dynamic CVT - 116 hk
Månedsydelse: 4.299 kr
Førstegangsydelse: 12.897 kr
CO2-afgift (halvårlig): 0 kr

Yaris Cross 1.5 Hybrid Style CVT - 116 hk
Månedsydelse: 4.699 kr
Førstegangsydelse: 14.097 kr
CO2-afgift (halvårlig): 0 kr

C-HR
====

C-HR 1.8 Hybrid C-LUB CVT - 122 hk
Månedsydelse: 5.499 kr
Førstegangsydelse: 16.497 kr
CO2-afgift (halvårlig): 0 kr

C-HR 2.0 Hybrid GR Sport CVT - 196 hk
Månedsydelse: 6.299 kr
Førstegangsydelse: 18.897 kr
CO2-afgift (halvårlig): 330 kr

Tilvalg og pakker:
==================

Vinterhjul 15": 299 kr/md
Vinterhjul 16": 349 kr/md
Vinterhjul 17": 399 kr/md

Service & Vedligeholdelse: 450 kr/md
Kasko Forsikring: 650 kr/md
Ansvarsforsikring: 150 kr/md

Alle priser er inkl. 25% moms.
Priserne er vejledende og kan ændres uden varsel.
`

/**
 * Sample BMW document content in Danish
 */
export const BMW_SAMPLE_CONTENT = `
BMW Erhvervsleasing 2024
========================

Prisliste gyldig fra: 15. maj 2024
Alle priser ekskl. moms

BMW iX3
=======

Løbetid: 36 måneder
Årlig kørsel: 20.000 km

iX3 xDrive30 - 286 hk (Elektrisk)
Månedsydelse: 8.500 kr
Udbetaling: 85.000 kr
Batteristørrelse: 74 kWh
Rækkevidde: 458 km

BMW 3-Serie
===========

320i Advantage Steptronic - 184 hk
Månedsydelse: 6.200 kr
Udbetaling: 62.000 kr
Brændstofforbrug: 17,2 km/l

320d Advantage Steptronic - 190 hk
Månedsydelse: 6.800 kr
Udbetaling: 68.000 kr
Brændstofforbrug: 20,4 km/l

BMW X3
======

X3 xDrive20d Advantage Steptronic - 190 hk
Månedsydelse: 7.900 kr
Udbetaling: 79.000 kr
0-100 km/t: 8,0 sek

X3 xDrive30e M Sport Steptronic - 292 hk (Plugin Hybrid)
Månedsydelse: 9.200 kr
Udbetaling: 92.000 kr
Elektrisk rækkevidde: 46 km

Tilvalg:
========

M Sportspakke: 750 kr/md
Panoramatag: 450 kr/md
Adaptiv undervogn: 350 kr/md

Alle priser er ekskl. 25% moms.
`

/**
 * Sample Mercedes document content in Danish
 */
export const MERCEDES_SAMPLE_CONTENT = `
Mercedes-Benz Privatleasing
===========================

Gældende fra: 1. april 2024
Priser inkl. moms og registreringsafgift

A-Klasse
========

Løbetid: 48 måneder
Kørselsbegrænsning: 15.000 km/år

A 180 Progressive - 136 hk
Månedsydelse: 4.995 kr
Startgebyr: 14.985 kr
Brændstofforbrug: 16,7 km/l

A 200 AMG Line - 163 hk
Månedsydelse: 5.495 kr
Startgebyr: 16.485 kr
Brændstofforbrug: 15,4 km/l

EQA
===

EQA 250 Progressive - 190 hk (Elektrisk)
Månedsydelse: 6.295 kr
Startgebyr: 18.885 kr
Batteristørrelse: 66,5 kWh
Rækkevidde: 426 km

C-Klasse
========

C 200 Advantage - 204 hk
Månedsydelse: 7.195 kr
Startgebyr: 21.585 kr
0-100 km/t: 7,3 sek

C 300 e AMG Line - 313 hk (Plugin Hybrid)
Månedsydelse: 8.695 kr
Startgebyr: 26.085 kr
Elektrisk rækkevidde: 111 km

Pakker og tilvalg:
==================

AMG Line Pakke: 650 kr/md
Premium Pakke: 450 kr/md
MBUX Navigation Premium: 300 kr/md

Alle priser inkluderer 25% moms.
`

/**
 * Expected extraction result for Toyota sample
 */
export const EXPECTED_TOYOTA_RESULT: ExtractedCarData = {
  documentInfo: {
    brand: 'Toyota',
    documentDate: '2024-06-01',
    currency: 'DKK',
    language: 'da',
    documentType: 'private_leasing'
  },
  vehicles: [
    {
      model: 'Aygo X',
      leasePeriodMonths: 48,
      powertrainType: 'gasoline',
      variants: [
        {
          variantName: 'X-trend CVT',
          engineSpecification: '1.0 VVT-i - 72 hk',
          transmission: 'cvt',
          pricing: {
            monthlyPayment: 2899,
            firstPayment: 8697,
            annualKilometers: 15000,
            co2TaxBiannual: 330
          }
        },
        {
          variantName: 'X-cite CVT',
          engineSpecification: '1.0 VVT-i - 72 hk',
          transmission: 'cvt',
          pricing: {
            monthlyPayment: 3199,
            firstPayment: 9597,
            annualKilometers: 15000,
            co2TaxBiannual: 330
          }
        },
        {
          variantName: 'X-clusiv CVT',
          engineSpecification: '1.0 VVT-i - 72 hk',
          transmission: 'cvt',
          pricing: {
            monthlyPayment: 3399,
            firstPayment: 10197,
            annualKilometers: 15000,
            co2TaxBiannual: 330
          }
        }
      ]
    },
    {
      model: 'Yaris Cross',
      leasePeriodMonths: 48,
      powertrainType: 'hybrid',
      variants: [
        {
          variantName: 'Dynamic CVT',
          engineSpecification: '1.5 Hybrid - 116 hk',
          transmission: 'cvt',
          pricing: {
            monthlyPayment: 4299,
            firstPayment: 12897,
            annualKilometers: 15000,
            co2TaxBiannual: 0
          }
        },
        {
          variantName: 'Style CVT',
          engineSpecification: '1.5 Hybrid - 116 hk',
          transmission: 'cvt',
          pricing: {
            monthlyPayment: 4699,
            firstPayment: 14097,
            annualKilometers: 15000,
            co2TaxBiannual: 0
          }
        }
      ]
    },
    {
      model: 'C-HR',
      leasePeriodMonths: 48,
      powertrainType: 'hybrid',
      variants: [
        {
          variantName: 'C-LUB CVT',
          engineSpecification: '1.8 Hybrid - 122 hk',
          transmission: 'cvt',
          pricing: {
            monthlyPayment: 5499,
            firstPayment: 16497,
            annualKilometers: 15000,
            co2TaxBiannual: 0
          }
        },
        {
          variantName: 'GR Sport CVT',
          engineSpecification: '2.0 Hybrid - 196 hk',
          transmission: 'cvt',
          pricing: {
            monthlyPayment: 6299,
            firstPayment: 18897,
            annualKilometers: 15000,
            co2TaxBiannual: 330
          }
        }
      ]
    }
  ],
  accessories: [
    {
      packageName: 'Vinterhjul 15"',
      monthlyCost: 299,
      category: 'wheels'
    },
    {
      packageName: 'Vinterhjul 16"',
      monthlyCost: 349,
      category: 'wheels'
    },
    {
      packageName: 'Vinterhjul 17"',
      monthlyCost: 399,
      category: 'wheels'
    },
    {
      packageName: 'Service & Vedligeholdelse',
      monthlyCost: 450,
      category: 'service'
    },
    {
      packageName: 'Kasko Forsikring',
      monthlyCost: 650,
      category: 'insurance'
    },
    {
      packageName: 'Ansvarsforsikring',
      monthlyCost: 150,
      category: 'insurance'
    }
  ]
}

/**
 * Sample content with validation issues for testing
 */
export const INVALID_CONTENT_SAMPLE = `
UnknownBrand SuperCar 2024

Model X Unknown Engine
Månedsydelse: 50 kr (too low)
Førstegangsydelse: -1000 kr (negative)

Electric Car without battery info
Månedsydelse: 100000 kr (too high)
CO2-udslip: 200 g/km (should be 0 for electric)
`

/**
 * Complex multi-dealer content for testing
 */
export const MULTI_DEALER_CONTENT = `
Toyota & BMW Partnership Leasing 2024
=====================================

Toyota Section:
---------------
Prius 1.8 Hybrid - 122 hk
Månedsydelse: 4.500 kr

BMW Section:
------------
iX xDrive40 - 326 hk (Elektrisk)
Månedsydelse: 12.500 kr
Batteristørrelse: 76,6 kWh

Note: This document contains mixed brand information
which should be handled appropriately by the extraction system.
`

/**
 * Test cases for various edge cases
 */
export const TEST_CASES = {
  minimal: 'BMW 3-Series',
  empty: '',
  longContent: 'A'.repeat(50000) + ' Toyota Camry 2024',
  specialCharacters: 'Citroën C3 Aircross 1.2 PureTech - 110 hk',
  missingPrices: `
    Audi A4
    ========
    
    A4 2.0 TFSI - 190 hk
    (Priser ikke tilgængelige)
  `,
  multipleModels: `
    Volkswagen Leasing 2024
    
    Golf 1.5 TSI - 130 hk: 4.200 kr/md
    Passat 2.0 TDI - 150 hk: 5.800 kr/md
    Tiguan 2.0 TSI - 190 hk: 6.500 kr/md
    ID.4 Pro - 204 hk (El): 7.200 kr/md
  `
} as const

/**
 * Cost testing scenarios
 */
export const COST_TEST_SCENARIOS = {
  lowCost: {
    content: 'Small test content',
    expectedTokens: 10,
    expectedCostCents: 1
  },
  mediumCost: {
    content: 'A'.repeat(4000) + ' Toyota detailed specifications',
    expectedTokens: 1000,
    expectedCostCents: 1
  },
  highCost: {
    content: 'A'.repeat(32000) + ' Comprehensive dealer catalog with all models',
    expectedTokens: 8000,
    expectedCostCents: 8
  }
} as const

/**
 * Validation test cases
 */
export const VALIDATION_TEST_CASES = {
  validData: EXPECTED_TOYOTA_RESULT,
  
  missingBrand: {
    ...EXPECTED_TOYOTA_RESULT,
    documentInfo: {
      ...EXPECTED_TOYOTA_RESULT.documentInfo,
      brand: ''
    }
  },
  
  invalidPricing: {
    ...EXPECTED_TOYOTA_RESULT,
    vehicles: [{
      ...EXPECTED_TOYOTA_RESULT.vehicles[0],
      variants: [{
        ...EXPECTED_TOYOTA_RESULT.vehicles[0].variants[0],
        pricing: {
          monthlyPayment: 50, // Too low
          firstPayment: -1000 // Negative
        }
      }]
    }]
  },
  
  electricWithoutBattery: {
    ...EXPECTED_TOYOTA_RESULT,
    vehicles: [{
      model: 'Tesla Model 3',
      leasePeriodMonths: 36,
      powertrainType: 'electric' as const,
      variants: [{
        variantName: 'Standard Range',
        engineSpecification: 'Electric Motor',
        transmission: 'automatic' as const,
        pricing: {
          monthlyPayment: 8000
        },
        specifications: {
          co2EmissionsGkm: 200, // Should be 0
          // Missing battery capacity
        }
      }]
    }]
  }
} as const