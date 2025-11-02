# Dev Pages Quick Reference

## Visual Structure Comparison

### Hub & Docs Pages (Hero Pattern)
```
┌─────────────────────────────────────────┐
│ DevLayout Global Nav (sticky)           │
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐│
│ │ HERO SECTION (gradient bg)            ││
│ │ - Title                               ││
│ │ - Description                         ││
│ │ - CTA Buttons                         ││
│ └───────────────────────────────────────┘│
├─────────────────────────────────────────┤
│ MAIN CONTENT                            │
│ ┌─────────────────────────────────────┐ │
│ │ Section 1 (Grid Layout)             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Section 2 (Grid Layout)             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Section 3 (Grid Layout)             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Forms/Layouts/Spacing Pages (Header Pattern)
```
┌─────────────────────────────────────────┐
│ CUSTOM STICKY HEADER (hides global nav) │
│ [Back] | Title + Subtitle               │
├─────────────────────────────────────────┤
│ MAIN CONTENT                            │
│ ┌─────────────────────────────────────┐ │
│ │ ExampleSection 1                    │ │
│ │ - Title + Description               │ │
│ │ - Example + Code tabs               │ │
│ │ - BeforeAfter if needed             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ExampleSection 2                    │ │
│ └─────────────────────────────────────┘ │
│ ... more sections ...                   │
├─────────────────────────────────────────┤
│ FOOTER                                  │
│ [Learn more: Link to Doc]               │
└─────────────────────────────────────────┘
```

### Components Page (Minimal Pattern)
```
┌─────────────────────────────────────────┐
│ DevLayout Global Nav (sticky)           │
├─────────────────────────────────────────┤
│ ComponentShowcase (dynamically loaded)  │
│ 787 lines of component examples         │
└─────────────────────────────────────────┘
```

---

## Page Inventory

### Pages Analyzed
1. `/dev/page.tsx` - Design System Hub
2. `/dev/components/page.tsx` - Component Showcase
3. `/dev/forms/page.tsx` - Form Patterns
4. `/dev/layouts/page.tsx` - Layout Patterns
5. `/dev/spacing/page.tsx` - Spacing Patterns
6. `/dev/docs/page.tsx` - Documentation Hub
7. `/dev/docs/design-system/[...slug]/page.tsx` - Dynamic Doc Pages

---

## Key Findings

### What's Duplicated
- **Custom Sticky Headers** (40 lines × 3 pages = 120 lines)
  - Forms page header
  - Layouts page header
  - Spacing page header
  
- **Custom Footers** (8 lines × 3 pages = 24 lines)
  - Forms page footer
  - Layouts page footer
  - Spacing page footer

**Total Duplication: 144 lines**

### What's Missing
- Breadcrumb navigation (all pages)
- Consistent page titles (only hero/header based)
- Footers on half the pages
- Consistent component loading patterns

### What's Inconsistent
1. Header implementation (custom vs inherited)
2. Page title display (hero vs header vs frontmatter)
3. Footer presence (3 pages yes, 4 pages no)
4. Page wrapper structure (min-h-screen vs not)
5. Content padding (py-12 vs py-8)
6. 'use client' directive (Forms only)
7. Dynamic imports (Components & Spacing only)

---

## Component Architecture

### Current Dev Components
```
/src/components/dev/
├── DevLayout.tsx         - Global layout wrapper (14KB)
├── Example.tsx           - Example container with tabs (5KB)
├── BeforeAfter.tsx       - Before/after comparison
├── CodeSnippet.tsx       - Code syntax highlighting
└── ComponentShowcase.tsx  - 787-line component gallery
```

### Proposed New Components
```
/src/components/dev/
├── DevPageHeader.tsx     - Shared page header with back button
├── DevBreadcrumbs.tsx    - Navigation breadcrumbs
├── DevPageFooter.tsx     - Shared footer with doc links
├── DevPageLayout.tsx     - Complete page wrapper
└── ExampleLoadingSkeleton.tsx - Consistent loading state
```

---

## Page Usage Matrix

### What Each Page Actually Has
```
                Hub Comp Forms Layout Spacing Docs DocsDyn
'use client'     ·   ·     ✓     ·     ·       ·    ·
Custom Header    ·   ·     ✓     ✓     ✓       ·    ·
Back Button      ·   ·     ✓     ✓     ✓       ·    ·
Page Title       H   ·     H     H     H       H    FM
Breadcrumbs      ·   ·     ·     ·     ·       ·    ·
Hero Section     ✓   ·     ·     ·     ·       ✓    ·
Footer           ·   ·     ✓     ✓     ✓       ·    ·
ExampleSection   ·   ·     ✓     ✓     ✓       ·    ·
BeforeAfter      ·   ·     ✓     ✓     ✓       ·    ·
Dynamic Imports  ·   ✓     ·     ·     ✓       ·    ·
Code Duplication Low Low   High  High  High    Low  Low

Legend:
✓ = Has it
· = Doesn't have it
H = Hero section
FM = Frontmatter
```

### What Each Page Should Have (Target)
```
                Hub Comp Forms Layout Spacing Docs DocsDyn
'use client'     ·   ·     ✓     ·     ·       ·    ·
Custom Header    ·   ·     ✗     ✗     ✗       ·    ·
Back Button      ·   ✓     ✓     ✓     ✓       ·    ✓
Page Title       H   ✓     ✓     ✓     ✓       H    FM
Breadcrumbs      ·   ✓     ✓     ✓     ✓       ·    ✓
Hero Section     ✓   ·     ·     ·     ·       ✓    ·
Footer           FTR FTR   ✓     ✓     ✓       FTR  FTR
ExampleSection   ·   ·     ✓     ✓     ✓       ·    ·
BeforeAfter      ·   ·     ✓     ✓     ✓       ·    ·
Dynamic Imports  ·   ✓     ·     ·     ✓       ·    ·
Code Duplication Red Red   Green Green Green   Red  Red

Legend:
✓ = Add/Keep
✗ = Remove
FTR = Use footer component
Red = Needs attention
Green = Ready
```

---

## Implementation Roadmap

### Phase 1: Extract Components (1-2 hours)
1. Create `DevPageHeader.tsx` - shared header
2. Create `DevPageFooter.tsx` - shared footer
3. Create `DevPageLayout.tsx` - wrapper component
4. Create `DevBreadcrumbs.tsx` - breadcrumb nav

### Phase 2: Refactor Pages (2-3 hours)
1. Update Forms page - remove custom header, use DevPageLayout
2. Update Layouts page - remove custom header, use DevPageLayout
3. Update Spacing page - remove custom header, use DevPageLayout
4. Update Components page - add breadcrumbs & footer

### Phase 3: Enhance (1-2 hours)
1. Add breadcrumbs to all non-hub pages
2. Standardize dynamic imports
3. Add consistent loading skeletons
4. Update Hub/Docs footers

### Phase 4: Polish (30-60 min)
1. Add Table of Contents to long pages
2. Improve mobile responsiveness
3. Test navigation flow
4. Verify accessibility

**Total Effort: 4-8 hours**

---

## Code Examples

### Before (Duplicated Header)
```typescript
// /dev/forms/page.tsx
export default function FormsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link href="/dev">
            <Button variant="ghost" size="icon">
              <ArrowLeft />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Form Patterns</h1>
            <p className="text-sm text-muted-foreground">
              react-hook-form + Zod examples
            </p>
          </div>
        </div>
      </header>
      <main>...</main>
      <footer className="mt-16 border-t py-6">
        <Link href="/dev/docs/design-system/06-forms">
          Forms Documentation
        </Link>
      </footer>
    </div>
  );
}
```

### After (Using Components)
```typescript
// /dev/forms/page.tsx
import { DevPageLayout } from '@/components/dev/DevPageLayout';
import { ExampleSection } from '@/components/dev/Example';

export default function FormsPage() {
  return (
    <DevPageLayout
      title="Form Patterns"
      subtitle="react-hook-form + Zod examples"
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
        <ExampleSection
          title="Basic Form"
          description="..."
        >
          {/* Content */}
        </ExampleSection>
      </div>
    </DevPageLayout>
  );
}
```

**Savings: 40 lines of code per page × 3 pages = 120 lines**

---

## Testing Checklist

After implementation:
- [ ] All pages display breadcrumbs (except Hub)
- [ ] All pages have page titles visible
- [ ] All pages have footers with doc links (or no links for hubs)
- [ ] Back button works on all detail pages
- [ ] Global nav is consistent across pages
- [ ] Mobile navigation works properly
- [ ] Dynamic imports show loading states
- [ ] No console errors or warnings

---

## Files to Create/Modify

### Create
- `src/components/dev/DevPageHeader.tsx` (NEW)
- `src/components/dev/DevBreadcrumbs.tsx` (NEW)
- `src/components/dev/DevPageFooter.tsx` (NEW)
- `src/components/dev/DevPageLayout.tsx` (NEW)

### Modify
- `src/app/dev/components/page.tsx`
- `src/app/dev/forms/page.tsx`
- `src/app/dev/layouts/page.tsx`
- `src/app/dev/spacing/page.tsx`
- `src/app/dev/page.tsx` (footer)
- `src/app/dev/docs/page.tsx` (footer)
- `src/app/dev/docs/design-system/[...slug]/page.tsx` (footer)

### Keep As-Is
- `src/app/dev/layout.tsx`
- `src/components/dev/DevLayout.tsx`
- `src/components/dev/Example.tsx`
- `src/components/dev/BeforeAfter.tsx`
- `src/components/dev/CodeSnippet.tsx`
- `src/components/dev/ComponentShowcase.tsx`

---

## Metrics

### Code Duplication
- **Current:** 144 lines duplicated
- **After:** 0 lines duplicated

### File Complexity
- **Current:** 7 pages with inconsistent patterns
- **After:** 7 pages with consistent patterns

### Component Count
- **Current:** 6 components
- **After:** 10 components (adding 4 reusable pieces)

### Bundle Size Impact
- **Estimate:** +2-3KB for new components
- **Offset by:** Removing 144 lines of duplicated code

---

## Related Documentation

For more details, see:
- `/workdrive/workspace/Projects/HomeLab/fast-next-template/DEV_PAGES_STRUCTURE_ANALYSIS.md` - Full technical analysis
- `/workdrive/workspace/Projects/HomeLab/fast-next-template/frontend/docs/design-system/` - Design system docs
- `/workdrive/workspace/Projects/HomeLab/fast-next-template/CLAUDE.md` - Project guidelines

