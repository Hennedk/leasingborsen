# Leasingbørsen Project Overview

## Purpose
Leasingbørsen is a production-ready car leasing marketplace built with modern React architecture. It provides a comprehensive platform for browsing car listings, advanced filtering, mobile-responsive design, and a complete admin interface for managing listings, sellers, and reference data.

## Technology Stack

### Frontend
- **React 18** with TypeScript (strict mode)
- **Vite 6.3.5** - Build tool with HMR
- **Tailwind CSS 4** + **shadcn/ui** components
- **React Router 6** with lazy loading
- **Zustand** for global state management
- **React Query** for server state management

### Backend & Data
- **Supabase** - PostgreSQL database with Row Level Security
- **FastAPI** (Railway deployment) - PDF processing service

### Key Features
- Advanced search & filtering with URL persistence
- Mobile-first responsive design
- Performance optimized (code splitting, lazy loading)
- Danish localization (da-DK)
- Complete admin interface for CRUD operations
- PDF extraction service for Toyota car listings

## Development Environment
- Node.js 18+
- Danish language focus (all UI text in Danish)
- Environment variables in .env.local for local development