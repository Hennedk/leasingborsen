import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DealerConfig, ConfigValidator } from '../types/DealerConfig.ts'

export class ConfigLoader {
  private configCache = new Map<string, DealerConfig>()
  private cacheExpiryMs = 5 * 60 * 1000 // 5 minutes cache

  constructor(private supabaseClient: SupabaseClient) {}

  async loadConfig(dealerId: string, version: string = 'latest'): Promise<DealerConfig | null> {
    const cacheKey = `${dealerId}:${version}`
    
    // Check cache first
    if (this.configCache.has(cacheKey)) {
      console.log(`📋 Using cached config for ${dealerId} (${version})`)
      return this.configCache.get(cacheKey)!
    }

    try {
      console.log(`📋 Loading config for dealer: ${dealerId} (version: ${version})`)

      // Try loading from database first
      let query = this.supabaseClient
        .from('dealer_configs')
        .select('*')
        .eq('id', dealerId)
        .eq('enabled', true)

      if (version !== 'latest') {
        query = query.eq('version', version)
      } else {
        query = query.order('created_at', { ascending: false }).limit(1)
      }

      const { data, error } = await query

      let config: DealerConfig | null = null

      if (error || !data || data.length === 0) {
        // Fallback to JSON file if database load fails
        console.log(`📁 Attempting to load config from JSON file: ${dealerId}.json`)
        config = await this.loadConfigFromFile(dealerId)
      } else {
        // Parse database configuration
        const configData = data[0]
        config = {
          id: configData.id,
          name: configData.name,
          version: configData.version,
          ...configData.config
        }
      }

      if (!config) {
        console.warn(`⚠️ No config found for dealer: ${dealerId} (version: ${version})`)
        return null
      }

      // Validate configuration
      const validation = ConfigValidator.validateConfig(config)
      if (!validation.isValid) {
        console.error(`❌ Invalid config for ${dealerId}:`, validation.errors)
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
      }

      if (validation.warnings.length > 0) {
        console.warn(`⚠️ Config warnings for ${dealerId}:`, validation.warnings)
      }

      // Cache the validated config
      this.configCache.set(cacheKey, config)
      
      // Set cache expiry
      setTimeout(() => {
        this.configCache.delete(cacheKey)
        console.log(`🗑️ Expired cache for ${cacheKey}`)
      }, this.cacheExpiryMs)

      console.log(`✅ Loaded and validated config for ${dealerId} (${config.version})`)
      return config

    } catch (error) {
      console.error(`❌ Failed to load config for ${dealerId}:`, error)
      return null
    }
  }

  private async loadConfigFromFile(dealerId: string): Promise<DealerConfig | null> {
    try {
      // Construct the path to the JSON config file
      const configPath = new URL(`./dealers/${dealerId}.json`, import.meta.url)
      
      // Read and parse the JSON file
      const configText = await Deno.readTextFile(configPath)
      const config = JSON.parse(configText) as DealerConfig
      
      console.log(`✅ Loaded config from file: ${dealerId}.json`)
      return config
    } catch (error) {
      console.error(`❌ Failed to load config file for ${dealerId}:`, error)
      return null
    }
  }

  async saveConfig(config: DealerConfig): Promise<boolean> {
    try {
      // Validate before saving
      const validation = ConfigValidator.validateConfig(config)
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
      }

      // Prepare data for database
      const { id, name, version, ...configData } = config
      
      const dbRecord = {
        id,
        name,
        version,
        config_data: configData,
        is_active: true,
        updated_at: new Date().toISOString()
      }

      // Upsert to database
      const { error } = await this.supabaseClient
        .from('dealer_configs')
        .upsert(dbRecord)

      if (error) {
        console.error(`❌ Failed to save config for ${id}:`, error)
        return false
      }

      // Invalidate cache
      const cacheKeys = Array.from(this.configCache.keys())
        .filter(key => key.startsWith(id))
      
      cacheKeys.forEach(key => this.configCache.delete(key))

      console.log(`✅ Saved config for ${id} (${version})`)
      return true

    } catch (error) {
      console.error(`❌ Error saving config:`, error)
      return false
    }
  }

  async listConfigs(): Promise<{ id: string; name: string; version: string; isActive: boolean }[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('dealer_configs')
        .select('id, name, version, is_active')
        .order('name')

      if (error) {
        console.error(`❌ Failed to list configs:`, error)
        return []
      }

      return data.map(row => ({
        id: row.id,
        name: row.name,
        version: row.version,
        isActive: row.is_active
      }))

    } catch (error) {
      console.error(`❌ Error listing configs:`, error)
      return []
    }
  }

  async deactivateConfig(dealerId: string, version: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient
        .from('dealer_configs')
        .update({ is_active: false })
        .eq('id', dealerId)
        .eq('version', version)

      if (error) {
        console.error(`❌ Failed to deactivate config ${dealerId}:${version}:`, error)
        return false
      }

      // Invalidate cache
      this.configCache.delete(`${dealerId}:${version}`)
      this.configCache.delete(`${dealerId}:latest`)

      console.log(`✅ Deactivated config ${dealerId}:${version}`)
      return true

    } catch (error) {
      console.error(`❌ Error deactivating config:`, error)
      return false
    }
  }

  clearCache(): void {
    this.configCache.clear()
    console.log(`🗑️ Cleared config cache`)
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    }
  }
}

/*
 * ConfigLoader
 * 
 * Manages loading, caching, and validation of dealer-specific configurations.
 * 
 * Features:
 * - Database-backed configuration storage
 * - In-memory caching with automatic expiry
 * - Configuration validation before use
 * - Version management (latest vs specific version)
 * - CRUD operations for configuration management
 * - Cache invalidation on updates
 * 
 * Usage:
 * const loader = new ConfigLoader(supabaseClient)
 * const config = await loader.loadConfig('volkswagen', 'v1.0')
 * if (config) {
 *   // Use validated configuration for processing
 * }
 * 
 * Configuration Storage:
 * - Stored in 'dealer_configs' table as JSONB
 * - Supports versioning and activation/deactivation
 * - Cached in memory for performance
 * - Validated on every load operation
 */