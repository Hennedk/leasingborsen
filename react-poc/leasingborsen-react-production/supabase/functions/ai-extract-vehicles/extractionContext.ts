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

**VARIANT LOGIC:**
- Only create new variants when they are truly different (by HP >10, trim, fuel type, transmission, drivetrain, or distinct equipment)
- Merge transmission variants—never split "X" from "X Automatik"
- If both "X" and "X Automatik" variants are present for otherwise identical cars (same make, model, HP, equipment, etc.), merge into a single entry and use the base variant name (without "Automatik"). Transmission differences must be indicated using the tr field only
- Equipment differentiation:
  * For the base version, use the variant name as-is
  * For versions with additional equipment, append " - " followed by a comma-separated list of all equipment items
  * If equipment formatting is inconsistent (e.g., slashes, semicolons, or line breaks), extract all as listed and join with commas. Remove duplicate equipment items
- Never invent or guess makes, models, or body types. Only use those provided in the dynamic data blocks (ALLOWED_MODELS, etc.)

**OFFER EXTRACTION & EXPANSION:**
- Extract all leasing offers for each car
- CRITICAL: Group multiple pricing options for the same variant under a single car entry
- For different down payments, contract terms, or mileage allowances, group all as offers within the same car object

**VARIANT ISOLATION FOR MILEAGE SUPPLEMENTS:**
⚠️ CRITICAL: When processing PDFs with multiple car variants, you MUST isolate mileage supplements per specific variant
- For "merpris" (additional mileage supplement) text:
  * Carefully identify which mileage supplements apply to which specific car variant
  * For each base offer of a specific variant, expand ONLY using that variant's associated mileage supplements  
  * NEVER mix supplements from different variants - each variant has its own supplement structure
  * If supplement text appears near or under a specific variant, apply ONLY to that variant
  * If supplement text is global (applies to all variants), apply the same supplements to all variants consistently
  * Each resulting offer must be a unique [monthly_price, down_payment, months, km_per_year] combination
  * Always include the base offer (without supplement) for the base mileage

**PREVENTING CROSS-CONTAMINATION:**
- When processing Ford Capri Select RWD SR 170 HK, use ONLY the supplements specifically associated with this variant
- When processing Ford Capri Select RWD UR 286 HK, use ONLY the supplements specifically associated with this variant  
- When processing Ford Capri Select AWD UR 340 HK, use ONLY the supplements specifically associated with this variant
- Do not accidentally apply one variant's 25k/30k km supplements to another variant's base prices

- Do not create separate car entries for different pricing options

**FORMATTING AND CODES:**
- Use numeric codes for fuel type (ft), transmission (tr), and body type (bt) as defined below
- Always use "HK" for horsepower
- For all currency or price fields, use integers without thousands separators or currency symbols (e.g., 4500 not 4.500 kr.)
- Use a period (.) as the decimal separator
- For missing or illegible required fields, use null`

export const DANISH_TERMS = `DANISH TERMS TO EXTRACT:
- Monthly payment: "kr./md", "Ydelse pr. md"
- Down payment: "Førstegangsydelse", "Første betaling"
- Contract period: "36 måneder", "48 mdr"
- Annual mileage: "15.000 km/år", "20.000 km/år"
- Total price: "Totalpris"
- Horsepower: "HK" (never use kW)
- Technical specs: WLTP, CO2, fuel consumption, CO2 tax

**MERPRIS & SUPPLEMENT PATTERNS:**
- Supplements: "Merpris", "Tillæg", "Ekstra", "Supplerende", "Yderligere"
- Mileage conditions: "for X km/år", "ved X km", "pr. år", "årligt"
- Pattern examples:
  * "Merpris for 15.000 km pr. år: 350 kr./md."
  * "og 20.000 km: 700 kr./md."
  * "Tillæg ved 25.000 km: 1.150 kr./md."
  * "30.000 km: 1.600 kr./md."
- Multiple supplements in sequence: "15.000 km: +350kr, 20.000 km: +700kr, 25.000 km: +1150kr"
- Conditional pricing: "hvis", "ved", "for", "med"`

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

export const MERPRIS_EXPANSION_EXAMPLES = `MERPRIS EXPANSION EXAMPLES:

**Scenario 1: Ford Explorer with Merpris Supplements**
PDF Text: "Merpris for 15.000 km pr. år: 350 kr./md. og 20.000 km: 700 kr./md. Merpris for 25.000 km pr. år: 1.150 kr./md. og 30.000 km: 1.600 kr./md."

Base offers from table:
- [4395, 89000, 48, 10000] (10,000 km base)

Expansion with merpris:
- [4395, 89000, 48, 10000]  // Base offer (no supplement)
- [4745, 89000, 48, 15000]  // Base + 350 kr for 15,000 km
- [5095, 89000, 48, 20000]  // Base + 700 kr for 20,000 km
- [5545, 89000, 48, 25000]  // Base + 1,150 kr for 25,000 km
- [5995, 89000, 48, 30000]  // Base + 1,600 kr for 30,000 km

Result: 1 base offer expands to 5 total offers

**Scenario 2: Multiple Base Offers with Merpris**
If PDF has 4 base offers (different down payments/terms) and same merpris text:
- 4 base offers × 5 mileage options = 20 total offers per car
- Each base offer gets expanded with all 5 mileage variants

**Scenario 3: Transmission Merge**
PDF shows:
- "Explorer Premium 286 HK" 
- "Explorer Premium Automatik 286 HK"

Result: Single variant "Explorer Premium 286 HK" with tr=1 (automatic)

**Scenario 4: Equipment Differentiation**
PDF shows:
- "Explorer Premium 286 HK" (base)
- "Explorer Premium 286 HK med solvarme, navigation" (with equipment)

Result: Two variants:
- "Explorer Premium 286 HK" (base version)
- "Explorer Premium 286 HK - solvarme, navigation" (equipment version)

**Scenario 5: Multi-Variant Supplement Isolation (CRITICAL)**
PDF with multiple Ford Capri variants:

Ford Capri Select RWD SR 170 HK
Base offers: [4995, 4995, 36, 10000], [4895, 14995, 36, 10000], [4095, 29995, 36, 10000], [3395, 49995, 36, 10000]
Merpris: 15k: +350kr, 20k: +700kr, 25k: +1150kr, 30k: +1600kr

Ford Capri Select RWD UR 286 HK  
Base offers: [5495, 4995, 36, 10000], [5395, 14995, 36, 10000], [4595, 29995, 36, 10000], [3895, 49995, 36, 10000]
Merpris: 15k: +350kr, 20k: +700kr, 25k: +1200kr, 30k: +1700kr (DIFFERENT supplements!)

✅ CORRECT: Each variant uses ONLY its own supplements
- Capri 170 HK gets: base + [+350, +700, +1150, +1600]
- Capri 286 HK gets: base + [+350, +700, +1200, +1700]

❌ WRONG: Cross-contamination (do NOT do this)
- Capri 170 HK accidentally gets Capri 286 HK's supplements: base + [+350, +700, +1200, +1700]
- This creates incorrect pricing for the 170 HK variant

**Scenario 6: Global vs Variant-Specific Supplements**
If supplement text appears globally (not under specific variant), apply same supplements to ALL variants.
If supplement text appears under specific variant section, apply ONLY to that variant.`

/**
 * Build the extraction context with improved structured format (data only - instructions are in stored OpenAI prompt)
 */
export function buildExtractionContext(params: {
  dealerName?: string
  fileName?: string
  pdfText: string
  allowedModels: string
  existingListings: string
}): string {
  const { pdfText, allowedModels, existingListings } = params
  
  // Improved structured format with clear section headers
  return `ALLOWED_MODELS:
${allowedModels}

EXISTING_LISTINGS:
${existingListings}

BROCHURE_TEXT:
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
  allowedModels: string
  existingListings: string
}): string {
  const { dealerName, fileName, pdfText, allowedModels, existingListings } = params
  
  // Chat Completions needs the full context with instructions
  return `Extract vehicles from this PDF. Match variants to existing inventory when possible.

ALLOWED_MODELS:
${allowedModels}

EXISTING_LISTINGS:
${existingListings}

EXTRACTION RULES:

**VARIANT LOGIC:**
- Only create new variants when they are truly different (by HP >10, trim, fuel type, transmission, drivetrain, or distinct equipment)
- Merge transmission variants—never split "X" from "X Automatik"
- If both "X" and "X Automatik" variants are present for otherwise identical cars, merge into a single entry and use the base variant name (without "Automatik"). Transmission differences must be indicated using the tr field only
- Equipment differentiation: For base version, use variant name as-is. For versions with additional equipment, append " - " followed by comma-separated equipment items
- Never invent or guess makes, models, or body types. Only use those provided in ALLOWED_MODELS

**OFFER EXTRACTION & EXPANSION:**
- Extract all leasing offers for each car
- CRITICAL: Group multiple pricing options for the same variant under a single car entry
- For "merpris" (additional mileage supplement) text:
  * For each base offer, expand the offers array to include all mileage supplement options by adding the supplement to the base monthly price
  * Each resulting offer must be a unique [monthly_price, down_payment, months, km_per_year] combination
  * Always include the base offer (without supplement) for the base mileage
- Do not create separate car entries for different pricing options

**MERPRIS PATTERNS:**
- Look for: "Merpris for X km pr. år: Y kr./md", "og X km: Y kr./md", "Tillæg ved X km: Y kr./md"
- Example: "Merpris for 15.000 km pr. år: 350 kr./md. og 20.000 km: 700 kr./md"
- For each base offer [monthly, down, months, km], create additional offers: [monthly+350, down, months, 15000], [monthly+700, down, months, 20000]

**FORMATTING:**
- Use integers without thousands separators (4500 not 4.500 kr.)
- Always "HK" for horsepower
- Use null for missing fields

Output JSON: {"cars":[{"make","model","variant","hp","ft","tr","bt","wltp","co2","kwh100","l100","tax","offers":[[monthly,down,months,km]]}]}

BROCHURE_TEXT:
${pdfText}`
}