# Suggested Commands for Leasingbørsen Development

## Core Development Commands

### React Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server with HMR (default Vite port)
npm run build        # Build for production (TypeScript + Vite build)
npm run preview      # Preview production build on port 4173
```

### Code Quality
```bash
npm run lint         # Run ESLint checking
npm run type-check   # TypeScript compiler check (if available)
```

### Testing
```bash
npm run test         # Run Vitest test suite
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run test:refactored # Run specific refactored component tests
npm run build:test   # Test + Build pipeline for CI/CD
```

### PDF Processing Service
```bash
cd railway-pdfplumber-poc/
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
# or
python app.py
```

### Deployment & Staging
```bash
npm run staging:deploy    # Deploy to staging
npm run staging:test      # Test staging deployment
npm run phase2:test:staging # Test AI extraction on staging
```

## System Commands (Linux)
- `git` - Version control operations
- `ls`, `cd`, `find`, `grep` - File system navigation
- `curl` - HTTP requests for API testing
- `node`, `npm` - Node.js and package management

## Environment Setup
- Copy `.env.example` to `.env.local` for local development
- Supabase credentials required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY