# Comprehensive Test-Driven Plan: Automatic Lease Score Calculation System

## 🎯 Problem Statement & Vision

**Current Gap**: Lease scores are marked as stale when data changes, but require manual intervention to actually calculate. This breaks the user experience and leaves listings with outdated or missing scores.

**Vision**: Fully automated lease score calculation that runs immediately when prerequisites are met, with comprehensive error handling, performance optimization, and bulletproof reliability.

## 🧪 Test-Driven Development Strategy

### Core Testing Philosophy
1. **Write tests before code** - Define expected behavior first
2. **Red-Green-Refactor** - Fail, pass, optimize cycle
3. **Edge cases first** - Test failure modes before happy paths
4. **Integration coverage** - Test all pathways that trigger calculations
5. **Performance constraints** - Define and enforce performance requirements

## 📋 Phase 1: Database-Level Auto-Calculation Engine

### 1.1 PostgreSQL Function Implementation
**File**: `supabase/migrations/20250809_auto_calculate_lease_score.sql`

#### Test Cases to Write First:
```sql
-- Unit Tests for calculate_lease_score_auto() function
CREATE OR REPLACE FUNCTION test_lease_score_calculation()
RETURNS TABLE(test_name TEXT, result TEXT, expected TEXT, passed BOOLEAN);

-- Test cases:
-- ✅ Valid single offer calculation
-- ✅ Multi-offer best score selection  
-- ✅ Missing retail_price handling
-- ✅ Missing lease_pricing handling
-- ✅ Invalid pricing values (negative, zero)
-- ✅ Edge case scores (boundaries: 40, 60, 80, 90)
-- ✅ Null/empty offer arrays
-- ✅ Decimal precision handling
-- ✅ Transaction rollback on error
-- ✅ Concurrent calculation safety
```

#### Database Function Specification:
```sql
CREATE OR REPLACE FUNCTION calculate_lease_score_auto(
  p_listing_id UUID,
  p_force_recalc BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
-- Returns: {"success": true, "score": 85, "breakdown": {...}}
-- Handles: Prerequisites check, multi-offer selection, error logging
```

### 1.2 Enhanced Trigger System
#### Test Cases to Write First:
```sql
-- Integration Tests for auto_calculate_lease_score_trigger()
-- ✅ retail_price change triggers calculation
-- ✅ lease_pricing INSERT triggers calculation  
-- ✅ lease_pricing UPDATE triggers calculation
-- ✅ lease_pricing DELETE triggers recalculation
-- ✅ Failed calculation falls back to stale marking
-- ✅ Concurrent triggers don't conflict
-- ✅ Bulk operations perform efficiently
-- ✅ Deletion operations don't error
-- ✅ Transaction boundaries preserved
```

## 📋 Phase 2: Edge Function Integration

### 2.1 Admin Operations Enhancement
**File**: `supabase/functions/admin-listing-operations/index.ts`

#### Test Cases to Write First:
```typescript
describe('Admin Operations Auto-Calculation', () => {
  it('should auto-calculate lease score after CREATE with retail_price and offers', async () => {})
  it('should auto-calculate lease score after UPDATE to retail_price', async () => {})
  it('should auto-calculate lease score after UPDATE to lease_pricing', async () => {})
  it('should handle calculation failure gracefully during CREATE', async () => {})
  it('should not block operations if calculation fails', async () => {})
  it('should work with bulk operations', async () => {})
  it('should maintain transaction integrity', async () => {})
})
```

### 2.2 AI Extraction Integration
**File**: `supabase/functions/apply-extraction-changes/index.ts`

#### Test Cases to Write First:
```typescript
describe('AI Extraction Auto-Calculation', () => {
  it('should auto-calculate scores for new listings with pricing data', async () => {})
  it('should recalculate scores for updated retail prices', async () => {})
  it('should recalculate scores for updated lease pricing', async () => {})
  it('should handle partial extraction failures', async () => {})
  it('should work with large extraction batches', async () => {})
  it('should maintain extraction transaction integrity', async () => {})
})
```

## 📋 Phase 3: Background Processing System

### 3.1 Stale Score Processor
**File**: `supabase/functions/process-stale-lease-scores/index.ts`

#### Test Cases to Write First:
```typescript
describe('Stale Score Background Processing', () => {
  it('should identify listings with stale scores (score_calculated_at < updated_at)', async () => {})
  it('should identify listings missing scores with valid prerequisites', async () => {})
  it('should process stale scores in configurable batches', async () => {})
  it('should implement exponential backoff for failed calculations', async () => {})
  it('should track and report processing metrics', async () => {})
  it('should handle database connection failures', async () => {})
  it('should respect rate limits and timeouts', async () => {})
})
```

### 3.2 Scheduled Processing
**File**: `supabase/migrations/20250809_schedule_lease_score_processing.sql`

#### Test Cases to Write First:
```sql
-- PostgreSQL Cron Job Tests
-- ✅ Hourly stale score cleanup runs
-- ✅ Failed calculation retry logic
-- ✅ Performance monitoring and alerting
-- ✅ Resource usage constraints
```

## 📋 Phase 4: Performance & Reliability

### 4.1 Database Optimization
#### Test Cases to Write First:
```sql
-- Performance Tests
-- ✅ Single calculation < 100ms
-- ✅ Bulk calculation (100 listings) < 5 seconds  
-- ✅ Concurrent calculations don't deadlock
-- ✅ Index usage optimization
-- ✅ Memory usage within bounds
```

#### Database Optimizations:
```sql
-- Specialized indexes for auto-calculation queries
CREATE INDEX idx_listings_auto_score_calc 
ON listings(retail_price, lease_score_calculated_at, updated_at) 
WHERE retail_price IS NOT NULL;

CREATE INDEX idx_lease_pricing_listing_calc 
ON lease_pricing(listing_id, monthly_price, period_months, mileage_per_year);
```

### 4.2 Error Handling & Monitoring
#### Test Cases to Write First:
```typescript
describe('Error Handling & Monitoring', () => {
  it('should log calculation failures with context', async () => {})
  it('should track calculation success/failure rates', async () => {})
  it('should alert on high failure rates', async () => {})
  it('should provide debugging information in logs', async () => {})
  it('should handle edge function timeouts gracefully', async () => {})
})
```

## 📋 Phase 5: Frontend Integration

### 5.1 Real-Time Updates
**File**: `src/hooks/useLeaseScoreRealtime.ts`

#### Test Cases to Write First:
```typescript
describe('Real-Time Score Updates', () => {
  it('should update UI immediately after score calculation', async () => {})
  it('should show calculation progress indicators', async () => {})
  it('should handle calculation failures in UI', async () => {})
  it('should invalidate relevant React Query caches', async () => {})
})
```

### 5.2 Admin Interface Enhancement
#### Test Cases to Write First:
```typescript
describe('Admin Interface Auto-Calculation', () => {
  it('should show auto-calculation status in listing forms', async () => {})
  it('should display calculation errors to admins', async () => {})
  it('should provide manual override capabilities', async () => {})
  it('should show background processing statistics', async () => {})
})
```

## 🏗️ Implementation Architecture

### Core Components:

#### 1. Database Layer (PostgreSQL)
```sql
-- Auto-calculation function (pure SQL for performance)
calculate_lease_score_auto(listing_id, force_recalc) → JSON

-- Enhanced trigger function  
auto_calculate_lease_score_trigger() → TRIGGER

-- Background processing function
process_stale_lease_scores(batch_size, max_failures) → JSON
```

#### 2. Edge Functions Layer (TypeScript)
```typescript
// Enhanced admin operations with auto-calc
admin-listing-operations: POST /admin-listing-operations

// Enhanced extraction with auto-calc  
apply-extraction-changes: POST /apply-extraction-changes

// Background processing
process-stale-lease-scores: GET /process-stale-lease-scores

// Manual calculation (backward compatibility)
batch-calculate-lease-scores: GET /batch-calculate-lease-scores
```

#### 3. Frontend Layer (React/TypeScript)
```typescript
// Real-time score updates
useLeaseScoreRealtime(listingId) → { score, isCalculating, error }

// Admin monitoring
useLeaseScoreStats() → { processed, failed, pending }

// Enhanced bulk operations
useBulkLeaseScoreCalculation() → enhanced with auto-calc awareness
```

## 🧪 Testing Strategy by Phase

### Phase 1 Testing: Database Functions
```bash
# Unit tests for PostgreSQL functions
npm run test:db-functions

# Performance benchmarks
npm run test:performance:db

# Concurrency tests
npm run test:concurrency:db
```

### Phase 2 Testing: Edge Function Integration  
```bash
# Integration tests
npm run test:integration:edge-functions

# End-to-end workflow tests
npm run test:e2e:auto-calculation
```

### Phase 3 Testing: Background Processing
```bash
# Background job tests
npm run test:background-processing

# Failure recovery tests  
npm run test:failure-recovery
```

### Phase 4 Testing: Performance & Reliability
```bash
# Load testing
npm run test:load:auto-calculation

# Stress testing
npm run test:stress:concurrent-updates

# Failure simulation
npm run test:chaos:calculation-failures
```

### Phase 5 Testing: Frontend Integration
```bash
# React component tests
npm run test:components

# Real-time update tests
npm run test:realtime

# Admin interface tests
npm run test:admin:auto-calculation
```

## 📈 Success Metrics & KPIs

### Key Performance Indicators:
- **Calculation Speed**: < 100ms per listing
- **Success Rate**: > 99% calculation success
- **Coverage**: > 95% eligible listings have current scores  
- **Staleness**: < 1% scores older than data updates
- **Background Processing**: < 5 minutes to process all stale scores

## 🛡️ Risk Mitigation & Rollback Plan

### Risk Assessment:
1. **Database Performance Impact**: Mitigated by efficient triggers and background processing
2. **Calculation Failures**: Mitigated by graceful fallback to stale marking
3. **Data Integrity**: Mitigated by comprehensive transaction handling
4. **User Experience**: Mitigated by non-blocking async calculations

### Rollback Strategy:
```sql
-- Emergency rollback triggers
DROP TRIGGER IF EXISTS auto_calculate_lease_score_trigger_listings ON listings;
DROP TRIGGER IF EXISTS auto_calculate_lease_score_trigger_pricing ON lease_pricing;

-- Restore original stale-marking triggers
-- (Keep original migration files as backup)
```

## 📅 Implementation Timeline

### Week 1: Database Foundation
- [ ] Write database function tests
- [ ] Implement `calculate_lease_score_auto()` function  
- [ ] Write trigger tests
- [ ] Implement enhanced triggers
- [ ] Performance testing and optimization

### Week 2: Edge Function Integration
- [ ] Write integration tests
- [ ] Update `admin-listing-operations`
- [ ] Update `apply-extraction-changes`
- [ ] End-to-end testing

### Week 3: Background Processing
- [ ] Write background processing tests
- [ ] Implement `process-stale-lease-scores`
- [ ] Set up scheduled processing
- [ ] Error handling and retry logic

### Week 4: Frontend & Polish
- [ ] Write frontend tests
- [ ] Implement real-time updates
- [ ] Admin interface enhancements
- [ ] Documentation and final testing

## 📚 Documentation & Knowledge Transfer

### Session Documentation:
- **Technical Architecture Document**: Complete system design
- **API Documentation**: All new functions and endpoints
- **Testing Guide**: How to run and extend tests
- **Troubleshooting Guide**: Common issues and solutions
- **Performance Tuning Guide**: Optimization strategies

### Session Completion Deliverables:
1. **Working System**: Fully implemented auto-calculation
2. **Comprehensive Tests**: 95%+ test coverage 
3. **Performance Benchmarks**: Documented and validated
4. **Documentation**: Complete technical documentation
5. **Rollback Plan**: Tested emergency procedures

This extensive plan ensures bulletproof implementation through rigorous test-driven development, covering every edge case, performance requirement, and failure scenario while maintaining the high quality standards of the Leasingborsen platform.