import { faker } from '@faker-js/faker';

export const dealerFactory = {
  volkswagen: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: 'TEST_Volkswagen_Denmark',
    email: 'test@vw.dk',
    phone: '+45 12345678',
    address: 'Test Street 123',
    city: 'Copenhagen',
    postal_code: '1000',
    country: 'Denmark',
    website: 'https://test-vw.dk',
    contact_person: 'Test Manager',
    active: true,
    config: {
      pdf_url: 'https://vw-dealer.dk/catalogs/latest.pdf',
      patterns: {
        model: /(?:Golf|Passat|Tiguan|Polo|ID\.\d)/,
        variant: /(TSI|TDI|GTI|GTX|R-Line)/,
        price: /(\d{1,3}[.,]?\d{3})\s*kr/,
      },
      ai_config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        max_tokens: 2000,
      }
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),
  
  toyota: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: 'TEST_Toyota_Denmark',
    email: 'test@toyota.dk',
    phone: '+45 87654321',
    address: 'Test Avenue 456',
    city: 'Aarhus',
    postal_code: '8000',
    country: 'Denmark',
    website: 'https://test-toyota.dk',
    contact_person: 'Toyota Manager',
    active: true,
    config: {
      pdf_url: 'https://toyota-dealer.dk/prisliste.pdf',
      transmission_handling: 'separate_field',
      patterns: {
        variant_cleanup: /\s*(Automatik|Manuel|aut\.)$/,
        price_extraction: /(\d{1,3}[.,]?\d{3})\s*kr[\/\s]*md/,
      },
      ai_config: {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.2,
        max_tokens: 3000,
      }
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),
  
  ford: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: 'TEST_Ford_Denmark',
    email: 'test@ford.dk',
    phone: '+45 55555555',
    address: 'Ford Street 789',
    city: 'Odense',
    postal_code: '5000',
    country: 'Denmark',
    website: 'https://test-ford.dk',
    contact_person: 'Ford Manager',
    active: true,
    config: {
      pdf_url: 'https://ford-dealer.dk/prisliste.pdf',
      merpris_handling: true,
      patterns: {
        base_price: /(\d{1,3}[.,]?\d{3})\s*kr[\/\s]*md/,
        merpris_supplement: /\+\s*(\d+)\s*kr/,
      },
      ai_config: {
        model: 'gpt-4',
        temperature: 0.15,
        max_tokens: 2500,
      }
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  hyundai: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: 'TEST_Hyundai_Denmark',
    email: 'test@hyundai.dk',
    phone: '+45 44444444',
    address: 'Hyundai Boulevard 321',
    city: 'Aalborg',
    postal_code: '9000',
    country: 'Denmark',
    website: 'https://test-hyundai.dk',
    contact_person: 'Hyundai Manager',
    active: true,
    config: {
      pdf_url: 'https://hyundai-dealer.dk/prisliste.pdf',
      equipment_variants: true,
      patterns: {
        model: /IONIQ|KONA|TUCSON|i30|i20/,
        equipment: /–\s*([^,]+)/,
      },
      ai_config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        max_tokens: 2000,
      }
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  generic: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: `TEST_${faker.company.name()}_Denmark`,
    email: faker.internet.email(),
    phone: faker.phone.number('+45 ## ## ## ##'),
    address: faker.location.streetAddress(),
    city: faker.helpers.arrayElement(['Copenhagen', 'Aarhus', 'Odense', 'Aalborg']),
    postal_code: faker.location.zipCode('####'),
    country: 'Denmark',
    website: faker.internet.url(),
    contact_person: faker.person.fullName(),
    active: faker.datatype.boolean({ probability: 0.9 }),
    config: {
      pdf_url: faker.internet.url() + '/prisliste.pdf',
      patterns: {},
      ai_config: {
        model: faker.helpers.arrayElement(['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet-20240229']),
        temperature: faker.number.float({ min: 0.1, max: 0.3 }),
        max_tokens: faker.number.int({ min: 1500, max: 3000 }),
      }
    },
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Factory for creating multiple dealers at once
  createMultiple: (count: number, type?: string) => {
    const dealers = [];
    for (let i = 0; i < count; i++) {
      if (type && dealerFactory[type as keyof typeof dealerFactory]) {
        dealers.push(dealerFactory[type as keyof typeof dealerFactory]());
      } else {
        dealers.push(dealerFactory.generic());
      }
    }
    return dealers;
  },

  // Create a dealer with specific overrides
  withOverrides: (type: string, overrides: any) => {
    if (type && dealerFactory[type as keyof typeof dealerFactory]) {
      return (dealerFactory[type as keyof typeof dealerFactory] as any)(overrides);
    }
    return dealerFactory.generic(overrides);
  },
};