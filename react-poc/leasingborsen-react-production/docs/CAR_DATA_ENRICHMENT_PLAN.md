# Car Data Enrichment Plan - Comprehensive Web Data Integration

**Created**: 2025-08-09  
**Status**: Planning Phase  
**Priority**: High MVP Feature  

## Executive Summary

This plan outlines a comprehensive strategy to enrich car listings in the Leasingbørsen platform by fetching missing technical specifications from web sources, with focus on Danish dealer websites and official manufacturer sources. The goal is to populate 100% null fields across 29 listings with accurate technical data and AI-generated Danish descriptions.

## Current Data State Analysis

### Database Analysis Results
- **Total Listings**: 29 cars (primarily Toyota, 1 Volkswagen)
- **Critical Data Gaps**: Nearly 100% missing data across all technical fields
- **Missing Fields Per Listing**:
  - Description: 29/29 (100%)
  - Horsepower: 29/29 (100%)
  - WLTP Range: 29/29 (100%)
  - CO2 Emissions: 29/29 (100%)
  - Doors: 29/29 (100%)
  - Seats: 29/29 (100%)
  - Year: 28/29 (96%)
  - Fuel/Energy Consumption: 29/29 (100%)

### Listing Distribution
```
Toyota Models (28 listings):
├── AYGO X (4 variants)
├── bZ4X Electric (7 variants)
├── Corolla Cross (3 variants)
├── Urban Cruiser (2 variants)
├── Yaris (4 variants)
└── Yaris Cross (8 variants)

Volkswagen Models (1 listing):
└── Golf Style 1.5 TSI
```

## Data Sources Strategy

### 1. Primary Sources: Official Manufacturer Websites

#### Toyota Danmark (toyota.dk)
**Accessibility**: ✅ Confirmed accessible with comprehensive WLTP data
**Data Available**:
- Complete technical specifications with WLTP certification
- CO2 emissions (g/km)
- Engine power (HP)
- Fuel consumption (km/l or kWh/100km)
- Dimensions (L×W×H)
- Seats, doors, transmission details
- Battery capacity (for EVs)
- Range data (WLTP certified)

**Example Data Retrieved**:
```
Toyota Corolla Touring Sports:
- Horsepower: 140 hp
- CO2: 101 g/km (WLTP)
- Consumption: 22.2 km/l
- Seats: 5
- Engine: 1.8L Hybrid + 70 kW electric
```

#### Volkswagen Danmark (volkswagen.dk)
**Accessibility**: ✅ Confirmed accessible with WLTP data
**Data Available**:
- Technical specifications with WLTP certification
- Electric vehicle consumption (kWh/100km)
- Range data for EVs
- CO2 emissions and tax information
- Complete powertrain specifications

**Example Data Retrieved**:
```
ID.4 GTX:
- Power: 340 hp
- Consumption: 17.2 kWh/100km
- Range: 517 km (WLTP)
- CO2: 0 g/km
- CO2 Owner Tax: 420 kr/half-year
```

### 2. Fallback Sources: Third-Party Databases

#### Auto-Data.net API
- **Coverage**: 54,000+ vehicle specifications
- **Status**: Commercial API (pricing required)
- **Use Case**: Fallback for missing manufacturer data

#### NHTSA vPIC API
- **Coverage**: Free US government database
- **Status**: Free access available
- **Limitation**: Primarily US market data
- **Use Case**: Basic specifications backup

### 3. Data Scraping Strategy

#### Web Scraping Approach
1. **Structured Data Extraction**: Parse manufacturer specification pages
2. **WLTP Compliance**: Prioritize WLTP-certified emissions and consumption data
3. **Danish Market Focus**: Ensure data relevance to Danish market
4. **Data Validation**: Cross-reference multiple sources for accuracy

## Technical Implementation Plan

### Phase 1: Data Enrichment Infrastructure

#### 1.1 Create Edge Function: `enrich-listings-data`
```typescript
Location: supabase/functions/enrich-listings-data/index.ts

Capabilities:
- Web scraping of manufacturer websites
- API integration with external data sources
- Data parsing and validation
- Batch processing of multiple listings
- Error handling and retry logic
```

#### 1.2 Create Data Mapping Service
```typescript
Location: src/services/dataEnrichmentService.ts

Functions:
- mapManufacturerData(): Map scraped data to database schema
- validateTechnicalSpecs(): Ensure data accuracy and consistency
- formatDanishData(): Apply Danish localization (units, formatting)
- handleVariantMatching(): Match listing variants to manufacturer specs
```

### Phase 2: Danish Description Generation System

#### 2.1 AI Description Generator
```typescript
Location: supabase/functions/generate-danish-descriptions/index.ts

Features:
- OpenAI GPT-4 integration for Danish content generation
- Template-based description structure
- Personal, informal tone targeting age 30-50 demographic
- Technical specification integration
- Brand voice consistency
```

#### 2.2 Description Generation Prompt Template
```
You are an assistant helping to write short, personal, and practical Danish descriptions for car leasing listings. Your task is to write a brief, everyday description for each car trim, so that potential private leasing customers (age 30–50) quickly understand what makes the car and trim relevant for their daily life.

Guidelines:
- Write in Danish
- Keep it short (2-3 sentences)
- Use informal and personal tone, as if recommending to a friend
- Focus on comfort, daily usability, and unique trim features
- No sales slogans or heavy technical details

Input Data:
- Make: {make}
- Model: {model}
- Trim: {variant}
- Horsepower: {horsepower}
- Range/Consumption: {wltp_data}
- Key Features: {key_equipment}
```

### Phase 3: Batch Update System

#### 3.1 Supabase Integration
```sql
-- New table for tracking enrichment status
CREATE TABLE listing_enrichment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(listing_id),
  enrichment_date TIMESTAMP DEFAULT NOW(),
  data_source VARCHAR(100),
  fields_updated TEXT[],
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2 Edge Function: `batch-enrich-listings`
```typescript
Location: supabase/functions/batch-enrich-listings/index.ts

Process:
1. Query all listings with null technical fields
2. Group by make/model for efficient processing
3. Call data enrichment service for each group
4. Generate Danish descriptions using AI
5. Update database with enriched data
6. Log all operations for tracking
7. Handle errors gracefully with retry logic
```

## Data Enrichment Workflow

### Step-by-Step Process

#### 1. Data Discovery Phase
```typescript
// Identify listings needing enrichment
const listingsToEnrich = await supabase
  .from('full_listing_view')
  .select('*')
  .or('description.is.null,horsepower.is.null,wltp.is.null,co2_emission.is.null')
```

#### 2. Manufacturer Data Fetching
```typescript
// For each make/model/variant combination:
const specs = await fetchManufacturerSpecs({
  make: 'Toyota',
  model: 'bZ4X',
  variant: 'Active 73,1 kWh 224HK',
  market: 'Denmark'
})
```

#### 3. Data Processing & Validation
```typescript
const enrichedData = {
  horsepower: extractHorsepower(specs),
  wltp: extractWLTPRange(specs),
  co2_emission: extractCO2Emissions(specs),
  doors: extractDoors(specs),
  seats: extractSeats(specs),
  consumption_kwh_100km: extractConsumption(specs)
}
```

#### 4. Danish Description Generation
```typescript
const description = await generateDanishDescription({
  make: listing.make,
  model: listing.model,
  variant: listing.variant,
  specifications: enrichedData,
  target_audience: 'private_lease_30_50'
})
```

#### 5. Database Update
```typescript
await supabase
  .from('listings')
  .update({
    ...enrichedData,
    description: description,
    updated_at: new Date().toISOString()
  })
  .eq('listing_id', listing.listing_id)
```

## Quality Assurance Strategy

### Data Validation Rules
1. **Horsepower Range**: 50-600 HP for reasonable validation
2. **CO2 Emissions**: 0-400 g/km range validation
3. **WLTP Range**: 50-800 km for electric vehicles
4. **Consumption Validation**: Reasonable fuel/energy consumption ranges
5. **Seat Count**: 2-8 seats validation
6. **Door Count**: 3-5 doors validation

### Description Quality Controls
1. **Length**: 2-3 sentences (50-200 characters)
2. **Language**: Danish only with proper grammar
3. **Tone**: Informal, personal, friendly
4. **Content**: Focus on practical benefits, not technical jargon
5. **Accuracy**: Align with actual specifications

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create data enrichment Edge Function
- [ ] Implement Toyota.dk scraping
- [ ] Test data extraction and validation
- [ ] Create enrichment logging system

### Phase 2: Core Features (Week 2)
- [ ] Add Volkswagen.dk support
- [ ] Implement AI description generation
- [ ] Create batch processing system
- [ ] Add error handling and retry logic

### Phase 3: Quality & Scale (Week 3)
- [ ] Add fallback API sources (Auto-Data.net, NHTSA)
- [ ] Implement comprehensive validation
- [ ] Create admin monitoring interface
- [ ] Performance optimization

### Phase 4: Production Deployment (Week 4)
- [ ] Full testing across all 29 listings
- [ ] Performance monitoring
- [ ] Documentation completion
- [ ] Production deployment

## Success Metrics

### Data Completion Targets
- **Primary Goal**: 100% technical specifications completion
- **Description Quality**: 95%+ Danish description accuracy
- **Performance**: <30 seconds per listing enrichment
- **Reliability**: 99%+ successful enrichment rate

### Monitoring Dashboard
```typescript
// Admin interface metrics
interface EnrichmentMetrics {
  totalListings: number
  enrichedListings: number
  completionPercentage: number
  failedEnrichments: number
  averageProcessingTime: number
  lastEnrichmentDate: string
  dataSourceBreakdown: {
    toyota_dk: number
    volkswagen_dk: number
    api_fallback: number
  }
}
```

## Risk Mitigation

### Technical Risks
1. **Website Structure Changes**: Regular monitoring of scraping targets
2. **API Rate Limits**: Implement throttling and retry logic
3. **Data Accuracy**: Multi-source validation
4. **Performance Issues**: Batch processing optimization

### Business Risks
1. **Data Legal Compliance**: Ensure fair use of manufacturer data
2. **Danish Language Quality**: Human review of AI-generated descriptions
3. **User Experience**: Maintain fast listing load times
4. **Data Freshness**: Regular re-enrichment schedule

## Budget Considerations

### AI Costs (OpenAI GPT-4)
- **Description Generation**: ~$0.03 per listing
- **Monthly Total**: ~$1 for 29 listings
- **Annual Estimate**: ~$12 for current volume

### Infrastructure Costs
- **Edge Functions**: Included in Supabase plan
- **External APIs**: $0-500/month depending on usage
- **Development Time**: 3-4 weeks initial implementation

## Long-term Maintenance

### Regular Updates
- **Monthly**: Re-scrape manufacturer data for accuracy
- **Quarterly**: Review and update description templates
- **Annually**: Evaluate new data sources and APIs

### Scaling Considerations
- **New Manufacturers**: Easy addition of new scraping targets
- **Increased Volume**: Batch processing supports high volume
- **International Markets**: Template system supports new languages

## Conclusion

This comprehensive plan provides a robust foundation for enriching all car listings in the Leasingbørsen platform with accurate technical specifications and engaging Danish descriptions. The multi-source approach ensures data reliability while the AI-powered description generation maintains quality and consistency at scale.

The implementation prioritizes Danish manufacturer websites for accuracy and relevance while providing fallback options for comprehensive coverage. The phased approach allows for iterative improvement and quality assurance throughout the development process.

## Next Steps

1. **User Approval**: Review and approve this comprehensive plan
2. **Development Kickoff**: Begin Phase 1 implementation
3. **Testing Strategy**: Set up testing environment with subset of listings
4. **Stakeholder Communication**: Update team on timeline and expectations

---

**Document Status**: Draft for Review  
**Last Updated**: 2025-08-09  
**Next Review**: After user approval  