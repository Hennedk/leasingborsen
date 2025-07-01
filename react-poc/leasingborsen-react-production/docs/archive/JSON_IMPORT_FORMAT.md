# JSON Import Format for Admin Car Form

This document describes the JSON format for importing car data into the admin interface's "Add Car" form.

## Overview

The JSON import functionality allows administrators to quickly fill out the car form by pasting structured JSON data. This is particularly useful for bulk data entry or when integrating with external systems.

## Access

The JSON import functionality is available in two places:

### Single Car Import
- **Location**: Top of the "Add Car" form (`/admin/listings/new`)
- **Purpose**: Import data for one car listing
- **Features**: Auto-fill form fields with JSON data

### Batch Car Import  
- **Location**: Batch creation page (`/admin/listings/batch`)
- **Purpose**: Create multiple car listings with one seller
- **Features**: Import array of cars, progress tracking, error handling

## JSON Format Specification

### Required Fields

```json
{
  "make": "string",           // Car manufacturer (e.g., "Toyota")
  "model": "string",          // Car model (e.g., "Corolla")
  "body_type": "string",      // Body type (e.g., "Stationcar", "Sedan")
  "fuel_type": "string",      // Fuel type (e.g., "Hybrid", "Benzin", "Diesel")
  "transmission": "string",   // Transmission type (e.g., "Automatisk", "Manual")
  "offers": [                 // Array of lease offers (minimum 1 required)
    {
      "monthly_price": number,        // Monthly lease price (required)
      "first_payment": number,        // Down payment (optional)
      "period_months": number,        // Lease period in months (optional)
      "mileage_per_year": number      // Annual mileage allowance (optional)
    }
  ]
}
```

### Optional Fields

#### Basic Information
```json
{
  "variant": "string",        // Car variant (e.g., "Hybrid", "Sport")
  "year": number,             // Model year
  "horsepower": number,       // Engine horsepower
  "seats": number,            // Number of seats (2-9)
  "doors": number,            // Number of doors (2-5)
  "colour": "string",         // Car color
  "description": "string"     // Car description (max 1000 characters)
}
```

#### Technical Specifications
```json
{
  "mileage": number,                    // Current mileage
  "co2_emission": number,               // CO2 emissions (g/km)
  "co2_tax_half_year": number,         // CO2 tax per half year (DKK)
  "consumption_l_100km": number,        // Fuel consumption (L/100km)
  "consumption_kwh_100km": number,      // Electric consumption (kWh/100km)
  "wltp": number,                      // WLTP range (km)
  "drive_type": "fwd|rwd|awd"          // Drive type
}
```

#### Seller Information
```json
{
  "seller_id": "string"       // UUID of the seller
}
```

#### Media
```json
{
  "images": ["string"]        // Array of image URLs
}
```

## Complete Example

```json
{
  "make": "Toyota",
  "model": "Corolla",
  "variant": "Hybrid",
  "body_type": "Stationcar",
  "fuel_type": "Hybrid",
  "transmission": "Automatisk",
  "year": 2023,
  "horsepower": 122,
  "seats": 5,
  "doors": 5,
  "colour": "Hvid",
  "mileage": 15000,
  "co2_emission": 98,
  "co2_tax_half_year": 1200,
  "consumption_l_100km": 4.2,
  "wltp": 850,
  "description": "Flot Toyota Corolla Hybrid i perfekt stand med fuld servicehistorik",
  "seller_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "images": [
    "https://example.com/car-image-1.jpg",
    "https://example.com/car-image-2.jpg",
    "https://example.com/car-image-3.jpg"
  ],
  "offers": [
    {
      "monthly_price": 3999,
      "first_payment": 0,
      "period_months": 36,
      "mileage_per_year": 15000
    },
    {
      "monthly_price": 3599,
      "first_payment": 25000,
      "period_months": 36,
      "mileage_per_year": 15000
    },
    {
      "monthly_price": 3299,
      "first_payment": 50000,
      "period_months": 36,
      "mileage_per_year": 15000
    }
  ]
}
```

## Usage Instructions

1. **Navigate** to the admin interface (`/admin/listings/new`)
2. **Locate** the "JSON Data Import" section at the top of the form
3. **Click** "Vis Eksempel" to see the format or use the example
4. **Paste** your JSON data into the text area
5. **Click** "Importer Data" to validate and import the data
6. **Review** the imported data in the form fields below
7. **Complete** any missing required fields if needed
8. **Submit** the form as usual

## Validation Rules

- **JSON Syntax**: Must be valid JSON format
- **Required Fields**: `make`, `model`, `body_type`, `fuel_type`, `transmission` must be present
- **Offers**: At least one offer with a valid `monthly_price` is required
- **Numbers**: Numeric fields must be within acceptable ranges:
  - `horsepower`: 0-2000
  - `seats`: 2-9  
  - `doors`: 2-5
  - `monthly_price`: 1-50,000 DKK
  - `first_payment`: 0-500,000 DKK
  - `period_months`: 1-120
  - `mileage_per_year`: 5,000-50,000 km
- **Strings**: Text fields have maximum length limits (description: 1000 characters)
- **URLs**: Image URLs must be valid HTTP/HTTPS URLs

## Error Handling

The system provides Danish error messages for:
- Invalid JSON syntax
- Missing required fields
- Invalid data types or ranges
- Malformed URLs

Common errors:
- `"JSON parsing fejl: Unexpected token"` - Invalid JSON syntax
- `"Påkrævede felter mangler: make, model..."` - Missing required fields
- `"Alle tilbud skal have en gyldig monthly_price"` - Invalid offer data

## Integration Notes

### For Developers
- The imported data is validated using Zod schemas
- Form fields are populated using React Hook Form's `setValue`
- Offers data is passed to the parent component for handling after listing creation
- The component is fully TypeScript typed for safety

### For External Systems
- Ensure all required fields are included
- Use Danish text for `body_type`, `fuel_type`, and `transmission` values
- Price values should be in Danish Kroner (DKK)
- Image URLs should be publicly accessible

## Supported Values

### Body Types (body_type)
Common values: `"Stationcar"`, `"Hatchback"`, `"Sedan"`, `"SUV"`, `"Coupe"`, `"Cabriolet"`

### Fuel Types (fuel_type)
Common values: `"Benzin"`, `"Diesel"`, `"Hybrid"`, `"El"`, `"Plug-in Hybrid"`

### Transmissions (transmission)
Common values: `"Manual"`, `"Automatisk"`, `"CVT"`

### Drive Types (drive_type)
Allowed values: `"fwd"` (front-wheel drive), `"rwd"` (rear-wheel drive), `"awd"` (all-wheel drive)

## Troubleshooting

**Data not appearing in form fields?**
- Check that JSON is valid using a JSON validator
- Ensure all required fields are present
- Verify field names match exactly (case-sensitive)

**Import button disabled?**
- Make sure the text area contains data
- Check for JSON syntax errors

**Offers not being imported?**
- Offers are handled separately and will be available after the listing is created
- Ensure each offer has a valid `monthly_price`

**Validation errors?**
- Review the specific error message in Danish
- Check that numeric values are within allowed ranges
- Verify that required fields contain valid data