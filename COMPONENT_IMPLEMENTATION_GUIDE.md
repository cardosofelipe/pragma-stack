# Component Implementation Guide

This document provides detailed code for implementing the proposed dev page components.

## 1. DevPageHeader Component

**File:** `src/components/dev/DevPageHeader.tsx`

```typescript
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DevPageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
}

/**
 * DevPageHeader
 * Shared sticky header for detail pages with optional back button
 * 
 * Replaces duplicated headers in forms, layouts, and spacing pages
 * 
 * @example
 * <DevPageHeader
 *   title="Form Patterns"
 *   subtitle="react-hook-form + Zod examples"
 *   showBackButton
 *   backHref="/dev"
 * />
 */
export function DevPageHeader({
  title,
  subtitle,
  showBackButton = false,
  backHref = '/dev',
}: DevPageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {showBackButton && (
          <Link href={backHref}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to previous page"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
```

---

## 2. DevBreadcrumbs Component

**File:** `src/components/dev/DevBreadcrumbs.tsx`

```typescript
'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface DevBreadcrumbsProps {
  items: Breadcrumb[];
  className?: string;
}

/**
 * DevBreadcrumbs
 * Breadcrumb navigation for showing page hierarchy
 * 
 * @example
 * <DevBreadcrumbs
 *   items={[
 *     { label: 'Hub', href: '/dev' },
 *     { label: 'Forms' }
 *   ]}
 * />
 */
export function DevBreadcrumbs({ items, className }: DevBreadcrumbsProps) {
  return (
    <nav
      className={cn('bg-muted/30 border-b px-4 py-2', className)}
      aria-label="Breadcrumb"
    >
      <ol className="container mx-auto flex items-center gap-2 text-sm">
        {/* Home link */}
        <li>
          <Link
            href="/dev"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {/* Breadcrumb items */}
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {item.href ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

---

## 3. DevPageFooter Component

**File:** `src/components/dev/DevPageFooter.tsx`

```typescript
import Link from 'next/link';

interface DevPageFooterProps {
  documentationLink?: {
    label: string;
    href: string;
  };
}

/**
 * DevPageFooter
 * Shared footer for dev pages with optional documentation link
 * 
 * @example
 * <DevPageFooter
 *   documentationLink={{
 *     label: 'Forms Documentation',
 *     href: '/dev/docs/design-system/06-forms'
 *   }}
 * />
 */
export function DevPageFooter({ documentationLink }: DevPageFooterProps) {
  return (
    <footer className="mt-16 border-t py-6">
      <div className="container mx-auto px-4">
        {documentationLink ? (
          <p className="text-center text-sm text-muted-foreground">
            Learn more:{' '}
            <Link
              href={documentationLink.href}
              className="font-medium hover:text-foreground transition-colors"
            >
              {documentationLink.label}
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Part of the FastNext Design System
          </p>
        )}
      </div>
    </footer>
  );
}
```

---

## 4. DevPageLayout Component

**File:** `src/components/dev/DevPageLayout.tsx`

```typescript
import { ReactNode } from 'react';
import { DevPageHeader } from './DevPageHeader';
import { DevBreadcrumbs } from './DevBreadcrumbs';
import { DevPageFooter } from './DevPageFooter';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface DocumentationLink {
  label: string;
  href: string;
}

interface DevPageLayoutProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  showBackButton?: boolean;
  backHref?: string;
  footer?: DocumentationLink | boolean;
  children: ReactNode;
  className?: string;
}

/**
 * DevPageLayout
 * Complete page layout wrapper for dev pages
 * 
 * Combines header, breadcrumbs, main content, and footer
 * 
 * @example
 * <DevPageLayout
 *   title="Form Patterns"
 *   subtitle="Complete form examples"
 *   breadcrumbs={[
 *     { label: 'Hub', href: '/dev' },
 *     { label: 'Forms' }
 *   ]}
 *   footer={{
 *     label: 'Forms Documentation',
 *     href: '/dev/docs/design-system/06-forms'
 *   }}
 *   showBackButton
 * >
 *   {/* Page content */}
 * </DevPageLayout>
 */
export function DevPageLayout({
  title,
  subtitle,
  breadcrumbs,
  showBackButton = false,
  backHref = '/dev',
  footer,
  children,
  className,
}: DevPageLayoutProps) {
  // Determine footer configuration
  let footerLink: DocumentationLink | undefined;
  if (typeof footer === 'object' && footer !== null) {
    footerLink = footer;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs (optional) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <DevBreadcrumbs items={breadcrumbs} />
      )}

      {/* Page Header (optional) */}
      {title && (
        <DevPageHeader
          title={title}
          subtitle={subtitle}
          showBackButton={showBackButton}
          backHref={backHref}
        />
      )}

      {/* Main Content */}
      <main className={cn('container mx-auto px-4 py-8', className)}>
        {children}
      </main>

      {/* Footer */}
      {footer !== false && <DevPageFooter documentationLink={footerLink} />}
    </div>
  );
}
```

---

## 5. ExampleLoadingSkeleton Component

**File:** `src/components/dev/ExampleLoadingSkeleton.tsx`

```typescript
import { cn } from '@/lib/utils';

interface ExampleLoadingSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * ExampleLoadingSkeleton
 * Loading placeholder for dynamically imported example components
 * 
 * @example
 * const Example = dynamic(() => import('@/components/dev/Example'), {
 *   loading: () => <ExampleLoadingSkeleton />,
 * });
 */
export function ExampleLoadingSkeleton({
  count = 1,
  className,
}: ExampleLoadingSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse space-y-4 rounded-lg border p-6"
        >
          {/* Title skeleton */}
          <div className="h-6 w-48 rounded bg-muted" />

          {/* Description skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>

          {/* Content skeleton */}
          <div className="h-32 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Example Page Refactoring

### Forms Page (BEFORE)

```typescript
export default function FormsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ... rest of state

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link href="/dev">
            <Button variant="ghost" size="icon" aria-label="Back to hub">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Form Patterns</h1>
            <p className="text-sm text-muted-foreground">
              react-hook-form + Zod validation examples
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Content sections */}
      </main>

      <footer className="mt-16 border-t py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Learn more:{' '}
            <Link
              href="/dev/docs/design-system/06-forms"
              className="font-medium hover:text-foreground"
            >
              Forms Documentation
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
```

### Forms Page (AFTER)

```typescript
'use client';

import { useState } from 'react';
import { DevPageLayout } from '@/components/dev/DevPageLayout';
import { ExampleSection } from '@/components/dev/Example';
import { BeforeAfter } from '@/components/dev/BeforeAfter';
// ... other imports

export default function FormsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ... rest of state

  return (
    <DevPageLayout
      title="Form Patterns"
      subtitle="react-hook-form + Zod validation examples"
      breadcrumbs={[
        { label: 'Hub', href: '/dev' },
        { label: 'Forms' }
      ]}
      footer={{
        label: 'Forms Documentation',
        href: '/dev/docs/design-system/06-forms'
      }}
      showBackButton
    >
      <div className="space-y-12">
        {/* Content sections remain the same */}
      </div>
    </DevPageLayout>
  );
}
```

---

## 7. Updated Component Imports

### Update Example.tsx exports (if extracting ExampleSection)

```typescript
// src/components/dev/Example.tsx

export function Example({ ... }) { ... }
export function ExampleGrid({ ... }) { ... }
export function ExampleSection({ ... }) { ... }
export { ExampleLoadingSkeleton } from './ExampleLoadingSkeleton';
```

### Update spacing/page.tsx dynamic imports

```typescript
import dynamic from 'next/dynamic';
import { ExampleLoadingSkeleton } from '@/components/dev/ExampleLoadingSkeleton';

const Example = dynamic(
  () => import('@/components/dev/Example').then((mod) => ({ 
    default: mod.Example 
  })),
  { loading: () => <ExampleLoadingSkeleton /> }
);

const ExampleSection = dynamic(
  () => import('@/components/dev/Example').then((mod) => ({ 
    default: mod.ExampleSection 
  })),
  { loading: () => <ExampleLoadingSkeleton /> }
);

const BeforeAfter = dynamic(
  () => import('@/components/dev/BeforeAfter').then((mod) => ({ 
    default: mod.BeforeAfter 
  })),
  { loading: () => <ExampleLoadingSkeleton /> }
);
```

---

## 8. Implementation Checklist

### Step 1: Create New Components
- [ ] Create `DevPageHeader.tsx`
- [ ] Create `DevBreadcrumbs.tsx`
- [ ] Create `DevPageFooter.tsx`
- [ ] Create `DevPageLayout.tsx`
- [ ] Create `ExampleLoadingSkeleton.tsx`

### Step 2: Update Forms Page
- [ ] Import `DevPageLayout`
- [ ] Remove custom header
- [ ] Remove custom footer
- [ ] Wrap content with `DevPageLayout`
- [ ] Add breadcrumbs config
- [ ] Test navigation and styling

### Step 3: Update Layouts Page
- [ ] Import `DevPageLayout`
- [ ] Remove custom header
- [ ] Remove custom footer
- [ ] Wrap content with `DevPageLayout`
- [ ] Add breadcrumbs config
- [ ] Test navigation and styling

### Step 4: Update Spacing Page
- [ ] Import `DevPageLayout`
- [ ] Remove custom header
- [ ] Remove custom footer
- [ ] Update dynamic imports to use `ExampleLoadingSkeleton`
- [ ] Wrap content with `DevPageLayout`
- [ ] Add breadcrumbs config
- [ ] Test navigation and styling

### Step 5: Update Components Page
- [ ] Import `DevPageLayout` and `DevBreadcrumbs`
- [ ] Add breadcrumbs
- [ ] Add footer with doc link
- [ ] Update dynamic import to use `ExampleLoadingSkeleton`
- [ ] Test navigation and styling

### Step 6: Update Hub Page
- [ ] Import `DevPageFooter`
- [ ] Add footer component
- [ ] Test styling

### Step 7: Update Docs Page
- [ ] Import `DevPageFooter`
- [ ] Add footer component
- [ ] Test styling

### Step 8: Update Dynamic Docs Page
- [ ] Import `DevPageLayout` or `DevPageFooter`
- [ ] Add breadcrumbs
- [ ] Add footer
- [ ] Test navigation

### Step 9: Testing
- [ ] All pages have consistent headers
- [ ] Breadcrumbs display correctly
- [ ] Back buttons work
- [ ] Footers are present and styled
- [ ] Mobile responsiveness intact
- [ ] No console errors

---

## Usage Examples

### Simple Detail Page (Forms/Layouts/Spacing)

```typescript
<DevPageLayout
  title="Form Patterns"
  subtitle="Complete form examples"
  breadcrumbs={[
    { label: 'Hub', href: '/dev' },
    { label: 'Forms' }
  ]}
  footer={{
    label: 'Forms Documentation',
    href: '/dev/docs/design-system/06-forms'
  }}
  showBackButton
>
  <div className="space-y-12">
    {/* Your content */}
  </div>
</DevPageLayout>
```

### Hub Page (with footer only)

```typescript
<DevPageLayout footer={false}>
  {/* Hero section */}
  {/* Content sections */}
</DevPageLayout>
```

### With Breadcrumbs Only

```typescript
<DevPageLayout
  breadcrumbs={[
    { label: 'Docs', href: '/dev/docs' },
    { label: 'Forms' }
  ]}
>
  {/* Content */}
</DevPageLayout>
```

---

## Migration Summary

| Page | Changes |
|------|---------|
| Forms | Remove header/footer, add DevPageLayout |
| Layouts | Remove header/footer, add DevPageLayout |
| Spacing | Remove header/footer, add DevPageLayout, update imports |
| Components | Add breadcrumbs/footer, update imports |
| Hub | Add DevPageFooter |
| Docs | Add DevPageFooter |
| Docs Dynamic | Add DevPageLayout with breadcrumbs |

---

## Testing Commands

```bash
# Type check
npm run type-check

# Lint
npm run lint

# E2E tests
npm run test:e2e

# Build
npm run build
```

