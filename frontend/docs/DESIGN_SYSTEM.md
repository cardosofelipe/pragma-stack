# FastNext Template Design System

**Version**: 1.0
**Last Updated**: November 2, 2025
**Theme**: Modern Minimal (via [tweakcn.com](https://tweakcn.com))
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Shadows](#shadows)
6. [Border Radius](#border-radius)
7. [Components](#components)
8. [Dark Mode](#dark-mode)
9. [Accessibility](#accessibility)
10. [Best Practices](#best-practices)

---

## Overview

This design system is built on **shadcn/ui** component library with **Tailwind CSS 4**, using the **OKLCH color space** for superior perceptual uniformity and accessibility.

### Technology Stack

- **Framework**: Next.js 15 + React 19
- **Styling**: Tailwind CSS 4 (CSS-first configuration)
- **Components**: shadcn/ui (New York style)
- **Color Space**: OKLCH
- **Icons**: lucide-react
- **Fonts**: Geist Sans + Geist Mono

### Design Principles

1. **Minimal & Clean** - Simple, uncluttered interfaces
2. **Accessible First** - WCAG AA compliance minimum
3. **Consistent** - Predictable patterns across the application
4. **Performant** - Optimized for speed and efficiency
5. **Responsive** - Mobile-first approach

---

## Color System

Our color system uses **OKLCH** (Oklab LCH) color space for:
- Perceptual uniformity across light and dark modes
- Better accessibility with predictable contrast
- More vibrant colors without sacrificing legibility

### Semantic Color Tokens

All colors follow the **background/foreground** convention:
- `background` - The background color
- `foreground` - The text color on that background

#### Primary Colors

**Purpose**: Main brand color, CTAs, primary actions

```css
Light: --primary: oklch(0.6231 0.1880 259.8145)        /* Blue */
Dark:  --primary: oklch(0.6231 0.1880 259.8145)        /* Same blue */
```

**Usage**:
```tsx
<Button>Primary Action</Button>
<a href="#" className="text-primary">Link</a>
```

#### Secondary Colors

**Purpose**: Secondary actions, less prominent UI elements

```css
Light: --secondary: oklch(0.9670 0.0029 264.5419)      /* Light gray-blue */
Dark:  --secondary: oklch(0.2686 0 0)                  /* Dark gray */
```

#### Muted Colors

**Purpose**: Backgrounds for disabled states, subtle UI elements

```css
Light: --muted: oklch(0.9846 0.0017 247.8389)
Dark:  --muted: oklch(0.2393 0 0)
```

**Usage**:
- Disabled button backgrounds
- Skeleton loaders
- TabsList backgrounds
- Switch backgrounds (unchecked)

#### Accent Colors

**Purpose**: Hover states, focus indicators, highlights

```css
Light: --accent: oklch(0.9514 0.0250 236.8242)
Dark:  --accent: oklch(0.3791 0.1378 265.5222)
```

**Usage**:
```tsx
<DropdownMenuItem className="focus:bg-accent">Item</DropdownMenuItem>
```

#### Destructive Colors

**Purpose**: Error states, delete actions, warnings

```css
Light: --destructive: oklch(0.6368 0.2078 25.3313)     /* Red */
Dark:  --destructive: oklch(0.6368 0.2078 25.3313)     /* Same red */
```

**Usage**:
```tsx
<Button variant="destructive">Delete</Button>
<Alert variant="destructive">Error message</Alert>
```

#### Card & Popover

**Purpose**: Elevated surfaces (cards, popovers, dropdowns)

```css
Light: --card: oklch(1.0000 0 0)                       /* White */
Dark:  --card: oklch(0.2686 0 0)                       /* Dark gray */

Light: --popover: oklch(1.0000 0 0)                    /* White */
Dark:  --popover: oklch(0.2686 0 0)                    /* Dark gray */
```

#### Border & Input

**Purpose**: Borders, input field borders

```css
Light: --border: oklch(0.9276 0.0058 264.5313)
Dark:  --border: oklch(0.3715 0 0)

Light: --input: oklch(0.9276 0.0058 264.5313)
Dark:  --input: oklch(0.3715 0 0)
```

#### Focus Ring

**Purpose**: Focus indicators for keyboard navigation

```css
Light: --ring: oklch(0.6231 0.1880 259.8145)           /* Primary blue */
Dark:  --ring: oklch(0.6231 0.1880 259.8145)
```

### Chart Colors

For data visualization, we provide 5 harmonious chart colors:

```css
--chart-1: oklch(0.6231 0.1880 259.8145)  /* Blue */
--chart-2: oklch(0.5461 0.2152 262.8809)  /* Purple-blue */
--chart-3: oklch(0.4882 0.2172 264.3763)  /* Deep purple */
--chart-4: oklch(0.4244 0.1809 265.6377)  /* Violet */
--chart-5: oklch(0.3791 0.1378 265.5222)  /* Deep violet */
```

### Color Usage Guidelines

**DO**:
- ✅ Use semantic tokens (`bg-primary`, `text-destructive`)
- ✅ Test color combinations with contrast checkers
- ✅ Use `muted` for subtle backgrounds
- ✅ Use `accent` for hover states

**DON'T**:
- ❌ Use arbitrary color values (`bg-blue-500`)
- ❌ Mix OKLCH with RGB/HSL in the same context
- ❌ Use `primary` for large background areas
- ❌ Override foreground colors without checking contrast

---

## Typography

### Font Families

```css
--font-sans: Geist Sans, system-ui, -apple-system, sans-serif
--font-mono: Geist Mono, ui-monospace, monospace
--font-serif: ui-serif, Georgia, serif
```

**Usage**:
```tsx
<div className="font-sans">Body text</div>
<code className="font-mono">const example = true;</code>
```

### Type Scale

Tailwind CSS provides a comprehensive type scale. We use:

| Size | Class | Use Case |
|------|-------|----------|
| 3xl | `text-3xl` | Page titles |
| 2xl | `text-2xl` | Section headings |
| xl | `text-xl` | Card titles |
| lg | `text-lg` | Subheadings |
| base | `text-base` | Body text (default) |
| sm | `text-sm` | Secondary text, captions |
| xs | `text-xs` | Labels, helper text |

### Font Weights

| Weight | Class | Use Case |
|--------|-------|----------|
| 700 | `font-bold` | Headings, emphasis |
| 600 | `font-semibold` | Subheadings, buttons |
| 500 | `font-medium` | Labels, menu items |
| 400 | `font-normal` | Body text (default) |
| 300 | `font-light` | De-emphasized text |

### Typography Guidelines

**DO**:
- ✅ Use `text-foreground` for body text
- ✅ Use `text-muted-foreground` for secondary text
- ✅ Maintain consistent heading hierarchy (h1 → h2 → h3)
- ✅ Limit line length to 60-80 characters for readability

**DON'T**:
- ❌ Use more than 3 font sizes on a single page
- ❌ Use custom colors without checking contrast
- ❌ Skip heading levels (h1 → h3)
- ❌ Use `font-bold` excessively

**Line Height**:
- Headings: `leading-tight` (1.25)
- Body: `leading-normal` (1.5) - default
- Dense UI: `leading-relaxed` (1.625)

---

## Spacing & Layout

### Spacing Scale

Tailwind uses a **0.25rem (4px) base unit**:

```css
--spacing: 0.25rem;
```

| Token | Value | Pixels | Use Case |
|-------|-------|--------|----------|
| `0` | 0 | 0px | No spacing |
| `px` | 1px | 1px | Borders, dividers |
| `0.5` | 0.125rem | 2px | Tight spacing |
| `1` | 0.25rem | 4px | Icon gaps |
| `2` | 0.5rem | 8px | Small gaps |
| `3` | 0.75rem | 12px | Component padding |
| `4` | 1rem | 16px | Standard spacing |
| `6` | 1.5rem | 24px | Section spacing |
| `8` | 2rem | 32px | Large gaps |
| `12` | 3rem | 48px | Section dividers |
| `16` | 4rem | 64px | Page sections |

### Container & Max Width

```tsx
<div className="container mx-auto px-4">
  {/* Responsive container with horizontal padding */}
</div>

<div className="max-w-2xl mx-auto">
  {/* Constrained width for readability */}
</div>
```

**Max Width Scale**:
- `max-w-sm` - 384px - Small cards
- `max-w-md` - 448px - Forms
- `max-w-lg` - 512px - Modals
- `max-w-2xl` - 672px - Article content
- `max-w-4xl` - 896px - Wide layouts
- `max-w-7xl` - 1280px - Full page width

### Layout Guidelines

**DO**:
- ✅ Use multiples of 4 for spacing (4, 8, 12, 16, 24, 32...)
- ✅ Use `gap-` utilities for flex/grid spacing
- ✅ Use `space-y-` for vertical stacks
- ✅ Use `container` for page-level constraints

**DON'T**:
- ❌ Use arbitrary values like `p-[13px]`
- ❌ Mix padding and margin inconsistently
- ❌ Forget responsive spacing (`sm:p-6 lg:p-8`)

---

## Shadows

Professional shadow system for depth and elevation:

```css
--shadow-xs:   0 1px 3px 0px hsl(0 0% 0% / 0.05)
--shadow-sm:   0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)
--shadow:      0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)
--shadow-md:   0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)
--shadow-lg:   0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)
--shadow-xl:   0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)
--shadow-2xl:  0 1px 3px 0px hsl(0 0% 0% / 0.25)
```

### Shadow Usage

| Elevation | Class | Use Case |
|-----------|-------|----------|
| Base | No shadow | Buttons, inline elements |
| Low | `shadow-sm` | Cards, panels |
| Medium | `shadow-md` | Dropdowns, tooltips |
| High | `shadow-lg` | Modals, popovers |
| Highest | `shadow-xl` | Notifications, floating |

**Usage**:
```tsx
<Card className="shadow-sm">Card content</Card>
<DropdownMenu className="shadow-md">Menu</DropdownMenu>
<Dialog className="shadow-xl">Modal</Dialog>
```

---

## Border Radius

Consistent rounded corners across the application:

```css
--radius: 0.375rem;  /* 6px - base */

--radius-sm: calc(var(--radius) - 4px)  /* 2px */
--radius-md: calc(var(--radius) - 2px)  /* 4px */
--radius-lg: var(--radius)              /* 6px */
--radius-xl: calc(var(--radius) + 4px)  /* 10px */
```

### Border Radius Usage

| Token | Value | Use Case |
|-------|-------|----------|
| `rounded-sm` | 2px | Small elements, tags |
| `rounded-md` | 4px | Inputs, small buttons |
| `rounded-lg` | 6px | Cards, buttons (default) |
| `rounded-xl` | 10px | Large cards, modals |
| `rounded-full` | 9999px | Pills, avatars, icon buttons |

**Usage**:
```tsx
<Button className="rounded-lg">Default Button</Button>
<Avatar className="rounded-full" />
<Badge className="rounded-sm">Tag</Badge>
```

---

## Components

### shadcn/ui Component Library

We use **shadcn/ui** components (New York style) with CSS variables for theming.

**Installed Components**:
- `alert` - Alerts and notifications
- `avatar` - User avatars
- `badge` - Tags and labels
- `button` - Buttons (primary, secondary, outline, ghost, destructive)
- `card` - Content cards
- `checkbox` - Checkboxes
- `dialog` - Modals and dialogs
- `dropdown-menu` - Context menus, dropdowns
- `input` - Text inputs
- `label` - Form labels
- `popover` - Tooltips, popovers
- `select` - Select dropdowns
- `separator` - Horizontal/vertical dividers
- `sheet` - Side panels
- `skeleton` - Loading skeletons
- `table` - Data tables
- `tabs` - Tabbed interfaces
- `textarea` - Multi-line inputs

### Component Variants

#### Button Variants

```tsx
<Button variant="default">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link Button</Button>
```

#### Button Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Component Guidelines

**DO**:
- ✅ Use semantic variant names (`destructive`, not `red`)
- ✅ Compose components from shadcn/ui primitives
- ✅ Follow the background/foreground convention
- ✅ Add `aria-label` for icon-only buttons

**DON'T**:
- ❌ Create custom variants without documenting them
- ❌ Override component styles with arbitrary classes
- ❌ Mix component libraries (stick to shadcn/ui)

---

## Dark Mode

Dark mode is implemented using CSS classes (`.dark`) with automatic OS preference detection.

### Dark Mode Strategy

1. **CSS Variables**: All colors have light and dark variants
2. **Class Toggle**: `.dark` class on `<html>` element
3. **Persistent**: User preference stored in localStorage
4. **Smooth Transition**: Optional transitions between modes

### Implementation

```tsx
// Toggle dark mode
<Button onClick={() => document.documentElement.classList.toggle('dark')}>
  Toggle Theme
</Button>

// Check current mode
const isDark = document.documentElement.classList.contains('dark');
```

### Dark Mode Guidelines

**DO**:
- ✅ Test all components in both light and dark modes
- ✅ Use semantic color tokens (not hardcoded colors)
- ✅ Maintain WCAG AA contrast in both modes
- ✅ Provide a theme toggle in settings

**DON'T**:
- ❌ Use absolute colors like `bg-white` or `bg-black`
- ❌ Assume users only use one mode
- ❌ Forget to test shadow visibility in dark mode

---

## Accessibility

We follow **WCAG 2.1 Level AA** as the minimum standard.

### Color Contrast

All text must meet minimum contrast ratios:

- **Normal text (< 18px)**: 4.5:1 minimum
- **Large text (≥ 18px or ≥ 14px bold)**: 3:1 minimum
- **UI components**: 3:1 minimum

**Tools**:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Accessibility panel
- Browser extensions (axe, WAVE)

### Keyboard Navigation

**Requirements**:
- ✅ All interactive elements focusable via Tab
- ✅ Visible focus indicators (`:focus-visible`)
- ✅ Logical tab order
- ✅ Escape key closes modals/dropdowns
- ✅ Arrow keys for navigation within components

### Screen Readers

**Requirements**:
- ✅ Semantic HTML (headings, lists, nav, main, etc.)
- ✅ `aria-label` for icon-only buttons
- ✅ `aria-describedby` for form errors
- ✅ `role` attributes where needed
- ✅ Live regions for dynamic updates

### Focus Management

```tsx
// Proper focus indicator
<Button className="focus-visible:ring-2 focus-visible:ring-ring">
  Action
</Button>

// Skip to main content link
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### Accessibility Checklist

- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Images have `alt` text
- [ ] Forms have labels
- [ ] Error messages associated with inputs
- [ ] ARIA attributes used correctly
- [ ] Tested with screen reader (NVDA, JAWS, VoiceOver)

---

## Best Practices

### Naming Conventions

**DO**:
```tsx
// ✅ Descriptive, semantic names
<Button variant="destructive">Delete</Button>
<div className="bg-card text-card-foreground">Content</div>
```

**DON'T**:
```tsx
// ❌ Generic, non-semantic names
<Button className="bg-red-500">Delete</Button>
<div className="bg-white text-black">Content</div>
```

### Component Structure

**DO**:
```tsx
// ✅ Compose with shadcn/ui primitives
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

**DON'T**:
```tsx
// ❌ Create custom components for everything
<CustomCard title="Title">Content</CustomCard>
```

### Responsive Design

**DO**:
```tsx
// ✅ Mobile-first responsive utilities
<div className="p-4 sm:p-6 lg:p-8">
  <h1 className="text-2xl sm:text-3xl lg:text-4xl">Title</h1>
</div>
```

**DON'T**:
```tsx
// ❌ Desktop-first or no responsive design
<div className="p-8">
  <h1 className="text-4xl">Title</h1>
</div>
```

### Performance

**DO**:
- ✅ Use CSS variables for theming (no runtime JS)
- ✅ Minimize custom CSS (use Tailwind utilities)
- ✅ Lazy load components when appropriate
- ✅ Optimize images with Next.js Image component

**DON'T**:
- ❌ Inline styles everywhere
- ❌ Large custom CSS files
- ❌ Unoptimized images
- ❌ Excessive animation/transitions

### Code Organization

```
src/components/
├── ui/              # shadcn/ui components (don't edit)
├── auth/            # Authentication components
├── layout/          # Layout components (Header, Footer)
└── settings/        # Feature-specific components
```

### Documentation

**DO**:
- ✅ Document custom variants in this file
- ✅ Add JSDoc comments to complex components
- ✅ Include usage examples
- ✅ Update this document when making changes

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 2, 2025 | Initial design system with Modern Minimal theme |

---

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/docs)
- [OKLCH Color Space](https://oklch.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Theme Generator](https://tweakcn.com)

---

**For questions or suggestions, refer to this document and the official documentation.**
