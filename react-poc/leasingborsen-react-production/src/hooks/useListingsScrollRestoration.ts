import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY_PREFIX = "listings-scroll:";

const normalizeSearch = (search: string) => {
  const p = new URLSearchParams(search);
  const entries = [...p.entries()].sort(([a],[b]) => a.localeCompare(b));
  return new URLSearchParams(entries).toString();
};

export function useListingsScrollRestoration(ready = true) {
  const location = useLocation();
  const navType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"

  useEffect(() => {
    if (location.pathname !== "/listings" || !ready) return;

    const key = KEY_PREFIX + normalizeSearch(location.search);
    const saved = sessionStorage.getItem(key);
    const isBackLike = navType === "POP" || location.state?.backLike === true;

    const save = () => sessionStorage.setItem(key, String((window.scrollY || 0) | 0));
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);

    const restoreInstant = (y: number) => {
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
        if ((notAtTarget || unstable) && tries++ < 20) {
          requestAnimationFrame(loop);
        } else {
          requestAnimationFrame(() => html.classList.remove("instant-nav"));
        }
      };
      requestAnimationFrame(loop);
    };

    if (isBackLike && saved) {
      restoreInstant(parseInt(saved, 10) || 0);
    } else if (navType !== "POP") {
      // true forward visit → clear and go to top (no smooth animation)
      sessionStorage.removeItem(key);
      restoreInstant(0);
    }

    return () => {
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [location.pathname, location.search, location.state, navType, ready]);
}