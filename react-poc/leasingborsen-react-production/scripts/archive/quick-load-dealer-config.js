#!/usr/bin/env node

/**
 * Quick loader for dealer configurations into Supabase
 * Run with: node scripts/quick-load-dealer-config.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadSimpleConfig() {
  console.log('🚀 Quick Dealer Configuration Loader');
  console.log('====================================');
  
  try {
    // Simple Volkswagen configuration for testing
    const vwConfig = {
      id: 'volkswagen',
      name: 'Volkswagen Group',
      version: 'v1.0',
      config: {
        id: 'volkswagen',
        name: 'Volkswagen',
        version: 'v1.0',
        makes: ['Volkswagen', 'VW', 'Audi', 'SKODA', 'SEAT'],
        patterns: {
          make: '\\b(Volkswagen|VW|Audi|SKODA|SEAT)\\b',
          model: '(?:Volkswagen|VW|Audi|SKODA|SEAT)\\s+([A-Z][a-zA-Z0-9\\s\\-]+?)\\s+(?:\\d|\\n)',
          monthly_price: '\\d{1,3}[.,]\\d{3}(?=\\s*kr)',
          variant: '([A-Z0-9]+(?:\\s[A-Z0-9]+)*?)\\s+(?:\\d{1,3}[.,]\\d{3}|\\d{4,})'
        },
        extraction: {
          method: 'hybrid',
          ai_fallback: true,
          confidence_threshold: 0.7,
          aiPrompt: {
            systemRole: 'You are an expert at extracting vehicle pricing information from Volkswagen Group PDF price lists.',
            userPromptTemplate: 'Extract all vehicle information from this VW Group price list text: {text}',
            temperature: 0.1,
            maxTokens: 4000,
            model: 'gpt-3.5-turbo',
            examples: []
          },
          confidence: {
            usePatternOnly: 0.85,
            requireReview: 0.6,
            minimumAcceptable: 0.4,
            cacheResults: 0.7
          }
        },
        validation: {
          required_fields: ['model', 'variant', 'monthly_price'],
          priceRange: { min: 1000, max: 15000 }
        },
        optimization: {
          cacheEnabled: true,
          learningEnabled: true,
          maxAICostPerPDF: 0.50,
          patternLearningThreshold: 0.9
        }
      }
    };

    console.log('📄 Loading simplified Volkswagen configuration...');
    
    // Try direct insert first
    const { data, error } = await supabase
      .from('dealer_configs')
      .upsert(vwConfig, {
        onConflict: 'id'
      })
      .select();
    
    if (error) {
      console.error('❌ Failed to insert with full schema, trying minimal schema:', error.message);
      
      // Try minimal schema
      const minimalConfig = {
        id: 'volkswagen',
        name: 'Volkswagen Group',
        version: 'v1.0',
        config: vwConfig.config
      };
      
      const { data: data2, error: error2 } = await supabase
        .from('dealer_configs')
        .upsert(minimalConfig, {
          onConflict: 'id'
        })
        .select();
      
      if (error2) {
        throw error2;
      }
      
      console.log('✅ Successfully loaded minimal Volkswagen configuration');
    } else {
      console.log('✅ Successfully loaded full Volkswagen configuration');
    }
    
    // Verify the configuration was loaded
    const { data: verification, error: verifyError } = await supabase
      .from('dealer_configs')
      .select('id, name, version')
      .eq('id', 'volkswagen')
      .single();
    
    if (!verifyError && verification) {
      console.log(`✅ Verified: ${verification.name} (${verification.id}) v${verification.version}`);
    }
    
    console.log('\n✨ Configuration loaded! Ready to test PDF processing.');
    
  } catch (error) {
    console.error('❌ Failed to load configuration:', error.message);
    process.exit(1);
  }
}

// Run the loader
loadSimpleConfig();