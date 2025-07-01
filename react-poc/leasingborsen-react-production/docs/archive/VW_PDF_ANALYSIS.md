# Volkswagen PDF Analysis - Real Structure

Based on analysis of `VolkswagenLeasingpriser.pdf`, here's the actual data structure we need to handle:

## 📊 Actual VW PDF Structure

### **Model Organization**
The PDF is organized by **model sections**, each with a header like:
- `T-Roc leasingpriser`
- `ID.3 leasingpriser` 
- `ID.4 leasingpriser`
- `Passat Variant leasingpriser`
- `Tiguan leasingpriser`

### **Variant Structure Per Model**
Each model has multiple variants/trim levels, structured as:

```
R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk
CO₂: 144 g/km | Forbrug: 15,9 km/l | Halvårlig CO₂-ejerafgift : 730 kr.

KørselsbehovLeasingperiodeTotalomkostningerMindstepris 12 mdr.UdbetalingMånedlig ydelse
10.000 km/år12 mdr.49.940 kr.49.940 kr.5.000 kr.3.695 kr.
15.000 km/år12 mdr.52.340 kr.52.340 kr.5.000 kr.3.895 kr.
20.000 km/år12 mdr.54.740 kr.54.740 kr.5.000 kr.4.095 kr.
25.000 km/år12 mdr.57.140 kr.57.140 kr.5.000 kr.4.295 kr.
```

### **Data Structure Insights**

#### **1. Model Headers**
Pattern: `{Model} leasingpriser`
- Examples: `T-Roc leasingpriser`, `ID.3 leasingpriser`
- These indicate start of new model section

#### **2. Variant/Trim Lines**
Pattern: Complex engine/trim descriptions
- `R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk`
- `Life+ 286 hk` (for electric ID models)
- `Style+ 286 hk`

#### **3. Technical Specs Lines**
Pattern: Environmental and engine data
- `CO₂: 144 g/km | Forbrug: 15,9 km/l | Halvårlig CO₂-ejerafgift : 730 kr.`
- `Rækkevidde: 455 km | Forbrug: 19,2 kWh/100km` (for electric)

#### **4. Pricing Table Headers**
Standard header (can be ignored):
`KørselsbehovLeasingperiodeTotalomkostningerMindstepris 12 mdr.UdbetalingMånedlig ydelse`

#### **5. Pricing Data Lines**
Pattern: `{mileage} km/år{period} mdr.{total} kr.{min_price} kr.{deposit} kr.{monthly} kr.`
- `10.000 km/år12 mdr.49.940 kr.49.940 kr.5.000 kr.3.695 kr.`
- `15.000 km/år36 mdr.194.620 kr.81.940 kr.25.000 kr.4.695 kr.`

## 🎯 Extraction Strategy

### **Hierarchical Parsing Approach**
1. **Find Model Sections**: Look for `{word} leasingpriser` headers
2. **Extract Variants**: Lines with complex trim/engine descriptions
3. **Parse Pricing**: Extract tabular pricing data following each variant
4. **Technical Specs**: Extract CO₂, fuel consumption, etc.

### **Key Data Points Per Listing**
```typescript
interface VWListingData {
  // Model identification
  model: string              // "T-Roc", "ID.3", etc.
  variant: string            // "R-Line Black Edition 1.5 TSI EVO ACT DSG7"
  horsepower: number         // 150
  
  // Technical specs
  co2_emission: number       // 144 (g/km)
  fuel_consumption: string   // "15,9 km/l" or "19,2 kWh/100km"
  co2_tax_half_year: number  // 730 (kr)
  
  // Pricing options (multiple per variant)
  pricing_options: Array<{
    mileage_per_year: number    // 10000, 15000, etc.
    period_months: number       // 12, 36, 48
    total_cost: number          // 49940
    min_price_12_months: number // 49940  
    deposit: number             // 5000
    monthly_price: number       // 3695
  }>
}
```

## 🔍 Updated Regex Patterns

### **Model Section Headers**
```typescript
const MODEL_HEADER = /^(.+?)\s+leasingpriser$/gm
// Matches: "T-Roc leasingpriser" → captures "T-Roc"
```

### **Variant Lines**
```typescript
const VARIANT_LINE = /^(.+?)\s+(\d+)\s+hk$/gm
// Matches: "R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk"
// Captures: variant + horsepower
```

### **Technical Specs**
```typescript
const CO2_SPECS = /CO₂:\s*(\d+)\s*g\/km.*?(\d+[.,]?\d*)\s*km\/l.*?(\d+)\s*kr\./g
// Captures: CO₂ emission, fuel consumption, CO₂ tax

const ELECTRIC_SPECS = /Rækkevidde:\s*(\d+)\s*km.*?(\d+[.,]?\d*)\s*kWh\/100km/g
// For electric vehicles
```

### **Pricing Lines**
```typescript
const PRICING_LINE = /^(\d{1,2}[.,]?\d{3})\s*km\/år(\d+)\s*mdr\.(.+?)(\d{1,3}[.,]?\d{3})\s*kr\.$/gm
// Matches: "10.000 km/år12 mdr.49.940 kr.49.940 kr.5.000 kr.3.695 kr."
// Captures: mileage, period, prices
```

## 🏗️ Implementation Strategy

### **1. Section-Based Parsing**
- Split PDF into model sections using model headers
- Process each section independently
- Extract variants and pricing within each section

### **2. Context-Aware Extraction** 
- Track current model context while parsing
- Associate variants and pricing with correct model
- Handle multi-variant models (e.g., ID.4 has multiple variants)

### **3. Data Normalization**
- Convert comma-separated numbers (49.940) to integers (49940)
- Standardize fuel types (TSI = benzin, TDI = diesel, hk = electric)
- Extract engine size from variant descriptions

### **4. Quality Validation**
- Ensure pricing makes sense (monthly price < total cost)
- Validate mileage ranges (10,000-30,000 km typical)
- Check period options (12, 36, 48 months standard)

## 📈 Expected Extraction Results

From the sample PDF, we should extract approximately:
- **6-8 VW models**: T-Roc, ID.Buzz, ID.3, ID.4, Passat Variant, Tiguan
- **2-4 variants per model**: Different trim levels and engines
- **3-4 pricing options per variant**: Different mileage/period combinations
- **Total listings**: ~50-80 individual lease options

This gives us a rich dataset for testing our batch processing system with realistic VW data.