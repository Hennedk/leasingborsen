import { describe, it, expect, beforeEach } from 'vitest'
import { 
  filterTranslations, 
  FILTER_TRANSLATIONS,
  isValidFilterValue,
  getUnmappedValues
} from '../filterTranslations'

describe('Filter Translations', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure independence
    filterTranslations.clearCache()
  })

  describe('Body Type Translations', () => {
    it('should translate known body types correctly', () => {
      expect(filterTranslations.getBodyTypeLabel('SUV')).toBe('SUV')
      expect(filterTranslations.getBodyTypeLabel('Sedan')).toBe('Sedan')
      expect(filterTranslations.getBodyTypeLabel('Stationcar')).toBe('Stationcar')
      expect(filterTranslations.getBodyTypeLabel('Hatchback')).toBe('Hatchback')
      expect(filterTranslations.getBodyTypeLabel('Mikro')).toBe('Mikrobil')
      expect(filterTranslations.getBodyTypeLabel('Coupe')).toBe('Coupé')
      expect(filterTranslations.getBodyTypeLabel('Cabriolet')).toBe('Cabriolet')
      expect(filterTranslations.getBodyTypeLabel('Crossover (CUV)')).toBe('Crossover')
      expect(filterTranslations.getBodyTypeLabel('Minibus (MPV)')).toBe('Familiebil (MPV)')
    })

    it('should handle aliases correctly', () => {
      expect(filterTranslations.getBodyTypeLabel('Station Wagon')).toBe('Stationcar')
      expect(filterTranslations.getBodyTypeLabel('Convertible')).toBe('Cabriolet')
    })

    it('should be case insensitive', () => {
      expect(filterTranslations.getBodyTypeLabel('suv')).toBe('SUV')
      expect(filterTranslations.getBodyTypeLabel('SEDAN')).toBe('Sedan')
      expect(filterTranslations.getBodyTypeLabel('station wagon')).toBe('Stationcar')
    })

    it('should return original value for unknown body types', () => {
      expect(filterTranslations.getBodyTypeLabel('Unknown')).toBe('Unknown')
      expect(filterTranslations.getBodyTypeLabel('NonExistent')).toBe('NonExistent')
    })

    it('should handle empty/null values', () => {
      expect(filterTranslations.getBodyTypeLabel('')).toBe('–')
      expect(filterTranslations.getBodyTypeLabel(null as any)).toBe('–')
      expect(filterTranslations.getBodyTypeLabel(undefined as any)).toBe('–')
    })
  })

  describe('Fuel Type Translations', () => {
    it('should translate known fuel types correctly', () => {
      expect(filterTranslations.getFuelTypeLabel('Electric')).toBe('Elektrisk')
      expect(filterTranslations.getFuelTypeLabel('Elektrisk')).toBe('Elektrisk') // Already Danish
      expect(filterTranslations.getFuelTypeLabel('Benzin')).toBe('Benzin') // Already Danish
      expect(filterTranslations.getFuelTypeLabel('Diesel')).toBe('Diesel')
      expect(filterTranslations.getFuelTypeLabel('Hybrid')).toBe('Hybrid')
      expect(filterTranslations.getFuelTypeLabel('Plugin Hybrid')).toBe('Plugin Hybrid')
      expect(filterTranslations.getFuelTypeLabel('Hybrid - Diesel')).toBe('Hybrid Diesel')
      expect(filterTranslations.getFuelTypeLabel('Hybrid - Petrol')).toBe('Hybrid Benzin')
      expect(filterTranslations.getFuelTypeLabel('Plug-in - Diesel')).toBe('Plugin Hybrid Diesel')
      expect(filterTranslations.getFuelTypeLabel('Plug-in - Petrol')).toBe('Plugin Hybrid Benzin')
    })

    it('should handle aliases correctly', () => {
      expect(filterTranslations.getFuelTypeLabel('Petrol')).toBe('Benzin')
      expect(filterTranslations.getFuelTypeLabel('petrol')).toBe('Benzin') // case insensitive
    })

    it('should be case insensitive', () => {
      expect(filterTranslations.getFuelTypeLabel('ELECTRIC')).toBe('Elektrisk')
      expect(filterTranslations.getFuelTypeLabel('benzin')).toBe('Benzin')
    })

    it('should return original value for unknown fuel types', () => {
      expect(filterTranslations.getFuelTypeLabel('Nuclear')).toBe('Nuclear')
    })

    it('should handle empty/null values', () => {
      expect(filterTranslations.getFuelTypeLabel('')).toBe('–')
      expect(filterTranslations.getFuelTypeLabel(null as any)).toBe('–')
      expect(filterTranslations.getFuelTypeLabel(undefined as any)).toBe('–')
    })
  })

  describe('Transmission Translations', () => {
    it('should translate known transmission types correctly', () => {
      expect(filterTranslations.getTransmissionLabel('Automatic')).toBe('Automatisk')
      expect(filterTranslations.getTransmissionLabel('Automatisk')).toBe('Automatisk') // Already Danish
      expect(filterTranslations.getTransmissionLabel('Manual')).toBe('Manuel')
    })

    it('should be case insensitive', () => {
      expect(filterTranslations.getTransmissionLabel('automatic')).toBe('Automatisk')
      expect(filterTranslations.getTransmissionLabel('MANUAL')).toBe('Manuel')
    })

    it('should return original value for unknown transmission types', () => {
      expect(filterTranslations.getTransmissionLabel('CVT')).toBe('CVT')
    })

    it('should handle empty/null values', () => {
      expect(filterTranslations.getTransmissionLabel('')).toBe('–')
      expect(filterTranslations.getTransmissionLabel(null as any)).toBe('–')
      expect(filterTranslations.getTransmissionLabel(undefined as any)).toBe('–')
    })
  })

  describe('Reverse Lookup (Database Value from Display Label)', () => {
    it('should find database value from display label', () => {
      expect(filterTranslations.getDatabaseValue('bodyTypes', 'SUV')).toBe('SUV')
      expect(filterTranslations.getDatabaseValue('bodyTypes', 'Mikrobil')).toBe('Mikro')
      expect(filterTranslations.getDatabaseValue('bodyTypes', 'Coupé')).toBe('Coupe')
      
      expect(filterTranslations.getDatabaseValue('fuelTypes', 'Elektrisk')).toBe('Electric')
      expect(filterTranslations.getDatabaseValue('fuelTypes', 'Benzin')).toBe('Benzin')
      expect(filterTranslations.getDatabaseValue('fuelTypes', 'Hybrid Benzin')).toBe('Hybrid - Petrol')
      
      expect(filterTranslations.getDatabaseValue('transmissions', 'Automatisk')).toBe('Automatic')
      expect(filterTranslations.getDatabaseValue('transmissions', 'Manuel')).toBe('Manual')
    })

    it('should return original value if no translation found', () => {
      expect(filterTranslations.getDatabaseValue('bodyTypes', 'Unknown')).toBe('Unknown')
      expect(filterTranslations.getDatabaseValue('fuelTypes', 'Unknown')).toBe('Unknown')
      expect(filterTranslations.getDatabaseValue('transmissions', 'Unknown')).toBe('Unknown')
    })

    it('should be case insensitive', () => {
      expect(filterTranslations.getDatabaseValue('bodyTypes', 'suv')).toBe('SUV')
      expect(filterTranslations.getDatabaseValue('fuelTypes', 'elektrisk')).toBe('Electric')
      expect(filterTranslations.getDatabaseValue('transmissions', 'automatisk')).toBe('Automatic')
    })
  })

  describe('Filter Options Generation', () => {
    it('should generate body type options correctly', () => {
      const options = filterTranslations.getAllBodyTypeOptions()
      
      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)
      
      // Check structure
      const suvOption = options.find(opt => opt.value === 'SUV')
      expect(suvOption).toEqual({
        value: 'SUV',
        label: 'SUV',
        name: 'SUV'
      })
      
      const mikroOption = options.find(opt => opt.value === 'Mikro')
      expect(mikroOption).toEqual({
        value: 'Mikro',
        label: 'Mikrobil',
        name: 'Mikro'
      })
    })

    it('should generate fuel type options correctly', () => {
      const options = filterTranslations.getAllFuelTypeOptions()
      
      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)
      
      // Check for deduplication
      const electricOptions = options.filter(opt => opt.label === 'Elektrisk')
      expect(electricOptions.length).toBe(1)
      
      const benzinOptions = options.filter(opt => opt.label === 'Benzin')
      expect(benzinOptions.length).toBe(1)
    })

    it('should generate transmission options correctly', () => {
      const options = filterTranslations.getAllTransmissionOptions()
      
      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)
      
      // Check for deduplication
      const automaticOptions = options.filter(opt => opt.label === 'Automatisk')
      expect(automaticOptions.length).toBe(1)
    })
  })

  describe('Batch Translation', () => {
    it('should batch translate body types', () => {
      const values = ['SUV', 'Sedan', 'Unknown']
      const result = filterTranslations.batchTranslate('bodyTypes', values)
      
      expect(result).toEqual([
        { value: 'SUV', label: 'SUV' },
        { value: 'Sedan', label: 'Sedan' },
        { value: 'Unknown', label: 'Unknown' }
      ])
    })

    it('should batch translate fuel types', () => {
      const values = ['Electric', 'Petrol', 'Unknown']
      const result = filterTranslations.batchTranslate('fuelTypes', values)
      
      expect(result).toEqual([
        { value: 'Electric', label: 'Elektrisk' },
        { value: 'Petrol', label: 'Benzin' },
        { value: 'Unknown', label: 'Unknown' }
      ])
    })

    it('should batch translate transmissions', () => {
      const values = ['Automatic', 'Manual', 'Unknown']
      const result = filterTranslations.batchTranslate('transmissions', values)
      
      expect(result).toEqual([
        { value: 'Automatic', label: 'Automatisk' },
        { value: 'Manual', label: 'Manuel' },
        { value: 'Unknown', label: 'Unknown' }
      ])
    })
  })

  describe('Validation Functions', () => {
    it('should validate known filter values', () => {
      expect(isValidFilterValue('bodyTypes', 'SUV')).toBe(true)
      expect(isValidFilterValue('bodyTypes', 'Station Wagon')).toBe(true) // alias
      expect(isValidFilterValue('bodyTypes', 'Unknown')).toBe(false)
      
      expect(isValidFilterValue('fuelTypes', 'Electric')).toBe(true)
      expect(isValidFilterValue('fuelTypes', 'Petrol')).toBe(true) // alias
      expect(isValidFilterValue('fuelTypes', 'Unknown')).toBe(false)
      
      expect(isValidFilterValue('transmissions', 'Automatic')).toBe(true)
      expect(isValidFilterValue('transmissions', 'Unknown')).toBe(false)
    })

    it('should be case insensitive for validation', () => {
      expect(isValidFilterValue('bodyTypes', 'suv')).toBe(true)
      expect(isValidFilterValue('fuelTypes', 'ELECTRIC')).toBe(true)
      expect(isValidFilterValue('transmissions', 'automatic')).toBe(true)
    })

    it('should get unmapped values', () => {
      const bodyTypes = ['SUV', 'Unknown1', 'Sedan', 'Unknown2']
      const unmapped = getUnmappedValues('bodyTypes', bodyTypes)
      expect(unmapped).toEqual(['Unknown1', 'Unknown2'])
      
      const fuelTypes = ['Electric', 'Nuclear', 'Diesel']
      const unmappedFuel = getUnmappedValues('fuelTypes', fuelTypes)
      expect(unmappedFuel).toEqual(['Nuclear'])
    })
  })

  describe('Caching', () => {
    it('should cache translation results', () => {
      // Clear cache first
      filterTranslations.clearCache()
      
      // First call should populate cache
      const result1 = filterTranslations.getBodyTypeLabel('SUV')
      expect(result1).toBe('SUV')
      
      // Cache should have entries
      const stats = filterTranslations.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.keys).toContain('body:suv')
      
      // Second call should use cache
      const result2 = filterTranslations.getBodyTypeLabel('SUV')
      expect(result2).toBe('SUV')
      
      // Cache size should remain the same (same key)
      const stats2 = filterTranslations.getCacheStats()
      expect(stats2.size).toBe(stats.size)
    })

    it('should clear cache correctly', () => {
      // Populate cache
      filterTranslations.getBodyTypeLabel('SUV')
      filterTranslations.getFuelTypeLabel('Electric')
      
      // Cache should have entries
      let stats = filterTranslations.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
      
      // Clear cache
      filterTranslations.clearCache()
      
      // Cache should be empty
      stats = filterTranslations.getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.keys).toEqual([])
    })
  })

  describe('Performance', () => {
    it('should handle large batches efficiently', () => {
      const start = performance.now()
      
      // Create large arrays
      const bodyTypes = new Array(1000).fill('SUV')
      const fuelTypes = new Array(1000).fill('Electric')
      const transmissions = new Array(1000).fill('Automatic')
      
      // Batch translate
      filterTranslations.batchTranslate('bodyTypes', bodyTypes)
      filterTranslations.batchTranslate('fuelTypes', fuelTypes)
      filterTranslations.batchTranslate('transmissions', transmissions)
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100)
    })

    it('should benefit from caching on repeated calls', () => {
      filterTranslations.clearCache()
      
      // First batch - no cache
      const start1 = performance.now()
      for (let i = 0; i < 100; i++) {
        filterTranslations.getBodyTypeLabel('SUV')
      }
      const end1 = performance.now()
      const uncachedTime = end1 - start1
      
      // Second batch - with cache
      const start2 = performance.now()
      for (let i = 0; i < 100; i++) {
        filterTranslations.getBodyTypeLabel('SUV')
      }
      const end2 = performance.now()
      const cachedTime = end2 - start2
      
      // Cached calls should be faster (or at least not significantly slower)
      expect(cachedTime).toBeLessThanOrEqual(uncachedTime * 2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle whitespace in values', () => {
      expect(filterTranslations.getBodyTypeLabel(' SUV ')).toBe('SUV')
      expect(filterTranslations.getFuelTypeLabel('\tElectric\n')).toBe('Elektrisk')
      expect(filterTranslations.getTransmissionLabel('  Automatic  ')).toBe('Automatisk')
    })

    it('should handle special characters', () => {
      expect(filterTranslations.getBodyTypeLabel('Crossover (CUV)')).toBe('Crossover')
      expect(filterTranslations.getFuelTypeLabel('Hybrid - Petrol')).toBe('Hybrid Benzin')
      expect(filterTranslations.getFuelTypeLabel('Plug-in - Diesel')).toBe('Plugin Hybrid Diesel')
    })

    it('should maintain consistency with FILTER_TRANSLATIONS data', () => {
      // Ensure all entries in FILTER_TRANSLATIONS can be translated correctly
      FILTER_TRANSLATIONS.bodyTypes.forEach(entry => {
        expect(filterTranslations.getBodyTypeLabel(entry.databaseValue)).toBe(entry.displayLabel)
        
        // Test aliases if they exist
        if (entry.aliases) {
          entry.aliases.forEach(alias => {
            expect(filterTranslations.getBodyTypeLabel(alias)).toBe(entry.displayLabel)
          })
        }
      })
      
      FILTER_TRANSLATIONS.fuelTypes.forEach(entry => {
        expect(filterTranslations.getFuelTypeLabel(entry.databaseValue)).toBe(entry.displayLabel)
        
        if (entry.aliases) {
          entry.aliases.forEach(alias => {
            expect(filterTranslations.getFuelTypeLabel(alias)).toBe(entry.displayLabel)
          })
        }
      })
      
      FILTER_TRANSLATIONS.transmissions.forEach(entry => {
        expect(filterTranslations.getTransmissionLabel(entry.databaseValue)).toBe(entry.displayLabel)
        
        if (entry.aliases) {
          entry.aliases.forEach(alias => {
            expect(filterTranslations.getTransmissionLabel(alias)).toBe(entry.displayLabel)
          })
        }
      })
    })
  })
})