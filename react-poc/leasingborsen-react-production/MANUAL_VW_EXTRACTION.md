# Manual VW Data Extraction - Expected Results

## Expected Data Structure

### 1. T-Roc
- **Model**: "T-Roc"
- **Variant**: "R-Line Black Edition 1.5 TSI EVO ACT DSG7"
- **Horsepower**: 150
- **CO₂**: 144 g/km
- **Fuel Consumption**: 15.9 km/l
- **CO₂ Tax**: 730 kr (half year)
- **Pricing Options**:
  1. 10,000 km/år, 12 mdr → 3,695 kr/month
  2. 15,000 km/år, 12 mdr → 3,795 kr/month  
  3. 20,000 km/år, 12 mdr → 3,895 kr/month

### 2. ID.3
- **Model**: "ID.3"
- **Variant**: "Pro S 150 kW"
- **Horsepower**: 204
- **Range**: 455 km
- **Electric Consumption**: 19.2 kWh/100km
- **Is Electric**: true
- **Pricing Options**:
  1. 10,000 km/år, 12 mdr → 5,095 kr/month
  2. 15,000 km/år, 12 mdr → 5,295 kr/month
  3. 20,000 km/år, 12 mdr → 5,495 kr/month

### 3. ID.4 (Pro)
- **Model**: "ID.4"
- **Variant**: "Pro 150 kW"
- **Horsepower**: 204
- **Range**: 358 km
- **Electric Consumption**: 21.3 kWh/100km
- **Is Electric**: true
- **Pricing Options**:
  1. 10,000 km/år, 12 mdr → 5,195 kr/month
  2. 15,000 km/år, 12 mdr → 5,395 kr/month

### 4. ID.4 (Pro Max)
- **Model**: "ID.4"
- **Variant**: "Pro Max 210 kW"
- **Horsepower**: 286
- **Range**: 358 km
- **Electric Consumption**: 21.8 kWh/100km
- **Is Electric**: true
- **Pricing Options**:
  1. 10,000 km/år, 12 mdr → 6,095 kr/month
  2. 15,000 km/år, 12 mdr → 6,295 kr/month

### 5. Passat Variant
- **Model**: "Passat Variant"
- **Variant**: "eHybrid R-Line 1.4 TSI DSG6"
- **Horsepower**: 218
- **CO₂**: 26 g/km
- **Fuel Consumption**: 50.0 km/l
- **CO₂ Tax**: 160 kr (half year)
- **Pricing Options**:
  1. 10,000 km/år, 12 mdr → 4,195 kr/month
  2. 15,000 km/år, 12 mdr → 4,395 kr/month
  3. 20,000 km/år, 12 mdr → 4,595 kr/month

### 6. Tiguan
- **Model**: "Tiguan"
- **Variant**: "Elegance 1.5 TSI EVO ACT DSG7"
- **Horsepower**: 150
- **CO₂**: 149 g/km
- **Fuel Consumption**: 15.4 km/l
- **CO₂ Tax**: 760 kr (half year)
- **Pricing Options**:
  1. 10,000 km/år, 12 mdr → 4,295 kr/month
  2. 15,000 km/år, 12 mdr → 4,495 kr/month

## Expected Final Output

**Total Expected Listings**: 15 individual listings
- T-Roc: 3 listings (1 variant × 3 pricing options)
- ID.3: 3 listings (1 variant × 3 pricing options)
- ID.4 Pro: 2 listings (1 variant × 2 pricing options)
- ID.4 Pro Max: 2 listings (1 variant × 2 pricing options)
- Passat Variant: 3 listings (1 variant × 3 pricing options)
- Tiguan: 2 listings (1 variant × 2 pricing options)

**Models**: 5 unique models
**Variants**: 6 unique variants
**Electric Models**: 3 (ID.3, ID.4 Pro, ID.4 Pro Max)
**Conventional Models**: 3 (T-Roc, Passat Variant, Tiguan)

## Current Issue

The regex patterns are finding the right number of lines but capturing groups are undefined:
- ✅ 5 model headers found
- ✅ 15 pricing lines found  
- ❌ Only 3 variants found (should be 6)
- ❌ All captured groups return undefined

**Root Cause**: Regex patterns need fixing to properly capture the groups.