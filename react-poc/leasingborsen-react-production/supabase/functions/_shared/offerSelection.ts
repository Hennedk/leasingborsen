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
