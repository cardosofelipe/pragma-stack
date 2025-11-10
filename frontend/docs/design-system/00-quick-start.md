# Quick Start Guide

Get up and running with the FastNext design system immediately. This guide covers the essential patterns you need to build 80% of interfaces.

---

## TL;DR

```tsx
// 1. Import from @/components/ui/*
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// 2. Use semantic color tokens
className="bg-primary text-primary-foreground"
className="text-destructive"

// 3. Use spacing scale (4, 8, 12, 16, 24, 32...)
className="p-4 space-y-6"

// 4. Build layouts with these patterns
<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">
    {/* Your content */}
  </div>
</div>
```

---

## 1. Essential Components

### Buttons

```tsx
import { Button } from '@/components/ui/button';

// Primary action
<Button>Save Changes</Button>

// Danger action
<Button variant="destructive">Delete</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Subtle action
<Button variant="ghost">Skip</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

**[See all button variants](/dev/components#button)**

---

### Cards

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
    <CardDescription>Manage your account settings</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>;
```

**[See card examples](/dev/components#card)**

---

### Forms

```tsx
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
</div>;
```

**[See form patterns](./06-forms.md)** | **[Form examples](/dev/forms)**

---

### Dialogs/Modals

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure you want to proceed?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

**[See dialog examples](/dev/components#dialog)**

---

### Alerts

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Default alert
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    This is an informational message.
  </AlertDescription>
</Alert>

// Error alert
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>
```

**[See all component variants](/dev/components)**

---

## 2. Essential Layouts (1 minute)

### Page Container

```tsx
// Standard page layout
<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">
    <h1 className="text-3xl font-bold">Page Title</h1>
    <Card>{/* Content */}</Card>
  </div>
</div>
```

### Dashboard Grid

```tsx
// Responsive card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id}>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
      </CardHeader>
      <CardContent>{item.content}</CardContent>
    </Card>
  ))}
</div>
```

### Form Layout

```tsx
// Centered form with max width
<div className="container mx-auto px-4 py-8">
  <Card className="max-w-md mx-auto">
    <CardHeader>
      <CardTitle>Login</CardTitle>
    </CardHeader>
    <CardContent>
      <form className="space-y-4">{/* Form fields */}</form>
    </CardContent>
  </Card>
</div>
```

**[See all layout patterns](./03-layouts.md)** | **[Layout examples](/dev/layouts)**

---

## 3. Color System

**Always use semantic tokens**, never arbitrary colors:

```tsx
// ✅ GOOD - Semantic tokens
<div className="bg-primary text-primary-foreground">Primary</div>
<div className="bg-destructive text-destructive-foreground">Error</div>
<div className="bg-muted text-muted-foreground">Disabled</div>
<p className="text-foreground">Body text</p>
<p className="text-muted-foreground">Secondary text</p>

// ❌ BAD - Arbitrary colors
<div className="bg-blue-500 text-white">Don't do this</div>
```

**Available tokens:**

- `primary` - Main brand color, CTAs
- `destructive` - Errors, delete actions
- `muted` - Disabled states, subtle backgrounds
- `accent` - Hover states, highlights
- `foreground` - Body text
- `muted-foreground` - Secondary text
- `border` - Borders, dividers

**[See complete color system](./01-foundations.md#color-system-oklch)**

---

## 4. Spacing System

**Use multiples of 4** (Tailwind's base unit is 0.25rem = 4px):

```tsx
// ✅ GOOD - Consistent spacing
<div className="p-4 space-y-6">
  <div className="mb-8">Content</div>
</div>

// ❌ BAD - Arbitrary spacing
<div className="p-[13px] space-y-[17px]">
  <div className="mb-[23px]">Content</div>
</div>
```

**Common spacing values:**

- `2` (8px) - Tight spacing
- `4` (16px) - Standard spacing
- `6` (24px) - Section spacing
- `8` (32px) - Large gaps
- `12` (48px) - Section dividers

**Pro tip:** Use `gap-` for grids/flex, `space-y-` for vertical stacks:

```tsx
// Grid spacing
<div className="grid grid-cols-3 gap-6">

// Stack spacing
<div className="space-y-4">
```

**[Read spacing philosophy](./04-spacing-philosophy.md)**

---

## 5. Responsive Design

**Mobile-first approach** with Tailwind breakpoints:

```tsx
<div className="
  p-4           // Mobile: 16px padding
  sm:p-6        // Tablet: 24px padding
  lg:p-8        // Desktop: 32px padding
">
  <h1 className="
    text-2xl     // Mobile: 24px
    sm:text-3xl  // Tablet: 30px
    lg:text-4xl  // Desktop: 36px
    font-bold
  ">
    Responsive Title
  </h1>
</div>

// Grid columns
<div className="grid
  grid-cols-1        // Mobile: 1 column
  md:grid-cols-2     // Tablet: 2 columns
  lg:grid-cols-3     // Desktop: 3 columns
  gap-6
">
```

**Breakpoints:**

- `sm:` 640px+
- `md:` 768px+
- `lg:` 1024px+
- `xl:` 1280px+

---

## 6. Accessibility

**Always include:**

```tsx
// Labels for inputs
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />

// ARIA for errors
<Input
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <p id="email-error" className="text-sm text-destructive">
    {errors.email.message}
  </p>
)}

// ARIA labels for icon-only buttons
<Button size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>
```

**[Complete accessibility guide](./07-accessibility.md)**

---

## 7. Common Patterns Cheat Sheet

### Loading State

```tsx
import { Skeleton } from '@/components/ui/skeleton';

{
  isLoading ? <Skeleton className="h-12 w-full" /> : <div>{content}</div>;
}
```

### Dropdown Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

### Badge/Tag

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>New</Badge>
<Badge variant="destructive">Urgent</Badge>
<Badge variant="outline">Draft</Badge>
```

---

## 8. Next Steps

You now know enough to build most interfaces! For deeper knowledge:

### Learn More

- **Components**: [Complete component guide](./02-components.md)
- **Layouts**: [Layout patterns](./03-layouts.md)
- **Forms**: [Form patterns & validation](./06-forms.md)
- **Custom Components**: [Component creation guide](./05-component-creation.md)

### Interactive Examples

- **[Component Showcase](/dev/components)** - All components with code
- **[Layout Examples](/dev/layouts)** - Before/after comparisons
- **[Form Examples](/dev/forms)** - Complete form implementations

### Reference

- **[Quick Reference Tables](./99-reference.md)** - Bookmark this for lookups
- **[Foundations](./01-foundations.md)** - Complete color/spacing/typography guide

---

## 🎯 Golden Rules

Remember these and you'll be 95% compliant:

1. ✅ **Import from `@/components/ui/*`**
2. ✅ **Use semantic colors**: `bg-primary`, not `bg-blue-500`
3. ✅ **Use spacing scale**: 4, 8, 12, 16, 24, 32 (multiples of 4)
4. ✅ **Use `cn()` for className merging**: `cn("base", conditional && "extra", className)`
5. ✅ **Add accessibility**: Labels, ARIA, keyboard support
6. ✅ **Test in dark mode**: Toggle with theme switcher

---

## 🚀 Start Building!

You're ready to build. When you hit edge cases or need advanced patterns, refer back to the [full documentation](./README.md).

**Bookmark these:**

- [Quick Reference](./99-reference.md) - For quick lookups
- [AI Guidelines](./08-ai-guidelines.md) - If using AI assistants
- [Component Showcase](/dev/components) - For copy-paste examples

Happy coding! 🎨
