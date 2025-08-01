export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  features: {
    aiExtractionEnabled: boolean;
    debugMode: boolean;
  };
  name: 'local' | 'test' | 'staging' | 'production';
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV;
  const isTest = process.env.VITEST === 'true';
  const isVercelPreview = import.meta.env.VERCEL_ENV === 'preview';
  
  // Additional check for Vercel preview based on hostname pattern
  const isVercelPreviewByHostname = typeof window !== 'undefined' && 
    /leasingborsen-react-production-[a-z0-9]+\.vercel\.app/.test(window.location.hostname) &&
    window.location.hostname !== 'leasingborsen-react-production.vercel.app';
  
  // Testing environment (for test suite) - uses mocks
  if (isTest) {
    return {
      name: 'test',
      supabase: {
        url: 'http://localhost:54321', // Mock URL for tests
        anonKey: 'test-anon-key',
      },
      features: {
        aiExtractionEnabled: false, // Use mocks in tests
        debugMode: true,
      },
    };
  }
  
  // Vercel Preview environment - uses staging database
  if (isVercelPreview || isVercelPreviewByHostname || env === 'staging' || process.env.VITE_ENVIRONMENT === 'staging') {
    return {
      name: 'staging',
      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL!,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: import.meta.env.VITE_AI_EXTRACTION_ENABLED === 'true',
        debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
      },
    };
  }
  
  // Local development - currently uses production but with safety guards
  if (env === 'development' && !import.meta.env.VERCEL) {
    return {
      name: 'local',
      supabase: {
        url: import.meta.env.VITE_SUPABASE_LOCAL_URL || 
             import.meta.env.VITE_SUPABASE_URL!,
        anonKey: import.meta.env.VITE_SUPABASE_LOCAL_ANON_KEY || 
                 import.meta.env.VITE_SUPABASE_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: import.meta.env.VITE_AI_EXTRACTION_ENABLED === 'true',
        debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
      },
    };
  }
  
  // Production
  return {
    name: 'production',
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL!,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
    },
    features: {
      aiExtractionEnabled: import.meta.env.VITE_AI_EXTRACTION_ENABLED === 'true',
      debugMode: false,
    },
  };
};

// Helper to get current environment name  
export const getCurrentEnvironment = (): string => {
  return getEnvironmentConfig().name;
};

// Helper to check if in production
export const isProduction = (): boolean => {
  return getEnvironmentConfig().name === 'production';
};

// Helper to check if in testing mode
export const isTesting = (): boolean => {
  return getEnvironmentConfig().name === 'test';
};

// Helper to check if debug mode is enabled
export const isDebugMode = (): boolean => {
  return getEnvironmentConfig().features.debugMode;
};