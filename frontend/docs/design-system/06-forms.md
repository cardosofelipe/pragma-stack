# Forms Guide

**Master form patterns with react-hook-form + Zod validation**: Learn field layouts, error handling, loading states, and accessibility best practices for bulletproof forms.

---

## Table of Contents

1. [Form Architecture](#form-architecture)
2. [Basic Form Pattern](#basic-form-pattern)
3. [Field Patterns](#field-patterns)
4. [Validation with Zod](#validation-with-zod)
5. [Error Handling](#error-handling)
6. [Loading & Submit States](#loading--submit-states)
7. [Form Layouts](#form-layouts)
8. [Advanced Patterns](#advanced-patterns)

---

## Form Architecture

### Technology Stack

- **react-hook-form** - Form state management, validation
- **Zod** - Schema validation
- **@hookform/resolvers** - Zod resolver for react-hook-form
- **shadcn/ui components** - Input, Label, Button, etc.

**Why this stack?**
- ✅ Type-safe validation (TypeScript + Zod)
- ✅ Minimal re-renders (react-hook-form)
- ✅ Accessible by default (shadcn/ui)
- ✅ Easy error handling
- ✅ Built-in loading states

---

### Form Decision Tree

```
Need a form?
│
├─ Single field (search, filter)?
│  └─> Use uncontrolled input with onChange
│     <Input onChange={(e) => setQuery(e.target.value)} />
│
├─ Simple form (1-3 fields, no complex validation)?
│  └─> Use react-hook-form without Zod
│     const form = useForm();
│
└─ Complex form (4+ fields, validation, async submit)?
   └─> Use react-hook-form + Zod
      const form = useForm({ resolver: zodResolver(schema) });
```

---

## Basic Form Pattern

### Minimal Form (No Validation)

```tsx
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormData {
  email: string;
}

export function SimpleForm() {
  const form = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register('email')}
        />
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

### Complete Form Pattern (with Zod)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// 1. Define validation schema
const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// 2. Infer TypeScript type from schema
type FormData = z.infer<typeof formSchema>;

export function LoginForm() {
  // 3. Initialize form with Zod resolver
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 4. Submit handler (type-safe!)
  const onSubmit = async (data: FormData) => {
    try {
      await loginUser(data);
      toast.success('Logged in successfully');
    } catch (error) {
      toast.error('Invalid credentials');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Email field */}
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

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...form.register('password')}
          aria-invalid={!!form.formState.errors.password}
          aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
        />
        {form.formState.errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

**Key points:**
1. Define Zod schema first
2. Infer TypeScript type with `z.infer`
3. Use `zodResolver` in `useForm`
4. Register fields with `{...form.register('fieldName')}`
5. Show errors from `form.formState.errors`
6. Disable submit during submission

---

## Field Patterns

### Text Input

```tsx
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input
    id="name"
    {...form.register('name')}
    aria-invalid={!!form.formState.errors.name}
    aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
  />
  {form.formState.errors.name && (
    <p id="name-error" className="text-sm text-destructive">
      {form.formState.errors.name.message}
    </p>
  )}
</div>
```

---

### Textarea

```tsx
<div className="space-y-2">
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    rows={4}
    {...form.register('description')}
  />
  {form.formState.errors.description && (
    <p className="text-sm text-destructive">
      {form.formState.errors.description.message}
    </p>
  )}
</div>
```

---

### Select

```tsx
<div className="space-y-2">
  <Label htmlFor="role">Role</Label>
  <Select
    value={form.watch('role')}
    onValueChange={(value) => form.setValue('role', value)}
  >
    <SelectTrigger id="role">
      <SelectValue placeholder="Select a role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="user">User</SelectItem>
      <SelectItem value="guest">Guest</SelectItem>
    </SelectContent>
  </Select>
  {form.formState.errors.role && (
    <p className="text-sm text-destructive">
      {form.formState.errors.role.message}
    </p>
  )}
</div>
```

---

### Checkbox

```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="terms"
    checked={form.watch('acceptTerms')}
    onCheckedChange={(checked) => form.setValue('acceptTerms', checked as boolean)}
  />
  <Label htmlFor="terms" className="text-sm font-normal">
    I accept the terms and conditions
  </Label>
</div>
{form.formState.errors.acceptTerms && (
  <p className="text-sm text-destructive">
    {form.formState.errors.acceptTerms.message}
  </p>
)}
```

---

### Radio Group (Custom Pattern)

```tsx
<div className="space-y-2">
  <Label>Notification Method</Label>
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id="email"
        value="email"
        {...form.register('notificationMethod')}
      />
      <Label htmlFor="email" className="font-normal">Email</Label>
    </div>
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id="sms"
        value="sms"
        {...form.register('notificationMethod')}
      />
      <Label htmlFor="sms" className="font-normal">SMS</Label>
    </div>
  </div>
</div>
```

---

## Validation with Zod

### Common Validation Patterns

```tsx
import { z } from 'zod';

// Email
z.string().email('Invalid email address')

// Min/max length
z.string().min(8, 'Minimum 8 characters').max(100, 'Maximum 100 characters')

// Required field
z.string().min(1, 'This field is required')

// Optional field
z.string().optional()

// Number with range
z.number().min(0).max(100)

// Number from string input
z.coerce.number().min(0)

// Enum
z.enum(['admin', 'user', 'guest'], {
  errorMap: () => ({ message: 'Invalid role' })
})

// URL
z.string().url('Invalid URL')

// Password with requirements
z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Confirm password
z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Custom validation
z.string().refine((val) => !val.includes('badword'), {
  message: 'Invalid input',
})

// Conditional fields
z.object({
  role: z.enum(['admin', 'user']),
  adminKey: z.string().optional(),
}).refine((data) => {
  if (data.role === 'admin') {
    return !!data.adminKey;
  }
  return true;
}, {
  message: 'Admin key required for admin role',
  path: ['adminKey'],
})
```

---

### Full Form Schema Example

```tsx
const userFormSchema = z.object({
  // Required text
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),

  // Email
  email: z.string().email('Invalid email address'),

  // Optional phone
  phone: z.string().optional(),

  // Number
  age: z.coerce.number().min(18, 'Must be 18 or older').max(120),

  // Enum
  role: z.enum(['admin', 'user', 'guest']),

  // Boolean
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms',
  }),

  // Nested object
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().regex(/^\d{5}$/, 'Invalid ZIP code'),
  }),

  // Array
  tags: z.array(z.string()).min(1, 'At least one tag required'),
});

type UserFormData = z.infer<typeof userFormSchema>;
```

---

## Error Handling

### Field-Level Errors

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    {...form.register('email')}
    className={form.formState.errors.email ? 'border-destructive' : ''}
    aria-invalid={!!form.formState.errors.email}
    aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
  />
  {form.formState.errors.email && (
    <p id="email-error" className="text-sm text-destructive">
      {form.formState.errors.email.message}
    </p>
  )}
</div>
```

**Accessibility notes:**
- Use `aria-invalid` to indicate error state
- Use `aria-describedby` to link error message
- Error ID format: `{fieldName}-error`

---

### Form-Level Errors

```tsx
const onSubmit = async (data: FormData) => {
  try {
    await submitForm(data);
  } catch (error) {
    // Set form-level error
    form.setError('root', {
      type: 'server',
      message: error.message || 'Something went wrong',
    });
  }
};

// Display form-level error
{form.formState.errors.root && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      {form.formState.errors.root.message}
    </AlertDescription>
  </Alert>
)}
```

---

### Server Validation Errors

```tsx
const onSubmit = async (data: FormData) => {
  try {
    await createUser(data);
  } catch (error) {
    if (error.response?.data?.errors) {
      // Map server errors to form fields
      const serverErrors = error.response.data.errors;

      Object.keys(serverErrors).forEach((field) => {
        form.setError(field as keyof FormData, {
          type: 'server',
          message: serverErrors[field],
        });
      });
    } else {
      // Generic error
      form.setError('root', {
        type: 'server',
        message: 'Failed to create user',
      });
    }
  }
};
```

---

## Loading & Submit States

### Basic Loading State

```tsx
<Button type="submit" disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
</Button>
```

---

### Disable All Fields During Submit

```tsx
const isDisabled = form.formState.isSubmitting;

<Input
  {...form.register('name')}
  disabled={isDisabled}
/>

<Button type="submit" disabled={isDisabled}>
  {isDisabled ? 'Submitting...' : 'Submit'}
</Button>
```

---

### Loading with Toast

```tsx
const onSubmit = async (data: FormData) => {
  const loadingToast = toast.loading('Creating user...');

  try {
    await createUser(data);
    toast.success('User created successfully', { id: loadingToast });
    router.push('/users');
  } catch (error) {
    toast.error('Failed to create user', { id: loadingToast });
  }
};
```

---

## Form Layouts

### Centered Form (Login, Signup)

```tsx
<div className="container mx-auto px-4 py-8">
  <Card className="max-w-md mx-auto">
    <CardHeader>
      <CardTitle>Sign In</CardTitle>
      <CardDescription>Enter your credentials to continue</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Form fields */}
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>
    </CardContent>
  </Card>
</div>
```

---

### Two-Column Form

```tsx
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
  {/* Row 1: Two columns */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-2">
      <Label htmlFor="firstName">First Name</Label>
      <Input id="firstName" {...form.register('firstName')} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="lastName">Last Name</Label>
      <Input id="lastName" {...form.register('lastName')} />
    </div>
  </div>

  {/* Row 2: Full width */}
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" {...form.register('email')} />
  </div>

  <Button type="submit">Save</Button>
</form>
```

---

### Form with Sections

```tsx
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
  {/* Section 1 */}
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold">Personal Information</h3>
      <p className="text-sm text-muted-foreground">
        Basic details about you
      </p>
    </div>
    <Separator />
    <div className="space-y-4">
      {/* Fields */}
    </div>
  </div>

  {/* Section 2 */}
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold">Account Settings</h3>
      <p className="text-sm text-muted-foreground">
        Configure your account preferences
      </p>
    </div>
    <Separator />
    <div className="space-y-4">
      {/* Fields */}
    </div>
  </div>

  <div className="flex justify-end gap-4">
    <Button type="button" variant="outline">Cancel</Button>
    <Button type="submit">Save Changes</Button>
  </div>
</form>
```

---

## Advanced Patterns

### Dynamic Fields (Array)

```tsx
import { useFieldArray } from 'react-hook-form';

const schema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.coerce.number().min(1),
  })).min(1, 'At least one item required'),
});

function DynamicForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ name: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-4">
          <Input
            {...form.register(`items.${index}.name`)}
            placeholder="Item name"
          />
          <Input
            type="number"
            {...form.register(`items.${index}.quantity`)}
            placeholder="Quantity"
          />
          <Button
            type="button"
            variant="destructive"
            onClick={() => remove(index)}
          >
            Remove
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append({ name: '', quantity: 1 })}
      >
        Add Item
      </Button>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

### Conditional Fields

```tsx
const schema = z.object({
  role: z.enum(['user', 'admin']),
  adminKey: z.string().optional(),
}).refine((data) => {
  if (data.role === 'admin') {
    return !!data.adminKey;
  }
  return true;
}, {
  message: 'Admin key required',
  path: ['adminKey'],
});

function ConditionalForm() {
  const form = useForm({ resolver: zodResolver(schema) });
  const role = form.watch('role');

  return (
    <form className="space-y-4">
      <Select
        value={role}
        onValueChange={(val) => form.setValue('role', val as any)}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>

      {role === 'admin' && (
        <Input
          {...form.register('adminKey')}
          placeholder="Admin Key"
        />
      )}
    </form>
  );
}
```

---

### File Upload

```tsx
const schema = z.object({
  file: z.instanceof(FileList).refine((files) => files.length > 0, {
    message: 'File is required',
  }),
});

<input
  type="file"
  {...form.register('file')}
  accept="image/*"
/>

const onSubmit = (data: FormData) => {
  const file = data.file[0];  // FileList -> File
  const formData = new FormData();
  formData.append('file', file);
  // Upload formData
};
```

---

## Form Checklist

Before shipping a form, verify:

### Functionality
- [ ] All fields register correctly
- [ ] Validation works (test invalid inputs)
- [ ] Submit handler fires
- [ ] Loading state works
- [ ] Error messages display
- [ ] Success case redirects/shows success

### Accessibility
- [ ] Labels associated with inputs (`htmlFor` + `id`)
- [ ] Error messages use `aria-describedby`
- [ ] Invalid inputs have `aria-invalid`
- [ ] Focus order is logical (Tab through form)
- [ ] Submit button disabled during submission

### UX
- [ ] Field errors appear on blur or submit
- [ ] Loading state prevents double-submit
- [ ] Success message or redirect on success
- [ ] Cancel button clears form or navigates away
- [ ] Mobile-friendly (responsive layout)

---

## Next Steps

- **Interactive Examples**: [Form examples](/dev/forms)
- **Components**: [Form components](./02-components.md#form-components)
- **Accessibility**: [Form accessibility](./07-accessibility.md#forms)

---

**Related Documentation:**
- [Components](./02-components.md) - Input, Label, Button, Select
- [Layouts](./03-layouts.md) - Form layout patterns
- [Accessibility](./07-accessibility.md) - ARIA attributes for forms

**External Resources:**
- [react-hook-form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)

**Last Updated**: November 2, 2025
