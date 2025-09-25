import { useLayoutEffect, useRef, useCallback } from "react";
import { useLocation } from "@tanstack/react-router";
import { LEASE_DEFAULTS } from '@/lib/leaseConfigMapping';

const KEY_PREFIX = "listings-scroll:";
const STALE_MS = 60 * 1000; // 60 seconds freshness window for exact restore
const MAX_RESUME_MS = 45 * 60 * 1000; // 45 minutes max resume window

type ListingsSnapshotMetadata = {
  loadedPageCount?: number;
  firstId?: string;
  lastId?: string;
};

type NavSnapshot = {
  searchKey: string;
  position: number;
  timestamp: number;
  loadedPageCount?: number;
  firstId?: string;
  lastId?: string;
  signature?: string;
};

type RestoreDecision =
  | { action: 'top' }
  | { action: 'pixel'; y: number }
  | { action: 'anchor'; anchorId: string };

const buildSignature = (meta?: ListingsSnapshotMetadata | null) => {
  if (!meta) return '';
  return `${meta.firstId ?? ''}|${meta.lastId ?? ''}|${meta.loadedPageCount ?? 0}`;
};

const parseSnapshotFromRaw = (raw: string | null, normalizedSearch: string): NavSnapshot | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed === 'number') {
      return {
        searchKey: normalizedSearch,
        position: parsed | 0,
        timestamp: Date.now()
      };
    }

    if (typeof parsed === 'object' && parsed) {
      const searchKey = typeof parsed.searchKey === 'string' && parsed.searchKey.length > 0
        ? parsed.searchKey
        : (typeof parsed.filters === 'string' ? parsed.filters : normalizedSearch);

      const numericPosition = typeof parsed.position === 'number'
        ? parsed.position
        : parseInt(parsed.position ?? '0', 10);

      const timestamp = typeof parsed.timestamp === 'number'
        ? parsed.timestamp
        : Date.now();

      const loadedPageCount = typeof parsed.loadedPageCount === 'number'
        ? parsed.loadedPageCount
        : (typeof parsed.loadedPages === 'number' ? parsed.loadedPages : undefined);

      const firstId = typeof parsed.firstId === 'string' ? parsed.firstId : undefined;
      const lastId = typeof parsed.lastId === 'string' ? parsed.lastId : undefined;
      const signature = typeof parsed.signature === 'string' ? parsed.signature : undefined;

      return {
        searchKey,
        position: Number.isFinite(numericPosition) ? numericPosition : 0,
        timestamp,
        loadedPageCount,
        firstId,
        lastId,
        signature
      };
    }
  } catch (error) {
    // Legacy format (plain number string)
  }

  const legacyPosition = parseInt(raw, 10);
  if (!Number.isNaN(legacyPosition)) {
    return {
      searchKey: normalizedSearch,
      position: legacyPosition,
      timestamp: Date.now()
    };
  }

  return null;
};

const determineRestoreDecision = (
  snapshot: NavSnapshot | null,
  currentSignature: string | null
): RestoreDecision => {
  if (!snapshot) {
    return { action: 'top' };
  }

  const age = Date.now() - snapshot.timestamp;
  const snapshotSignature = snapshot.signature ?? buildSignature(snapshot);
  const hasCurrentSignature = Boolean(currentSignature && currentSignature.length > 0);

  if (age > MAX_RESUME_MS) {
    return { action: 'top' };
  }

  if (!snapshotSignature || !hasCurrentSignature) {
    // Without a signature match we fall back to pixel restore while within resume window
    return { action: 'pixel', y: snapshot.position };
  }

  const signaturesMatch = snapshotSignature === currentSignature;

  if (signaturesMatch && age <= STALE_MS) {
    return { action: 'pixel', y: snapshot.position };
  }

  if (signaturesMatch) {
    // Still the same data but older than the stale threshold – restore pixel but refetch will update
    return { action: 'pixel', y: snapshot.position };
  }

  // Data changed but still within resume window – attempt anchor fallback
  const anchorId = snapshot.lastId ?? snapshot.firstId;
  if (anchorId) {
    return { action: 'anchor', anchorId };
  }

  return { action: 'top' };
};

const normalizeSearch = (search: string | undefined) => {
  if (!search) return '';
  try {
    const p = new URLSearchParams(search);

    // Normalize away default lease config parameters to keep keys stable
    if (p.get('udb') === String(LEASE_DEFAULTS.deposit)) {
      p.delete('udb');
    }
    if (p.get('selectedDeposit') === String(LEASE_DEFAULTS.deposit)) {
      p.delete('selectedDeposit');
    }

    if (p.get('mdr') === String(LEASE_DEFAULTS.term)) {
      p.delete('mdr');
    }
    if (p.get('selectedTerm') === String(LEASE_DEFAULTS.term)) {
      p.delete('selectedTerm');
    }

    if (p.get('km') === String(LEASE_DEFAULTS.mileage)) {
      p.delete('km');
    }
    if (p.get('selectedMileage') === String(LEASE_DEFAULTS.mileage)) {
      p.delete('selectedMileage');
    }

    const entries = [...p.entries()].sort(([a],[b]) => a.localeCompare(b));
    return new URLSearchParams(entries).toString();
  } catch (error) {
    console.error('Error normalizing search params:', error);
    return '';
  }
};

export function useListingsScrollRestoration(
  ready = true,
  metadata?: ListingsSnapshotMetadata | null
) {
  const location = useLocation();
  const lastRestoredRef = useRef<string>("");
  const navigationStartRef = useRef<number>(0);
  const hasRestoredRef = useRef<boolean>(false);
  const isRestoringRef = useRef<boolean>(false);
  const metadataRef = useRef<(ListingsSnapshotMetadata & { signature: string }) | null>(null);

  if (metadata) {
    const signature = buildSignature(metadata);
    metadataRef.current = {
      ...metadata,
      signature
    };
  }

  // Enhanced helper function to check if this is a filter change vs navigation
  const isFilterChange = useCallback(() => {
    try {
      const contextRaw = sessionStorage.getItem('leasingborsen-filter-context');
      if (!contextRaw) return false;
      
      const context = JSON.parse(contextRaw);
      
      // Must have the filter change flag set
      if (!context.isFilterChange) return false;
      
      // Must be recent (within 2 seconds to account for async operations)
      const isRecent = context.timestamp && (Date.now() - context.timestamp) < 2000;
      if (!isRecent) return false;
      
      // Must be from the listings page (filter changes should only affect listings)
      const isFromListings = context.pathname === '/listings';
      if (!isFromListings) return false;
      
      // Check if it's explicitly a user-initiated filter change
      const isUserFilterChange = context.source === 'user-filter-change';
      
      console.log('[ScrollRestore] Filter change check:', {
        isFilterChange: context.isFilterChange,
        isRecent,
        isFromListings,
        isUserFilterChange,
        source: context.source,
        age: Date.now() - context.timestamp
      });
      
      return isUserFilterChange;
    } catch (e) {
      console.log('[ScrollRestore] Filter change check error:', e instanceof Error ? e.message : 'Unknown error');
      return false;
    }
  }, []);

  // Enhanced back navigation detection with debug logging
  const detectNavigationType = useCallback(() => {
    const debugInfo: Record<string, any> = {};
    
    // 1. Check explicit state first (most reliable)
    const explicitBackLike = (location.state as { backLike?: boolean })?.backLike === true;
    if (explicitBackLike) {
      debugInfo.reason = 'explicit-state';
      debugInfo.result = 'back';
      console.log('[ScrollRestore] Navigation type:', debugInfo);
      return 'back';
    }
    
    // 2. Check Navigation API currentEntry for history traversal (most modern approach)
    if (typeof (window as any).navigation !== 'undefined' && (window as any).navigation.currentEntry) {
      try {
        // Check if this is a traverse operation (back/forward)
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry?.type === 'back_forward') {
          debugInfo.reason = 'navigation-api-traverse';
          debugInfo.result = 'back';
          console.log('[ScrollRestore] Navigation type:', debugInfo);
          return 'back';
        }
      } catch (e) {
        debugInfo.navigationApiError = e instanceof Error ? e.message : 'Unknown error';
      }
    }
    
    // 3. Check Performance Navigation API (fallback)
    if (typeof performance !== 'undefined' && performance.navigation && performance.navigation.type === 2) {
      debugInfo.reason = 'performance-api';
      debugInfo.result = 'back';
      console.log('[ScrollRestore] Navigation type:', debugInfo);
      return 'back';
    }
    
    // 4. Check for back navigation flag in session storage
    const navState = sessionStorage.getItem('leasingborsen-navigation');
    if (navState) {
      try {
        const state = JSON.parse(navState);
        if (state.isNavigatingBack && state.timestamp && (Date.now() - state.timestamp) < 5000) {
          debugInfo.reason = 'session-back-flag';
          debugInfo.result = 'back';
          debugInfo.timestamp = state.timestamp;
          debugInfo.age = Date.now() - state.timestamp;
          console.log('[ScrollRestore] Navigation type:', debugInfo);
          return 'back';
        }
        
        // Check if we came from listings recently with scroll position
        if (state.from === 'listings' && state.scrollPosition > 0 && state.timestamp && (Date.now() - state.timestamp) < MAX_RESUME_MS) {
          debugInfo.reason = 'recent-from-listings';
          debugInfo.result = 'back';
          debugInfo.scrollPosition = state.scrollPosition;
          debugInfo.age = Date.now() - state.timestamp;
          console.log('[ScrollRestore] Navigation type:', debugInfo);
          return 'back';
        }
      } catch (e) {
        debugInfo.sessionStorageError = e instanceof Error ? e.message : 'Unknown error';
      }
    }
    
    // 5. Default to forward navigation unless we have strong evidence of back navigation
    debugInfo.reason = 'default-forward';
    debugInfo.result = 'forward';
    console.log('[ScrollRestore] Navigation type:', debugInfo);
    return 'forward';
  }, [location.state]);

  // Run pre-paint to avoid any visible jump on restore
  useLayoutEffect(() => {
    if (location.pathname !== "/listings" || !ready) return;
    
    // Skip scroll restoration if this is a filter change
    if (isFilterChange()) {
      console.log('[ScrollRestore] Skipping - filter change detected');
      return;
    }
    
    // Track mount time for this effect
    const effectMountTime = Date.now();
    console.log('[ScrollRestore] Effect mounted at:', effectMountTime);
    
    // Extended restoration window to prevent race conditions
    isRestoringRef.current = true;

    const searchString = typeof location.search === 'string' ? location.search : new URLSearchParams(location.search as any).toString();
    const normalizedSearch = normalizeSearch(searchString);
    const key = KEY_PREFIX + normalizedSearch;
    const savedSnapshot = parseSnapshotFromRaw(sessionStorage.getItem(key), normalizedSearch);
    if (savedSnapshot) {
      console.log('[ScrollRestore] Loaded snapshot', { key, snapshot: savedSnapshot });
    }

    let navigationSnapshot: NavSnapshot | null = null;
    try {
      const raw = sessionStorage.getItem('leasingborsen-navigation');
      if (raw) {
        const st = JSON.parse(raw) as {
          from?: string;
          scrollPosition?: number;
          filters?: string;
          timestamp?: number;
          loadedPages?: number;
          firstId?: string;
          lastId?: string;
          signature?: string;
        };

        if (
          st &&
          st.from === 'listings' &&
          typeof st.scrollPosition === 'number' &&
          st.timestamp &&
          (Date.now() - st.timestamp) <= MAX_RESUME_MS
        ) {
          const normalizedStored = normalizeSearch(st.filters ? '?' + st.filters : '');
          const normalizedCurrent = normalizeSearch(searchString);

          if (normalizedStored === normalizedCurrent) {
            navigationSnapshot = {
              searchKey: normalizedStored,
              position: st.scrollPosition | 0,
              timestamp: st.timestamp,
              loadedPageCount: st.loadedPages,
              firstId: st.firstId,
              lastId: st.lastId,
              signature: typeof st.signature === 'string' ? st.signature : undefined
            };

            console.log('[ScrollRestore] Loaded navigation snapshot', navigationSnapshot);
          }
        }
      }
    } catch (e) {
      console.log('[ScrollRestore] Navigation snapshot parse error:', e instanceof Error ? e.message : 'Unknown error');
    }

    let candidateSnapshot: NavSnapshot | null = savedSnapshot;
    if (
      navigationSnapshot &&
      (!candidateSnapshot || navigationSnapshot.timestamp > candidateSnapshot.timestamp)
    ) {
      candidateSnapshot = navigationSnapshot;
    }
    
    const navigationType = detectNavigationType();
    const isBackLike = navigationType === 'back';

    // Set navigation context for other components to detect back navigation
    if (isBackLike) {
      // Clear any lingering filter change context since this is clearly navigation
      try {
        sessionStorage.removeItem('leasingborsen-filter-context');
        console.log('[ScrollRestore] Cleared filter context for back navigation');
      } catch {}
      
      // Clear the navigating away flag when we arrive back
      const currentNav = sessionStorage.getItem('leasingborsen-navigation');
      if (currentNav) {
        try {
          const state = JSON.parse(currentNav);
          delete state.isNavigatingAway;
          delete state.isNavigatingBack; // Clear the back flag after using it
          sessionStorage.setItem('leasingborsen-navigation', JSON.stringify({
            ...state,
            from: 'listings',
            timestamp: Date.now(),
            isBack: true
          }));
        } catch {
          sessionStorage.setItem('leasingborsen-navigation', JSON.stringify({
            from: 'listings',
            timestamp: Date.now(),
            isBack: true
          }));
        }
      } else {
        sessionStorage.setItem('leasingborsen-navigation', JSON.stringify({
          from: 'listings',
          timestamp: Date.now(),
          isBack: true
        }));
      }
    }

    // Check if we're navigating away (to prevent saving during exit animations)
    const isNavigatingAway = () => {
      // If navigation was just started, we're navigating away
      if (navigationStartRef.current > 0 && (Date.now() - navigationStartRef.current) < 3000) {
        return true;
      }
      
      // Check if prepareListingNavigation was called recently
      const navState = sessionStorage.getItem('leasingborsen-navigation');
      if (navState) {
        try {
          const state = JSON.parse(navState);
          // Check both the flag and timestamp
          if (state.isNavigatingAway || (state.timestamp && (Date.now() - state.timestamp) < 2000)) {
            return true;
          }
        } catch {}
      }
      return false;
    };

    // Enhanced save function with better race condition protection
    const save = () => {
      if (isRestoringRef.current || isFilterChange()) {
        console.log('[ScrollRestore] Save blocked - restoring or filter change');
        return;
      }
      
      // Don't save if we're navigating away (prevents saving scroll animation positions)
      if (isNavigatingAway()) {
        console.log('[ScrollRestore] Save blocked - navigating away');
        return;
      }
      
      // Extended mount time protection - don't save within first 1000ms of mount
      if (Date.now() - effectMountTime < 1000) {
        console.log('[ScrollRestore] Save blocked - too soon after mount');
        return;
      }
      
      const scrollY = window.scrollY || 0;
      const currentSavedRaw = sessionStorage.getItem(key);
      const existingSnapshot = parseSnapshotFromRaw(currentSavedRaw, normalizedSearch);
      const currentSavedNum = existingSnapshot?.position ?? null;
      
      console.log('[ScrollRestore] Save attempt - scrollY:', scrollY, 'currentSaved:', currentSavedNum);
      
      // Enhanced protection against overwriting good positions
      if (scrollY === 0) {
        // If we have a saved position > 100 and we just mounted (< 5 seconds), don't overwrite
        if (currentSavedNum && currentSavedNum > 100 && (Date.now() - effectMountTime) < 5000) {
          console.log('[ScrollRestore] Save blocked - protecting good saved position');
          return;
        }
        // If we just restored a position, don't immediately overwrite with 0
        if (hasRestoredRef.current && (Date.now() - effectMountTime) < 5000) {
          console.log('[ScrollRestore] Save blocked - just restored position');
          return;
        }
      }
      
      // Don't save positions that are decreasing rapidly (scroll animation)
      if (currentSavedNum && currentSavedNum > 100 && scrollY < currentSavedNum - 50) {
        console.log('[ScrollRestore] Save blocked - rapid decrease detected');
        return;
      }
      
      // Only save if we have a meaningful scroll position or if there's no saved value yet
      if (scrollY > 0 || !currentSavedRaw) {
        const latestMetadata = metadataRef.current ?? null;
        const mergedSnapshot: NavSnapshot = {
          searchKey: normalizedSearch,
          position: scrollY | 0,
          timestamp: Date.now(),
          loadedPageCount: latestMetadata?.loadedPageCount ?? existingSnapshot?.loadedPageCount,
          firstId: latestMetadata?.firstId ?? existingSnapshot?.firstId,
          lastId: latestMetadata?.lastId ?? existingSnapshot?.lastId,
          signature: latestMetadata?.signature ?? existingSnapshot?.signature
        };

        const payload = {
          version: 3,
          navigationType: 'scroll',
          position: mergedSnapshot.position,
          timestamp: mergedSnapshot.timestamp,
          searchKey: mergedSnapshot.searchKey,
          filters: mergedSnapshot.searchKey,
          loadedPageCount: mergedSnapshot.loadedPageCount,
          loadedPages: mergedSnapshot.loadedPageCount,
          firstId: mergedSnapshot.firstId,
          lastId: mergedSnapshot.lastId,
          signature: mergedSnapshot.signature
        };

        sessionStorage.setItem(key, JSON.stringify(payload));
        console.log('[ScrollRestore] Saved snapshot', payload);
      }
    };
    
    // Increased debounce time to better handle rapid scroll events
    let saveTimer: NodeJS.Timeout;
    const debouncedSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 200); // Increased from 100ms
    };
    
    window.addEventListener("scroll", debouncedSave, { passive: true });
    window.addEventListener("pagehide", save);

    const restoreInstant = (y: number) => {
      console.log('[ScrollRestore] Starting restoration to position:', y);
      isRestoringRef.current = true;
      hasRestoredRef.current = true;
      const html = document.documentElement;
      html.classList.add("instant-nav");

      let prevH = 0, stable = 0, tries = 0;
      const loop = () => {
        const se = document.scrollingElement || document.documentElement;
        const maxY = Math.max(0, se.scrollHeight - window.innerHeight);
        const target = Math.min(y, maxY);

        window.scrollTo(0, target);

        const h = se.scrollHeight;
        stable = (h === prevH) ? stable + 1 : 0;
        prevH = h;

        const notAtTarget = Math.abs(window.scrollY - target) > 1;
        const unstable = stable < 2; // need two stable frames
        if ((notAtTarget || unstable) && tries++ < 40) {
          requestAnimationFrame(loop);
        } else {
          requestAnimationFrame(() => {
            html.classList.remove("instant-nav");
            // Extended delay to prevent immediate overwrite after restoration
            setTimeout(() => {
              isRestoringRef.current = false;
              console.log('[ScrollRestore] Restoration complete, saving enabled');
            }, 1000); // Increased from 300ms
          });
        }
      };
      requestAnimationFrame(loop);
    };

    const restoreAnchor = (anchorId: string) => {
      const anchorEl = document.querySelector(`[data-listing-id="${anchorId}"]`) as HTMLElement | null;
      if (!anchorEl) {
        console.log('[ScrollRestore] Anchor element not found, defaulting to top restore', anchorId);
        restoreInstant(0);
        return;
      }

      const rect = anchorEl.getBoundingClientRect();
      const targetY = Math.max(0, rect.top + window.scrollY);
      console.log('[ScrollRestore] Restoring via anchor', { anchorId, targetY });
      restoreInstant(targetY);
    };

    if (isBackLike) {
      const currentSignature = metadataRef.current?.signature ?? null;
      const decision = determineRestoreDecision(candidateSnapshot, currentSignature);
      console.log('[ScrollRestore] Restore decision', { decision, candidateSnapshot, currentSignature });

      if (decision.action === 'pixel') {
        const pos = decision.y;
        if (lastRestoredRef.current === `${key}-${pos}`) {
          console.log('[ScrollRestore] Skipping restoration - already restored this position');
          return;
        }

        lastRestoredRef.current = `${key}-${pos}`;
        restoreInstant(pos);
      } else if (decision.action === 'anchor') {
        const cacheKey = `${key}-anchor-${decision.anchorId}`;
        if (lastRestoredRef.current === cacheKey) {
          console.log('[ScrollRestore] Skipping restoration - already restored anchor', decision.anchorId);
          return;
        }

        lastRestoredRef.current = cacheKey;
        restoreAnchor(decision.anchorId);
      } else {
        lastRestoredRef.current = `${key}-0`;
        restoreInstant(0);
      }
    } else if (navigationType === 'forward') {
      // Only clear and go to top for explicit forward navigation
      sessionStorage.removeItem(key);
      lastRestoredRef.current = `${key}-0`;
      console.log('[ScrollRestore] Forward navigation - scrolling to top');
      restoreInstant(0);
    } else {
      console.log('[ScrollRestore] No restoration - navigation type:', navigationType, 'snapshot:', candidateSnapshot);
      // Allow saving to resume after initial mount
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 1000);
    }

    // Reset navigation start ref when we arrive at listings
    navigationStartRef.current = 0;

    return () => {
      clearTimeout(saveTimer);
      window.removeEventListener("scroll", debouncedSave);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [
    location.pathname,
    location.search,
    location.state,
    ready,
    isFilterChange,
    detectNavigationType,
    metadata?.firstId,
    metadata?.lastId,
    metadata?.loadedPageCount
  ]);
}
