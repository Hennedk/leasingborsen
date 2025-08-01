import { getEnvironmentConfig } from '../src/config/environments';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env';
try {
  config({ path: envFile });
  console.log(`Loaded environment from ${envFile}`);
} catch (e) {
  console.warn(`Could not load ${envFile} file`);
}

// Manually set VITE_ variables for Node.js context
if (process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
if (process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

// Try to read from .env file directly if still not loaded
if (!process.env.VITE_SUPABASE_URL) {
  try {
    const envContent = readFileSync(envFile, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('VITE_SUPABASE_URL=')) {
        process.env.VITE_SUPABASE_URL = line.split('=')[1];
      }
      if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        process.env.VITE_SUPABASE_ANON_KEY = line.split('=')[1];
      }
    }
  } catch (e) {
    console.warn(`Could not read ${envFile} file directly`);
  }
}

async function verifyEnvironment() {
  console.log('🔍 Verifying environment setup...\n');
  
  const config = getEnvironmentConfig();
  
  console.log(`Current Environment: ${config.name}`);
  console.log(`Supabase URL: ${config.supabase.url}`);
  console.log(`Debug Mode: ${config.features.debugMode}`);
  console.log(`AI Extraction: ${config.features.aiExtractionEnabled}\n`);
  
  // Verify environment variables
  console.log('📋 Environment Variables:');
  console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`VITEST: ${process.env.VITEST || 'false'}\n`);
  
  // Test connection (only if not in test mode)
  if (config.name !== 'test') {
    try {
      console.log('🔌 Testing database connection...');
      const supabase = createClient(
        config.supabase.url,
        config.supabase.anonKey
      );
      
      const { count, error } = await supabase
        .from('sellers')
        .select('*', { count: 'exact', head: true });
        
      if (error) throw error;
      
      console.log(`✅ Connected successfully!`);
      console.log(`📊 Found ${count} sellers in database\n`);
    } catch (error) {
      console.error('❌ Connection failed:', error);
    }
  } else {
    console.log('🧪 Test environment detected - skipping real database connection\n');
  }
  
  // Environment-specific checks
  console.log('🔒 Safety Checks:');
  
  if (config.name === 'production') {
    console.log('🔴 PRODUCTION environment detected');
    console.log('⚠️  Extra safety measures active');
    console.log('⚠️  Dangerous operations will be blocked');
  } else if (config.name === 'test') {
    console.log('🧪 TEST environment detected');
    console.log('✅ Mocks will be used for external services');
    console.log('✅ Database operations will use test data');
  } else {
    console.log(`🔧 DEVELOPMENT environment (${config.name}) detected`);
    console.log('⚠️  Using production database with safety guards');
    console.log('💡 Consider upgrading to Supabase Pro for proper branching');
  }
  
  console.log('\n🎯 Recommendations:');
  
  if (config.name === 'local' && config.supabase.url.includes('supabase.co')) {
    console.log('⚠️  Local development is using production database');
    console.log('💡 Consider setting up local Supabase with Docker for safer development');
  }
  
  if (config.features.aiExtractionEnabled && config.name !== 'production') {
    console.log('⚠️  AI extraction is enabled in non-production environment');
    console.log('💰 This may incur costs - consider using mocks for testing');
  }
  
  console.log('\n✅ Environment verification complete!');
}

// Allow running directly with tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyEnvironment().catch(console.error);
}

export default verifyEnvironment;