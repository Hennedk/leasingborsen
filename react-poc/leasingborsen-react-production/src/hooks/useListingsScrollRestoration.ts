import { useLayoutEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

const KEY_PREFIX = "listings-scroll:";

const normalizeSearch = (search: string) => {
  const p = new URLSearchParams(search);
  const entries = [...p.entries()].sort(([a],[b]) => a.localeCompare(b));
  return new URLSearchParams(entries).toString();
};

export function useListingsScrollRestoration(ready = true) {
  const location = useLocation();
  // TanStack Router doesn't have useNavigationType, so we'll use location.state as fallback
  const navType = "PUSH"; // Default to PUSH, will be handled by other logic
  const lastRestoredRef = useRef<string>("");
  const navigationStartRef = useRef<number>(0);
  const hasRestoredRef = useRef<boolean>(false);

  // Run pre-paint to avoid any visible jump on restore
  useLayoutEffect(() => {
    if (location.pathname !== "/listings" || !ready) return;
    
    // Track mount time for this effect
    const effectMountTime = Date.now();
    
    // Flag to prevent saving during restoration
    let isRestoring = false;

    const normalizedSearch = normalizeSearch(location.search);
    const key = KEY_PREFIX + normalizedSearch;
    const saved = sessionStorage.getItem(key);
    const isBackLike = navType === "POP" || (location.state as { backLike?: boolean })?.backLike === true;
    

    // Set navigation context for other components to detect back navigation
    if (isBackLike) {
      // Clear the navigating away flag when we arrive back
      const currentNav = sessionStorage.getItem('leasingborsen-navigation');
      if (currentNav) {
        try {
          const state = JSON.parse(currentNav);
          delete state.isNavigatingAway;
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

    // Fallback: also consider navigation context storage if list-specific key is missing
    let fallbackPos: number | null = null;
    if (!saved) {
      try {
        const raw = sessionStorage.getItem('leasingborsen-navigation');
        if (raw) {
          const st = JSON.parse(raw) as { from?: string; scrollPosition?: number; filters?: string; timestamp?: number };
          const MAX_AGE = 30 * 60 * 1000;
          if (st && st.from === 'listings' && typeof st.scrollPosition === 'number' && st.timestamp && (Date.now() - st.timestamp) <= MAX_AGE) {
            const normalizedStored = normalizeSearch(st.filters ? '?' + st.filters : '');
            const normalizedCurrent = normalizeSearch(location.search);
            if (normalizedStored === normalizedCurrent) {
              fallbackPos = st.scrollPosition | 0;
            }
          }
        }
      } catch {
        // Ignore parse errors
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

    // Don't save during restoration or when navigating away
    const save = () => {
      if (isRestoring) {
        return;
      }
      
      // Don't save if we're navigating away (prevents saving scroll animation positions)
      if (isNavigatingAway()) {
        return;
      }
      
      // Don't save within first 500ms of mount to prevent race conditions
      if (Date.now() - effectMountTime < 500) {
        return;
      }
      
      const scrollY = window.scrollY || 0;
      const currentSaved = sessionStorage.getItem(key);
      const currentSavedNum = currentSaved ? parseInt(currentSaved) : null;
      
      // Don't overwrite a good saved position with 0 or very small values during mount
      // Enhanced check: only save 0 if we explicitly scrolled to top, not on initial mount
      if (scrollY === 0) {
        // If we have a saved position > 100 and we just mounted (< 2 seconds), don't overwrite
        if (currentSavedNum && currentSavedNum > 100 && (Date.now() - effectMountTime) < 2000) {
          return;
        }
        // If we just restored a position, don't immediately overwrite with 0
        if (hasRestoredRef.current && (Date.now() - effectMountTime) < 3000) {
          return;
        }
      }
      
      // Don't save positions that are decreasing rapidly (scroll animation)
      if (currentSavedNum && currentSavedNum > 100 && scrollY < currentSavedNum - 50) {
        return;
      }
      
      // Only save if we have a meaningful scroll position or if there's no saved value
      if (scrollY > 0 || currentSaved === null) {
        sessionStorage.setItem(key, String(scrollY | 0));
      }
    };
    
    // Debounced save handler
    let saveTimer: NodeJS.Timeout;
    const debouncedSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 100);
    };
    
    window.addEventListener("scroll", debouncedSave, { passive: true });
    window.addEventListener("pagehide", save);

    const restoreInstant = (y: number) => {
      isRestoring = true;
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
            // Allow saving again after restoration is complete
            // Increased delay to prevent immediate overwrite
            setTimeout(() => {
              isRestoring = false;
            }, 300);
          });
        }
      };
      requestAnimationFrame(loop);
    };

    if (isBackLike && (saved || fallbackPos != null)) {
      const pos = saved ? (parseInt(saved, 10) || 0) : (fallbackPos as number);
      
      // Skip if we just restored this exact same thing (prevents double restoration)
      if (lastRestoredRef.current === `${key}-${pos}`) {
        return;
      }
      
      lastRestoredRef.current = `${key}-${pos}`;
      restoreInstant(pos);
    } else if (navType !== "POP") {
      // true forward visit → clear and go to top (no smooth animation)
      sessionStorage.removeItem(key);
      lastRestoredRef.current = `${key}-0`;
      restoreInstant(0);
    }

    // Reset navigation start ref when we arrive at listings
    navigationStartRef.current = 0;

    return () => {
      clearTimeout(saveTimer);
      window.removeEventListener("scroll", debouncedSave);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [location.pathname, location.search, location.state, navType, ready]);
}
