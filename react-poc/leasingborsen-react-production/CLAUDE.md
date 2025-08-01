# CLAUDE.md - React Leasingborsen Platform

Essential guidance for Claude Code (claude.ai/code) when working with the Danish car leasing comparison platform.

## 🎯 Project Vision

Building Denmark's premier car leasing comparison platform for consumers.

- **MVP Goal**: Validate that Danish consumers want centralized leasing offer comparisons
- **Core Value**: Automated PDF extraction of dealer inventories for real-time pricing
- **Success Metrics**: User engagement, dealer inquiries, listing accuracy
- **Target Users**: Danish consumers seeking transparent car leasing deals

## 🔄 Session Management & Handover

### Session Strategy
- **Prefer short sessions** (2-4 hours max) for focused work
- **Clear context regularly** to maintain Claude's performance
- **Document all changes** before ending session

### End of Session Protocol

1. **Create Session Summary**
   ```markdown
   ## Session: [Date] - [Primary Task]
   
   ### What Changed:
   - [ ] Fixed PDF extraction column mapping issues
   - [ ] Updated apply-extraction-changes Edge Function
   - [ ] Added RLS bypass for admin operations
   
   ### Known Issues:
   - Extraction fails for dealer Y PDF format
   - Cache invalidation delay on listing updates
   
   ### Next Steps:
   - Test with dealer Y's latest PDF
   - Implement extraction retry logic
   
   ### Files Modified:
   - `src/hooks/useListingComparison.ts`
   - `supabase/functions/apply-extraction-changes/index.ts`
   ```

2. **Update Documentation**
   - Add summary to `docs/SESSION_LOG.md`
   - Update this file if patterns change
   - Commit with descriptive message

3. **Git Commit Convention**
   ```bash
   git add -A
   git commit -m "fix: PDF extraction RLS violations
   
   - Updated apply-extraction-changes to use service_role
   - Fixed cascade deletion for lease_pricing
   - See docs/SESSION_LOG.md for session details"
   ```

### Starting Next Session
1. Read last 2-3 entries in `docs/SESSION_LOG.md`
2. Check recent git commits: `git log --oneline -10`
3. Review any TODO comments in code
4. Read this file for context

## 🚀 Quick Start

```bash
# Setup
npm install              # Install dependencies
npm run dev              # Start dev server (hot reload)

# Key URLs
http://localhost:5173    # Development server
/admin/listings          # Admin interface
/admin/ai-extractions    # PDF extraction review

# Essential Files
src/hooks/useListings.ts # Core data fetching
src/components/ListingCard.tsx # Main UI pattern
docs/SESSION_LOG.md      # Recent changes
```

## 🚨 Critical: PDF Extraction Workflow

**This is the CORE MVP feature** - automated dealer inventory updates via PDF extraction.

### Extraction Pipeline
```
PDF Upload → ai-extract-vehicles → compare-extracted-listings → apply-extraction-changes
    ↓              ↓                        ↓                           ↓
Validation    AI Processing          Change Preview              Database Update
```

### Common Issues & Solutions

**"No changes applied"**
```sql
-- Check extraction session
SELECT status, error_message FROM extraction_sessions WHERE id = 'session-id';
```

**"Column doesn't exist"** 
- Fixed in July 2025: `engine_info` → `engine_size_cm3`, `duration_months` → `period_months`

**"RLS policy violation"**
- Must use `apply-extraction-changes` Edge Function (uses service_role)

### Testing Extraction Locally
```bash
# 1. Upload test PDF
curl -X POST http://localhost:54321/functions/v1/ai-extract-vehicles \
  -H "Authorization: Bearer $ANON_KEY" \
  -F "file=@dealer-inventory.pdf" \
  -F "sellerId=dealer-uuid"

# 2. Review in admin UI
http://localhost:5173/admin/ai-extractions
```

⚠️ **CRITICAL**: Uploading partial inventory (e.g., single model PDF) marks ALL unmatched listings for deletion. Always review before applying!

**Detailed documentation**: `docs/archive/AI_EXTRACTION_SYSTEM.md`

## 💼 Development Workflow

### Git Strategy
```
main (production) ← feature/fix branches
  ↓
staging (auto-deploy for testing)
```

- Create feature branches from `main`
- Test thoroughly before merging
- Squash commits for clean history

### Deployment Pipeline
```
Local Dev → Feature Branch → PR Review → Staging → Production
    ↓            ↓              ↓           ↓          ↓
npm run dev   Push to Git   Auto-tests  Auto-deploy  Manual
```

### Pre-deployment Checklist
- [ ] Tests pass: `npm run test:run`
- [ ] Lint clean: `npm run lint`
- [ ] PDF extraction tested with sample files
- [ ] Database migrations reviewed
- [ ] Session documented in `docs/SESSION_LOG.md`

## 🧪 Testing Strategy

### What to Test (Priority Order)
1. **PDF Extraction** - Edge cases, format variations
2. **Admin CRUD** - Listing create/update/delete
3. **Filters & Search** - User-facing functionality
4. **Error States** - Danish error messages

### When to Write Tests
- Before fixing extraction bugs
- New admin features
- User-reported issues

### Test Example
```typescript
// Always test extraction deletion logic
it('marks ALL unmatched listings for deletion on partial upload', async () => {
  const result = await extractVehicles(partialInventoryPDF)
  expect(result.deletions).toHaveLength(existingListings.length - matchedCount)
})
```

**Full testing guide**: `docs/archive/TESTING_INSTRUCTIONS.md`

## 📝 Coding Principles

### Component Strategy
- Use shadcn/ui components always (no custom styling)
- Extract components at 300+ lines
- Memoize expensive list renders

### State Management
```typescript
// Global state (Zustand)
const { filters, setFilter } = useFilterStore()

// Server state (React Query)
const { data, isLoading } = useListings(filters)

// URL state (custom hook)
const { syncedFilters } = useUrlSync()
```

### Error Handling
```typescript
// Always Danish user messages
catch (error) {
  setError('Der opstod en fejl ved indlæsning af biler')
  console.error('Listing fetch error:', error) // English for logs
}
```

## Development Commands

```bash
# Core Development
npm install              # Install dependencies
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview prod build
npm run lint             # Check code quality

# Testing
npm run test             # Watch mode
npm run test:run         # Single run (CI)
npm run test:coverage    # Coverage report

# Edge Functions Deployment (14 functions)
supabase functions deploy admin-listing-operations
supabase functions deploy admin-seller-operations
supabase functions deploy admin-image-operations
supabase functions deploy admin-reference-operations
supabase functions deploy ai-extract-vehicles
supabase functions deploy apply-extraction-changes
supabase functions deploy compare-extracted-listings
supabase functions deploy calculate-lease-score
supabase functions deploy batch-calculate-lease-scores
supabase functions deploy pdf-proxy
supabase functions deploy manage-prompts
supabase functions deploy remove-bg
supabase functions deploy staging-check
supabase functions deploy test-function
```

## Technology Stack

- **Frontend**: React 19.1.0 + TypeScript 5.8.3 + Vite 6.3.5
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State**: Zustand + React Query 5
- **Testing**: Vitest + React Testing Library
- **Language**: Danish UI (da-DK)

**Full stack details**: `docs/archive/TECHNOLOGY_STACK.md`

## Project Structure

```
src/
├── components/ui/       # shadcn/ui components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── services/           # Business logic
├── stores/             # Zustand stores
├── lib/                # Utilities
└── types/              # TypeScript types
```

## Edge Functions Reference

### Admin Operations
- **admin-listing-operations** - CRUD for car listings with RLS bypass
- **admin-seller-operations** - Dealer/seller management
- **admin-image-operations** - Image upload with background processing
- **admin-reference-operations** - Manage makes, models, body types, etc.

### AI & Extraction
- **ai-extract-vehicles** - Extract car data from PDFs (OpenAI/Claude)
- **apply-extraction-changes** - Apply reviewed changes (bypasses RLS)
- **compare-extracted-listings** - Preview extraction changes
- **pdf-proxy** - Secure PDF download with SSRF protection

### Scoring & Analysis
- **calculate-lease-score** - Score individual listings
- **batch-calculate-lease-scores** - Bulk scoring with specific IDs

### Utilities
- **manage-prompts** - AI prompt version management
- **remove-bg** - Remove image backgrounds
- **staging-check** - Verify staging environment
- **test-function** - Development testing

**Detailed specs**: `docs/EDGE_FUNCTIONS.md`

## Core Patterns

### Component Pattern
```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const ListingCard: React.FC<Props> = ({ listing }) => {
  const [loading, setLoading] = useState(false)
  const price = listing.monthly_price?.toLocaleString('da-DK') || '–'
  
  if (loading) return <Card className="animate-pulse">...</Card>
  
  return (
    <Card>
      <CardContent>
        <h3>{listing.make} {listing.model}</h3>
        <p className="text-2xl font-bold">{price} kr/md</p>
        <Button>Se detaljer</Button>
      </CardContent>
    </Card>
  )
}
```

### Query Pattern
```typescript
const fetchListings = async (filters: Filters) => {
  let query = supabase
    .from('full_listing_view')
    .select('*')
  
  if (filters.make) query = query.eq('make', filters.make)
  if (filters.maxPrice) query = query.lte('monthly_price', filters.maxPrice)
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) throw new Error('Der opstod en fejl')
  return data
}
```

**More patterns**: `docs/PATTERNS.md`

## Environment Configuration

```bash
# Required
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Feature Flags
VITE_AI_EXTRACTION_ENABLED=true
VITE_MOBILE_FILTERS_ENABLED=true
```

**Security note**: API keys stored in Edge Functions, not client

## Database Overview

### Core Tables
- **listings** - Car inventory with pricing
- **lease_pricing** - Multiple offers per listing
- **sellers** - Dealers and importers
- **extraction_sessions** - PDF processing history
- **makes, models, etc.** - Reference data

### Primary View
- **full_listing_view** - Denormalized data for performance

**Complete schema**: `docs/DATABASE_SCHEMA.md`

## Common Tasks

### Add New Listing
1. Navigate to `/admin/listings`
2. Click "Ny bil" 
3. Fill required fields
4. Add lease offers

### Test PDF Extraction
1. Go to `/admin/sellers`
2. Select dealer
3. Upload PDF via "Upload PDF"
4. Review at `/admin/ai-extractions`

### Deploy to Staging
```bash
npm run staging:deploy
# Check https://staging.leasingborsen.dk
```

### Debug Extraction Failure
1. Check session in Supabase dashboard
2. Review `api_call_logs` for AI errors
3. Verify PDF format matches expected structure

## Danish Localization

```typescript
// Price formatting
const formatPrice = (price?: number) => 
  price ? `${price.toLocaleString('da-DK')} kr/md` : '–'

// Common messages
const messages = {
  loading: 'Indlæser...',
  error: 'Der opstod en fejl',
  noResults: 'Ingen resultater fundet',
  save: 'Gem',
  cancel: 'Annuller'
}
```

## Troubleshooting

### PDF Extraction Issues

**Problem**: "Failed to extract vehicles"
- Check `api_call_logs` for AI provider errors
- Verify PDF is text-based, not scanned image
- Confirm dealer_id exists in sellers table

**Problem**: "Changes not applying"
- Ensure using admin role (`is_admin()` must return true)
- Check browser console for RLS errors
- Verify extraction_session status is 'pending_review'

### Performance Issues

**Slow listing load**
- Use `full_listing_view` instead of joins
- Add `.limit(20)` to queries
- Check for missing database indexes

### Cache Problems
- Hard refresh: Ctrl+Shift+R
- Clear React Query cache in dev tools
- Check `lease_score_calculated_at` timestamp

**More solutions**: `docs/TROUBLESHOOTING.md`

## Quick Links

### Documentation
- Session Log: `docs/SESSION_LOG.md`
- AI System: `docs/archive/AI_EXTRACTION_SYSTEM.md`
- Testing: `docs/archive/TESTING_INSTRUCTIONS.md`
- Database: `docs/DATABASE_SCHEMA.md`

### External Resources
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Deployments](https://vercel.com)
- [shadcn/ui Docs](https://ui.shadcn.com)

## Summary

This platform automates Danish car leasing comparisons through:
- **AI-powered PDF extraction** for dealer inventory updates
- **Comprehensive admin interface** for data management
- **Danish-first UX** with proper localization
- **Secure Edge Functions** bypassing RLS for admin operations

**Remember**: Always document your session before closing!