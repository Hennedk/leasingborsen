import type { LeaseConfigSearchParams } from '@/types'

const STORAGE_KEY_PREFIX = 'leasingborsen:preferred-lease-config:'
const DEFAULT_TTL_MS = 5 * 60 * 1000

interface StoredLeaseConfig {
  config: Partial<LeaseConfigSearchParams>
  timestamp: number
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const pickDefinedConfig = (
  config: Partial<LeaseConfigSearchParams>
): Partial<LeaseConfigSearchParams> => {
  const entries = Object.entries(config).filter(([, value]) => isFiniteNumber(value))
  return Object.fromEntries(entries) as Partial<LeaseConfigSearchParams>
}

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

const buildKey = (listingId: string) => `${STORAGE_KEY_PREFIX}${listingId}`

export function storePreferredLeaseConfig(
  listingId: string,
  config: Partial<LeaseConfigSearchParams>
): void {
  if (!listingId) return
  const storage = getStorage()
  if (!storage) return

  const sanitized = pickDefinedConfig(config)
  if (Object.keys(sanitized).length === 0) return

  const payload: StoredLeaseConfig = {
    config: sanitized,
    timestamp: Date.now(),
  }

  try {
    storage.setItem(buildKey(listingId), JSON.stringify(payload))
  } catch {
    // Ignore quota/security errors at runtime
  }
}

export function consumePreferredLeaseConfig(
  listingId: string,
  ttlMs: number = DEFAULT_TTL_MS
): Partial<LeaseConfigSearchParams> | null {
  if (!listingId) return null
  const storage = getStorage()
  if (!storage) return null

  const key = buildKey(listingId)
  const raw = storage.getItem(key)
  if (!raw) return null

  storage.removeItem(key)

  try {
    const payload = JSON.parse(raw) as StoredLeaseConfig | null
    if (!payload || typeof payload !== 'object') return null

    if (!Number.isFinite(payload.timestamp)) return null
    if (payload.timestamp + ttlMs < Date.now()) return null

    const sanitized = pickDefinedConfig(payload.config || {})
    return Object.keys(sanitized).length > 0 ? sanitized : null
  } catch {
    return null
  }
}

export function clearPreferredLeaseConfig(listingId: string): void {
  if (!listingId) return
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(buildKey(listingId))
  } catch {
    // No-op
  }
}

export const PREFERRED_LEASE_CONFIG_TTL_MS = DEFAULT_TTL_MS
