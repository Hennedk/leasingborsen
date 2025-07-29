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
  
  // Staging environment - explicitly set via NODE_ENV=staging
  if (env === 'staging' || process.env.VITE_ENVIRONMENT === 'staging') {
    return {
      name: 'staging',
      supabase: {
        url: process.env.VITE_SUPABASE_URL || 
             process.env.VITE_SUPABASE_STAGING_URL!,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY || 
                 process.env.VITE_SUPABASE_STAGING_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: true,
        debugMode: true,
      },
    };
  }
  
  // Local development - currently uses production but with safety guards
  if (env === 'development' && !process.env.VERCEL) {
    return {
      name: 'local',
      supabase: {
        url: process.env.VITE_SUPABASE_LOCAL_URL || 
             process.env.VITE_SUPABASE_URL!,
        anonKey: process.env.VITE_SUPABASE_LOCAL_ANON_KEY || 
                 process.env.VITE_SUPABASE_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: true,
        debugMode: true,
      },
    };
  }
  
  // Vercel preview deployments - would use staging if available
  if (process.env.VERCEL_ENV === 'preview') {
    return {
      name: 'staging',
      supabase: {
        url: process.env.VITE_SUPABASE_STAGING_URL || 
             process.env.VITE_SUPABASE_URL!,
        anonKey: process.env.VITE_SUPABASE_STAGING_ANON_KEY || 
                 process.env.VITE_SUPABASE_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: true,
        debugMode: true,
      },
    };
  }
  
  // Production
  return {
    name: 'production',
    supabase: {
      url: process.env.VITE_SUPABASE_URL!,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    },
    features: {
      aiExtractionEnabled: true,
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