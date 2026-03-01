# PragmaStack - Frontend

Production-ready Next.js 16 frontend with TypeScript, authentication, admin panel, and internationalization.

## Features

### Core

- ⚡ **Next.js 16** - App Router with React Server Components
- 📘 **TypeScript** - Full type safety
- 🎨 **Tailwind CSS** - Utility-first styling
- 🧩 **shadcn/ui** - High-quality component library
- 🌙 **Dark Mode** - System-aware theme switching

### Authentication & Security

- 🔐 **JWT Authentication** - Access & refresh token flow
- 🔒 **Protected Routes** - Client-side route guards
- 👤 **User Management** - Profile settings, password change
- 📱 **Session Management** - Multi-device session tracking

### Internationalization (i18n)

- 🌍 **Multi-language Support** - English & Italian (easily extensible)
- 🔗 **Locale Routing** - SEO-friendly URLs (`/en/login`, `/it/login`)
- 🎯 **Type-safe Translations** - TypeScript autocomplete for keys
- 📄 **Localized Metadata** - SEO-optimized meta tags per locale
- 🗺️ **Multilingual Sitemap** - Automatic sitemap generation with hreflang

### Admin Panel

- 👥 **User Administration** - Full lifecycle operations, search, filters
- 🏢 **Organization Management** - Multi-tenant support with roles
- 📊 **Dashboard** - Statistics and quick actions
- 🔍 **Advanced Filtering** - Status, search, pagination

### Developer Experience

- ✅ **Comprehensive Testing** - 1,142+ unit tests, 178+ E2E tests
- 🎭 **Playwright** - End-to-end testing with fixtures
- 🧪 **Jest** - Fast unit testing with coverage
- 📝 **ESLint & Prettier** - Code quality enforcement
- 🔍 **TypeScript** - Strict mode enabled

## Getting Started

### Prerequisites

- Node.js 18+
- [Bun](https://bun.sh/) (recommended runtime & package manager)

### Installation

```bash
# Install dependencies
bun install

# Run development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Scripts

```bash
# Development
bun run dev          # Start dev server
bun run build        # Production build
bun run start        # Start production server

# Code Quality
bun run lint         # Run ESLint
bun run format       # Format with Prettier
bun run format:check # Check formatting
bun run type-check   # TypeScript type checking
bun run validate     # Run all checks (lint + format + type-check)

# Testing
bun run test             # Run unit tests
bun run test:watch   # Watch mode
bun run test:coverage # Coverage report
bun run test:e2e     # Run E2E tests
bun run test:e2e:ui  # Playwright UI mode

# API Client
bun run generate:api # Generate TypeScript client from OpenAPI spec
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # Locale-specific routes
│   │   │   ├── (auth)/         # Auth pages (login, register)
│   │   │   ├── (authenticated)/ # Protected pages
│   │   │   ├── admin/          # Admin panel
│   │   │   └── layout.tsx      # Locale layout
│   │   ├── sitemap.ts          # Multilingual sitemap
│   │   └── robots.ts           # SEO robots.txt
│   ├── components/             # React components
│   │   ├── auth/               # Auth components
│   │   ├── admin/              # Admin components
│   │   ├── forms/              # Form utilities
│   │   ├── navigation/         # Navigation (Header, LocaleSwitcher)
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/                    # Utilities & configuration
│   │   ├── api/                # API client (auto-generated)
│   │   ├── auth/               # Auth utilities & storage
│   │   ├── i18n/               # Internationalization
│   │   │   ├── routing.ts      # Locale routing config
│   │   │   ├── utils.ts        # Locale utilities
│   │   │   └── metadata.ts     # SEO metadata helpers
│   │   └── stores/             # Zustand state management
│   └── hooks/                  # Custom React hooks
├── messages/                   # Translation files
│   ├── en.json                 # English
│   └── it.json                 # Italian
├── e2e/                        # Playwright E2E tests
├── tests/                      # Jest unit tests
├── docs/                       # Documentation
│   ├── I18N.md                 # i18n guide
│   └── design-system/          # Design system docs
└── types/                      # TypeScript type definitions
```

## Internationalization (i18n)

The app supports multiple languages with SEO-optimized routing.

### Supported Languages

- 🇬🇧 English (default)
- 🇮🇹 Italian

### Usage

```typescript
// Client components
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('namespace');
  return <h1>{t('title')}</h1>;
}

// Server components
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('namespace');
  return <h1>{t('title')}</h1>;
}

// Navigation (always use locale-aware routing)
import { Link, useRouter } from '@/lib/i18n/routing';

<Link href="/dashboard">Dashboard</Link>  // → /en/dashboard
```

### Adding New Languages

1. Create translation file: `messages/fr.json`
2. Update `src/lib/i18n/routing.ts`: Add `'fr'` to locales
3. Update `src/lib/i18n/metadata.ts`: Add `'fr'` to Locale type
4. Update `LocaleSwitcher` component with locale name

See [docs/I18N.md](./docs/I18N.md) for complete guide.

## Testing

### Unit Tests (Jest)

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Coverage
bun run test:coverage
```

**Coverage**: 1,142+ tests covering components, hooks, utilities, and pages.

### E2E Tests (Playwright)

```bash
# Run E2E tests
bun run test:e2e

# UI mode (recommended for debugging)
bun run test:e2e:ui

# Debug mode
bun run test:e2e:debug
```

**Coverage**: 178+ tests covering authentication, navigation, admin panel, and user flows.

## Documentation

- [Internationalization Guide](./docs/I18N.md) - Complete i18n implementation guide
- [Design System](./docs/design-system/) - Component library and patterns
- [Implementation Plan](./docs/I18N_IMPLEMENTATION_PLAN.md) - i18n implementation details

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3 + shadcn/ui
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **i18n**: next-intl 4.5.3
- **Testing**: Jest + Playwright
- **Code Quality**: ESLint + Prettier

## Performance

- ⚡ Server Components for optimal loading
- 🎨 Font optimization with `display: 'swap'`
- 📦 Code splitting with dynamic imports
- 🗜️ Automatic bundle optimization
- 🌐 Lazy loading of locale messages
- 🖼️ Image optimization with next/image

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow existing code patterns
2. Write tests for new features
3. Run `bun run validate` before committing
4. Keep translations in sync (en.json & it.json)

## License

MIT License - see LICENSE file for details

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
