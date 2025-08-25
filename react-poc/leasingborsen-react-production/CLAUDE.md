# CLAUDE.md - React Leasingborsen Platform

Essential guidance for Claude Code (claude.ai/code) when working with the Danish car leasing comparison platform.

## 🎯 Project Overview

Building Denmark's premier car leasing comparison platform for consumers.

- **MVP Goal**: Validate that Danish consumers want centralized leasing offer comparisons
- **Core Value**: Automated PDF extraction of dealer inventories for real-time pricing
- **Tech Stack**: React 19 + TypeScript + Vite + TanStack Router v2 + Supabase + shadcn/ui
- **Language**: Danish-first interface (da-DK localization)

## 🔄 Session Management & Handover

### Session Strategy
- **Prefer short sessions** (2-4 hours max) for focused work
- **Clear context regularly** to maintain Claude's performance
- **Document all changes** before ending session

### End of Session Protocol

1. **Create Session Summary** in `docs/SESSION_LOG.md`
   - What changed (features, fixes, refactors)
   - Known issues remaining
   - Next steps for continuation
   - Files modified

2. **Git Commit Convention**
   ```bash
   git add -A
   git commit -m "type: brief description
   
   - Detailed change 1
   - Detailed change 2
   See docs/SESSION_LOG.md for session details"
   ```

3. **Starting Next Session**
   - Read last 2-3 entries in `docs/SESSION_LOG.md`
   - Check recent commits: `git log --oneline -10`
   - Review TODO comments in code

## 📍 Documentation Map

Quick reference for detailed documentation:

| Topic | Location | When to Read |
|-------|----------|--------------|
| **Code Patterns** | `docs/CODE_PATTERNS.md` | Component development, state management |
| **Database Schema** | `docs/DATABASE_SCHEMA.md` | Working with tables, queries, RLS |
| **Development Commands** | `docs/DEVELOPMENT_COMMANDS.md` | Testing, deployment, Edge Functions |
| **AI Extraction** | `docs/AI_EXTRACTION_DETAILS.md` | PDF processing, extraction workflow |
| **Lease Scoring** | `docs/LEASE_SCORE_SYSTEM.md` | Score calculations, algorithms |
| **Testing Guide** | `docs/TESTING_INSTRUCTIONS.md` | Writing tests, coverage requirements |
| **Session History** | `docs/SESSION_LOG.md` | Understanding recent changes |

### Archive Documentation (Task-Specific)
- **AI System Details**: `docs/archive/AI_EXTRACTION_SYSTEM.md`
- **Admin Components**: `docs/archive/ADMIN_COMPONENTS_REVIEW.md`
- **Performance**: `docs/archive/OPTIMIZATION-SESSION.md`
- **Build Issues**: `docs/archive/BUILD_ISSUES.md`

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
src/hooks/useListings.ts         # Core data fetching
src/components/ListingCard.tsx   # Main UI pattern
src/stores/consolidatedFilterStore.ts # State management
```

## 🚨 Core Workflows

### PDF Extraction Pipeline (CRITICAL MVP FEATURE)

```
PDF Upload → ai-extract-vehicles → compare-extracted-listings → apply-extraction-changes
```

**Common Issues**:
- "No changes applied" - Check extraction session status
- "Column doesn't exist" - Fixed: `engine_info` → `engine_size_cm3`
- "RLS violation" - Use `apply-extraction-changes` Edge Function

**Testing**: Upload PDF via `/admin/sellers` → Review at `/admin/ai-extractions`

⚠️ **WARNING**: Partial inventory uploads mark ALL unmatched listings for deletion!

**Details**: See `docs/AI_EXTRACTION_DETAILS.md`

### Development Workflow

```
main (production) ← feature branches ← local development
  ↓                     ↓                    ↓
Deploy to Vercel    PR + Review         npm run dev
```

**Pre-deployment Checklist**:
- [ ] Tests pass: `npm run test:run`
- [ ] Lint clean: `npm run lint`
- [ ] PDF extraction tested
- [ ] Session documented

### Testing Requirements

**Priority Order**:
1. PDF Extraction edge cases
2. Admin CRUD operations
3. User-facing filters/search
4. Danish error messages

**When to Write Tests**:
- Before fixing bugs
- New features
- User-reported issues

## 💻 Development Guidelines

### Component Patterns
- **Always** use shadcn/ui components (no custom styling)
- **Extract** components over 300 lines
- **Memoize** expensive list renders
- **Example**: See `docs/CODE_PATTERNS.md`

### Navigation & Routing (TanStack Router v2)
```typescript
// Type-safe navigation
import { useNavigate, Link } from '@tanstack/react-router'

// Navigate with parameters
const navigate = useNavigate()
navigate({ to: '/listing/$id', params: { id: 'abc-123' } })

// Links with search params
<Link to="/listings" search={{ make: 'Toyota' }}>View Toyota Cars</Link>

// Search params with validation (Zod schemas in route files)
const search = listingsRoute.useSearch() // Fully typed
```

### State Management
```typescript
// Global state (Zustand)
const { filters, setFilter } = useFilterStore()

// Server state (React Query)
const { data, isLoading } = useListings(filters)

// Local state (React hooks)
const [loading, setLoading] = useState(false)
```

### Error Handling
```typescript
catch (error) {
  setError('Der opstod en fejl ved indlæsning') // Danish UI
  console.error('Listing fetch error:', error)   // English logs
}
```

### Danish Localization
```typescript
// Price formatting
const formatPrice = (price?: number) => 
  price ? `${price.toLocaleString('da-DK')} kr/md` : '–'

// Common messages
const messages = {
  loading: 'Indlæser...',
  error: 'Der opstod en fejl',
  save: 'Gem',
  cancel: 'Annuller'
}
```

## 🛠 Essential Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Production build
npm run test             # Run tests (watch mode)
npm run lint             # Check code quality

# Edge Functions (14 total)
supabase functions deploy ai-extract-vehicles
supabase functions deploy apply-extraction-changes
supabase functions deploy admin-listing-operations
# See docs/DEVELOPMENT_COMMANDS.md for complete list

# Database
supabase db reset        # Reset local database
supabase db push         # Push migrations
```

**Full command reference**: `docs/DEVELOPMENT_COMMANDS.md`

## 🏗 Architecture Overview

### Tech Stack
- **Frontend**: React 19.1.0 + TypeScript 5.8.3 + Vite 6.3.5
- **UI**: Tailwind CSS 4 + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State**: Zustand + React Query 5
- **Testing**: Vitest + React Testing Library
- **AI**: OpenAI GPT-4 + Anthropic Claude

### Project Structure
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

### Edge Functions (14 Functions)

**Admin Operations**:
- `admin-listing-operations` - Car CRUD
- `admin-seller-operations` - Dealer management
- `admin-image-operations` - Image processing
- `admin-reference-operations` - Reference data

**AI & Extraction**:
- `ai-extract-vehicles` - PDF to data
- `apply-extraction-changes` - Apply changes (RLS bypass)
- `compare-extracted-listings` - Preview changes
- `pdf-proxy` - Secure PDF download

**Details**: See `docs/AI_EXTRACTION_DETAILS.md`

### Database Overview
- **Primary View**: `full_listing_view` (always use for queries)
- **Core Tables**: listings, sellers, lease_pricing
- **AI Tables**: extraction_sessions, extraction_listing_changes
- **Security**: Row Level Security with admin/service roles

**Full schema**: `docs/DATABASE_SCHEMA.md`

## 🐛 Common Issues & Solutions

### PDF Extraction
**"Failed to extract"** → Check `api_call_logs`, verify PDF is text-based

**"Changes not applying"** → Ensure admin role, check session status

**"Duplicates after extraction"** → Fixed: Removed transmission from matching key

### Performance
**Slow listings** → Use `full_listing_view`, add `.limit(20)`

**Cache issues** → Hard refresh (Ctrl+Shift+R), check React Query

### Build/Deploy
**Type errors** → Run `npm run typecheck` locally first

**Edge Function fails** → Check logs: `supabase functions logs [name]`

## 📚 Additional Resources

### Recent Updates (2025)
- **July**: Database simplification, extraction column fixes
- **January**: Extraction DELETE fix, comprehensive test suite
- **January**: AI extraction testing implementation (Phase 1 complete)

### Key Integration Points
- **Supabase URL**: Set in `VITE_SUPABASE_URL`
- **API Keys**: Stored in Edge Functions (not client)
- **Staging**: Auto-deploy from `staging` branch

### External Links
- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Deployments](https://vercel.com)
- [shadcn/ui Docs](https://ui.shadcn.com)

## 🎯 Summary

This platform automates Danish car leasing comparisons through:
- **AI-powered PDF extraction** for inventory updates
- **Comprehensive admin interface** for data management
- **Danish-first UX** with proper localization
- **Secure Edge Functions** bypassing RLS for admin ops

**Remember**: Always document your session before closing!

---

## Quick Task Reference

| Task | Primary Files | Documentation |
|------|--------------|---------------|
| Add new listing field | `types/index.ts`, `ListingCard.tsx` | `docs/CODE_PATTERNS.md` |
| Fix extraction issue | `ai-extract-vehicles`, `apply-extraction-changes` | `docs/AI_EXTRACTION_DETAILS.md` |
| Update lease scoring | `calculate-lease-score`, `LeaseScoreBadge.tsx` | `docs/LEASE_SCORE_SYSTEM.md` |
| Add admin feature | `admin-*-operations`, admin hooks | `docs/CODE_PATTERNS.md` |
| Debug database | Supabase dashboard, `full_listing_view` | `docs/DATABASE_SCHEMA.md` |