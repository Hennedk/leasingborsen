# Leasingbørsen React Production

A sophisticated, enterprise-grade car leasing platform for the Danish market, featuring AI-powered PDF extraction, comprehensive admin interface, and modern React architecture.

## 🚀 Overview

Leasingbørsen is a full-featured car leasing marketplace that has successfully migrated from Vue to React, resulting in a performant, maintainable, and feature-rich application. The platform connects Danish car dealers with customers looking for leasing options, providing automated data extraction, intelligent pricing analysis, and comprehensive inventory management.

### Key Features

- **🤖 AI-Powered PDF Extraction**: Multi-provider AI system for extracting vehicle data from Danish dealer PDFs
- **📊 Comprehensive Admin Interface**: Full CRUD operations for listings, sellers, and reference data
- **🔍 Advanced Search & Filtering**: Real-time search with multiple filter options
- **📱 Mobile-First Design**: Responsive design with dedicated mobile components
- **🏢 Multi-Environment Support**: Production and staging environments with separate configurations
- **🎨 Background Removal**: AI-powered image processing for professional vehicle photos
- **💰 Lease Score System**: Intelligent scoring algorithm for value analysis
- **🌐 Danish Localization**: Complete Danish language support throughout

## 🛠️ Technology Stack

- **Frontend**: React 19.1.0 + TypeScript 5.8.3
- **Build Tool**: Vite 6.3.5 with HMR
- **Styling**: Tailwind CSS 4.1.8 + shadcn/ui (40+ components)
- **State Management**: Zustand 5.0.5 + React Query 5.80.7
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI Integration**: OpenAI GPT-3.5/4, Anthropic Claude
- **Testing**: Vitest 3.2.4 + React Testing Library
- **PDF Processing**: Railway-deployed Python service

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key (for AI features)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone [repository-url]
cd leasingborsen-react-production
npm install
```

### 2. Environment Setup

Create a `.env.local` file:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Feature Flags
VITE_AI_EXTRACTION_ENABLED=true
VITE_BATCH_PROCESSING_ENABLED=true
VITE_MOBILE_FILTERS_ENABLED=true

# Development
VITE_DEBUG_MODE=false
VITE_PERFORMANCE_MONITORING=true
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in terminal)

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── admin/          # Admin interface components
│   ├── listings/       # Listing display components
│   ├── mobile-filters/ # Mobile-specific filters
│   └── layout/         # Layout components
├── pages/              # Route components
├── hooks/              # Custom React hooks (35+)
├── stores/             # Zustand state management
├── lib/                # Utilities and configurations
│   ├── ai/            # AI extraction system
│   └── supabase.ts    # Database client
├── types/              # TypeScript definitions
└── styles/             # Global styles

supabase/
├── functions/          # Edge Functions (14 total)
└── migrations/         # Database migrations

scripts/
├── archive/            # Utility scripts
└── prompt-manager/     # AI prompt management
```

## 🔧 Development Commands

### Core Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests with watch mode
npm run test:run     # Run tests once (CI mode)
```

### Deployment

```bash
# Deploy to staging
npm run staging:deploy

# Deploy Edge Functions
supabase functions deploy --all

# Deploy specific function
supabase functions deploy [function-name]
```

### AI & PDF Processing

```bash
# Test PDF extraction
npm run pdf:test

# Manage AI prompts
npm run prompts:list
npm run prompts:create
npm run prompts:update-id
```

## 🌟 Key Features Deep Dive

### AI Extraction System

The platform features a sophisticated AI-powered PDF extraction system:

- **Multi-Provider Support**: OpenAI GPT-3.5/4, Anthropic Claude
- **Secure Architecture**: API keys stored server-side in Edge Functions
- **Cost Management**: Budget controls and usage tracking
- **Brand Knowledge**: Specialized knowledge for Danish car brands
- **Variant Matching**: Intelligent matching against existing inventory

### Admin Interface

Comprehensive admin panel at `/admin` with:

- **Listing Management**: Full CRUD with bulk operations
- **Seller Management**: Dealer profiles and PDF configurations
- **Reference Data**: Makes, models, body types, fuel types
- **Extraction Sessions**: Review and apply AI extraction results
- **Lease Score Calculation**: Bulk scoring operations

### Background Removal (POC)

AI-powered background removal for vehicle images:

- **Route**: `/background-removal-poc`
- **Provider**: API4.ai integration
- **Features**: Upload → Preview → Process → Download

### Staging Environment

Complete staging infrastructure:

- **Separate Database**: Isolated Supabase project
- **Feature Flags**: Test features before production
- **Deployment Scripts**: Automated staging deployment
- **Cost Controls**: Limited AI budgets for testing

## 🗄️ Database Architecture

The application uses a streamlined PostgreSQL database:

### Core Tables (18 total)
- `listings` - Car listings with pricing
- `lease_pricing` - Lease offers
- `sellers` - Dealer information
- `makes`, `models` - Vehicle references
- Plus reference tables and AI/extraction tables

### Views
- `full_listing_view` - Primary denormalized view for queries
- `extraction_session_summary` - AI extraction statistics

### Recent Optimization
- Phase 3C completed (July 2025)
- 55-60% database complexity reduction
- Migration from legacy batch system to modern extraction sessions

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test path/to/test.tsx
```

### Coverage Requirements
- Functions: 90%
- Branches: 80%

## 🚀 Deployment

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel/Netlify**:
   - Connect GitHub repository
   - Set environment variables
   - Deploy from `main` branch

3. **Deploy Edge Functions**:
   ```bash
   supabase link --project-ref [project-id]
   supabase functions deploy --all
   ```

### Environment Variables

Required for production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Edge Function secrets (set in Supabase dashboard):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `API4AI_KEY`

## 📚 Documentation

### For Developers
- **CLAUDE.md**: Detailed development patterns and architecture
- **docs/archive/**: Specialized documentation for features

### Key Documentation
- AI System: `docs/archive/AI_EXTRACTION_SYSTEM.md`
- Admin Components: `docs/archive/ADMIN_COMPONENTS_REVIEW.md`
- Testing Guide: `docs/archive/TESTING_INSTRUCTIONS.md`
- Database Cleanup: `docs/DATABASE_CLEANUP_COMPREHENSIVE_PLAN.md`

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass
4. Update documentation
5. Submit a pull request

## 📄 License

[License information]

## 🆘 Support

For issues or questions:
- Check existing documentation
- Review `docs/archive/` for specialized topics
- Create an issue in the repository

---

Built with ❤️ for the Danish car leasing market