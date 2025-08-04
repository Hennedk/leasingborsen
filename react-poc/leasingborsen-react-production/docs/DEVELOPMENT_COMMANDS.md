# Development Commands - Leasingborsen Platform

Complete reference for all development, testing, and deployment commands.

## Core Development Commands

### Essential Workflow
```bash
# Setup and Installation
npm install              # Install all dependencies (Node.js 18+ required)
npm run dev              # Start development server with instant HMR
npm run build            # TypeScript check + Vite production build
npm run preview          # Preview production build on port 4173
npm run lint             # ESLint code quality checking

# Prerequisites for Edge Function testing:
# - Deno runtime required (https://deno.land/manual/getting_started/installation)
# - Install: curl -fsSL https://deno.land/install.sh | sh
```

### Testing Suite

#### Frontend Testing
```bash
npm run test                  # Interactive test mode with watch
npm run test:run             # Run all tests once (CI mode)
npm run test:coverage        # Generate coverage reports (90% functions, 80% branches)
npm run test:refactored      # Run tests for Phase 1 refactored components
npm run build:test           # Test + Build pipeline for CI/CD integration
```

#### Extraction-Specific Tests
```bash
npm run test:extraction              # Run extraction CRUD tests
npm run test:extraction:watch        # Watch mode for extraction tests
npm run test:extraction:coverage     # Coverage report for extraction
npm run test:extraction:ui           # Interactive UI for extraction tests
```

#### AI Extraction Edge Function Tests (Requires Deno)
```bash
npm run test:edge                    # Run all Edge Function tests
npm run test:edge:apply-changes      # Run apply-extraction-changes tests
npm run test:edge:compare            # Run compare-extracted-listings tests
npm run test:edge:coverage           # Run with coverage report
npm run test:all                     # Run all tests (frontend + edge functions)
```

#### Comparison Utility Tests (Phase 1 Complete)
```bash
npm run test:comparison              # Run comparison utility tests (27 tests)
npm run test:comparison:watch        # Watch mode for comparison tests
```

## Supabase Local Development

### Database Operations
```bash
supabase start              # Start local Supabase instance
supabase stop               # Stop local instance
supabase db start           # Start only database
supabase db reset           # Reset with fresh migrations
supabase db push            # Push local changes to remote
supabase db pull            # Pull remote schema locally
supabase db diff            # Show migration differences
```

### Edge Functions Local Development
```bash
supabase functions serve    # Serve all Edge Functions locally
supabase functions serve [function-name]  # Serve specific function

# Examples:
supabase functions serve ai-extract-vehicles --env-file .env.local
supabase functions serve apply-extraction-changes --env-file .env.local
```

## Edge Functions Deployment

### Complete Deployment List (14 Functions)

#### Admin Operations
```bash
supabase functions deploy admin-listing-operations     # CRUD for car listings
supabase functions deploy admin-seller-operations      # Seller management
supabase functions deploy admin-image-operations       # Image upload with processing
supabase functions deploy admin-reference-operations   # Reference data management
```

#### AI & Extraction
```bash
supabase functions deploy ai-extract-vehicles          # PDF extraction with AI
supabase functions deploy apply-extraction-changes     # Apply reviewed changes
supabase functions deploy compare-extracted-listings   # Preview extraction changes
supabase functions deploy pdf-proxy                    # Secure PDF download
```

#### Scoring & Analysis
```bash
supabase functions deploy calculate-lease-score        # Individual lease scoring
supabase functions deploy batch-calculate-lease-scores # Bulk lease scoring
```

#### Utilities
```bash
supabase functions deploy manage-prompts               # AI prompt management
supabase functions deploy remove-bg                    # Background removal
supabase functions deploy staging-check                # Staging environment check
supabase functions deploy test-function                # Development testing
```

### Bulk Deployment
```bash
# Deploy all functions at once
for func in admin-listing-operations admin-seller-operations admin-image-operations admin-reference-operations ai-extract-vehicles apply-extraction-changes compare-extracted-listings calculate-lease-score batch-calculate-lease-scores pdf-proxy manage-prompts remove-bg staging-check test-function; do
  supabase functions deploy $func
done
```

## Specialized Operations

### AI PDF Processing
```bash
# Test PDF processing locally
npm run pdf:test             # Test with sample PDF files

# Deploy PDF processing functions
npm run pdf:deploy           # Deploy all extraction Edge Functions

# Manual PDF testing
curl -X POST http://localhost:54321/functions/v1/ai-extract-vehicles \
  -H "Authorization: Bearer $ANON_KEY" \
  -F "file=@test-inventory.pdf" \
  -F "sellerId=dealer-uuid"
```

### Database Migrations
```bash
# Create new migration
supabase migration new [migration-name]

# Apply migrations
supabase db push

# List migrations
supabase migration list

# Revert last migration
supabase db reset --db-url [database-url]
```

### Environment Management
```bash
# Link to Supabase project
supabase link --project-ref [project-id]

# Set secrets for Edge Functions
supabase secrets set OPENAI_API_KEY=[your-key]
supabase secrets set ANTHROPIC_API_KEY=[your-key]

# List secrets
supabase secrets list

# Unset secrets
supabase secrets unset OPENAI_API_KEY
```

## Git Workflow Commands

### Branch Management
```bash
# Create feature branch
git checkout -b feature/[feature-name]

# Update from main
git checkout main
git pull origin main
git checkout feature/[feature-name]
git rebase main

# Push feature branch
git push -u origin feature/[feature-name]
```

### Commit Standards
```bash
# Conventional commits
git commit -m "feat: add new listing filter"
git commit -m "fix: resolve PDF extraction column mapping"
git commit -m "docs: update session log"
git commit -m "test: add extraction CRUD tests"
git commit -m "refactor: simplify database schema"
```

## Production Deployment

### Vercel Deployment
```bash
# Manual deployment
vercel --prod

# Preview deployment
vercel

# Link to project
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### Staging Deployment
```bash
# Deploy to staging
npm run staging:deploy

# Check staging
npm run staging:check
```

## Utility Scripts

### Performance Analysis
```bash
# Bundle analysis
npm run build -- --analyze

# Lighthouse CI
npm run lighthouse

# Check bundle size
npm run size
```

### Code Quality
```bash
# Type checking
npm run typecheck

# Format code
npm run format

# Check formatting
npm run format:check

# Find unused exports
npm run unused-exports
```

### Database Utilities
```bash
# Check lease score migration
node scripts/check-lease-score-migration.js

# Verify extraction sessions
node scripts/verify-extraction-sessions.js

# Clean orphaned records
node scripts/clean-orphaned-records.js
```

## Troubleshooting Commands

### Debug Edge Functions
```bash
# View function logs
supabase functions logs [function-name]

# Test function locally
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/[function-name]' \
  --header 'Authorization: Bearer [anon-key]' \
  --header 'Content-Type: application/json' \
  --data '{"test": "data"}'
```

### Database Debugging
```bash
# Connect to database
psql -h localhost -p 54322 -U postgres -d postgres

# Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'listings';

# View current connections
SELECT * FROM pg_stat_activity;
```

### React Query DevTools
```bash
# Enable in development
# DevTools automatically available at bottom-right in dev mode
# Press "React Query" button to open
```

## CI/CD Commands

### GitHub Actions
```yaml
# .github/workflows/test.yml
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
```

### Pre-commit Hooks
```bash
# Install husky
npm run prepare

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run typecheck"
```

## Quick Command Reference

| Task | Command |
|------|---------|
| Start dev | `npm run dev` |
| Run tests | `npm run test` |
| Build prod | `npm run build` |
| Deploy function | `supabase functions deploy [name]` |
| Check types | `npm run typecheck` |
| Format code | `npm run format` |
| View logs | `supabase functions logs [name]` |
| Reset DB | `supabase db reset` |