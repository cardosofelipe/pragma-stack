# Component Creation Guide

**Learn when to create custom components vs composing existing ones**, and master the patterns for building reusable, accessible components with variants using CVA (class-variance-authority).

---

## Table of Contents

1. [When to Create vs Compose](#when-to-create-vs-compose)
2. [Component Templates](#component-templates)
3. [Variant Patterns (CVA)](#variant-patterns-cva)
4. [Prop Design](#prop-design)
5. [Testing Checklist](#testing-checklist)
6. [Real-World Examples](#real-world-examples)

---

## When to Create vs Compose

### The Golden Rule

**80% of the time, you should COMPOSE existing shadcn/ui components.**

Only create custom components when:

1. ✅ You're reusing the same composition 3+ times
2. ✅ The pattern has complex business logic
3. ✅ You need variants beyond what shadcn/ui provides

---

### Decision Tree

```
Do you need a UI element?
│
├─ Does shadcn/ui have this component?
│  │
│  ├─YES─> Use it directly
│  │       <Button>Action</Button>
│  │
│  └─NO──> Can you compose multiple shadcn/ui components?
│          │
│          ├─YES─> Compose them inline first
│          │       <Card>
│          │         <CardHeader>...</CardHeader>
│          │       </Card>
│          │
│          └─NO──> Are you using this composition 3+ times?
│                  │
│                  ├─NO──> Keep composing inline
│                  │
│                  └─YES─> Create a custom component
│                          function MyComponent() { ... }
```

---

### ✅ GOOD: Compose First

```tsx
// ✅ CORRECT - Compose inline
<Card>
  <CardHeader>
    <CardTitle>{title}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardHeader>
  <CardContent>
    <p>{content}</p>
  </CardContent>
  <CardFooter>
    <Button onClick={onAction}>{actionLabel}</Button>
  </CardFooter>
</Card>
```

**Why this is good:**

- Simple and direct
- Easy to customize per use case
- No abstraction overhead
- Clear what's happening

---

### ❌ BAD: Over-Abstracting Too Soon

```tsx
// ❌ WRONG - Premature abstraction
function ContentCard({ title, description, content, actionLabel, onAction }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>{content}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onAction}>{actionLabel}</Button>
      </CardFooter>
    </Card>
  );
}

// Used once... why did we create this?
<ContentCard title="..." description="..." content="..." />;
```

**Problems:**

- ❌ Created before knowing if pattern is reused
- ❌ Inflexible (what if we need 2 buttons?)
- ❌ Unclear what it renders (abstraction hides structure)
- ❌ Harder to customize

---

### ✅ GOOD: Extract After 3+ Uses

```tsx
// ✅ CORRECT - After seeing pattern used 3 times, extract
function DashboardMetricCard({
  title,
  value,
  change,
  icon: Icon,
}: DashboardMetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground">
            {change > 0 ? '+' : ''}{change}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Now used in 5+ places
<DashboardMetricCard title="Total Revenue" value="$45,231.89" change={20.1} />
<DashboardMetricCard title="Subscriptions" value="+2350" change={12.5} />
```

**Why this works:**

- ✅ Pattern validated (used 3+ times)
- ✅ Specific purpose (dashboard metrics)
- ✅ Consistent structure across uses
- ✅ Easy to update all instances

---

## Component Templates

### Template 1: Basic Custom Component

**Use case**: Simple component with optional className override

```tsx
import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  children: React.ReactNode;
}

export function MyComponent({ className, children }: MyComponentProps) {
  return (
    <div
      className={cn(
        'base-classes-here', // Base styles
        className // Allow overrides
      )}
    >
      {children}
    </div>
  );
}

// Usage
<MyComponent className="custom-overrides">Content</MyComponent>;
```

**Key points:**

- Always accept `className` prop
- Use `cn()` utility for merging
- Base classes first, overrides last

---

### Template 2: Component with Variants (CVA)

**Use case**: Component needs multiple visual variants

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva(
  // Base classes (always applied)
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
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

interface MyComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {
  // Additional props here
}

export function MyComponent({ variant, size, className, ...props }: MyComponentProps) {
  return <div className={cn(componentVariants({ variant, size, className }))} {...props} />;
}

// Usage
<MyComponent variant="outline" size="lg">
  Content
</MyComponent>;
```

**Key points:**

- Use CVA for complex variant logic
- Always provide `defaultVariants`
- Extend `React.HTMLAttributes` for standard HTML props
- Spread `...props` to pass through additional attributes

---

### Template 3: Composition Component

**Use case**: Wrap multiple shadcn/ui components with consistent structure

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, description, icon, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

// Usage
<StatCard
  title="Total Users"
  value="1,234"
  description="+12% from last month"
  icon={<Users className="h-4 w-4 text-muted-foreground" />}
/>;
```

**Key points:**

- Compose from shadcn/ui primitives
- Keep structure consistent
- Optional props with `?`
- Descriptive prop names

---

### Template 4: Controlled Component

**Use case**: Component manages state internally but can be controlled

```tsx
import { useState } from 'react';

interface ToggleProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  defaultValue?: boolean;
  children: React.ReactNode;
}

export function Toggle({
  value: controlledValue,
  onChange,
  defaultValue = false,
  children,
}: ToggleProps) {
  // Uncontrolled state
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue ?? uncontrolledValue;
  const handleChange = (newValue: boolean) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setUncontrolledValue(newValue);
    }
  };

  return (
    <button onClick={() => handleChange(!value)}>
      {value ? '✓' : '○'} {children}
    </button>
  );
}

// Uncontrolled usage
<Toggle defaultValue={false}>Auto-save</Toggle>;

// Controlled usage
const [enabled, setEnabled] = useState(false);
<Toggle value={enabled} onChange={setEnabled}>
  Auto-save
</Toggle>;
```

**Key points:**

- Support both controlled and uncontrolled modes
- Use `defaultValue` for initial uncontrolled value
- Use `value` + `onChange` for controlled mode
- Fallback to internal state if not controlled

---

## Variant Patterns (CVA)

### What is CVA?

**class-variance-authority** (CVA) is a utility for creating component variants with Tailwind CSS.

**Why use CVA?**

- ✅ Type-safe variant props
- ✅ Compound variants (combinations)
- ✅ Default variants
- ✅ Clean, readable syntax

---

### Basic Variant Pattern

```tsx
import { cva } from 'class-variance-authority';

const alertVariants = cva(
  // Base classes (always applied)
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Usage
<div className={alertVariants({ variant: 'destructive' })}>Alert content</div>;
```

---

### Multiple Variants

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
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

// Usage
<button className={buttonVariants({ variant: 'outline', size: 'lg' })}>
  Large Outline Button
</button>;
```

---

### Compound Variants

**Use case**: Different classes when specific variant combinations are used

```tsx
const buttonVariants = cva('base-classes', {
  variants: {
    variant: {
      default: 'bg-primary',
      destructive: 'bg-destructive',
    },
    size: {
      sm: 'h-8',
      lg: 'h-12',
    },
  },
  // Compound variants: specific combinations
  compoundVariants: [
    {
      variant: 'destructive',
      size: 'lg',
      class: 'text-lg font-bold', // Applied when BOTH are true
    },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'sm',
  },
});
```

---

## Prop Design

### Prop Naming Conventions

**DO**:

```tsx
// ✅ Descriptive, semantic names
interface UserCardProps {
  user: User;
  onEdit: () => void;
  isLoading: boolean;
  showAvatar?: boolean;
}
```

**DON'T**:

```tsx
// ❌ Generic, unclear names
interface CardProps {
  data: any;
  onClick: () => void;
  loading: boolean;
  flag?: boolean;
}
```

---

### Required vs Optional Props

**Guidelines:**

- Required: Core functionality depends on it
- Optional: Nice-to-have, has sensible default

```tsx
interface AlertProps {
  // Required: Core to component
  children: React.ReactNode;

  // Optional: Has default variant
  variant?: 'default' | 'destructive';

  // Optional: Component works without it
  onClose?: () => void;
  icon?: React.ReactNode;

  // Optional: Standard override
  className?: string;
}

export function Alert({
  children,
  variant = 'default', // Default for optional prop
  onClose,
  icon,
  className,
}: AlertProps) {
  // ...
}
```

---

### Prop Type Patterns

**Enum props** (limited options):

```tsx
interface ButtonProps {
  variant: 'default' | 'destructive' | 'outline';
  size: 'sm' | 'default' | 'lg';
}
```

**Boolean flags**:

```tsx
interface CardProps {
  isLoading?: boolean;
  isDisabled?: boolean;
  showBorder?: boolean;
}
```

**Callback props**:

```tsx
interface FormProps {
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  onChange?: (field: string, value: any) => void;
}
```

**Render props** (advanced customization):

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
}

// Usage
<List
  items={users}
  renderItem={(user, i) => <UserCard key={i} user={user} />}
  renderEmpty={() => <EmptyState />}
/>;
```

---

## Testing Checklist

Before shipping a custom component, verify:

### Visual Testing

- [ ] **Light mode** - Component looks correct
- [ ] **Dark mode** - Component looks correct (toggle theme)
- [ ] **All variants** - Test each variant works
- [ ] **Responsive** - Mobile, tablet, desktop sizes
- [ ] **Loading state** - Shows loading correctly (if applicable)
- [ ] **Error state** - Shows errors correctly (if applicable)
- [ ] **Empty state** - Handles no data gracefully

### Accessibility Testing

- [ ] **Keyboard navigation** - Can be focused and activated with Tab/Enter
- [ ] **Focus indicators** - Visible focus ring (`:focus-visible`)
- [ ] **Screen reader** - ARIA labels and roles present
- [ ] **Color contrast** - 4.5:1 for text, 3:1 for UI (use contrast checker)
- [ ] **Semantic HTML** - Using correct HTML elements (button, nav, etc.)

### Functional Testing

- [ ] **Props work** - All props apply correctly
- [ ] **className override** - Can override styles with className prop
- [ ] **Controlled/uncontrolled** - Both modes work (if applicable)
- [ ] **Event handlers** - onClick, onChange, etc. fire correctly
- [ ] **TypeScript** - No type errors, props autocomplete

### Code Quality

- [ ] **No console errors** - Check browser console
- [ ] **No warnings** - React warnings, a11y warnings
- [ ] **Performance** - No unnecessary re-renders
- [ ] **Documentation** - JSDoc comments for complex props

---

## Real-World Examples

### Example 1: Stat Card

**Problem**: Dashboard shows 8 metric cards with same structure.

**Solution**: Extract composition after 3rd use.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, change, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={cn('text-xs', change >= 0 ? 'text-green-600' : 'text-destructive')}>
            {change >= 0 ? '+' : ''}
            {change}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Usage
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard title="Total Revenue" value="$45,231.89" change={20.1} icon={DollarSign} />
  <StatCard title="Subscriptions" value="+2350" change={12.5} icon={Users} />
  <StatCard title="Sales" value="+12,234" change={19} icon={CreditCard} />
  <StatCard title="Active Now" value="+573" change={-2.1} icon={Activity} />
</div>;
```

**Why this works:**

- Specific purpose (dashboard metrics)
- Reused 8+ times
- Consistent structure
- Easy to update all instances

---

### Example 2: Confirmation Dialog

**Problem**: Need to confirm delete actions throughout app.

**Solution**: Create reusable confirmation dialog wrapper.

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Usage
const [showDeleteDialog, setShowDeleteDialog] = useState(false);

<ConfirmDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  title="Delete User"
  description="Are you sure you want to delete this user? This action cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={async () => {
    await deleteUser(user.id);
    toast.success('User deleted');
  }}
/>;
```

**Why this works:**

- Common pattern (confirmations)
- Handles loading states automatically
- Consistent UX across app
- Easy to use

---

### Example 3: Page Header

**Problem**: Every page has header with title, description, and optional action.

**Solution**: Extract page header component.

```tsx
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Usage
<PageHeader
  title="Users"
  description="Manage system users and permissions"
  action={
    <Button onClick={() => router.push('/users/new')}>
      <Plus className="mr-2 h-4 w-4" />
      Create User
    </Button>
  }
/>;
```

---

## Summary: Component Creation Checklist

Before creating a custom component, ask:

- [ ] **Is it reused 3+ times?** If no, compose inline
- [ ] **Does shadcn/ui have this?** If yes, use it
- [ ] **Can I compose existing components?** If yes, do that first
- [ ] **Does it need variants?** Use CVA
- [ ] **Is className supported?** Always allow overrides
- [ ] **Is it accessible?** Test keyboard, screen reader, contrast
- [ ] **Is it documented?** Add JSDoc comments
- [ ] **Does it follow conventions?** Match shadcn/ui patterns

---

## Next Steps

- **Practice**: Refactor inline compositions into components after 3+ uses
- **Explore**: [Component showcase](/dev/components)
- **Reference**: [shadcn/ui source code](https://github.com/shadcn-ui/ui/tree/main/apps/www/registry)

---

**Related Documentation:**

- [Components](./02-components.md) - shadcn/ui component library
- [AI Guidelines](./08-ai-guidelines.md) - Component templates for AI
- [Forms](./06-forms.md) - Form component patterns
- [Accessibility](./07-accessibility.md) - Accessibility requirements

**Last Updated**: November 2, 2025
