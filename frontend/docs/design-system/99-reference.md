# Quick Reference

**Bookmark this page** for instant lookups of colors, spacing, typography, components, and common patterns. Your go-to cheat sheet for the FastNext design system.

---

## Table of Contents

1. [Color Tokens](#color-tokens)
2. [Typography Scale](#typography-scale)
3. [Spacing Scale](#spacing-scale)
4. [Component Variants](#component-variants)
5. [Layout Patterns](#layout-patterns)
6. [Common Class Combinations](#common-class-combinations)
7. [Decision Trees](#decision-trees)

---

## Color Tokens

### Semantic Colors

| Token | Usage | Example |
|-------|-------|---------|
| `bg-primary text-primary-foreground` | CTAs, primary actions | Primary button |
| `bg-secondary text-secondary-foreground` | Secondary actions | Secondary button |
| `bg-destructive text-destructive-foreground` | Delete, errors | Delete button, error alert |
| `bg-muted text-muted-foreground` | Disabled, subtle | Disabled button, TabsList |
| `bg-accent text-accent-foreground` | Hover states | Dropdown hover |
| `bg-card text-card-foreground` | Cards, elevated surfaces | Card component |
| `bg-popover text-popover-foreground` | Popovers, dropdowns | Dropdown content |
| `bg-background text-foreground` | Page background | Body |
| `text-foreground` | Body text | Paragraphs |
| `text-muted-foreground` | Secondary text | Captions, helper text |
| `border-border` | Borders, dividers | Card borders, separators |
| `border-input` | Input borders | Text input border |
| `ring-ring` | Focus indicators | Focus ring |

### Usage Examples

```tsx
// Primary button
<Button className="bg-primary text-primary-foreground">Save</Button>

// Destructive button
<Button className="bg-destructive text-destructive-foreground">Delete</Button>

// Secondary text
<p className="text-muted-foreground text-sm">Helper text</p>

// Card
<Card className="bg-card text-card-foreground border-border">...</Card>

// Focus ring
<div className="focus-visible:ring-2 focus-visible:ring-ring">...</div>
```

---

## Typography Scale

### Font Sizes

| Class | rem | px | Use Case | Common |
|-------|-----|----|----|:------:|
| `text-xs` | 0.75rem | 12px | Labels, fine print | |
| `text-sm` | 0.875rem | 14px | Secondary text, captions | ⭐ |
| `text-base` | 1rem | 16px | Body text (default) | ⭐ |
| `text-lg` | 1.125rem | 18px | Subheadings | |
| `text-xl` | 1.25rem | 20px | Card titles | ⭐ |
| `text-2xl` | 1.5rem | 24px | Section headings | ⭐ |
| `text-3xl` | 1.875rem | 30px | Page titles | ⭐ |
| `text-4xl` | 2.25rem | 36px | Large headings | |
| `text-5xl` | 3rem | 48px | Hero text | |

⭐ = Most commonly used

### Font Weights

| Class | Value | Use Case | Common |
|-------|-------|----------|:------:|
| `font-light` | 300 | De-emphasized text | |
| `font-normal` | 400 | Body text (default) | ⭐ |
| `font-medium` | 500 | Labels, menu items | ⭐ |
| `font-semibold` | 600 | Subheadings, buttons | ⭐ |
| `font-bold` | 700 | Headings, emphasis | ⭐ |

⭐ = Most commonly used

### Common Typography Combinations

```tsx
// Page title
<h1 className="text-3xl font-bold">Page Title</h1>

// Section heading
<h2 className="text-2xl font-semibold mb-4">Section Heading</h2>

// Card title
<h3 className="text-xl font-semibold">Card Title</h3>

// Body text (default)
<p className="text-base text-foreground">Regular paragraph</p>

// Secondary text
<p className="text-sm text-muted-foreground">Helper text</p>

// Label
<Label className="text-sm font-medium">Field Label</Label>
```

---

## Spacing Scale

### Spacing Values

| Token | rem | px | Use Case | Common |
|-------|-----|----|----|:------:|
| `0` | 0 | 0px | No spacing | |
| `px` | - | 1px | Borders | |
| `0.5` | 0.125rem | 2px | Very tight | |
| `1` | 0.25rem | 4px | Icon gaps | |
| `2` | 0.5rem | 8px | Tight spacing (label → input) | ⭐ |
| `3` | 0.75rem | 12px | Component padding | |
| `4` | 1rem | 16px | Standard spacing (form fields) | ⭐ |
| `5` | 1.25rem | 20px | Medium spacing | |
| `6` | 1.5rem | 24px | Section spacing (cards) | ⭐ |
| `8` | 2rem | 32px | Large gaps | ⭐ |
| `10` | 2.5rem | 40px | Very large gaps | |
| `12` | 3rem | 48px | Section dividers | ⭐ |
| `16` | 4rem | 64px | Page sections | |

⭐ = Most commonly used

### Spacing Methods

| Method | Use Case | Example |
|--------|----------|---------|
| `gap-4` | Flex/grid spacing | `flex gap-4` |
| `space-y-4` | Vertical stack spacing | `space-y-4` |
| `space-x-4` | Horizontal stack spacing | `space-x-4` |
| `p-4` | Padding (all sides) | `p-4` |
| `px-4` | Horizontal padding | `px-4` |
| `py-4` | Vertical padding | `py-4` |
| `m-4` | Margin (exceptions only!) | `mt-8` |

### Common Spacing Patterns

```tsx
// Form vertical spacing
<form className="space-y-4">...</form>

// Field group spacing (label → input)
<div className="space-y-2">
  <Label>...</Label>
  <Input />
</div>

// Button group horizontal spacing
<div className="flex gap-4">
  <Button>Cancel</Button>
  <Button>Save</Button>
</div>

// Card grid spacing
<div className="grid grid-cols-3 gap-6">...</div>

// Page padding
<div className="container mx-auto px-4 py-8">...</div>

// Card padding
<Card className="p-6">...</Card>
```

---

## Component Variants

### Button Variants

```tsx
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="destructive">Delete</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Badge Variants

```tsx
<Badge variant="default">New</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="outline">Pending</Badge>
<Badge variant="destructive">Critical</Badge>
```

### Alert Variants

```tsx
<Alert variant="default">Info alert</Alert>
<Alert variant="destructive">Error alert</Alert>
```

---

## Layout Patterns

### Grid Columns

```tsx
// 1 → 2 → 3 progression (most common)
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// 1 → 2 → 4 progression
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"

// 1 → 2 progression (simple)
className="grid grid-cols-1 md:grid-cols-2 gap-6"

// 1 → 3 progression (skip 2)
className="grid grid-cols-1 lg:grid-cols-3 gap-6"
```

### Container Widths

```tsx
// Standard container
className="container mx-auto px-4"

// Constrained widths
className="max-w-md mx-auto"   // 448px - Forms
className="max-w-lg mx-auto"   // 512px - Modals
className="max-w-2xl mx-auto"  // 672px - Articles
className="max-w-4xl mx-auto"  // 896px - Wide layouts
className="max-w-7xl mx-auto"  // 1280px - Full page
```

### Flex Patterns

```tsx
// Horizontal flex
className="flex gap-4"

// Vertical flex
className="flex flex-col gap-4"

// Center items
className="flex items-center justify-center"

// Space between
className="flex items-center justify-between"

// Wrap items
className="flex flex-wrap gap-4"

// Responsive: stack on mobile, row on desktop
className="flex flex-col sm:flex-row gap-4"
```

---

## Common Class Combinations

### Page Container

```tsx
<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">
    {/* Content */}
  </div>
</div>
```

### Card Header with Action

```tsx
<CardHeader className="flex flex-row items-center justify-between space-y-0">
  <div>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </div>
  <Button variant="outline" size="sm">Action</Button>
</CardHeader>
```

### Dashboard Metric Card Header

```tsx
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  <CardTitle className="text-sm font-medium">Metric Title</CardTitle>
  <Icon className="h-4 w-4 text-muted-foreground" />
</CardHeader>
```

### Form Field

```tsx
<div className="space-y-2">
  <Label htmlFor="field">Label</Label>
  <Input id="field" />
  {error && <p className="text-sm text-destructive">{error.message}</p>}
</div>
```

### Centered Form Card

```tsx
<div className="container mx-auto px-4 py-8">
  <Card className="max-w-md mx-auto">
    <CardHeader>
      <CardTitle>Form Title</CardTitle>
    </CardHeader>
    <CardContent>
      <form className="space-y-4">
        {/* Fields */}
      </form>
    </CardContent>
  </Card>
</div>
```

### Button Group

```tsx
<div className="flex gap-4">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>

// Or right-aligned
<div className="flex justify-end gap-4">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>
```

### Icon with Text

```tsx
<div className="flex items-center gap-2">
  <Icon className="h-4 w-4" />
  <span>Text</span>
</div>
```

### Responsive Text

```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Responsive Title
</h1>
```

### Responsive Padding

```tsx
<div className="p-4 sm:p-6 lg:p-8">
  Responsive padding
</div>
```

---

## Decision Trees

### Grid vs Flex

```
Need equal-width columns? → Grid
  Example: grid grid-cols-3 gap-6

Need flexible item sizes? → Flex
  Example: flex gap-4

Need 2D layout (rows + columns)? → Grid
  Example: grid grid-cols-2 grid-rows-3 gap-4

Need 1D layout (row OR column)? → Flex
  Example: flex flex-col gap-4
```

### Margin vs Padding vs Gap

```
Spacing between siblings?
  ├─ Flex/Grid parent? → gap
  └─ Regular parent? → space-y or space-x

Inside component? → padding

Exception case (one child different)? → margin
```

### Button Variant

```
What's the action?
├─ Primary action (save, submit) → variant="default"
├─ Secondary action (cancel, back) → variant="secondary"
├─ Alternative action (view, edit) → variant="outline"
├─ Subtle action (icon in list) → variant="ghost"
├─ In-text action (learn more) → variant="link"
└─ Delete/remove action → variant="destructive"
```

### Form Field Error Display

```
Has error?
  ├─YES─> Add aria-invalid={true}
  │       Add aria-describedby="field-error"
  │       Add border-destructive class
  │       Show <p id="field-error" className="text-sm text-destructive">
  │
  └─NO──> Normal state
```

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `Tab` | Move focus forward | All |
| `Shift + Tab` | Move focus backward | All |
| `Enter` | Activate button/link | Buttons, links |
| `Space` | Activate button/checkbox | Buttons, checkboxes |
| `Escape` | Close overlay | Dialogs, dropdowns |
| `Arrow keys` | Navigate items | Dropdowns, lists |
| `Home` | Jump to start | Lists |
| `End` | Jump to end | Lists |

---

## Accessibility Quick Checks

### Contrast Ratios

- **Normal text (< 18px)**: 4.5:1 minimum
- **Large text (≥ 18px or ≥ 14px bold)**: 3:1 minimum
- **UI components**: 3:1 minimum

### ARIA Attributes

```tsx
// Icon-only button
<Button size="icon" aria-label="Close">
  <X className="h-4 w-4" />
</Button>

// Form field error
<Input
  aria-invalid={!!error}
  aria-describedby={error ? 'field-error' : undefined}
/>
{error && <p id="field-error">{error.message}</p>}

// Required field
<Input aria-required="true" required />

// Live region
<div aria-live="polite">{statusMessage}</div>
```

---

## Import Cheat Sheet

```tsx
// Components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Utilities
import { cn } from '@/lib/utils';

// Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Toast
import { toast } from 'sonner';

// Icons
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
```

---

## Zod Validation Patterns

```tsx
// Required string
z.string().min(1, 'Required')

// Email
z.string().email('Invalid email')

// Min/max length
z.string().min(8, 'Min 8 chars').max(100, 'Max 100 chars')

// Optional
z.string().optional()

// Number
z.coerce.number().min(0).max(100)

// Enum
z.enum(['admin', 'user', 'guest'])

// Boolean
z.boolean().refine(val => val === true, { message: 'Must accept' })

// Password confirmation
z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

---

## Responsive Breakpoints

| Breakpoint | Min Width | Typical Device |
|------------|-----------|----------------|
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops, desktops |
| `xl:` | 1280px | Large desktops |
| `2xl:` | 1536px | Extra large screens |

```tsx
// Mobile-first (default → sm → md → lg)
className="text-sm sm:text-base md:text-lg lg:text-xl"
className="p-4 sm:p-6 lg:p-8"
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

---

## Shadows & Radius

### Shadows

```tsx
shadow-sm   // Cards, panels
shadow-md   // Dropdowns, tooltips
shadow-lg   // Modals, popovers
shadow-xl   // Floating notifications
```

### Border Radius

```tsx
rounded-sm   // 2px - Tags, small badges
rounded-md   // 4px - Inputs, small buttons
rounded-lg   // 6px - Cards, buttons (default)
rounded-xl   // 10px - Large cards, modals
rounded-full // Pills, avatars, icon buttons
```

---

## Next Steps

- **For detailed info**: Navigate to specific guides from [README](./README.md)
- **For examples**: Visit [/dev/components](/dev/components)
- **For AI**: See [AI Guidelines](./08-ai-guidelines.md)

---

**Related Documentation:**
- [Quick Start](./00-quick-start.md) - 5-minute crash course
- [Foundations](./01-foundations.md) - Detailed color, typography, spacing
- [Components](./02-components.md) - All component variants
- [Layouts](./03-layouts.md) - Layout patterns
- [Forms](./06-forms.md) - Form patterns
- [Accessibility](./07-accessibility.md) - WCAG compliance

**Last Updated**: November 2, 2025
