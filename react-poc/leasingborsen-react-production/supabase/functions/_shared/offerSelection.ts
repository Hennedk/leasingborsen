export interface LeasePricingOffer {
  mileage_per_year: number
  period_months: number
  first_payment: number
  monthly_price: number
  [key: string]: any
}

export type SelectBestOfferResult = (LeasePricingOffer & {
  selection_method?: 'default' | 'exact' | 'fallback' | 'closest'
}) | null

// New interfaces for price cap functionality
export interface OfferSelectionOptions {
  maxPrice?: number
  enforcePriceCap?: boolean
}

export interface OfferSelectionResult {
  displayOffer: LeasePricingOffer | null
  displayReason: 'best_fit' | 'price_cap_best_fit' | 'price_cap_cheapest' | 'cheapest'
  idealOffer?: LeasePricingOffer
  deltaToIdeal?: number
  selection_method?: 'default' | 'exact' | 'fallback' | 'closest'
}

export type OfferSelectionStage = 'strict' | 'flexible' | 'cheapest'

export interface OfferSelectionWithFallback {
  offer: SelectBestOfferResult
  stage: OfferSelectionStage
}

export interface SelectOfferWithFallbackOptions {
  leasePricing: LeasePricingOffer[] | null | undefined
  targetMileage: number
  targetDeposit?: number
  targetTerm?: number
  isUserSpecified?: boolean
}

/**
 * Shared offer selection logic used by both the client application and Supabase Edge Functions.
 * Keeps mileage, deposit, and term alignment consistent across contexts.
 */
export function selectBestOffer(
  leasePricing: LeasePricingOffer[] | null | undefined,
  targetMileage: number,
  targetDeposit: number = 35000,
  targetTerm?: number,
  strictMode = true,
  isUserSpecified = true
): SelectBestOfferResult {
  if (!Array.isArray(leasePricing) || leasePricing.length === 0) {
    return null
  }

  let matchingOffers: LeasePricingOffer[] = []
  let isExactMileageFlexible = false

  if (strictMode) {
    if (targetMileage === 35000) {
      const acceptableMileages = [35000, 40000, 45000, 50000]
      matchingOffers = leasePricing.filter((offer) =>
        acceptableMileages.includes(offer.mileage_per_year)
      )
    } else {
      matchingOffers = leasePricing.filter(
        (offer) => offer.mileage_per_year === targetMileage
      )
    }

    if (matchingOffers.length === 0) {
      return null
    }
  } else {
    const availableMileages = [
      ...new Set(leasePricing.map((offer) => offer.mileage_per_year)),
    ]

    if (availableMileages.length === 0) {
      return null
    }

    const closestDistance = Math.min(
      ...availableMileages.map((mileage) => Math.abs(mileage - targetMileage))
    )

    const closestMileages = availableMileages.filter(
      (mileage) => Math.abs(mileage - targetMileage) === closestDistance
    )

    const selectedMileage = Math.min(...closestMileages)
    isExactMileageFlexible = selectedMileage === targetMileage

    matchingOffers = leasePricing.filter(
      (offer) => offer.mileage_per_year === selectedMileage
    )
  }

  const termPreference = Array.from(
    new Set(targetTerm ? [targetTerm, 36, 24, 48] : [36, 24, 48])
  )

  for (const preferredTerm of termPreference) {
    const termOffers = matchingOffers.filter(
      (offer) => offer.period_months === preferredTerm
    )

    if (termOffers.length > 0) {
      let selectedOffer = termOffers.find(
        (offer) => offer.first_payment === targetDeposit
      )

      if (!selectedOffer) {
        const depositDistances = termOffers.map((offer) => ({
          offer,
          distance: Math.abs(offer.first_payment - targetDeposit),
        }))

        depositDistances.sort((a, b) => {
          if (a.distance !== b.distance) {
            return a.distance - b.distance
          }
          return a.offer.monthly_price - b.offer.monthly_price
        })

        selectedOffer = depositDistances[0].offer
      }

      if (strictMode) {
        return {
          ...selectedOffer,
          selection_method: !isUserSpecified
            ? 'default'
            : preferredTerm === targetTerm
            ? 'exact'
            : 'fallback',
        }
      }

      return {
        ...selectedOffer,
        selection_method: !isUserSpecified
          ? 'default'
          : isExactMileageFlexible
          ? preferredTerm === targetTerm
            ? 'exact'
            : 'fallback'
          : 'closest',
      }
    }
  }

  if (strictMode) {
    return null
  }

  const bestOffer = matchingOffers
    .map((offer) => ({
      offer,
      depositDistance: Math.abs(offer.first_payment - targetDeposit),
    }))
    .sort((a, b) => {
      if (a.offer.period_months === 36 && b.offer.period_months !== 36) return -1
      if (b.offer.period_months === 36 && a.offer.period_months !== 36) return 1

      if (a.depositDistance !== b.depositDistance) {
        return a.depositDistance - b.depositDistance
      }

      return a.offer.monthly_price - b.offer.monthly_price
    })[0]?.offer

  if (!bestOffer) {
    return null
  }

  return {
    ...bestOffer,
    selection_method: !isUserSpecified
      ? 'default'
      : isExactMileageFlexible
      ? 'exact'
      : 'closest',
  }
}

/**
 * Enhanced offer selection with optional price cap support.
 * Returns both display offer (within price cap) and ideal offer (without cap) for UI context.
 */
export function selectBestOfferWithPriceCap(
  leasePricing: LeasePricingOffer[] | null | undefined,
  targetMileage: number,
  targetDeposit: number = 35000,
  targetTerm?: number,
  strictMode = true,
  isUserSpecified = true,
  options?: OfferSelectionOptions
): OfferSelectionResult {
  if (!Array.isArray(leasePricing) || leasePricing.length === 0) {
    return {
      displayOffer: null,
      displayReason: 'cheapest',
      idealOffer: undefined,
      deltaToIdeal: undefined,
      selection_method: 'default'
    }
  }

  // First, get the ideal offer without price cap constraints
  const idealOffer = selectBestOffer(
    leasePricing,
    targetMileage,
    targetDeposit,
    targetTerm,
    strictMode,
    isUserSpecified
  )

  // If no price cap is enforced, return ideal offer as display offer
  if (!options?.enforcePriceCap || !options.maxPrice) {
    return {
      displayOffer: idealOffer,
      displayReason: 'best_fit',
      idealOffer: idealOffer || undefined,
      deltaToIdeal: idealOffer ? 0 : undefined,
      selection_method: idealOffer?.selection_method || 'default'
    }
  }

  // Apply price cap filtering
  const cappedOffers = leasePricing.filter(
    (offer) => offer.monthly_price <= options.maxPrice!
  )

  if (cappedOffers.length === 0) {
    // No offers within price cap
    return {
      displayOffer: null,
      displayReason: 'cheapest',
      idealOffer: idealOffer || undefined,
      deltaToIdeal: idealOffer ? idealOffer.monthly_price - options.maxPrice : undefined,
      selection_method: 'default'
    }
  }

  // Try to find best fit within price cap
  const cappedOffer = selectBestOffer(
    cappedOffers,
    targetMileage,
    targetDeposit,
    targetTerm,
    strictMode,
    isUserSpecified
  )

  if (!cappedOffer) {
    // CRITICAL: When strict mode constraints cannot be satisfied within price cap,
    // we should NOT fall back to arbitrary offers that violate user filters.
    // This maintains filter integrity - if user selected 15k km and price cap,
    // we should not show 20k km offers just because they're cheaper.

    if (strictMode) {
      // In strict mode, if no offers match constraints within cap, exclude the listing
      return {
        displayOffer: null,
        displayReason: 'cheapest',
        idealOffer: idealOffer || undefined,
        deltaToIdeal: idealOffer ? idealOffer.monthly_price - options.maxPrice : undefined,
        selection_method: 'default'
      }
    }

    // In flexible mode, we can fall back to cheapest within cap
    const cheapestCapped = cappedOffers.reduce((prev, current) =>
      current.monthly_price < prev.monthly_price ? current : prev
    )

    const deltaToIdeal = idealOffer
      ? idealOffer.monthly_price - cheapestCapped.monthly_price
      : 0

    return {
      displayOffer: {
        ...cheapestCapped,
        selection_method: 'fallback'
      },
      displayReason: 'price_cap_cheapest',
      idealOffer: idealOffer || undefined,
      deltaToIdeal: deltaToIdeal > 0 ? deltaToIdeal : undefined,
      selection_method: 'fallback'
    }
  }

  // Determine display reason
  let displayReason: OfferSelectionResult['displayReason'] = 'price_cap_best_fit'

  if (idealOffer &&
      cappedOffer.monthly_price === idealOffer.monthly_price &&
      cappedOffer.first_payment === idealOffer.first_payment &&
      cappedOffer.period_months === idealOffer.period_months &&
      cappedOffer.mileage_per_year === idealOffer.mileage_per_year) {
    displayReason = 'best_fit' // Ideal offer happens to be within cap
  }

  const deltaToIdeal = idealOffer
    ? idealOffer.monthly_price - cappedOffer.monthly_price
    : 0

  return {
    displayOffer: cappedOffer,
    displayReason,
    idealOffer: idealOffer || undefined,
    deltaToIdeal: deltaToIdeal > 0 ? deltaToIdeal : (idealOffer ? 0 : undefined),
    selection_method: cappedOffer.selection_method || 'default'
  }
}

export function selectOfferWithFallback({
  leasePricing,
  targetMileage,
  targetDeposit = 35000,
  targetTerm,
  isUserSpecified = true,
}: SelectOfferWithFallbackOptions): OfferSelectionWithFallback {
  const strictOffer = selectBestOffer(
    leasePricing,
    targetMileage,
    targetDeposit,
    targetTerm,
    true,
    isUserSpecified
  )

  if (strictOffer) {
    return { offer: strictOffer, stage: 'strict' }
  }

  const flexibleOffer = selectBestOffer(
    leasePricing,
    targetMileage,
    targetDeposit,
    targetTerm,
    false,
    isUserSpecified
  )

  if (flexibleOffer) {
    return { offer: flexibleOffer, stage: 'flexible' }
  }

  if (!Array.isArray(leasePricing) || leasePricing.length === 0) {
    return { offer: null, stage: 'cheapest' }
  }

  const cheapest = leasePricing.reduce<LeasePricingOffer | null>((previous, current) => {
    const prevPrice = previous?.monthly_price ?? Number.POSITIVE_INFINITY
    const currPrice = current?.monthly_price ?? Number.POSITIVE_INFINITY
    return currPrice < prevPrice ? current : previous ?? current
  }, null)

  if (!cheapest) {
    return { offer: null, stage: 'cheapest' }
  }

  return {
    offer: {
      ...cheapest,
      selection_method: isUserSpecified ? 'fallback' : 'default',
    },
    stage: 'cheapest',
  }
}
