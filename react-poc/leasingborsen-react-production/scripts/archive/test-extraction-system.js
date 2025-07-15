#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const TEST_DEALER_ID = '53a1d14b-c01d-4c55-9892-4bb82bdf8e02'; // Bilhuset Birkerød

class ExtractionSystemTester {
  constructor() {
    this.results = [];
    this.passCount = 0;
    this.failCount = 0;
  }

  async runAllTests() {
    console.log('🧪 EXTRACTION SYSTEM COMPREHENSIVE TEST SUITE\n');
    console.log('=' .repeat(50));
    console.log('\n');

    // Run all test cases
    await this.testCase1_BasicExtraction();
    await this.testCase2_EquipmentDifferentiation();
    await this.testCase3_DuplicateConstraints();
    await this.testCase4_ExistingListingMatching();
    await this.testCase5_ApplyChanges();
    await this.testCase6_ErrorHandling();
    await this.testCase7_ResponsesAPIUsage();
    await this.testCase8_DataIntegrity();

    // Print summary
    this.printSummary();
  }

  async testCase1_BasicExtraction() {
    console.log('📋 TEST CASE 1: Basic Extraction Validation');
    console.log('-'.repeat(40));
    
    try {
      // Get a recent successful extraction
      const { data: session } = await supabase
        .from('extraction_sessions')
        .select('*')
        .eq('status', 'completed')
        .eq('seller_id', TEST_DEALER_ID)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        this.fail('No completed extraction sessions found');
        return;
      }

      // Validate session data
      const checks = [
        { name: 'Session has ID', pass: !!session.id },
        { name: 'Session has seller_id', pass: !!session.seller_id },
        { name: 'Session has created_at', pass: !!session.created_at },
        { name: 'Session has total_extracted > 0', pass: session.total_extracted > 0 },
        { name: 'Session uses Responses API', pass: session.api_version === 'responses-api' }
      ];

      checks.forEach(check => {
        if (check.pass) {
          this.pass(check.name);
        } else {
          this.fail(check.name);
        }
      });

      // Check extraction changes exist
      const { data: changes, count } = await supabase
        .from('extraction_listing_changes')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      if (count > 0) {
        this.pass(`Session has ${count} extraction changes`);
      } else {
        this.fail('Session has no extraction changes');
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }
    
    console.log('\n');
  }

  async testCase2_EquipmentDifferentiation() {
    console.log('📋 TEST CASE 2: Equipment Differentiation');
    console.log('-'.repeat(40));

    try {
      // Find sessions with equipment variants
      const { data: changes } = await supabase
        .from('extraction_listing_changes')
        .select('extracted_data, session_id')
        .like('extracted_data->>variant', '% - %')
        .limit(10);

      const equipmentVariants = changes?.filter(c => {
        const variant = c.extracted_data?.variant || '';
        return variant.includes('alufælge') || 
               variant.includes('soltag') || 
               variant.includes('sidespejle') ||
               variant.includes('custom colour');
      });

      if (equipmentVariants && equipmentVariants.length > 0) {
        this.pass(`Found ${equipmentVariants.length} equipment-differentiated variants`);
        
        // Check format
        const wellFormatted = equipmentVariants.filter(ev => {
          const parts = ev.extracted_data.variant.split(' - ');
          return parts.length >= 2 && parts[1].includes(',');
        });

        if (wellFormatted.length > 0) {
          this.pass('Equipment variants properly formatted with comma separation');
        } else {
          this.warn('Equipment variants found but formatting needs review');
        }
      } else {
        this.warn('No equipment-differentiated variants found in recent extractions');
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }

    console.log('\n');
  }

  async testCase3_DuplicateConstraints() {
    console.log('📋 TEST CASE 3: Duplicate Constraint Prevention');
    console.log('-'.repeat(40));

    try {
      // Check for recent duplicate errors
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7); // Last 7 days

      const { data: duplicateErrors } = await supabase
        .from('extraction_listing_changes')
        .select('session_id, review_notes')
        .like('review_notes', '%duplicate key%')
        .gte('created_at', recentDate.toISOString());

      if (!duplicateErrors || duplicateErrors.length === 0) {
        this.pass('No duplicate key errors in last 7 days');
      } else {
        // Check if they're all from before the fix
        const uniqueSessions = [...new Set(duplicateErrors.map(e => e.session_id))];
        
        // Get session dates
        const { data: sessions } = await supabase
          .from('extraction_sessions')
          .select('id, created_at')
          .in('id', uniqueSessions);

        const fixDate = new Date('2025-01-11T12:00:00'); // Approximate fix deployment time
        const errorsAfterFix = sessions?.filter(s => new Date(s.created_at) > fixDate);

        if (!errorsAfterFix || errorsAfterFix.length === 0) {
          this.pass('All duplicate errors occurred before fix deployment');
        } else {
          this.fail(`${errorsAfterFix.length} sessions with duplicate errors after fix`);
        }
      }

      // Validate constraint uniqueness in recent sessions
      const { data: recentSession } = await supabase
        .from('extraction_sessions')
        .select('id')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentSession) {
        const { data: changes } = await supabase
          .from('extraction_listing_changes')
          .select('extracted_data')
          .eq('session_id', recentSession.id);

        let duplicatesFound = 0;
        changes?.forEach(change => {
          const offers = change.extracted_data?.offers || [];
          const seen = new Set();
          
          offers.forEach(offer => {
            const key = `${offer.mileage_per_year}-${offer.first_payment}-${offer.period_months}`;
            if (seen.has(key)) {
              duplicatesFound++;
            }
            seen.add(key);
          });
        });

        if (duplicatesFound === 0) {
          this.pass('No duplicate constraints in most recent extraction');
        } else {
          this.fail(`Found ${duplicatesFound} duplicate constraints in recent extraction`);
        }
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }

    console.log('\n');
  }

  async testCase4_ExistingListingMatching() {
    console.log('📋 TEST CASE 4: Existing Listing Matching');
    console.log('-'.repeat(40));

    try {
      // Get recent extraction with matches
      const { data: changes } = await supabase
        .from('extraction_listing_changes')
        .select('*')
        .eq('change_type', 'update')
        .not('existing_listing_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (changes && changes.length > 0) {
        this.pass(`Found ${changes.length} matched existing listings`);

        // Check match quality
        const goodMatches = changes.filter(c => 
          c.confidence_score >= 0.8 && 
          c.match_method !== 'unmatched'
        );

        if (goodMatches.length === changes.length) {
          this.pass('All matches have high confidence scores');
        } else {
          this.warn(`${changes.length - goodMatches.length} matches with low confidence`);
        }

        // Check variant consistency
        const variantMatches = changes.filter(c => {
          const extracted = c.extracted_data?.variant;
          const matchDetails = c.match_details;
          return matchDetails?.variantSource === 'existing';
        });

        if (variantMatches.length > 0) {
          this.pass(`${variantMatches.length} matches used existing variant names`);
        }

      } else {
        this.warn('No existing listing matches found to test');
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }

    console.log('\n');
  }

  async testCase5_ApplyChanges() {
    console.log('📋 TEST CASE 5: Apply Changes Functionality');
    console.log('-'.repeat(40));

    try {
      // Check for recently applied changes
      const { data: appliedChanges } = await supabase
        .from('extraction_listing_changes')
        .select('*')
        .eq('change_status', 'applied')
        .order('reviewed_at', { ascending: false })
        .limit(10);

      if (appliedChanges && appliedChanges.length > 0) {
        this.pass(`Found ${appliedChanges.length} recently applied changes`);

        // Check if applied_by is set
        const withAppliedBy = appliedChanges.filter(c => c.applied_by);
        if (withAppliedBy.length > 0) {
          this.pass('Applied changes have applied_by field set');
        }

        // Verify actual data changes
        const updateChanges = appliedChanges.filter(c => c.change_type === 'update');
        if (updateChanges.length > 0) {
          const change = updateChanges[0];
          
          // Check if the listing was actually updated
          const { data: listing } = await supabase
            .from('listings')
            .select('updated_at')
            .eq('id', change.existing_listing_id)
            .single();

          if (listing && new Date(listing.updated_at) > new Date(change.created_at)) {
            this.pass('Verified listing was actually updated after applying changes');
          } else {
            this.warn('Could not verify listing update timestamp');
          }
        }

      } else {
        this.warn('No recently applied changes found to test');
      }

      // Check for rejected changes with errors
      const { data: rejectedChanges } = await supabase
        .from('extraction_listing_changes')
        .select('review_notes')
        .eq('change_status', 'rejected')
        .not('review_notes', 'is', null)
        .limit(5);

      if (rejectedChanges && rejectedChanges.length > 0) {
        this.pass('Error handling working - rejected changes have error notes');
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }

    console.log('\n');
  }

  async testCase6_ErrorHandling() {
    console.log('📋 TEST CASE 6: Error Handling & Recovery');
    console.log('-'.repeat(40));

    try {
      // Check for failed sessions
      const { data: failedSessions } = await supabase
        .from('extraction_sessions')
        .select('*')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (failedSessions && failedSessions.length > 0) {
        this.info(`Found ${failedSessions.length} failed sessions for analysis`);

        // Check if they have proper error tracking
        const withErrors = failedSessions.filter(s => 
          s.error_message || s.completed_at
        );

        if (withErrors.length > 0) {
          this.pass('Failed sessions have error tracking');
        }
      } else {
        this.pass('No recent failed sessions (good stability)');
      }

      // Check monitoring metrics
      const { data: metrics } = await supabase
        .from('migration_metrics')
        .select('*')
        .eq('error_occurred', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (metrics && metrics.length > 0) {
        this.pass('Error monitoring is capturing failures');
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }

    console.log('\n');
  }

  async testCase7_ResponsesAPIUsage() {
    console.log('📋 TEST CASE 7: Responses API Integration');
    console.log('-'.repeat(40));

    try {
      // Check API version distribution
      const { data: sessions } = await supabase
        .from('extraction_sessions')
        .select('api_version')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const apiVersions = sessions?.reduce((acc, s) => {
        const version = s.api_version || 'unknown';
        acc[version] = (acc[version] || 0) + 1;
        return acc;
      }, {});

      if (apiVersions && apiVersions['responses-api']) {
        this.pass(`Responses API used in ${apiVersions['responses-api']} recent sessions`);
      } else {
        this.fail('No recent Responses API usage found');
      }

      // Check inference rates
      const { data: recentSessions } = await supabase
        .from('extraction_sessions')
        .select('inference_rate, variant_source_stats')
        .eq('api_version', 'responses-api')
        .not('inference_rate', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentSessions && recentSessions.length > 0) {
        const avgInferenceRate = recentSessions.reduce((sum, s) => sum + (s.inference_rate || 0), 0) / recentSessions.length;
        
        if (avgInferenceRate < 0.2) {
          this.pass(`Average inference rate: ${(avgInferenceRate * 100).toFixed(1)}% (< 20% target)`);
        } else {
          this.warn(`Average inference rate: ${(avgInferenceRate * 100).toFixed(1)}% (above 20% target)`);
        }
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }

    console.log('\n');
  }

  async testCase8_DataIntegrity() {
    console.log('📋 TEST CASE 8: Data Integrity Validation');
    console.log('-'.repeat(40));

    try {
      // Check for orphaned records
      const { data: orphanedChanges } = await supabase
        .from('extraction_listing_changes')
        .select('id, session_id')
        .is('session_id', null);

      if (!orphanedChanges || orphanedChanges.length === 0) {
        this.pass('No orphaned extraction changes found');
      } else {
        this.fail(`Found ${orphanedChanges.length} orphaned extraction changes`);
      }

      // Check reference data integrity
      const { data: recentListings } = await supabase
        .from('listings')
        .select('id, make_id, model_id, fuel_type_id, transmission_id, body_type_id')
        .order('created_at', { ascending: false })
        .limit(10);

      let nullRefs = 0;
      recentListings?.forEach(listing => {
        if (!listing.make_id || !listing.model_id) {
          nullRefs++;
        }
      });

      if (nullRefs === 0) {
        this.pass('All recent listings have valid make/model references');
      } else {
        this.fail(`${nullRefs} recent listings missing make/model references`);
      }

      // Validate pricing data
      const { data: pricingIssues } = await supabase
        .from('lease_pricing')
        .select('id')
        .or('monthly_price.lte.0,monthly_price.is.null')
        .limit(10);

      if (!pricingIssues || pricingIssues.length === 0) {
        this.pass('No invalid pricing data found');
      } else {
        this.fail(`Found ${pricingIssues.length} invalid pricing records`);
      }

    } catch (error) {
      this.fail(`Test error: ${error.message}`);
    }

    console.log('\n');
  }

  // Helper methods
  pass(message) {
    console.log(`✅ ${message}`);
    this.passCount++;
    this.results.push({ status: 'pass', message });
  }

  fail(message) {
    console.log(`❌ ${message}`);
    this.failCount++;
    this.results.push({ status: 'fail', message });
  }

  warn(message) {
    console.log(`⚠️  ${message}`);
    this.results.push({ status: 'warn', message });
  }

  info(message) {
    console.log(`ℹ️  ${message}`);
    this.results.push({ status: 'info', message });
  }

  printSummary() {
    console.log('=' .repeat(50));
    console.log('\n📊 TEST SUMMARY\n');
    console.log(`Total Tests: ${this.passCount + this.failCount}`);
    console.log(`Passed: ${this.passCount} ✅`);
    console.log(`Failed: ${this.failCount} ❌`);
    console.log(`Pass Rate: ${((this.passCount / (this.passCount + this.failCount)) * 100).toFixed(1)}%`);
    
    if (this.failCount > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`  - ${r.message}`));
    }

    const warnings = this.results.filter(r => r.status === 'warn');
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(r => console.log(`  - ${r.message}`));
    }

    console.log('\n' + '=' .repeat(50));
  }
}

// Run tests
const tester = new ExtractionSystemTester();
tester.runAllTests().catch(console.error);