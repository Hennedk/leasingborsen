# Leasingbørsen React Application

> **Modern React car leasing marketplace** with comprehensive admin interface

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)

---

## 🚀 Project Overview

Leasingbørsen is a production-ready car leasing marketplace built with modern React architecture. This application provides a comprehensive platform for browsing car listings, advanced filtering, mobile-responsive design, and a complete admin interface for managing listings, sellers, and reference data.

### ✨ Key Features

- **🔍 Advanced Search & Filtering** - Real-time filtering with URL persistence
- **📱 Mobile-First Design** - Responsive across all devices with feature parity
- **⚡ Performance Optimized** - Code splitting, lazy loading, and intelligent caching
- **🎨 Modern UI** - shadcn/ui components with Tailwind CSS
- **🌙 Theme System** - Multiple themes with light/dark mode support
- **🔒 Admin Interface** - Complete CRUD operations for all entities
- **🌍 Danish Localization** - Full da-DK language support
- **📊 Production Ready** - TypeScript strict mode, error boundaries, comprehensive testing

---

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Latest React with concurrent features
- **TypeScript** - Strict mode for type safety
- **Vite 6.3.5** - Lightning-fast build tool with HMR
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **React Router 6** - Client-side routing with lazy loading

### **Backend & Data**
- **Supabase** - PostgreSQL database with Row Level Security
- **React Query** - Server state management with intelligent caching
- **Zustand** - Lightweight client state management

### **Developer Experience**
- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting
- **Husky** - Git hooks for quality gates
- **TypeScript** - Static type checking

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** 8+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd leasingborsen-react-production

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📋 Available Scripts

```bash
# Development
npm run dev          # Start development server with HMR
npm run preview      # Preview production build locally

# Building
npm run build        # Build for production
npm run build:analyze # Build with bundle analysis

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run type-check   # Run TypeScript compiler check

# Testing
npm run test         # Run test suite (when implemented)
npm run test:watch   # Run tests in watch mode
```

---

## 🏗️ Project Architecture

### **Directory Structure**

```
src/
├── components/              # Reusable React components
│   ├── admin/              # Admin interface components
│   │   ├── AdminLayout.tsx # Admin layout wrapper
│   │   ├── DataTable.tsx   # Advanced data table
│   │   ├── ListingsTable.tsx # Listings management
│   │   └── form-sections/  # Modular form components
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   └── [feature]/          # Feature-specific components
├── hooks/                  # Custom React hooks
│   ├── useListings.ts      # Car listings data fetching
│   ├── useUrlSync.ts       # URL parameter synchronization
│   └── useMutations.ts     # Data mutation operations
├── pages/                  # Route-level components
│   ├── admin/              # Admin interface pages
│   └── [public]/           # Public-facing pages
├── stores/                 # Zustand state management
│   ├── filterStore.ts      # Search filter state
│   └── themeStore.ts       # Theme management
├── lib/                    # Utilities and configurations
│   ├── supabase.ts         # Supabase client setup
│   ├── utils.ts            # Utility functions
│   └── validations.ts      # Form validation schemas
└── types/                  # TypeScript type definitions
```

### **Key Components**

#### **Public Interface**
- **Home Page** - Hero banner with latest car listings
- **Listings Page** - Advanced search with filtering and sorting
- **Listing Detail** - Individual car information and contact
- **Filter System** - Real-time filtering with URL persistence

#### **Admin Interface**
- **Listings Management** - CRUD operations for car listings
- **Seller Management** - Seller profiles and contact information
- **Reference Data** - Makes, models, body types, fuel types
- **Image Upload** - Integrated image management system

---

## 🎨 Design System

### **Theme System**
The application supports multiple themes with instant switching:
- Light/Dark modes
- Custom color schemes
- Consistent component styling
- CSS variable-based theming

### **Component Library**
Built on shadcn/ui for consistency and accessibility:
- Form components (Input, Select, Button, etc.)
- Data display (Table, Card, Badge)
- Navigation (Dropdown, Dialog, Toast)
- Layout (Container, Grid, Flex)

### **Responsive Design**
Mobile-first approach with breakpoints:
- `sm`: 640px and up
- `md`: 768px and up  
- `lg`: 1024px and up
- `xl`: 1280px and up

---

## 📊 Performance

### **Optimization Features**
- **Code Splitting** - Route-based lazy loading
- **Image Optimization** - Progressive loading with intersection observer
- **Caching Strategy** - Intelligent React Query caching
- **Bundle Analysis** - Webpack bundle analyzer integration

### **Build Targets**
- **CSS Bundle**: ~109KB (optimized with tree-shaking)
- **JavaScript**: ~292KB (with code splitting)
- **Loading Performance** - First Contentful Paint < 1.5s

### **Core Web Vitals**
- **LCP** - Largest Contentful Paint optimization
- **FID** - First Input Delay minimization  
- **CLS** - Cumulative Layout Shift prevention

---

## 🔒 Admin Interface

### **Authentication & Authorization**
- Role-based access control
- Secure admin routes
- Session management

### **Features**
- **Car Listings** - Complete CRUD with advanced forms
- **Seller Management** - Contact and company information
- **Reference Data** - Manage makes, models, categories
- **Image Upload** - Drag-and-drop with progress tracking
- **Data Tables** - Sorting, filtering, bulk operations
- **Form Validation** - Real-time validation with error handling

### **Access**
Admin interface available at `/admin` (requires authentication)

---

## 🌍 Internationalization

### **Danish Localization (da-DK)**
- All UI text in Danish
- Date/time formatting: `dd/mm/yyyy`
- Number formatting: `1.234,56 kr`
- Currency: Danish Kroner (DKK)

### **Error Messages**
Comprehensive Danish error messages:
- Form validation errors
- Network connectivity issues
- Database operation failures
- User-friendly fallbacks

---

## 🧪 Testing Strategy

### **Testing Framework** (Planned)
- **Vitest** - Fast unit test runner
- **React Testing Library** - Component testing
- **MSW** - API mocking
- **Playwright** - End-to-end testing

### **Coverage Targets**
- Unit tests: >90% coverage
- Integration tests: Critical user flows
- E2E tests: Complete user journeys

---

## 🚀 Deployment

### **Production Build**
```bash
npm run build
```

### **Environment Configuration**
- Development: `.env.local`
- Staging: `.env.staging` 
- Production: `.env.production`

### **Deployment Platforms**
- **Vercel** - Recommended for easy React deployment
- **Netlify** - Alternative with edge functions
- **Self-hosted** - Docker containerization available

---

## 📚 Documentation

### **Additional Resources**
- **[Development History](./DEVELOPMENT_HISTORY.md)** - Complete project timeline
- **[Admin Review](./ADMIN_REVIEW.md)** - Admin interface analysis
- **[Claude Instructions](./CLAUDE.md)** - Development guidelines
- **[Session Summary](./SESSION_SUMMARY.md)** - Latest development session
- **[Archived Docs](./docs/archive/)** - Historical documentation

### **API Documentation**
- Supabase schema documentation
- Database relationship diagrams
- API endpoint specifications

---

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### **Code Standards**
- Follow TypeScript strict mode
- Use Danish for all user-facing text
- Implement proper error handling
- Add comprehensive tests
- Follow component naming conventions

### **Commit Message Format**
```
type(scope): description

feat(admin): add seller management interface
fix(filters): resolve mobile filter overlay issue
docs(readme): update installation instructions
```

---

## 📄 License

This project is proprietary. All rights reserved.

---

## 📞 Support

For questions or support:
- **Documentation**: Check the docs/ directory
- **Issues**: Report bugs through the issue tracker
- **Development**: Follow the contributing guidelines

---

**Built with ❤️ using modern React best practices**