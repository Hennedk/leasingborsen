import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { 
  useFilterTranslations, 
  useFilterTranslationFunctions, 
  useFilterOptions 
} from '../useFilterTranslations'
import { filterTranslations } from '@/lib/translations/filterTranslations'

describe('useFilterTranslations Hook', () => {
  beforeEach(() => {
    // Clear translation cache before each test
    filterTranslations.clearCache()
  })

  describe('useFilterTranslations (main hook)', () => {
    it('should provide all translation functions', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      expect(typeof result.current.translateBodyType).toBe('function')
      expect(typeof result.current.translateFuelType).toBe('function')
      expect(typeof result.current.translateTransmission).toBe('function')
      expect(typeof result.current.getDatabaseValue).toBe('function')
      expect(typeof result.current.batchTranslate).toBe('function')
    })

    it('should provide all filter option functions', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      expect(typeof result.current.getBodyTypeOptions).toBe('function')
      expect(typeof result.current.getFuelTypeOptions).toBe('function')
      expect(typeof result.current.getTransmissionOptions).toBe('function')
    })

    it('should provide combined utility functions', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      expect(typeof result.current.translateCarFilters).toBe('function')
      expect(typeof result.current.getAllFilterOptions).toBe('function')
    })

    it('should translate individual filter values correctly', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      expect(result.current.translateBodyType('SUV')).toBe('SUV')
      expect(result.current.translateBodyType('Mikro')).toBe('Mikrobil')
      
      expect(result.current.translateFuelType('Electric')).toBe('Elektrisk')
      expect(result.current.translateFuelType('Petrol')).toBe('Benzin')
      
      expect(result.current.translateTransmission('Automatic')).toBe('Automatisk')
      expect(result.current.translateTransmission('Manual')).toBe('Manuel')
    })

    it('should translate car filters in batch', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      const car = {
        body_type: 'SUV',
        fuel_type: 'Electric',
        transmission: 'Automatic'
      }
      
      const translated = result.current.translateCarFilters(car)
      
      expect(translated).toEqual({
        bodyType: 'SUV',
        fuelType: 'Elektrisk',
        transmission: 'Automatisk'
      })
    })

    it('should handle missing car properties gracefully', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      const car = {}
      const translated = result.current.translateCarFilters(car)
      
      expect(translated).toEqual({
        bodyType: '–',
        fuelType: '–',
        transmission: '–'
      })
    })

    it('should get all filter options', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      const allOptions = result.current.getAllFilterOptions()
      
      expect(allOptions).toHaveProperty('bodyTypes')
      expect(allOptions).toHaveProperty('fuelTypes')
      expect(allOptions).toHaveProperty('transmissions')
      
      expect(Array.isArray(allOptions.bodyTypes)).toBe(true)
      expect(Array.isArray(allOptions.fuelTypes)).toBe(true)
      expect(Array.isArray(allOptions.transmissions)).toBe(true)
      
      expect(allOptions.bodyTypes.length).toBeGreaterThan(0)
      expect(allOptions.fuelTypes.length).toBeGreaterThan(0)
      expect(allOptions.transmissions.length).toBeGreaterThan(0)
    })

    it('should maintain referential equality on re-renders', () => {
      const { result, rerender } = renderHook(() => useFilterTranslations())
      
      const firstRender = result.current
      
      // Re-render
      rerender()
      
      const secondRender = result.current
      
      // Functions should be the same reference (memoized)
      expect(firstRender.translateBodyType).toBe(secondRender.translateBodyType)
      expect(firstRender.translateFuelType).toBe(secondRender.translateFuelType)
      expect(firstRender.translateTransmission).toBe(secondRender.translateTransmission)
      expect(firstRender.getBodyTypeOptions).toBe(secondRender.getBodyTypeOptions)
      expect(firstRender.getAllFilterOptions).toBe(secondRender.getAllFilterOptions)
    })
  })

  describe('useFilterTranslationFunctions (lightweight hook)', () => {
    it('should provide only translation functions', () => {
      const { result } = renderHook(() => useFilterTranslationFunctions())
      
      expect(typeof result.current.translateBodyType).toBe('function')
      expect(typeof result.current.translateFuelType).toBe('function')
      expect(typeof result.current.translateTransmission).toBe('function')
      
      // Should not have filter option functions
      expect(result.current).not.toHaveProperty('getBodyTypeOptions')
      expect(result.current).not.toHaveProperty('getFuelTypeOptions')
      expect(result.current).not.toHaveProperty('getTransmissionOptions')
    })

    it('should translate values correctly', () => {
      const { result } = renderHook(() => useFilterTranslationFunctions())
      
      expect(result.current.translateBodyType('Mikro')).toBe('Mikrobil')
      expect(result.current.translateFuelType('Electric')).toBe('Elektrisk')
      expect(result.current.translateTransmission('Automatic')).toBe('Automatisk')
    })

    it('should maintain referential equality on re-renders', () => {
      const { result, rerender } = renderHook(() => useFilterTranslationFunctions())
      
      const firstRender = result.current
      rerender()
      const secondRender = result.current
      
      expect(firstRender.translateBodyType).toBe(secondRender.translateBodyType)
      expect(firstRender.translateFuelType).toBe(secondRender.translateFuelType)
      expect(firstRender.translateTransmission).toBe(secondRender.translateTransmission)
    })
  })

  describe('useFilterOptions (filter options hook)', () => {
    it('should provide only filter option arrays', () => {
      const { result } = renderHook(() => useFilterOptions())
      
      expect(Array.isArray(result.current.bodyTypeOptions)).toBe(true)
      expect(Array.isArray(result.current.fuelTypeOptions)).toBe(true)
      expect(Array.isArray(result.current.transmissionOptions)).toBe(true)
      
      // Should not have translation functions
      expect(result.current).not.toHaveProperty('translateBodyType')
      expect(result.current).not.toHaveProperty('translateFuelType')
      expect(result.current).not.toHaveProperty('translateTransmission')
    })

    it('should return properly structured options', () => {
      const { result } = renderHook(() => useFilterOptions())
      
      // Check body type options structure
      const bodyTypeOption = result.current.bodyTypeOptions.find(opt => opt.value === 'SUV')
      expect(bodyTypeOption).toEqual({
        value: 'SUV',
        label: 'SUV',
        name: 'SUV'
      })
      
      // Check fuel type options structure
      const fuelTypeOption = result.current.fuelTypeOptions.find(opt => opt.value === 'Electric')
      expect(fuelTypeOption).toEqual({
        value: 'Electric',
        label: 'Elektrisk',
        name: 'Electric'
      })
      
      // Check transmission options structure
      const transmissionOption = result.current.transmissionOptions.find(opt => opt.value === 'Automatic')
      expect(transmissionOption).toEqual({
        value: 'Automatic',
        label: 'Automatisk',
        name: 'Automatic'
      })
    })

    it('should maintain referential equality on re-renders', () => {
      const { result, rerender } = renderHook(() => useFilterOptions())
      
      const firstRender = result.current
      rerender()
      const secondRender = result.current
      
      expect(firstRender.bodyTypeOptions).toBe(secondRender.bodyTypeOptions)
      expect(firstRender.fuelTypeOptions).toBe(secondRender.fuelTypeOptions)
      expect(firstRender.transmissionOptions).toBe(secondRender.transmissionOptions)
    })

    it('should not have duplicate options by label', () => {
      const { result } = renderHook(() => useFilterOptions())
      
      // Check for duplicates in body types
      const bodyTypeLabels = result.current.bodyTypeOptions.map(opt => opt.label)
      const uniqueBodyTypeLabels = [...new Set(bodyTypeLabels)]
      expect(bodyTypeLabels.length).toBe(uniqueBodyTypeLabels.length)
      
      // Check for duplicates in fuel types
      const fuelTypeLabels = result.current.fuelTypeOptions.map(opt => opt.label)
      const uniqueFuelTypeLabels = [...new Set(fuelTypeLabels)]
      expect(fuelTypeLabels.length).toBe(uniqueFuelTypeLabels.length)
      
      // Check for duplicates in transmissions
      const transmissionLabels = result.current.transmissionOptions.map(opt => opt.label)
      const uniqueTransmissionLabels = [...new Set(transmissionLabels)]
      expect(transmissionLabels.length).toBe(uniqueTransmissionLabels.length)
    })
  })

  describe('Performance Characteristics', () => {
    it('should not recreate functions on every render', () => {
      const { result, rerender } = renderHook(() => useFilterTranslations())
      
      const initialFunctions = {
        translateBodyType: result.current.translateBodyType,
        translateFuelType: result.current.translateFuelType,
        translateTransmission: result.current.translateTransmission,
        getBodyTypeOptions: result.current.getBodyTypeOptions,
        translateCarFilters: result.current.translateCarFilters
      }
      
      // Trigger multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender()
      }
      
      // Functions should remain the same
      expect(result.current.translateBodyType).toBe(initialFunctions.translateBodyType)
      expect(result.current.translateFuelType).toBe(initialFunctions.translateFuelType)
      expect(result.current.translateTransmission).toBe(initialFunctions.translateTransmission)
      expect(result.current.getBodyTypeOptions).toBe(initialFunctions.getBodyTypeOptions)
      expect(result.current.translateCarFilters).toBe(initialFunctions.translateCarFilters)
    })

    it('should handle rapid successive calls efficiently', () => {
      const { result } = renderHook(() => useFilterTranslations())
      
      const start = performance.now()
      
      // Make many calls
      for (let i = 0; i < 1000; i++) {
        result.current.translateBodyType('SUV')
        result.current.translateFuelType('Electric')
        result.current.translateTransmission('Automatic')
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(50) // 50ms for 1000 calls
    })
  })

  describe('Integration with Translation System', () => {
    it('should reflect changes in underlying translation system', () => {
      const { result } = renderHook(() => useFilterTranslationFunctions())
      
      // Test that the hook uses the actual translation system
      expect(result.current.translateBodyType('Station Wagon')).toBe('Stationcar')
      expect(result.current.translateFuelType('Petrol')).toBe('Benzin')
      
      // Test case insensitivity
      expect(result.current.translateBodyType('suv')).toBe('SUV')
      expect(result.current.translateFuelType('ELECTRIC')).toBe('Elektrisk')
    })

    it('should handle edge cases consistently with translation system', () => {
      const { result } = renderHook(() => useFilterTranslationFunctions())
      
      // Empty values
      expect(result.current.translateBodyType('')).toBe('–')
      expect(result.current.translateFuelType('')).toBe('–')
      expect(result.current.translateTransmission('')).toBe('–')
      
      // Unknown values
      expect(result.current.translateBodyType('Unknown')).toBe('Unknown')
      expect(result.current.translateFuelType('Unknown')).toBe('Unknown')
      expect(result.current.translateTransmission('Unknown')).toBe('Unknown')
      
      // Whitespace
      expect(result.current.translateBodyType(' SUV ')).toBe('SUV')
      expect(result.current.translateFuelType('\tElectric\n')).toBe('Elektrisk')
    })
  })
})