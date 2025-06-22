/* Claude Change Summary:
 * Created StandardizationMaps for comprehensive vehicle data mappings.
 * Provides extensive mapping tables for model names, specifications, and terminology.
 * Supports fuzzy matching and intelligent mapping algorithms.
 * Related to: Cross-dealer validation and standardization system
 */

export interface ModelMapping {
  standardName: string
  aliases: string[]
  brand: string
  category: 'electric' | 'hybrid' | 'gasoline' | 'diesel'
  bodyType?: string
}

export interface SpecificationMapping {
  field: string
  patterns: RegExp[]
  parser: (value: string) => any
  validator: (value: any) => boolean
  normalizer?: (value: any) => any
}

export class StandardizationMaps {
  
  /**
   * Comprehensive model name mappings with aliases
   */
  static getModelMappings(): Record<string, ModelMapping> {
    return {
      // Volkswagen Electric
      'id4': {
        standardName: 'ID.4',
        aliases: ['ID.4', 'ID 4', 'ID4', 'id4', 'Id.4', 'Id 4'],
        brand: 'Volkswagen',
        category: 'electric',
        bodyType: 'SUV'
      },
      'id3': {
        standardName: 'ID.3',
        aliases: ['ID.3', 'ID 3', 'ID3', 'id3', 'Id.3', 'Id 3'],
        brand: 'Volkswagen',
        category: 'electric',
        bodyType: 'Hatchback'
      },
      'id5': {
        standardName: 'ID.5',
        aliases: ['ID.5', 'ID 5', 'ID5', 'id5', 'Id.5', 'Id 5'],
        brand: 'Volkswagen',
        category: 'electric',
        bodyType: 'SUV'
      },
      'id7': {
        standardName: 'ID.7',
        aliases: ['ID.7', 'ID 7', 'ID7', 'id7', 'Id.7', 'Id 7'],
        brand: 'Volkswagen',
        category: 'electric',
        bodyType: 'Large SUV'
      },
      'id_buzz': {
        standardName: 'ID. Buzz',
        aliases: ['ID. Buzz', 'ID.Buzz', 'ID Buzz', 'IDBuzz', 'id buzz', 'id.buzz'],
        brand: 'Volkswagen',
        category: 'electric',
        bodyType: 'Van'
      },
      'e_golf': {
        standardName: 'e-Golf',
        aliases: ['e-Golf', 'eGolf', 'e Golf', 'E-Golf', 'E-GOLF'],
        brand: 'Volkswagen',
        category: 'electric',
        bodyType: 'Hatchback'
      },
      'e_up': {
        standardName: 'e-up!',
        aliases: ['e-up!', 'e-up', 'eup', 'e up', 'E-Up', 'E-UP!'],
        brand: 'Volkswagen',
        category: 'electric',
        bodyType: 'Hatchback'
      },

      // Volkswagen ICE
      'golf': {
        standardName: 'Golf',
        aliases: ['Golf', 'VW Golf', 'Volkswagen Golf'],
        brand: 'Volkswagen',
        category: 'gasoline',
        bodyType: 'Hatchback'
      },
      'passat': {
        standardName: 'Passat',
        aliases: ['Passat', 'VW Passat', 'Volkswagen Passat'],
        brand: 'Volkswagen',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'tiguan': {
        standardName: 'Tiguan',
        aliases: ['Tiguan', 'VW Tiguan', 'Volkswagen Tiguan'],
        brand: 'Volkswagen',
        category: 'gasoline',
        bodyType: 'SUV'
      },
      'touareg': {
        standardName: 'Touareg',
        aliases: ['Touareg', 'VW Touareg', 'Volkswagen Touareg'],
        brand: 'Volkswagen',
        category: 'gasoline',
        bodyType: 'Large SUV'
      },
      'arteon': {
        standardName: 'Arteon',
        aliases: ['Arteon', 'VW Arteon', 'Volkswagen Arteon'],
        brand: 'Volkswagen',
        category: 'gasoline',
        bodyType: 'Sedan'
      },

      // Audi Electric
      'e_tron': {
        standardName: 'e-tron',
        aliases: ['e-tron', 'etron', 'e tron', 'E-tron', 'E-TRON'],
        brand: 'Audi',
        category: 'electric',
        bodyType: 'SUV'
      },
      'e_tron_gt': {
        standardName: 'e-tron GT',
        aliases: ['e-tron GT', 'etron GT', 'e tron GT', 'E-tron GT', 'E-TRON GT'],
        brand: 'Audi',
        category: 'electric',
        bodyType: 'Coupe'
      },
      'q4_e_tron': {
        standardName: 'Q4 e-tron',
        aliases: ['Q4 e-tron', 'Q4 etron', 'Q4e-tron', 'Q4 E-tron', 'Q4 E-TRON'],
        brand: 'Audi',
        category: 'electric',
        bodyType: 'Compact SUV'
      },
      'q8_e_tron': {
        standardName: 'Q8 e-tron',
        aliases: ['Q8 e-tron', 'Q8 etron', 'Q8e-tron', 'Q8 E-tron', 'Q8 E-TRON'],
        brand: 'Audi',
        category: 'electric',
        bodyType: 'Large SUV'
      },

      // Audi ICE
      'a3': {
        standardName: 'A3',
        aliases: ['A3', 'Audi A3'],
        brand: 'Audi',
        category: 'gasoline',
        bodyType: 'Hatchback'
      },
      'a4': {
        standardName: 'A4',
        aliases: ['A4', 'Audi A4'],
        brand: 'Audi',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'a6': {
        standardName: 'A6',
        aliases: ['A6', 'Audi A6'],
        brand: 'Audi',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'q3': {
        standardName: 'Q3',
        aliases: ['Q3', 'Audi Q3'],
        brand: 'Audi',
        category: 'gasoline',
        bodyType: 'Compact SUV'
      },
      'q5': {
        standardName: 'Q5',
        aliases: ['Q5', 'Audi Q5'],
        brand: 'Audi',
        category: 'gasoline',
        bodyType: 'SUV'
      },
      'q7': {
        standardName: 'Q7',
        aliases: ['Q7', 'Audi Q7'],
        brand: 'Audi',
        category: 'gasoline',
        bodyType: 'Large SUV'
      },

      // BMW Electric
      'ix3': {
        standardName: 'iX3',
        aliases: ['iX3', 'i X3', 'IX3', 'BMW iX3'],
        brand: 'BMW',
        category: 'electric',
        bodyType: 'SUV'
      },
      'i4': {
        standardName: 'i4',
        aliases: ['i4', 'i 4', 'I4', 'BMW i4'],
        brand: 'BMW',
        category: 'electric',
        bodyType: 'Sedan'
      },
      'ix': {
        standardName: 'iX',
        aliases: ['iX', 'i X', 'IX', 'BMW iX'],
        brand: 'BMW',
        category: 'electric',
        bodyType: 'Large SUV'
      },
      'i7': {
        standardName: 'i7',
        aliases: ['i7', 'i 7', 'I7', 'BMW i7'],
        brand: 'BMW',
        category: 'electric',
        bodyType: 'Sedan'
      },

      // BMW ICE
      '3_series': {
        standardName: '3 Series',
        aliases: ['3 Series', '3-Series', '3series', 'BMW 3 Series', 'BMW 3-Series'],
        brand: 'BMW',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      '5_series': {
        standardName: '5 Series',
        aliases: ['5 Series', '5-Series', '5series', 'BMW 5 Series', 'BMW 5-Series'],
        brand: 'BMW',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'x3': {
        standardName: 'X3',
        aliases: ['X3', 'BMW X3'],
        brand: 'BMW',
        category: 'gasoline',
        bodyType: 'SUV'
      },
      'x5': {
        standardName: 'X5',
        aliases: ['X5', 'BMW X5'],
        brand: 'BMW',
        category: 'gasoline',
        bodyType: 'Large SUV'
      },

      // Mercedes-Benz Electric
      'eqc': {
        standardName: 'EQC',
        aliases: ['EQC', 'Mercedes EQC', 'Mercedes-Benz EQC'],
        brand: 'Mercedes-Benz',
        category: 'electric',
        bodyType: 'SUV'
      },
      'eqa': {
        standardName: 'EQA',
        aliases: ['EQA', 'Mercedes EQA', 'Mercedes-Benz EQA'],
        brand: 'Mercedes-Benz',
        category: 'electric',
        bodyType: 'Compact SUV'
      },
      'eqb': {
        standardName: 'EQB',
        aliases: ['EQB', 'Mercedes EQB', 'Mercedes-Benz EQB'],
        brand: 'Mercedes-Benz',
        category: 'electric',
        bodyType: 'Compact SUV'
      },
      'eqs': {
        standardName: 'EQS',
        aliases: ['EQS', 'Mercedes EQS', 'Mercedes-Benz EQS'],
        brand: 'Mercedes-Benz',
        category: 'electric',
        bodyType: 'Sedan'
      },

      // Mercedes-Benz ICE
      'a_class': {
        standardName: 'A-Class',
        aliases: ['A-Class', 'A Class', 'AClass', 'Mercedes A-Class', 'Mercedes-Benz A-Class'],
        brand: 'Mercedes-Benz',
        category: 'gasoline',
        bodyType: 'Hatchback'
      },
      'c_class': {
        standardName: 'C-Class',
        aliases: ['C-Class', 'C Class', 'CClass', 'Mercedes C-Class', 'Mercedes-Benz C-Class'],
        brand: 'Mercedes-Benz',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'e_class': {
        standardName: 'E-Class',
        aliases: ['E-Class', 'E Class', 'EClass', 'Mercedes E-Class', 'Mercedes-Benz E-Class'],
        brand: 'Mercedes-Benz',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'glc': {
        standardName: 'GLC',
        aliases: ['GLC', 'Mercedes GLC', 'Mercedes-Benz GLC'],
        brand: 'Mercedes-Benz',
        category: 'gasoline',
        bodyType: 'SUV'
      },
      'gle': {
        standardName: 'GLE',
        aliases: ['GLE', 'Mercedes GLE', 'Mercedes-Benz GLE'],
        brand: 'Mercedes-Benz',
        category: 'gasoline',
        bodyType: 'Large SUV'
      },

      // Toyota
      'prius': {
        standardName: 'Prius',
        aliases: ['Prius', 'Toyota Prius'],
        brand: 'Toyota',
        category: 'hybrid',
        bodyType: 'Hatchback'
      },
      'corolla': {
        standardName: 'Corolla',
        aliases: ['Corolla', 'Toyota Corolla'],
        brand: 'Toyota',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'camry': {
        standardName: 'Camry',
        aliases: ['Camry', 'Toyota Camry'],
        brand: 'Toyota',
        category: 'gasoline',
        bodyType: 'Sedan'
      },
      'rav4': {
        standardName: 'RAV4',
        aliases: ['RAV4', 'RAV 4', 'Rav4', 'Toyota RAV4'],
        brand: 'Toyota',
        category: 'gasoline',
        bodyType: 'SUV'
      },
      'chr': {
        standardName: 'C-HR',
        aliases: ['C-HR', 'CHR', 'C HR', 'Toyota C-HR'],
        brand: 'Toyota',
        category: 'gasoline',
        bodyType: 'Crossover'
      },
      'highlander': {
        standardName: 'Highlander',
        aliases: ['Highlander', 'Toyota Highlander'],
        brand: 'Toyota',
        category: 'gasoline',
        bodyType: 'Large SUV'
      },
      'bz4x': {
        standardName: 'bZ4X',
        aliases: ['bZ4X', 'bz4x', 'BZ4X', 'Toyota bZ4X'],
        brand: 'Toyota',
        category: 'electric',
        bodyType: 'SUV'
      }
    }
  }

  /**
   * Body type standardization mappings
   */
  static getBodyTypeMappings(): Record<string, string> {
    return {
      // SUV variations
      'suv': 'SUV',
      'small suv': 'Compact SUV',
      'compact suv': 'Compact SUV',
      'medium suv': 'Mid-size SUV',
      'mid-size suv': 'Mid-size SUV',
      'large suv': 'Large SUV',
      'full-size suv': 'Large SUV',
      'crossover': 'Crossover',
      'cuv': 'Crossover',
      
      // Sedan variations
      'sedan': 'Sedan',
      'saloon': 'Sedan',
      'limousine': 'Sedan',
      
      // Hatchback variations
      'hatchback': 'Hatchback',
      'hatch': 'Hatchback',
      '5-door': 'Hatchback',
      
      // Estate variations
      'estate': 'Estate',
      'wagon': 'Estate',
      'touring': 'Estate',
      'avant': 'Estate',
      'variant': 'Estate',
      
      // Coupe variations
      'coupe': 'Coupe',
      'coupé': 'Coupe',
      '2-door': 'Coupe',
      
      // Convertible variations
      'convertible': 'Convertible',
      'cabriolet': 'Convertible',
      'roadster': 'Convertible',
      'spyder': 'Convertible',
      
      // Van variations
      'van': 'Van',
      'mpv': 'Van',
      'minivan': 'Van',
      'people carrier': 'Van',
      
      // Pickup variations
      'pickup': 'Pickup',
      'truck': 'Pickup',
      'double cab': 'Pickup'
    }
  }

  /**
   * Fuel type standardization mappings
   */
  static getFuelTypeMappings(): Record<string, string> {
    return {
      // Gasoline variations
      'gasoline': 'Gasoline',
      'petrol': 'Gasoline',
      'benzin': 'Gasoline',
      'gas': 'Gasoline',
      'unleaded': 'Gasoline',
      
      // Diesel variations
      'diesel': 'Diesel',
      'tdi': 'Diesel',
      'cdi': 'Diesel',
      'dci': 'Diesel',
      'hdi': 'Diesel',
      'crdi': 'Diesel',
      
      // Electric variations
      'electric': 'Electric',
      'battery': 'Electric',
      'bev': 'Electric',
      'full electric': 'Electric',
      'pure electric': 'Electric',
      
      // Hybrid variations
      'hybrid': 'Hybrid',
      'hev': 'Hybrid',
      'self-charging hybrid': 'Hybrid',
      'regular hybrid': 'Hybrid',
      
      // Plug-in Hybrid variations
      'plug-in hybrid': 'Plug-in Hybrid',
      'phev': 'Plug-in Hybrid',
      'rechargeable hybrid': 'Plug-in Hybrid',
      'plugin hybrid': 'Plug-in Hybrid',
      
      // Hydrogen
      'hydrogen': 'Hydrogen',
      'fuel cell': 'Hydrogen',
      'fcev': 'Hydrogen'
    }
  }

  /**
   * Transmission type standardization mappings
   */
  static getTransmissionMappings(): Record<string, string> {
    return {
      // Manual variations
      'manual': 'Manual',
      'manual transmission': 'Manual',
      'stick shift': 'Manual',
      'mt': 'Manual',
      '5-speed manual': 'Manual',
      '6-speed manual': 'Manual',
      
      // Automatic variations
      'automatic': 'Automatic',
      'automatic transmission': 'Automatic',
      'auto': 'Automatic',
      'at': 'Automatic',
      'tiptronic': 'Automatic',
      'multitronic': 'Automatic',
      'torque converter': 'Automatic',
      
      // DSG variations
      'dsg': 'DSG',
      'dual clutch': 'DSG',
      'dual-clutch': 'DSG',
      'direct shift': 'DSG',
      'powershift': 'DSG',
      'pdk': 'DSG',
      
      // CVT variations
      'cvt': 'CVT',
      'continuously variable': 'CVT',
      'variable transmission': 'CVT',
      'xtronic': 'CVT',
      
      // Semi-automatic variations
      'semi-automatic': 'Semi-automatic',
      'semi automatic': 'Semi-automatic',
      'automated manual': 'Semi-automatic',
      'robotized': 'Semi-automatic'
    }
  }

  /**
   * Specification field mappings with validation
   */
  static getSpecificationMappings(): Record<string, SpecificationMapping> {
    return {
      horsepower: {
        field: 'horsepower',
        patterns: [
          /(\d+)\s*hp/i,
          /(\d+)\s*hk/i,
          /(\d+)\s*ch/i,
          /(\d+)\s*ps/i,
          /(\d+)\s*bhp/i
        ],
        parser: (value: string) => {
          const match = value.match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        },
        validator: (value: number) => value >= 50 && value <= 1000,
        normalizer: (value: number) => Math.round(value / 5) * 5 // Round to nearest 5
      },

      kilowatts: {
        field: 'kilowatts',
        patterns: [
          /(\d+)\s*kw/i,
          /(\d+)\s*kilowatt/i
        ],
        parser: (value: string) => {
          const match = value.match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        },
        validator: (value: number) => value >= 35 && value <= 735, // 50-1000 HP equivalent
        normalizer: (value: number) => Math.round(value)
      },

      co2Emission: {
        field: 'co2Emission',
        patterns: [
          /(\d+)\s*g\/km/i,
          /(\d+)\s*gram/i,
          /co2:\s*(\d+)/i
        ],
        parser: (value: string) => {
          const match = value.match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        },
        validator: (value: number) => value >= 0 && value <= 400,
        normalizer: (value: number) => Math.round(value)
      },

      fuelConsumption: {
        field: 'fuelConsumption',
        patterns: [
          /(\d+[,.]?\d*)\s*l\/100\s*km/i,
          /(\d+[,.]?\d*)\s*km\/l/i,
          /(\d+[,.]?\d*)\s*liter/i
        ],
        parser: (value: string) => {
          // Handle both L/100km and km/L formats
          const l100kmMatch = value.match(/(\d+[,.]?\d*)\s*l\/100\s*km/i);
          if (l100kmMatch) {
            return {
              value: parseFloat(l100kmMatch[1].replace(',', '.')),
              unit: 'L/100km'
            };
          }
          
          const kmLMatch = value.match(/(\d+[,.]?\d*)\s*km\/l/i);
          if (kmLMatch) {
            const kmL = parseFloat(kmLMatch[1].replace(',', '.'));
            return {
              value: 100 / kmL, // Convert to L/100km
              unit: 'L/100km'
            };
          }
          
          return null;
        },
        validator: (value: any) => {
          if (typeof value === 'object' && value.value) {
            return value.value >= 2.0 && value.value <= 25.0;
          }
          return false;
        }
      },

      electricRange: {
        field: 'electricRange',
        patterns: [
          /(\d+)\s*km/i,
          /range:\s*(\d+)/i,
          /wltp:\s*(\d+)/i
        ],
        parser: (value: string) => {
          const match = value.match(/(\d+)/);
          return match ? parseInt(match[1]) : null;
        },
        validator: (value: number) => value >= 100 && value <= 800,
        normalizer: (value: number) => Math.round(value / 10) * 10 // Round to nearest 10
      },

      electricConsumption: {
        field: 'electricConsumption',
        patterns: [
          /(\d+[,.]?\d*)\s*kwh\/100\s*km/i,
          /(\d+[,.]?\d*)\s*kwh/i
        ],
        parser: (value: string) => {
          const match = value.match(/(\d+[,.]?\d*)/);
          return match ? parseFloat(match[1].replace(',', '.')) : null;
        },
        validator: (value: number) => value >= 10 && value <= 35,
        normalizer: (value: number) => Math.round(value * 10) / 10 // Round to 1 decimal
      }
    }
  }

  /**
   * Find standardized model name using fuzzy matching
   */
  static findStandardizedModel(inputModel: string, brand?: string): {
    standardName: string;
    confidence: number;
    mapping: ModelMapping;
  } | null {
    const modelMappings = this.getModelMappings();
    const cleanInput = inputModel.toLowerCase().trim();

    // Direct match first
    for (const [key, mapping] of Object.entries(modelMappings)) {
      if (brand && mapping.brand.toLowerCase() !== brand.toLowerCase()) {
        continue;
      }

      // Check exact aliases
      for (const alias of mapping.aliases) {
        if (alias.toLowerCase() === cleanInput) {
          return {
            standardName: mapping.standardName,
            confidence: 1.0,
            mapping
          };
        }
      }
    }

    // Fuzzy matching
    let bestMatch: { standardName: string; confidence: number; mapping: ModelMapping } | null = null;
    let bestScore = 0;

    for (const [key, mapping] of Object.entries(modelMappings)) {
      if (brand && mapping.brand.toLowerCase() !== brand.toLowerCase()) {
        continue;
      }

      for (const alias of mapping.aliases) {
        const score = this.calculateStringSimilarity(cleanInput, alias.toLowerCase());
        if (score > bestScore && score >= 0.8) { // 80% similarity threshold
          bestScore = score;
          bestMatch = {
            standardName: mapping.standardName,
            confidence: score,
            mapping
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return (maxLen - distance) / maxLen;
  }

  /**
   * Parse and validate specification value
   */
  static parseSpecification(field: string, value: string): {
    parsedValue: any;
    isValid: boolean;
    normalizedValue?: any;
  } {
    const specMappings = this.getSpecificationMappings();
    const mapping = specMappings[field];

    if (!mapping) {
      return { parsedValue: value, isValid: false };
    }

    // Try to parse with patterns
    for (const pattern of mapping.patterns) {
      if (pattern.test(value)) {
        const parsedValue = mapping.parser(value);
        if (parsedValue !== null) {
          const isValid = mapping.validator(parsedValue);
          const normalizedValue = mapping.normalizer ? mapping.normalizer(parsedValue) : parsedValue;
          
          return {
            parsedValue,
            isValid,
            normalizedValue
          };
        }
      }
    }

    return { parsedValue: value, isValid: false };
  }

  /**
   * Get brand variations mapping
   */
  static getBrandMappings(): Record<string, string> {
    return {
      'vw': 'Volkswagen',
      'volkswagen': 'Volkswagen',
      'audi': 'Audi',
      'bmw': 'BMW',
      'mercedes': 'Mercedes-Benz',
      'mercedes-benz': 'Mercedes-Benz',
      'mb': 'Mercedes-Benz',
      'toyota': 'Toyota',
      'volvo': 'Volvo',
      'ford': 'Ford',
      'opel': 'Opel',
      'peugeot': 'Peugeot',
      'renault': 'Renault',
      'citroën': 'Citroën',
      'citroen': 'Citroën',
      'skoda': 'Škoda',
      'škoda': 'Škoda',
      'seat': 'SEAT',
      'tesla': 'Tesla',
      'hyundai': 'Hyundai',
      'kia': 'Kia',
      'mazda': 'Mazda',
      'nissan': 'Nissan',
      'honda': 'Honda',
      'subaru': 'Subaru',
      'mitsubishi': 'Mitsubishi',
      'lexus': 'Lexus',
      'infiniti': 'Infiniti',
      'acura': 'Acura',
      'genesis': 'Genesis',
      'porsche': 'Porsche',
      'jaguar': 'Jaguar',
      'land rover': 'Land Rover',
      'range rover': 'Land Rover',
      'mini': 'MINI',
      'smart': 'smart',
      'fiat': 'Fiat',
      'alfa romeo': 'Alfa Romeo',
      'alfa': 'Alfa Romeo',
      'jeep': 'Jeep',
      'chrysler': 'Chrysler',
      'dodge': 'Dodge',
      'ram': 'Ram',
      'cadillac': 'Cadillac',
      'buick': 'Buick',
      'chevrolet': 'Chevrolet',
      'gmc': 'GMC',
      'lincoln': 'Lincoln'
    }
  }
}

/*
 * StandardizationMaps
 * 
 * Comprehensive mapping tables for vehicle data standardization.
 * Provides intelligent fuzzy matching and normalization capabilities.
 * 
 * Key Features:
 * - Extensive model name aliases with brand associations
 * - Body type, fuel type, and transmission standardization
 * - Specification parsing with validation and normalization
 * - Fuzzy string matching for intelligent mapping
 * - Brand name variations and standardization
 * - Pattern-based specification extraction
 * 
 * Usage:
 * const result = StandardizationMaps.findStandardizedModel('ID 4', 'Volkswagen')
 * console.log(result.standardName) // 'ID.4'
 * 
 * const spec = StandardizationMaps.parseSpecification('horsepower', '150 HP')
 * console.log(spec.normalizedValue) // 150
 */