# Batch Listing Creation - Multiple Cars, One Seller

This document describes the batch listing creation functionality that allows administrators to create multiple car listings at once using a single seller.

## Overview

The batch creation feature enables admins to:
1. **Select one seller** that will be applied to all listings
2. **Import multiple car JSON objects** (array or single object)
3. **Create all listings simultaneously** with progress tracking
4. **Handle errors gracefully** with detailed reporting

## Access

The batch creation functionality is available at:
- **URL**: `/admin/listings/batch`
- **Navigation**: Admin → Annoncer → "Batch Oprettelse" button

## Features

### 🚀 **Core Functionality**
- **Single Seller Selection**: Choose one seller for all cars in the batch
- **JSON Array Import**: Support for both `[{}, {}, ...]` and single `{}` formats
- **Real-time Validation**: Instant JSON parsing and validation
- **Progress Tracking**: Live progress updates during creation
- **Error Handling**: Continue processing even if some cars fail
- **Preview Mode**: Review all parsed cars before creation

### 📊 **Progress & Status**
- **Visual Progress Bar**: Shows completion percentage
- **Current Car Display**: Shows which car is being processed
- **Success/Error Counting**: Track successful vs failed creations
- **Detailed Error Messages**: Specific error details for debugging

### 🛡️ **Validation & Safety**
- **JSON Schema Validation**: Ensures data integrity
- **Batch Size Limits**: Maximum 50 cars per batch
- **Required Field Checking**: Validates all mandatory fields
- **Offer Validation**: Ensures each car has valid pricing

## Usage Instructions

### Step 1: Select Seller
1. Navigate to `/admin/listings/batch`
2. In the "Vælg Sælger" section, choose the seller for all listings
3. This seller will be automatically applied to every car in the batch

### Step 2: Prepare JSON Data
Format your data as either:

**Array Format (Multiple Cars):**
```json
[
  {
    "make": "Toyota",
    "model": "Corolla",
    "body_type": "Stationcar",
    "fuel_type": "Hybrid",
    "transmission": "Automatisk",
    "offers": [{"monthly_price": 3999, "period_months": 36}]
  },
  {
    "make": "Volkswagen",
    "model": "Golf",
    "body_type": "Hatchback",
    "fuel_type": "Benzin",
    "transmission": "Manual",
    "offers": [{"monthly_price": 4599, "period_months": 36}]
  }
]
```

**Single Object Format:**
```json
{
  "make": "BMW",
  "model": "X3",
  "body_type": "SUV",
  "fuel_type": "Diesel",
  "transmission": "Automatisk",
  "offers": [{"monthly_price": 5999, "period_months": 36}]
}
```

### Step 3: Import and Create
1. **Paste JSON** into the text area
2. **Click "Parse JSON"** to validate and preview
3. **Review parsed cars** in the preview section
4. **Click "Opret Alle"** to start batch creation
5. **Monitor progress** in real-time
6. **Review results** when complete

## JSON Format Requirements

### Required Fields (Per Car)
```json
{
  "make": "string",           // Car manufacturer
  "model": "string",          // Car model
  "body_type": "string",      // Body type
  "fuel_type": "string",      // Fuel type
  "transmission": "string",   // Transmission type
  "offers": [                 // Minimum 1 offer required
    {
      "monthly_price": number  // Required in each offer
    }
  ]
}
```

### Optional Fields (Per Car)
```json
{
  "variant": "string",
  "horsepower": number,
  "seats": number,
  "doors": number,
  "colour": "string",
  "description": "string",
  "co2_emission": number,
  "co2_tax_half_year": number,
  "consumption_l_100km": number,
  "consumption_kwh_100km": number,
  "wltp": number,
  "images": ["string"]        // Array of image URLs
}
```

### Important Notes
- **No seller_id needed**: Automatically applied from selection
- **Offer requirements**: Each car must have at least one offer with `monthly_price`
- **Batch limits**: Maximum 50 cars per batch
- **Processing time**: Large batches may take several minutes
- **Reference Data Matching**: All values for `make`, `model`, `body_type`, `fuel_type`, and `transmission` must match exactly with existing system reference data

## Technical Implementation

### Components Created

1. **BatchJsonImportSection** (`src/components/admin/listings/forms/BatchJsonImportSection.tsx`)
   - Main UI component for batch import
   - JSON validation and parsing
   - Car preview and management

2. **AdminBatchListings** (`src/pages/admin/AdminBatchListings.tsx`)
   - Full page interface for batch creation
   - Progress tracking and error display
   - Navigation and instructions

3. **useBatchListingCreation** (`src/hooks/useBatchListingCreation.ts`)
   - Custom hook for batch processing logic
   - Progress state management
   - Error handling and reporting

### Processing Flow

1. **Validation Phase**
   - Parse JSON structure
   - Validate required fields
   - Check offer data integrity
   - Preview parsed cars

2. **Creation Phase**
   - Load system reference data (makes, models, body types, etc.)
   - Convert text values to normalized database IDs
   - Process cars sequentially (not parallel)
   - Create listing record with proper foreign key references
   - Add offers for each listing
   - Handle images if provided
   - Track progress in real-time

3. **Completion Phase**
   - Invalidate relevant queries
   - Show success/error summary
   - Provide detailed error reporting

### Error Handling

- **Graceful Failures**: Continue processing if some cars fail
- **Detailed Errors**: Specific error messages for each failure
- **Transaction Safety**: Delete listing if offers fail to maintain consistency
- **Progress Continuation**: Don't stop batch for individual failures

## Performance Considerations

### Batch Processing
- **Sequential Processing**: Cars processed one at a time
- **Small Delays**: 200ms between cars to prevent database overload
- **Progress Feedback**: Real-time updates for user experience
- **Query Invalidation**: Refresh relevant data after completion

### Resource Management
- **Memory Efficient**: Process cars individually, not in bulk
- **Database Friendly**: Avoid overwhelming Supabase with concurrent requests
- **Error Recovery**: Clean up failed creations automatically

## Navigation Integration

### Admin Menu Access
- **Main Listings Page**: "Batch Oprettelse" button in header
- **Direct URL**: `/admin/listings/batch`
- **Breadcrumb Navigation**: Clear navigation path

### Related Features
- **Single Creation**: Link to regular form (`/admin/listings/create`)
- **View Listings**: Return to listings overview (`/admin/listings`)
- **Edit Individual**: Edit created listings individually

## Error Examples

### Common Validation Errors
```
"JSON parsing fejl: Unexpected token"           // Invalid JSON syntax
"Påkrævede felter mangler: make, model..."      // Missing required fields
"Bil 3: Mindst ét tilbud er påkrævet"          // Missing offers
"Maksimalt 50 biler kan importeres ad gangen"   // Batch too large
```

### Runtime Errors
```
"Fejl ved oprettelse af bil: Database error"                    // Database issues
"Fejl ved oprettelse af tilbud: Invalid data"                   // Offer creation failed
"Vælg venligst en sælger først"                                 // No seller selected
"Manglende reference data IDs for [car name]"                   // Reference data mismatch
"Reference data ikke indlæst"                                   // System reference data not loaded
```

## Future Enhancements

### Planned Features
- **Excel/CSV Import**: Support for spreadsheet data
- **Template System**: Predefined car templates
- **Bulk Image Upload**: Multiple image handling
- **Scheduled Processing**: Background batch processing
- **Export Results**: Download creation reports

### Performance Improvements
- **Parallel Processing**: Process multiple cars simultaneously
- **Chunk Processing**: Break large batches into smaller chunks
- **Background Jobs**: Queue large batches for background processing
- **Progress Persistence**: Resumable batch operations

## Troubleshooting

### Common Issues

**Q: Batch creation is slow**
A: Large batches process sequentially. Expected time: ~1-2 seconds per car.

**Q: Some cars fail to create**
A: Check error details in the results. Common issues: invalid data, missing offers, database constraints.

**Q: Progress stops unexpectedly**
A: Network issues or server errors. Refresh page and retry with smaller batch.

**Q: Seller selection doesn't work**
A: Ensure you have sellers in the system. Create sellers first if needed.

### Debugging Steps

1. **Validate JSON**: Use online JSON validator
2. **Check Required Fields**: Ensure all mandatory fields present
3. **Test Small Batch**: Try with 1-2 cars first
4. **Review Error Messages**: Check specific error details
5. **Contact Support**: If issues persist, provide error details