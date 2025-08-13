# Pull Request Guide for Staging Deployment

## 📋 PR Template for Mobile Fullscreen Hero Feature

### Creating the Pull Request

1. **Push to Feature Branch**
```bash
# Create and switch to feature branch
git checkout -b feature/mobile-fullscreen-hero

# Push the branch to origin
git push -u origin feature/mobile-fullscreen-hero
```

2. **Create PR on GitHub**
Navigate to: https://github.com/[your-org]/leasingborsen/pulls

Click "New pull request" and use this template:

---

### PR Title
```
feat: Mobile Fullscreen Hero for Listing Page (Phase 1 Implementation)
```

### PR Description
```markdown
## 🎯 Summary
Implements Phase 1 of the mobile fullscreen hero experience for the listing page, transforming mobile browsing into an immersive, app-like interface.

## 📱 What's New
- **Fullscreen Hero Image** (40vh) with optimized loading and padding
- **Floating Back Button** with result count "Tilbage til resultater (37)"
- **Compact Sticky Header** that appears on scroll with car title
- **Enhanced Price Footer** with state machine, scroll lock, and URL sync
- **Mobile-First Layout** with hidden desktop header on listing page

## 🔧 Technical Implementation

### New Components & Hooks
- `FullscreenHero` - Hero image with IntersectionObserver
- `CompactStickyHeader` - Sticky navigation with transitions
- `useScrollStore` - Scroll position management with sessionStorage
- `useIntersectionObserver` - Battery-efficient visibility detection
- `useBodyScrollLock` - iOS-safe scroll prevention
- `useScrollRestoration` - Hardware back button support
- `useLeaseConfigUrlSync` - URL parameter sync for configuration

### Key Changes
- Enhanced `MobilePriceBar` with vertical layout and edit icon
- Updated `Listing.tsx` with responsive padding and layout
- Added critical mobile CSS fixes (100dvh, safe areas, containment)

## ✅ Testing Checklist

### Mobile Browsers (Priority)
- [ ] iOS Safari 15+ (iPhone 12/13/14)
- [ ] Android Chrome (Samsung/Pixel devices)
- [ ] Samsung Internet
- [ ] Firefox Mobile

### Test Scenarios
- [ ] Hero image loads properly (40vh height)
- [ ] Back button navigates to listings
- [ ] Sticky header appears on scroll
- [ ] Price footer is always visible
- [ ] Price configuration sheet opens/closes
- [ ] Body scroll locks when sheet is open
- [ ] URL updates with configuration changes
- [ ] Hardware back button preserves scroll

### Known Issues
⚠️ **Before Merging to Production**:
1. Result count is hardcoded (37) - needs search context integration
2. Image CDN configuration pending for optimization
3. Seller data is placeholder - needs actual data integration
4. Fine-tuning needed for various device sizes

## 📊 Performance Impact
- **Expected LCP**: < 2.5s with image optimization
- **Bundle Size**: +~15KB (new components and hooks)
- **Mobile Score**: Target 90+ on Lighthouse

## 🚀 Deployment Notes

### Staging Environment
- Auto-deploys from `staging` branch
- Test URL: https://staging.leasingborsen.dk/listing/[id]
- Mobile testing recommended via BrowserStack

### Production Readiness
- [ ] Test on 5+ real devices
- [ ] Configure image CDN
- [ ] Integrate real data (result count, seller info)
- [ ] Performance audit passes
- [ ] QA sign-off

## 📸 Screenshots
[Add mobile screenshots here showing:]
1. Hero image with back button
2. Sticky header in action
3. Price footer with edit icon
4. Configuration sheet open

## 🔗 Related
- Implementation Plan: `docs/MOBILE_LISTING_FULLSCREEN_PLAN.md`
- Session Log: `docs/SESSION_LOG.md`
- Issue: #[issue-number]

## Review Focus Areas
1. Mobile UX flow and interactions
2. Performance on low-end devices
3. Cross-browser compatibility
4. Accessibility compliance
```

---

## 🔍 Review Checklist for Team

### Code Review Points
- [ ] No console.log statements
- [ ] Danish localization correct
- [ ] TypeScript types properly defined
- [ ] Error handling in place
- [ ] Loading states implemented

### Mobile Testing
- [ ] Test on actual devices (not just Chrome DevTools)
- [ ] Check iOS bounce scroll behavior
- [ ] Verify Android back button behavior
- [ ] Test with slow 3G connection
- [ ] Validate touch targets (44x44px minimum)

### Staging Validation
- [ ] Hero image responsive across devices
- [ ] Animations smooth (60fps)
- [ ] No layout shifts (CLS < 0.1)
- [ ] Memory leaks checked
- [ ] Navigation flows work correctly

## 🚢 Merge Strategy

1. **To Staging Branch**
```bash
# After PR approval
git checkout staging
git merge feature/mobile-fullscreen-hero
git push origin staging
```

2. **Monitor Staging**
- Check deployment logs
- Test on staging URL
- Monitor error tracking (Sentry/etc)
- Gather team feedback

3. **To Production** (After Validation)
```bash
# Create production PR from staging
git checkout main
git merge staging
git push origin main
```

## 📝 Post-Deployment

### Monitoring
- [ ] Check Core Web Vitals
- [ ] Monitor error rates
- [ ] Track engagement metrics
- [ ] Gather user feedback

### Rollback Plan
```bash
# If issues arise
git revert [commit-hash]
git push origin main
```

## 🤝 Team Contacts

- **Frontend Lead**: @[username]
- **QA Lead**: @[username]
- **Product Owner**: @[username]
- **DevOps**: @[username]

---

## Notes for Next Session

Before continuing to production:
1. Integrate actual search result count from filter context
2. Configure image CDN (Cloudinary/Imagekit)
3. Fetch real seller data from Supabase
4. Add analytics tracking for mobile interactions
5. Implement A/B testing for hero height variations
6. Add error boundaries for component failures

This PR implements the foundation - production readiness requires the data integration tasks above.