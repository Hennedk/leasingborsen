// Feature flag logic for gradual Responses API rollout

import type { FeatureFlagConfig } from './types.ts'

export class FeatureFlagManager {
  private static readonly ROLLOUT_PHASES = {
    phase1: 0.05,  // 5%
    phase2: 0.25,  // 25%
    phase3: 1.00   // 100%
  }
  
  private static config: FeatureFlagConfig | null = null
  
  static initialize() {
    // Load configuration from environment
    const enabled = Deno.env.get('USE_RESPONSES_API') === 'true'
    const phase = parseInt(Deno.env.get('MIGRATION_PHASE') || '1')
    const rolloutPercentage = this.ROLLOUT_PHASES[`phase${phase}` as keyof typeof this.ROLLOUT_PHASES] || 0
    
    // Parse dealer overrides
    const dealerOverrides = Deno.env.get('RESPONSES_API_DEALER_OVERRIDES')?.split(',').filter(Boolean) || []
    const excludedDealers = Deno.env.get('RESPONSES_API_EXCLUDED_DEALERS')?.split(',').filter(Boolean) || []
    
    this.config = {
      enabled,
      rolloutPercentage,
      dealerOverrides,
      excludedDealers
    }
    
    // console.log('[FeatureFlags] Initialized:', {
      enabled,
      phase,
      rolloutPercentage,
      dealerOverrides: dealerOverrides.length,
      excludedDealers: excludedDealers.length
    })
  }
  
  static async shouldUseResponsesAPI(dealerId?: string): Promise<boolean> {
    if (!this.config) {
      this.initialize()
    }
    
    // Global feature flag check
    if (!this.config!.enabled) {
      return false
    }
    
    // No dealer ID means we can't make dealer-specific decisions
    if (!dealerId) {
      return false
    }
    
    // Check excluded dealers first
    if (this.config!.excludedDealers?.includes(dealerId)) {
      // console.log(`[FeatureFlags] Dealer ${dealerId} is excluded from Responses API`)
      return false
    }
    
    // Check dealer overrides (always use Responses API for these)
    if (this.config!.dealerOverrides?.includes(dealerId)) {
      // console.log(`[FeatureFlags] Dealer ${dealerId} is in override list, using Responses API`)
      return true
    }
    
    // Hash-based rollout for consistent dealer assignment
    const dealerHash = this.hashDealerId(dealerId)
    const threshold = this.config!.rolloutPercentage
    
    const shouldUse = dealerHash < threshold
    
    // console.log(`[FeatureFlags] Dealer ${dealerId} hash: ${dealerHash.toFixed(3)}, threshold: ${threshold}, using Responses API: ${shouldUse}`)
    
    return shouldUse
  }
  
  private static hashDealerId(dealerId: string): number {
    // Simple hash function that returns a value between 0 and 1
    let hash = 0
    for (let i = 0; i < dealerId.length; i++) {
      const char = dealerId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to 0-1 range
    return Math.abs(hash) / 2147483647
  }
  
  static async isEmergencyDisabled(): Promise<boolean> {
    // Check for emergency disable flag
    const emergencyDisable = Deno.env.get('RESPONSES_API_EMERGENCY_DISABLE') === 'true'
    
    if (emergencyDisable) {
      console.error('[FeatureFlags] EMERGENCY: Responses API disabled via emergency flag')
    }
    
    return emergencyDisable
  }
  
  static async getConfig(): Promise<FeatureFlagConfig> {
    if (!this.config) {
      this.initialize()
    }
    return this.config!
  }
  
  static async logUsage(dealerId: string | undefined, used: boolean, reason: string) {
    // Log feature flag decision for monitoring
    // console.log('[FeatureFlags] Usage:', {
      dealerId,
      used,
      reason,
      timestamp: new Date().toISOString()
    })
    
    // In production, this would send to monitoring service
    // For now, just log to console
  }
}

// Initialize on module load
FeatureFlagManager.initialize()