// Vehicle Extraction Context and Prompts
// Centralized location for all extraction-related prompt content

export const VARIANT_MATCHING_RULES = `🚨 MANDATORY 4-STEP PROCESS - FOLLOW EXACTLY 🚨

**Step 1:** For EACH car in the brochure:
- Find existing listing with same make, model, ±5 HP
- If found → USE THAT EXACT VARIANT NAME (copy character by character)
- Do NOT modify it (no adding/removing "Automatik", suffixes, etc.)

**Step 2:** Only create NEW variant if:
- HP differs by >10 from all existing
- Different trim level
- Different fuel type
- Same trim but with distinct factory equipment
- Different transmission type
- Different drivetrain

**Step 3:** When creating new variant:
- Find closest existing variant
- Copy its naming pattern EXACTLY
- For equipment: add " – " + equipment list

**Step 4:** Validate each extraction:
"Does this match an existing listing? Am I using the EXACT variant name?"`

export const EXTRACTION_RULES = `EXTRACTION RULES:
1. Extract ALL vehicles and ALL offers
2. Prices as numbers only (no "kr.", ",-")
3. Always "HK" for horsepower, never "kW"
4. Normalize brands ("Skoda" not "Škoda")
5. MERGE transmission variants (they're the same car)
6. CRITICAL: Group multiple pricing options for the same variant under ONE car entry
   - Same make/model/variant with different down payments = ONE car with multiple offers
   - Same make/model/variant with different contract terms = ONE car with multiple offers
   - Do NOT create separate car entries for different pricing of the same variant`

export const DANISH_TERMS = `DANISH TERMS TO EXTRACT:
- Monthly payment: "kr./md", "Ydelse pr. md"
- Down payment: "Førstegangsydelse", "Første betaling"
- Contract period: "36 måneder", "48 mdr"
- Annual mileage: "15.000 km/år", "20.000 km/år"
- Total price: "Totalpris"
- Horsepower: "HK" (never use kW)
- Technical specs: WLTP, CO2, fuel consumption, CO2 tax`

export const OFFERS_ARRAY_STRUCTURE = `OUTPUT FORMAT & OFFERS ARRAY STRUCTURE:

⚠️ CRITICAL: The "offers" array has EXACTLY 4 elements in this ORDER:
Position 0: monthly_price (månedlig ydelse) - The RECURRING payment (2,000-8,000 kr typical)
Position 1: down_payment (førstegangsydelse) - The INITIAL payment (0-50,000 kr typical)
Position 2: months (periode) - Contract duration (12, 24, 36, 48)
Position 3: km_per_year (km/år) - Annual mileage (10000, 15000, 20000, 25000, 30000)

Note: Total price is calculated automatically as (months × monthly_price) + down_payment`

export const EXAMPLE_OUTPUT = `EXAMPLE:
{
  "cars": [
    {
      "make": "Hyundai",
      "model": "Ioniq 6",
      "variant": "Advanced 229 HK",
      "hp": 229,
      "ft": 1,  // 1=Electric
      "tr": 1,  // 1=Automatic
      "bt": 3,  // 3=Sedan
      "wltp": 614,
      "co2": null,
      "kwh100": 14.3,
      "l100": null,
      "tax": 420,
      "offers": [
        [4995, 79135, 48, 15000]
      ]
    }
  ]
}`

/**
 * Build the extraction context with essential data only (instructions now in system prompt)
 */
export function buildExtractionContext(params: {
  dealerName?: string
  fileName?: string
  pdfText: string
  referenceData: string
  existingListings: string
}): string {
  const { dealerName, fileName, pdfText, referenceData, existingListings } = params
  
  return `Dealer: ${dealerName || 'Unknown'}
File: ${fileName || 'PDF Upload'}
${referenceData}
${existingListings}

PDF TEXT:
${pdfText}`
}

/**
 * Build the context for Chat Completions API (fallback)
 * Note: Chat Completions still needs full instructions since it doesn't use stored prompts
 */
export function buildChatCompletionsContext(params: {
  dealerName?: string
  fileName?: string
  pdfText: string
  referenceData: string
  existingListings: string
}): string {
  const { dealerName, fileName, pdfText, referenceData, existingListings } = params
  
  // Chat Completions needs the full context with instructions
  return `Extract vehicles from this PDF. Match variants to existing inventory when possible.

Dealer: ${dealerName || 'Unknown'}
File: ${fileName || 'PDF Upload'}
${referenceData}
${existingListings}

RULES:
1. Match existing variants exactly (±5 HP)
2. Create new variants only if >10 HP difference or different trim/equipment
3. Extract all offers per vehicle
4. Output JSON: {"cars":[{"make","model","variant","hp","ft","tr","bt","wltp","co2","kwh100","l100","tax","offers":[[monthly,down,months,km]]}]}

PDF TEXT:
${pdfText}`
}