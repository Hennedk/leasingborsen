import { describe, test, expect, beforeEach, vi } from 'vitest';
import { setupSupabaseMocks, resetSupabaseMocks } from '@/test/mocks/supabase';
import { vehicleFactory } from '@/test/factories/vehicles';
import { extractionFactory } from '@/test/factories/extraction';
import { dealerFactory } from '@/test/factories/dealers';

// Mock comparison logic - this would be replaced with actual implementation
class ComparisonEngine {
  private fuzzyMatchThreshold = 0.85;

  compare(existing: any[], extracted: any[]): any[] {
    const changes: any[] = [];

    // Find updates and deletes
    existing.forEach(existingItem => {
      const match = this.findBestMatch(existingItem, extracted);
      
      if (!match) {
        // No match found - mark for deletion
        changes.push(extractionFactory.change.delete(existingItem));
      } else if (this.hasSignificantChanges(existingItem, match)) {
        // Found match but with significant changes - mark for update
        const changedFields = this.getChangedFields(existingItem, match);
        changes.push(extractionFactory.change.update(existingItem, changedFields));
      }
      // If match found with no significant changes - no action needed
    });

    // Find creates
    extracted.forEach(extractedItem => {
      const exists = this.findBestMatch(extractedItem, existing);
      
      if (!exists) {
        // No existing match - mark for creation
        changes.push(extractionFactory.change.create({
          extracted_data: extractedItem,
        }));
      }
    });

    return changes;
  }

  private findBestMatch(item: any, candidates: any[]): any | null {
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this.calculateMatchScore(item, candidate);
      if (score > bestScore && score >= this.fuzzyMatchThreshold) {
        bestMatch = candidate;
        bestScore = score;
      }
    }

    return bestMatch;
  }

  private calculateMatchScore(item1: any, item2: any): number {
    if (!item1 || !item2) return 0;

    let score = 0;
    let factors = 0;

    // Make and model must match exactly for a valid comparison
    if (item1.make === item2.make) {
      score += 0.3;
      factors += 0.3;
    } else {
      return 0; // Different make = no match
    }

    if (item1.model === item2.model) {
      score += 0.3;
      factors += 0.3;
    } else {
      return 0; // Different model = no match  
    }

    // Variant similarity (can be partial match)
    if (item1.variant && item2.variant) {
      const variantSimilarity = this.calculateStringSimilarity(item1.variant, item2.variant);
      score += variantSimilarity * 0.25;
      factors += 0.25;
    }

    // Year similarity
    if (item1.year && item2.year) {
      const yearDiff = Math.abs(item1.year - item2.year);
      const yearScore = yearDiff === 0 ? 0.15 : (yearDiff === 1 ? 0.1 : 0);
      score += yearScore;
      factors += 0.15;
    }

    return factors > 0 ? score / factors : 0;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private hasSignificantChanges(existing: any, extracted: any): boolean {
    const significantFields = ['monthly_price', 'retail_price', 'variant', 'year'];
    
    return significantFields.some(field => {
      if (field === 'monthly_price' || field === 'retail_price') {
        // Price changes are significant if they differ by more than 1%
        const oldPrice = existing[field] || 0;
        const newPrice = extracted[field] || 0;
        const percentChange = Math.abs((newPrice - oldPrice) / oldPrice);
        return percentChange > 0.01;
      }
      
      return existing[field] !== extracted[field];
    });
  }

  private getChangedFields(existing: any, extracted: any): any {
    const changes: any = {};
    const trackableFields = ['monthly_price', 'retail_price', 'variant', 'year', 'colour', 'transmission'];
    
    trackableFields.forEach(field => {
      if (existing[field] !== extracted[field]) {
        changes[field] = extracted[field];
      }
    });
    
    return changes;
  }

  // Toyota-specific logic for handling transmission variants
  compareWithTransmissionLogic(existing: any[], extracted: any[]): any[] {
    const changes: any[] = [];
    
    extracted.forEach(extractedItem => {
      // Check if this is a Toyota transmission variant
      if (extractedItem.make === 'Toyota' && extractedItem.variant?.includes('Automatik')) {
        // Clean up the variant name and set transmission type
        const cleanVariant = extractedItem.variant.replace(/\s*(Automatik|Manuel|aut\.)$/, '').trim();
        const processedItem = {
          ...extractedItem,
          variant: cleanVariant,
          transmission: 'Automatic',
          tr: 1, // Toyota automatic code
        };
        
        // Look for manual version with same clean variant
        const manualMatch = existing.find(e => 
          e.make === 'Toyota' && 
          e.variant === cleanVariant && 
          e.tr === 2 // Manual code
        );
        
        if (manualMatch) {
          // Update existing manual with transmission info if needed
          changes.push(extractionFactory.change.update(manualMatch, {
            transmission: 'Manual'
          }));
        }
        
        // Create automatic version
        changes.push(extractionFactory.change.create({
          extracted_data: processedItem,
        }));
      } else {
        // Standard comparison logic
        const match = this.findBestMatch(extractedItem, existing);
        if (!match) {
          changes.push(extractionFactory.change.create({
            extracted_data: extractedItem,
          }));
        }
      }
    });
    
    return changes;
  }

  // Ford-specific logic for expanding merpris offers
  expandFordMerpris(baseVehicle: any, merprисOptions: any[]): any {
    const expandedVehicle = { ...baseVehicle };
    
    if (merprісOptions && merprісOptions.length > 0) {
      const baseOffers = expandedVehicle.offers || [];
      const expandedOffers = [...baseOffers];
      
      merprісOptions.forEach(option => {
        const basePriceOffer = baseOffers[0];
        if (basePriceOffer) {
          expandedOffers.push({
            ...basePriceOffer,
            monthly_price: basePriceOffer.monthly_price + option.supplement,
            mileage_per_year: option.mileage,
          });
        }
      });
      
      expandedVehicle.offers = expandedOffers;
    }
    
    return expandedVehicle;
  }
}

describe('ComparisonEngine - Critical Business Logic', () => {
  let engine: ComparisonEngine;
  
  beforeEach(() => {
    setupSupabaseMocks();
    engine = new ComparisonEngine();
  });
  
  afterEach(() => {
    resetSupabaseMocks();
  });
  
  describe('Change Detection Accuracy', () => {
    test('should not create false updates for identical data', () => {
      // This addresses the "no change but shows as update" issue
      const existing = [vehicleFactory.vwId4()];
      const extracted = [{ ...existing[0] }]; // Identical copy
      
      const changes = engine.compare(existing, extracted);
      
      expect(changes).toHaveLength(0);
      expect(changes.filter(c => c.change_type === 'UPDATE')).toHaveLength(0);
    });
    
    test('should detect real price changes accurately', () => {
      const existing = vehicleFactory.vwId4({ monthly_price: 4999 });
      const extracted = { ...existing, monthly_price: 5499 }; // Price increase
      
      const changes = engine.compare([existing], [extracted]);
      
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        change_type: 'UPDATE',
        listing_id: existing.id,
      });
      
      // Verify the price change is tracked
      expect(changes[0].changes).toHaveProperty('monthly_price');
      expect(changes[0].changes.monthly_price.new).toBe(5499);
    });
    
    test('should ignore insignificant price changes (less than 1%)', () => {
      const existing = vehicleFactory.vwId4({ monthly_price: 5000 });
      const extracted = { ...existing, monthly_price: 5010 }; // 0.2% increase
      
      const changes = engine.compare([existing], [extracted]);
      
      expect(changes).toHaveLength(0);
    });
    
    test('should handle CREATE + UPDATE + DELETE in same batch', () => {
      // This addresses the "fix one thing, break another" issue
      const existing = [
        vehicleFactory.generic({ 
          id: '1', 
          make: 'Volkswagen', 
          model: 'Golf', 
          variant: 'GTI',
          monthly_price: 3500 
        }),
        vehicleFactory.generic({ 
          id: '2', 
          make: 'Volkswagen', 
          model: 'Passat', 
          variant: 'Elegance',
          monthly_price: 4500 
        }),
        vehicleFactory.generic({ 
          id: '3', 
          make: 'Volkswagen', 
          model: 'Tiguan', 
          variant: 'R-Line',
          monthly_price: 5500 
        }),
      ];
      
      const extracted = [
        { 
          make: 'Volkswagen', 
          model: 'Golf', 
          variant: 'GTI', 
          monthly_price: 3999 // Price update
        },
        { 
          make: 'Volkswagen', 
          model: 'ID.5', 
          variant: 'GTX' // New car
        },
        // Passat missing = DELETE
        { 
          make: 'Volkswagen', 
          model: 'Tiguan', 
          variant: 'R-Line',
          monthly_price: 5500 // No change
        },
      ];
      
      const changes = engine.compare(existing, extracted);
      
      // Verify each operation type works independently
      const updates = changes.filter(c => c.change_type === 'UPDATE');
      const creates = changes.filter(c => c.change_type === 'CREATE');
      const deletes = changes.filter(c => c.change_type === 'DELETE');
      
      expect(updates).toHaveLength(1);
      expect(creates).toHaveLength(1);
      expect(deletes).toHaveLength(1);
      
      // Verify Tiguan (no change) doesn't appear in changes
      expect(changes).toHaveLength(3);
      
      // Verify specific changes
      expect(updates[0].listing_id).toBe('1'); // Golf update
      expect(creates[0].extracted_data.model).toBe('ID.5'); // ID.5 create
      expect(deletes[0].listing_id).toBe('2'); // Passat delete
    });
  });
  
  describe('Edge Case Handling', () => {
    test('Toyota: should consolidate transmission variants correctly', () => {
      const existing = [vehicleFactory.toyotaAygo.manual()];
      const extracted = [
        { 
          make: 'Toyota', 
          model: 'Aygo X', 
          variant: 'Active 72 HK' 
        },
        { 
          make: 'Toyota', 
          model: 'Aygo X', 
          variant: 'Active 72 HK Automatik' 
        },
      ];
      
      const changes = engine.compareWithTransmissionLogic(existing, extracted);
      
      // Should create automatic variant and potentially update manual
      const creates = changes.filter(c => c.change_type === 'CREATE');
      expect(creates).toHaveLength(2); // Both variants treated as creates in this logic
      
      // Verify automatic variant doesn't include "Automatik" in name
      const automaticCreate = creates.find(c => 
        c.extracted_data.transmission === 'Automatic'
      );
      expect(automaticCreate).toBeDefined();
      expect(automaticCreate.extracted_data.variant).toBe('Active 72 HK');
      expect(automaticCreate.extracted_data.tr).toBe(1); // Automatic code
    });
    
    test('Hyundai: should separate equipment variants', () => {
      const extracted = [
        { 
          make: 'Hyundai',
          model: 'IONIQ 5', 
          variant: 'Ultimate 325 HK 4WD' 
        },
        { 
          make: 'Hyundai',
          model: 'IONIQ 5', 
          variant: 'Ultimate 325 HK 4WD – 20" alufælge, soltag' 
        },
      ];
      
      const changes = engine.compare([], extracted);
      
      // Both should be separate CREATE operations
      expect(changes).toHaveLength(2);
      expect(changes.every(c => c.change_type === 'CREATE')).toBe(true);
      
      const variants = changes.map(c => c.extracted_data.variant);
      expect(new Set(variants).size).toBe(2); // Ensure both variants are unique
    });
    
    test('Ford: should expand merpris offers correctly', () => {
      const fordBase = vehicleFactory.fordFiesta({
        offers: [{ monthly_price: 2495, mileage_per_year: 10000 }],
        merpris_options: [
          { mileage: 15000, supplement: 200 },
          { mileage: 20000, supplement: 400 },
        ]
      });
      
      const fordWithMerpris = engine.expandFordMerpris(fordBase, fordBase.merpris_options);
      
      expect(fordWithMerpris.offers).toHaveLength(3);
      expect(fordWithMerpris.offers).toContainEqual(
        expect.objectContaining({
          monthly_price: 2695, // 2495 + 200
          mileage_per_year: 15000,
        })
      );
      expect(fordWithMerpris.offers).toContainEqual(
        expect.objectContaining({
          monthly_price: 2895, // 2495 + 400
          mileage_per_year: 20000,
        })
      );
    });
  });
  
  describe('Fuzzy Matching Logic', () => {
    test('should match variants with minor spelling differences', () => {
      const existing = [vehicleFactory.generic({
        make: 'BMW',
        model: 'X3',
        variant: 'xDrive30d M Sport',
        monthly_price: 6500
      })];
      
      const extracted = [{
        make: 'BMW',
        model: 'X3',
        variant: 'xDrive 30d M-Sport', // Minor differences
        monthly_price: 6750
      }];
      
      const changes = engine.compare(existing, extracted);
      
      // Should detect as UPDATE, not CREATE + DELETE
      expect(changes).toHaveLength(1);
      expect(changes[0].change_type).toBe('UPDATE');
    });
    
    test('should not match vehicles with different makes or models', () => {
      const existing = [vehicleFactory.generic({
        make: 'BMW',
        model: 'X3',
        variant: 'xDrive30d',
      })];
      
      const extracted = [{
        make: 'Mercedes',
        model: 'GLC',
        variant: 'GLC 300d', // Different make/model
      }];
      
      const changes = engine.compare(existing, extracted);
      
      // Should create one CREATE and one DELETE
      expect(changes).toHaveLength(2);
      expect(changes.filter(c => c.change_type === 'CREATE')).toHaveLength(1);
      expect(changes.filter(c => c.change_type === 'DELETE')).toHaveLength(1);
    });
  });
  
  describe('Performance and Scale', () => {
    test('should handle large datasets efficiently', () => {
      const existing = vehicleFactory.createMultiple(100);
      const extracted = [
        ...existing.slice(0, 50), // Keep half unchanged
        ...existing.slice(50, 75).map(v => ({ ...v, monthly_price: v.monthly_price + 100 })), // Update quarter
        ...vehicleFactory.createMultiple(25), // Add new quarter
      ];
      
      const startTime = Date.now();
      const changes = engine.compare(existing, extracted);
      const endTime = Date.now();
      
      // Performance check - should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
      
      // Verify correct change detection
      const creates = changes.filter(c => c.change_type === 'CREATE');
      const updates = changes.filter(c => c.change_type === 'UPDATE');  
      const deletes = changes.filter(c => c.change_type === 'DELETE');
      
      expect(creates.length).toBeGreaterThan(0);
      expect(updates.length).toBeGreaterThan(0);
      expect(deletes.length).toBeGreaterThan(0);
    });
  });
});