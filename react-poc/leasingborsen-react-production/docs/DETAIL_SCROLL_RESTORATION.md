Detail Scroll Restoration

Summary
- Restores scroll position when navigating back to a listing detail.
- Forward navigation to detail always scrolls to top.
- Saves positions per detail id under `detail-scroll:<id>`.
- Uses `leasingborsen-detail-navigation` for transient flags.

Keys
- `detail-scroll:<id>`: { position: number, timestamp: number, version: 1 }
- `leasingborsen-detail-navigation`: { from: 'detail', currentId, scrollPosition, isNavigatingAway, timestamp, version }
- TTL of 30 minutes is enforced opportunistically.

Detection
- Priority: router `location.state.backLike === true` → NavigationTiming `back_forward` → legacy `performance.navigation.type === 2` → session flag `isNavigatingBack` (recent).

Hook
- `useListingDetailScrollRestoration(id, ready)` restores on back-like and saves on scroll/pagehide with debounce, guarding against race conditions while restoring or during navigation-away windows.
- `useDetailBackLike()` returns a boolean for coordinating scroll-to-top behavior.

Integration
- `Listing.tsx`: calls `useListingDetailScrollRestoration(id)` and passes `skipScrollToTop` to `useListingPositioning` based on `useDetailBackLike()`.
- `ListingCard`: calls `prepareListingNavigation` when originating from `/listings`, and `prepareDetailNavigation` when originating from `/listing/:id`.

Pitfalls
- iOS/Safari bfcache: restoration uses an rAF loop until content height stabilizes.
- Avoid overwriting restored positions: saving disabled briefly after restore and during navigate-away windows.
- Cooperates with listings scroll restoration by scoping keys and flags distinctly.

Rollout
- Dev-only logs included; reduce verbosity once validated.
- Safe to disable by removing the hook call in `Listing.tsx` if needed.

