/**
 * Mixpanel Analytics Core Module
 * 
 * GDPR-compliant analytics with EU data residency.
 * Opt-out by default - no tracking before explicit consent.
 */

import mixpanel from 'mixpanel-browser'

export type Device = 'desktop' | 'mobile' | 'tablet'

interface SuperProperties {
  schema_version: '1'
  device_type: Device
  session_id: string
  is_returning_visitor: boolean
  feature_flags?: string[]
}

interface InitOptions {
  token: string
  eu: boolean
}

class MixpanelAnalytics {
  private initialized = false
  private consented = false
  private sessionId: string | null = null
  private sessionLastActivity: number = 0
  private readonly SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_PAYLOAD_SIZE = 32 * 1024 // 32KB
  private firstTouchUTM: Record<string, string> = {}

  /**
   * Initialize Mixpanel with EU configuration
   * Automatically opts out tracking until consent is granted
   */
  init(options: InitOptions): void {
    if (this.initialized) {
      console.warn('[Analytics] Already initialized')
      return
    }

    try {
      // Configure Mixpanel for EU compliance
      mixpanel.init(options.token, {
        api_host: options.eu ? 'https://api-eu.mixpanel.com' : 'https://api.mixpanel.com',
        persistence: 'localStorage',
        persistence_name: 'mp_' + options.token.slice(0, 8),
        loaded: () => {
          // Immediately opt out until consent is granted
          mixpanel.opt_out_tracking()
        }
      })

      this.initialized = true
      this.captureFirstTouchUTM()

      console.log(`[Analytics] Initialized (EU: ${options.eu}, opted out by default)`)
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error)
    }
  }

  /**
   * Grant consent and opt-in to tracking
   * Optionally identify user and register feature flags
   */
  grantConsent(distinctId?: string, featureFlags?: string[]): void {
    if (!this.initialized) {
      console.warn('[Analytics] Cannot grant consent - not initialized')
      return
    }

    try {
      // Opt in to tracking
      mixpanel.opt_in_tracking()
      this.consented = true

      // Identify user if provided
      if (distinctId) {
        mixpanel.identify(distinctId)
      }

      // Register super properties
      const superProps: SuperProperties = {
        schema_version: '1',
        device_type: this.getDeviceType(),
        session_id: this.getSessionId(),
        is_returning_visitor: this.isReturningVisitor(),
        ...(featureFlags && { feature_flags: featureFlags })
      }

      mixpanel.register(superProps)

      // Add first-touch UTM if available
      if (Object.keys(this.firstTouchUTM).length > 0) {
        mixpanel.register(this.firstTouchUTM)
      }

      console.log('[Analytics] Consent granted, tracking enabled')
    } catch (error) {
      console.error('[Analytics] Failed to grant consent:', error)
    }
  }

  /**
   * Revoke consent and opt-out of tracking
   */
  revokeConsent(): void {
    if (!this.initialized) {
      return
    }

    try {
      mixpanel.opt_out_tracking()
      this.consented = false
      console.log('[Analytics] Consent revoked, tracking disabled')
    } catch (error) {
      console.error('[Analytics] Failed to revoke consent:', error)
    }
  }

  /**
   * Safe track method with size guard and error handling
   */
  track(event: string, properties?: Record<string, any>): void {
    if (!this.initialized || !this.consented) {
      return // Silent fail when not consented
    }

    try {
      // Update session activity
      this.updateSessionActivity()

      // Create final properties with session updates
      const finalProps = {
        ...properties,
        session_id: this.getSessionId()
      }

      // Size guard
      const payload = JSON.stringify({ event, properties: finalProps })
      if (payload.length > this.MAX_PAYLOAD_SIZE) {
        console.warn('[Analytics] Payload too large, dropping event:', event)
        return
      }

      mixpanel.track(event, finalProps)
    } catch (error) {
      console.error('[Analytics] Track failed silently:', error)
      // Silent fail - don't crash the app
    }
  }

  /**
   * Get current session ID with rolling 30-minute TTL
   */
  getSessionId(): string {
    const now = Date.now()

    // Check if session expired
    if (this.sessionId && (now - this.sessionLastActivity) > this.SESSION_TTL_MS) {
      this.sessionId = null // Force new session
    }

    // Create new session if needed
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId()
      console.log('[Analytics] New session created:', this.sessionId)
    }

    this.sessionLastActivity = now
    return this.sessionId
  }

  /**
   * Update session activity timestamp
   */
  private updateSessionActivity(): void {
    this.sessionLastActivity = Date.now()
  }

  /**
   * Generate a new session ID
   */
  private generateSessionId(): string {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Detect device type based on viewport and user agent
   */
  getDeviceType(): Device {
    if (typeof window === 'undefined') return 'desktop'

    const width = window.innerWidth
    const userAgent = navigator.userAgent.toLowerCase()

    // Check for tablet indicators
    if (userAgent.includes('tablet') || 
        userAgent.includes('ipad') ||
        (width >= 768 && width <= 1024 && 'ontouchstart' in window)) {
      return 'tablet'
    }

    // Check for mobile
    if (width < 768 || 
        userAgent.includes('mobile') ||
        userAgent.includes('android') ||
        userAgent.includes('iphone')) {
      return 'mobile'
    }

    return 'desktop'
  }

  /**
   * Get referrer host (domain only, no PII)
   */
  getReferrerHost(): string | undefined {
    try {
      if (document.referrer) {
        return new URL(document.referrer).hostname
      }
    } catch (error) {
      // Invalid referrer URL
    }
    return undefined
  }

  /**
   * Detect page load type
   */
  getPageLoadType(): 'cold' | 'warm' | 'bfcache' | 'spa' {
    if (typeof window === 'undefined') return 'cold'

    // Check for back/forward cache
    if (window.performance?.getEntriesByType) {
      const entries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (entries.length > 0 && entries[0].type === 'back_forward') {
        return 'bfcache'
      }
    }

    // Check if this is likely an SPA navigation (not first page load)
    if (window.performance?.timing && Date.now() - window.performance.timing.navigationStart > 100) {
      return 'spa'
    }

    // Distinguish cold vs warm based on loading performance
    if (window.performance?.timing) {
      const timing = window.performance.timing
      const loadTime = timing.loadEventEnd - timing.navigationStart
      return loadTime < 1000 ? 'warm' : 'cold'
    }

    return 'cold'
  }

  /**
   * Check if user is returning (has localStorage data)
   */
  private isReturningVisitor(): boolean {
    try {
      return localStorage.getItem('mp_' + mixpanel.get_config('token').slice(0, 8)) !== null
    } catch {
      return false
    }
  }

  /**
   * Capture first-touch UTM parameters from URL
   */
  private captureFirstTouchUTM(): void {
    if (typeof window === 'undefined') return

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      
      utmParams.forEach(param => {
        const value = urlParams.get(param)
        if (value) {
          this.firstTouchUTM[param] = value
        }
      })
    } catch (error) {
      console.error('[Analytics] Failed to capture UTM:', error)
    }
  }

  /**
   * Check if user has consented to tracking
   */
  hasConsent(): boolean {
    return this.consented
  }

  /**
   * Check if analytics is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// Export singleton instance
export const analytics = new MixpanelAnalytics()

// TODO: Future events can reuse these base properties and helpers
// TODO: Add listing_view event with impression tracking
// TODO: Add listing_click event with click tracking
// TODO: Add filters_change and filters_apply events
// TODO: Add dealer_outbound event for external link tracking