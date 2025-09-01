import { useLayoutEffect, useRef, useCallback } from "react";
import { useLocation } from "@tanstack/react-router";

const KEY_PREFIX = "listings-scroll:";
const MAX_AGE = 30 * 60 * 1000; // 30 minutes

const normalizeSearch = (search: string | undefined) => {
  if (!search) return '';
  try {
    const p = new URLSearchParams(search);
    const entries = [...p.entries()].sort(([a],[b]) => a.localeCompare(b));
    return new URLSearchParams(entries).toString();
  } catch (error) {
    console.error('Error normalizing search params:', error);
    return '';
  }
};

export function useListingsScrollRestoration(ready = true) {
  const location = useLocation();
  const lastRestoredRef = useRef<string>("");
  const navigationStartRef = useRef<number>(0);
  const hasRestoredRef = useRef<boolean>(false);
  const isRestoringRef = useRef<boolean>(false);

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
        if (state.from === 'listings' && state.scrollPosition > 0 && state.timestamp && (Date.now() - state.timestamp) < 3000) {
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
    const saved = sessionStorage.getItem(key);
    
    // Try to parse consolidated storage format first
    let savedPosition: number | null = null;
    let savedData: any = null;
    
    if (saved) {
      try {
        // Check if it's the new consolidated JSON format
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed.position !== undefined) {
          savedData = parsed;
          savedPosition = parsed.position;
          console.log('[ScrollRestore] Found consolidated storage data:', savedData);
        } else {
          // Fallback: old simple number format
          savedPosition = parseInt(saved, 10) || 0;
          console.log('[ScrollRestore] Found legacy position:', savedPosition);
        }
      } catch (e) {
        // Fallback: treat as old simple number format
        savedPosition = parseInt(saved, 10) || 0;
        console.log('[ScrollRestore] Parsing fallback, position:', savedPosition);
      }
    }
    
    console.log('[ScrollRestore] Checking saved position for key:', key, 'parsed position:', savedPosition);
    
    // Fallback: also consider navigation context storage if list-specific key is missing
    let fallbackPos: number | null = null;
    if (!savedPosition) {
      try {
        const raw = sessionStorage.getItem('leasingborsen-navigation');
        if (raw) {
          const st = JSON.parse(raw) as { from?: string; scrollPosition?: number; filters?: string; timestamp?: number };
          if (st && st.from === 'listings' && typeof st.scrollPosition === 'number' && st.timestamp && (Date.now() - st.timestamp) <= MAX_AGE) {
            const normalizedStored = normalizeSearch(st.filters ? '?' + st.filters : '');
            const normalizedCurrent = normalizeSearch(searchString);
            if (normalizedStored === normalizedCurrent) {
              fallbackPos = st.scrollPosition | 0;
              console.log('[ScrollRestore] Found fallback position:', fallbackPos);
            }
          }
        }
      } catch (e) {
        console.log('[ScrollRestore] Fallback position error:', e instanceof Error ? e.message : 'Unknown error');
      }
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
      const currentSaved = sessionStorage.getItem(key);
      let currentSavedNum: number | null = null;
      
      if (currentSaved) {
        try {
          // Try to parse as consolidated JSON format first
          const parsed = JSON.parse(currentSaved);
          if (typeof parsed === 'object' && parsed.position !== undefined) {
            currentSavedNum = parsed.position;
          } else {
            currentSavedNum = parseInt(currentSaved) || null;
          }
        } catch (e) {
          // Fallback: treat as legacy number format
          currentSavedNum = parseInt(currentSaved) || null;
        }
      }
      
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
      
      // Only save if we have a meaningful scroll position or if there's no saved value
      if (scrollY > 0 || currentSaved === null) {
        // Save in consolidated format with metadata
        const scrollData = {
          position: scrollY | 0,
          timestamp: Date.now(),
          filters: normalizedSearch,
          version: 2,
          navigationType: 'scroll' // Indicates this was saved during scrolling
        };
        sessionStorage.setItem(key, JSON.stringify(scrollData));
        console.log('[ScrollRestore] Saved position:', scrollY, 'to key:', key);
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

    // Always attempt to restore if we have a saved position and it's back navigation
    if ((savedPosition !== null || fallbackPos !== null) && isBackLike) {
      const pos = savedPosition !== null ? savedPosition : (fallbackPos as number);
      
      // Skip if we just restored this exact same thing (prevents double restoration)
      if (lastRestoredRef.current === `${key}-${pos}`) {
        console.log('[ScrollRestore] Skipping restoration - already restored this position');
        return;
      }
      
      lastRestoredRef.current = `${key}-${pos}`;
      console.log('[ScrollRestore] Restoring back navigation to position:', pos);
      restoreInstant(pos);
    } else if (navigationType === 'forward') {
      // Only clear and go to top for explicit forward navigation
      sessionStorage.removeItem(key);
      lastRestoredRef.current = `${key}-0`;
      console.log('[ScrollRestore] Forward navigation - scrolling to top');
      restoreInstant(0);
    } else {
      console.log('[ScrollRestore] No restoration - navigation type:', navigationType, 'savedPosition:', savedPosition, 'fallbackPos:', fallbackPos);
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
  }, [location.pathname, location.search, location.state, ready, isFilterChange, detectNavigationType]);
}