import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MileageChips } from '../MileageChips'

describe('MileageChips', () => {
  it('renders all mileage options', () => {
    const onChange = vi.fn()
    render(
      <MileageChips 
        selectedMileage={15000} 
        onMileageChange={onChange}
      />
    )
    
    expect(screen.getByText('10.000')).toBeInTheDocument()
    expect(screen.getByText('15.000')).toBeInTheDocument()
    expect(screen.getByText('20.000')).toBeInTheDocument()
    expect(screen.getByText('25.000')).toBeInTheDocument()
    expect(screen.getByText('30.000')).toBeInTheDocument()
    expect(screen.getByText('35.000+')).toBeInTheDocument()
  })
  
  it('shows 15.000 selected by default', () => {
    const onChange = vi.fn()
    render(
      <MileageChips 
        selectedMileage={15000} 
        onMileageChange={onChange}
      />
    )
    
    const selectedChip = screen.getByText('15.000')
    expect(selectedChip).toBeInTheDocument()
    expect(selectedChip.closest('[data-slot="badge"]')).toHaveClass('bg-surface-brand')
  })
  
  it('calls onChange when chip clicked', () => {
    const onChange = vi.fn()
    render(
      <MileageChips 
        selectedMileage={15000} 
        onMileageChange={onChange}
      />
    )
    
    fireEvent.click(screen.getByText('20.000'))
    expect(onChange).toHaveBeenCalledWith(20000)
  })
  
  // CRITICAL TEST: Click functionality with Badge components
  it('supports click interaction', () => {
    const onChange = vi.fn()
    render(
      <MileageChips 
        selectedMileage={15000} 
        onMileageChange={onChange}
      />
    )
    
    const chip = screen.getByText('20.000')
    fireEvent.click(chip)
    expect(onChange).toHaveBeenCalledWith(20000)
  })

  it('shows 35.000+ label correctly', () => {
    const onChange = vi.fn()
    render(
      <MileageChips 
        selectedMileage={35000} 
        onMileageChange={onChange}
      />
    )
    
    const chip35k = screen.getByText('35.000+')
    expect(chip35k).toBeInTheDocument()
    expect(chip35k.closest('[data-slot="badge"]')).toHaveClass('bg-surface-brand')
  })
})

describe('selectBestOffer', () => {
  // Mock the selectBestOffer function for testing
  const selectBestOffer = (leasePricing: any[], targetMileage: number, targetDeposit: number = 35000) => {
    if (!Array.isArray(leasePricing) || leasePricing.length === 0) {
      return null
    }
    
    const acceptableMileages = targetMileage === 35000 
      ? [35000, 40000, 45000, 50000]
      : [targetMileage]
    
    const matchingOffers = leasePricing.filter(offer => 
      acceptableMileages.includes(offer.mileage_per_year)
    )
    
    if (matchingOffers.length === 0) {
      return null
    }
    
    const termPreference = [36, 24, 48]
    
    for (const preferredTerm of termPreference) {
      const termOffers = matchingOffers.filter(offer => 
        offer.period_months === preferredTerm
      )
      
      if (termOffers.length > 0) {
        // NEW LOGIC: Find offer closest to target deposit (35k kr)
        let selectedOffer = termOffers.find(offer => 
          offer.first_payment === targetDeposit
        )
        
        if (!selectedOffer) {
          // Find deposit closest to target (35k kr)
          const depositDistances = termOffers.map(offer => ({
            offer,
            distance: Math.abs(offer.first_payment - targetDeposit)
          }))
          
          // Sort by distance to target deposit, then by monthly price if tied
          depositDistances.sort((a, b) => {
            if (a.distance !== b.distance) {
              return a.distance - b.distance // Closest to target first
            }
            return a.offer.monthly_price - b.offer.monthly_price // Lower monthly if tied
          })
          
          selectedOffer = depositDistances[0].offer
        }
        
        return {
          ...selectedOffer,
          selection_method: preferredTerm === 36 ? 'exact' : 'fallback'
        }
      }
    }
    
    return null
  }

  it('selects 36 month term when available', () => {
    const leasePricing = [
      { mileage_per_year: 15000, period_months: 24, monthly_price: 3000, first_payment: 0 },
      { mileage_per_year: 15000, period_months: 36, monthly_price: 3200, first_payment: 0 },
      { mileage_per_year: 15000, period_months: 48, monthly_price: 2800, first_payment: 0 }
    ]
    
    const result = selectBestOffer(leasePricing, 15000, 0)
    
    expect(result?.period_months).toBe(36)
    expect(result?.selection_method).toBe('exact')
  })
  
  it('falls back to 24 month when 36 unavailable', () => {
    const leasePricing = [
      { mileage_per_year: 15000, period_months: 24, monthly_price: 3000, first_payment: 0 },
      { mileage_per_year: 15000, period_months: 48, monthly_price: 2800, first_payment: 0 }
    ]
    
    const result = selectBestOffer(leasePricing, 15000, 0)
    
    expect(result?.period_months).toBe(24)
    expect(result?.selection_method).toBe('fallback')
  })
  
  it('handles 35k+ group correctly', () => {
    const leasePricing = [
      { mileage_per_year: 40000, period_months: 36, monthly_price: 4000, first_payment: 0 },
      { mileage_per_year: 50000, period_months: 36, monthly_price: 4500, first_payment: 0 }
    ]
    
    const result = selectBestOffer(leasePricing, 35000, 0) // 35k+ selection
    
    expect([40000, 45000, 50000].includes(result?.mileage_per_year)).toBe(true)
  })
  
  it('returns null when no matching mileage', () => {
    const leasePricing = [
      { mileage_per_year: 10000, period_months: 36, monthly_price: 3000, first_payment: 0 }
    ]
    
    const result = selectBestOffer(leasePricing, 20000, 0)
    
    expect(result).toBe(null)
  })

  it('handles deposit selection correctly', () => {
    const leasePricing = [
      { mileage_per_year: 15000, period_months: 36, monthly_price: 3000, first_payment: 50000 },
      { mileage_per_year: 15000, period_months: 36, monthly_price: 3200, first_payment: 0 }
    ]
    
    const result = selectBestOffer(leasePricing, 15000, 0)
    
    expect(result?.first_payment).toBe(0)
    expect(result?.monthly_price).toBe(3200)
  })
})