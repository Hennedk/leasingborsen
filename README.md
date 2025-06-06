# Leasingbørsen - Car Leasing Marketplace

> Modern Vue.js 3 application for Danish car leasing with 8 dynamic themes

## 🚀 Quick Start

```bash
npm install
npm run dev
npm run build
```

## 📚 Documentation System

| Document | Purpose |
|----------|---------|
| [**SOLUTIONS.md**](./SOLUTIONS.md) | Complete solution registry |
| [**CONTEXT.md**](./CONTEXT.md) | Architectural decisions |
| [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md) | Common issues & fixes |
| [**.cursorrules**](./.cursorrules) | AI assistant configuration |

## 🛠 Tech Stack

- **Vue.js 3** (Composition API) + **Vite 6.3.5**
- **Tailwind CSS 4** + **DaisyUI 5**
- **Supabase** (PostgreSQL + Real-time)
- **Danish Interface** (da-DK localization)

## 🎨 Key Features

- 8 Dynamic Themes (light, dark, corporate, business, synthwave, cyberpunk, fantasy, luxury)
- Comprehensive car listing search and filtering
- Mobile-first responsive design
- WCAG 2.1 AA accessibility compliance
- Optimized bundles (~109KB CSS, ~292KB JS)

## 🏗 Project Structure

```
src/
├── components/     # 17 reusable Vue components
├── pages/         # 5 route-level components  
├── router/        # Vue Router configuration
├── lib/           # Supabase client & utilities
└── assets/        # Global CSS & static assets
```

## 📋 Development Status

✅ **Completed**:
- Code cleanup & optimization (removed unused components)
- Tailwind CSS 4 + DaisyUI 5 integration
- 8-theme system with localStorage persistence
- Production-ready build pipeline
- Comprehensive documentation system

🔄 **Next Steps**:
- TypeScript migration
- Pinia state management
- Testing setup (Vitest)
- PWA features

## 🎯 Critical Constraints

- **DaisyUI 5**: Use classes directly in templates, NOT in `@apply` rules
- **Danish First**: All UI text in Danish with proper formatting
- **Performance**: Bundle size targets must be maintained
- **Accessibility**: WCAG 2.1 AA compliance required

Built with ❤️ for the Danish car leasing market
