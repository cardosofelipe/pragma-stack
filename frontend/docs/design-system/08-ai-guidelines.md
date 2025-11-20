# AI Code Generation Guidelines

**For AI Assistants**: This document contains strict rules for generating code in the PragmaStack project. Follow these rules to ensure generated code matches the design system perfectly.

---

## 🎯 Core Rules

### ALWAYS Do

1. ✅ **Import from `@/components/ui/*`**

   ```tsx
   import { Button } from '@/components/ui/button';
   import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
   ```

2. ✅ **Use semantic color tokens**

   ```tsx
   className = 'bg-primary text-primary-foreground';
   className = 'text-destructive';
   className = 'bg-muted text-muted-foreground';
   ```

3. ✅ **Use `cn()` utility for className merging**

   ```tsx
   import { cn } from '@/lib/utils';

   className={cn("base-classes", conditional && "conditional-classes", className)}
   ```

4. ✅ **Follow spacing scale** (multiples of 4: 0, 1, 2, 3, 4, 6, 8, 12, 16)

   ```tsx
   className = 'p-4 space-y-6 mb-8';
   ```

5. ✅ **Add accessibility attributes**

   ```tsx
   <Label htmlFor="email">Email</Label>
   <Input
     id="email"
     aria-invalid={!!errors.email}
     aria-describedby={errors.email ? 'email-error' : undefined}
   />
   ```

6. ✅ **Use component variants**

   ```tsx
   <Button variant="destructive">Delete</Button>
   <Alert variant="destructive">Error message</Alert>
   ```

7. ✅ **Compose from shadcn/ui primitives**

   ```tsx
   // Don't create custom card components
   // Use Card + CardHeader + CardTitle + CardContent
   ```

8. ✅ **Use mobile-first responsive design**
   ```tsx
   className = 'text-2xl sm:text-3xl lg:text-4xl';
   className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
   ```

---

### NEVER Do

1. ❌ **NO arbitrary colors**

   ```tsx
   // ❌ WRONG
   className = 'bg-blue-500 text-white';

   // ✅ CORRECT
   className = 'bg-primary text-primary-foreground';
   ```

2. ❌ **NO arbitrary spacing values**

   ```tsx
   // ❌ WRONG
   className = 'p-[13px] mb-[17px]';

   // ✅ CORRECT
   className = 'p-4 mb-4';
   ```

3. ❌ **NO inline styles**

   ```tsx
   // ❌ WRONG
   style={{ margin: '10px', color: '#3b82f6' }}

   // ✅ CORRECT
   className="m-4 text-primary"
   ```

4. ❌ **NO custom CSS classes** (use Tailwind utilities)

   ```tsx
   // ❌ WRONG
   <div className="my-custom-class">

   // ✅ CORRECT
   <div className="flex items-center justify-between p-4">
   ```

5. ❌ **NO mixing component libraries**

   ```tsx
   // ❌ WRONG - Don't use Material-UI, Ant Design, etc.
   import { Button } from '@mui/material';

   // ✅ CORRECT - Only shadcn/ui
   import { Button } from '@/components/ui/button';
   ```

6. ❌ **NO skipping accessibility**

   ```tsx
   // ❌ WRONG
   <button><X /></button>

   // ✅ CORRECT
   <Button size="icon" aria-label="Close">
     <X className="h-4 w-4" />
   </Button>
   ```

7. ❌ **NO creating custom variants without CVA**

   ```tsx
   // ❌ WRONG
   <Button className={type === 'danger' ? 'bg-red-500' : 'bg-blue-500'}>

   // ✅ CORRECT
   <Button variant="destructive">Delete</Button>
   ```

---

## 📐 Layout Patterns

### Page Container

```tsx
<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">{/* Content */}</div>
</div>
```

### Dashboard Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id}>...</Card>
  ))}
</div>
```

### Form Layout

```tsx
<Card className="max-w-md mx-auto">
  <CardHeader>
    <CardTitle>Form Title</CardTitle>
  </CardHeader>
  <CardContent>
    <form className="space-y-4">{/* Form fields */}</form>
  </CardContent>
</Card>
```

### Centered Content

```tsx
<div className="max-w-2xl mx-auto px-4">{/* Readable content width */}</div>
```

---

## 🧩 Component Templates

### Custom Component Template

```tsx
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface MyComponentProps {
  variant?: 'default' | 'compact';
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ variant = 'default', className, children }: MyComponentProps) {
  return (
    <Card
      className={cn(
        'p-4', // base styles
        variant === 'compact' && 'p-2',
        className // allow overrides
      )}
    >
      {children}
    </Card>
  );
}
```

### Component with CVA (class-variance-authority)

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva(
  'base-classes-here', // base
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

export function Component({ variant, size, className, ...props }: ComponentProps) {
  return <div className={cn(componentVariants({ variant, size, className }))} {...props} />;
}
```

---

## 📝 Form Pattern Template

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register('email')}
          aria-invalid={!!form.formState.errors.email}
          aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
        />
        {form.formState.errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

---

## 🎨 Color Token Reference

**Always use these semantic tokens:**

| Token                                        | Usage                 |
| -------------------------------------------- | --------------------- |
| `bg-primary text-primary-foreground`         | Primary buttons, CTAs |
| `bg-secondary text-secondary-foreground`     | Secondary actions     |
| `bg-destructive text-destructive-foreground` | Delete, errors        |
| `bg-muted text-muted-foreground`             | Disabled states       |
| `bg-accent text-accent-foreground`           | Hover states          |
| `bg-card text-card-foreground`               | Card backgrounds      |
| `text-foreground`                            | Body text             |
| `text-muted-foreground`                      | Secondary text        |
| `border-border`                              | Borders               |
| `ring-ring`                                  | Focus rings           |

---

## 📏 Spacing Reference

**Use these spacing values (multiples of 4px):**

| Class | Value  | Pixels | Usage            |
| ----- | ------ | ------ | ---------------- |
| `2`   | 0.5rem | 8px    | Tight spacing    |
| `4`   | 1rem   | 16px   | Standard spacing |
| `6`   | 1.5rem | 24px   | Section spacing  |
| `8`   | 2rem   | 32px   | Large gaps       |
| `12`  | 3rem   | 48px   | Section dividers |
| `16`  | 4rem   | 64px   | Page sections    |

---

## 🔑 Decision Trees

### When to use Grid vs Flex?

```
Need equal-width columns? → Use Grid
  className="grid grid-cols-3 gap-6"

Need flexible item sizes? → Use Flex
  className="flex gap-4"

Need 2D layout (rows + columns)? → Use Grid
  className="grid grid-cols-2 grid-rows-3 gap-4"

Need 1D layout (single row OR column)? → Use Flex
  className="flex flex-col gap-4"
```

### When to use Margin vs Padding?

```
Spacing between sibling elements? → Use gap or space-y
  className="flex gap-4"
  className="space-y-4"

Internal element spacing? → Use padding
  className="p-4"

External element spacing? → Avoid margins, use parent gap
  // ❌ Child with margin
  <div className="mb-4">

  // ✅ Parent with gap
  <div className="space-y-4">
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Mistake 1: Hardcoding colors

```tsx
// ❌ WRONG
<div className="bg-red-500 text-white">Error</div>

// ✅ CORRECT
<Alert variant="destructive">Error message</Alert>
```

### ❌ Mistake 2: Arbitrary spacing

```tsx
// ❌ WRONG
<div className="p-[15px] mb-[23px]">

// ✅ CORRECT
<div className="p-4 mb-6">
```

### ❌ Mistake 3: Missing accessibility

```tsx
// ❌ WRONG
<input type="email" />

// ✅ CORRECT
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

### ❌ Mistake 4: Creating custom components unnecessarily

```tsx
// ❌ WRONG - Custom component for simple composition
function MyCard({ title, children }) {
  return <div className="card">{children}</div>;
}

// ✅ CORRECT - Use shadcn/ui primitives
<Card>
  <CardHeader>
    <CardTitle>{title}</CardTitle>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>;
```

### ❌ Mistake 5: Not using cn() utility

```tsx
// ❌ WRONG
<div className={`base-class ${isActive ? 'active-class' : ''} ${className}`}>

// ✅ CORRECT
<div className={cn("base-class", isActive && "active-class", className)}>
```

---

## 📚 Reference Documentation

Before generating code, check these resources:

1. **[Quick Start](./00-quick-start.md)** - Essential patterns
2. **[Components](./02-components.md)** - All shadcn/ui components
3. **[Layouts](./03-layouts.md)** - Layout patterns
4. **[Spacing](./04-spacing-philosophy.md)** - Spacing rules
5. **[Forms](./06-forms.md)** - Form patterns
6. **[Reference](./99-reference.md)** - Quick lookup tables

---

## ✅ Code Generation Checklist

Before outputting code, verify:

- [ ] All imports from `@/components/ui/*`
- [ ] Using semantic color tokens (no `bg-blue-500`)
- [ ] Using spacing scale (multiples of 4)
- [ ] Using `cn()` for className merging
- [ ] Accessibility attributes included
- [ ] Mobile-first responsive design
- [ ] Composing from shadcn/ui primitives
- [ ] Following established patterns from docs
- [ ] No inline styles
- [ ] No arbitrary values

---

## 🤖 AI Assistant Configuration

### For Claude Code / Cursor

Add this to your project context:

```
When generating React/Next.js components:
1. Always import from @/components/ui/*
2. Use semantic tokens (bg-primary, text-destructive)
3. Use cn() utility for classNames
4. Follow spacing scale (4, 8, 12, 16, 24, 32)
5. Add accessibility (labels, ARIA)
6. Use component variants (variant="destructive")
7. Reference: /docs/design-system/08-ai-guidelines.md
```

### For GitHub Copilot

Add to `.github/copilot-instructions.md`:

```markdown
# Component Guidelines

- Import from @/components/ui/\*
- Use semantic colors: bg-primary, text-destructive
- Spacing: multiples of 4 (p-4, mb-6, gap-8)
- Use cn() for className merging
- Add accessibility attributes
- See /docs/design-system/08-ai-guidelines.md
```

---

## 📊 Examples

### ✅ Good Component (AI Generated)

```tsx
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down';
  className?: string;
}

export function DashboardCard({ title, value, trend, className }: DashboardCardProps) {
  return (
    <Card className={cn('p-6', className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p
            className={cn(
              'text-xs',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-destructive'
            )}
          >
            {trend === 'up' ? '↑' : '↓'} Trend
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Why it's good:**

- ✅ Imports from `@/components/ui/*`
- ✅ Uses semantic tokens
- ✅ Uses `cn()` utility
- ✅ Follows spacing scale
- ✅ Composes from shadcn/ui primitives
- ✅ TypeScript interfaces
- ✅ Allows className override

---

## 🎓 Learning Path for AI

1. Read [Quick Start](./00-quick-start.md) - Essential patterns
2. Read this document - Rules and templates
3. Reference [Component Guide](./02-components.md) - All components
4. Check [Reference Tables](./99-reference.md) - Token lookups

With these guidelines, you can generate code that perfectly matches the design system. Always prioritize consistency over creativity.

---

**Last Updated**: November 2, 2025
**For AI Assistants**: Follow these rules strictly for optimal code generation.
