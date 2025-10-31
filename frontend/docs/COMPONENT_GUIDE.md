# Component Guide

**Project**: Next.js + FastAPI Template
**Version**: 1.0
**Last Updated**: 2025-10-31

---

## Table of Contents

1. [shadcn/ui Components](#1-shadcn-ui-components)
2. [Custom Components](#2-custom-components)
3. [Component Composition](#3-component-composition)
4. [Customization](#4-customization)
5. [Accessibility](#5-accessibility)

---

## 1. shadcn/ui Components

### 1.1 Overview

This project uses [shadcn/ui](https://ui.shadcn.com), a collection of accessible, customizable components built on Radix UI primitives. Components are copied into the project (not installed as npm dependencies), giving you full control.

**Installation Method:**
```bash
npx shadcn@latest add button card input table dialog
```

### 1.2 Core Components

#### Button

```typescript
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconName /></Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// As Link
<Button asChild>
  <Link href="/users">View Users</Link>
</Button>
```

#### Card

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Users</CardTitle>
    <CardDescription>Manage system users</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Dialog / Modal

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete User</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this user? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button variant="destructive" onClick={onConfirm}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Form

```typescript
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';

const form = useForm();

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input placeholder="email@example.com" {...field} />
          </FormControl>
          <FormDescription>Your email address</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

#### Table

```typescript
import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell } from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.role}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### Toast / Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('User created successfully');

// Error
toast.error('Failed to delete user');

// Info
toast.info('Processing your request...');

// Loading
toast.loading('Saving changes...');

// Custom
toast('Event has been created', {
  description: 'Monday, January 3rd at 6:00pm',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
});
```

#### Tabs

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="profile">
  <TabsList>
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
    <TabsTrigger value="sessions">Sessions</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">
    <ProfileSettings />
  </TabsContent>
  <TabsContent value="password">
    <PasswordSettings />
  </TabsContent>
  <TabsContent value="sessions">
    <SessionManagement />
  </TabsContent>
</Tabs>
```

---

## 2. Custom Components

### 2.1 Layout Components

#### Header

```typescript
import { Header } from '@/components/layout/Header';

// Usage (in layout.tsx)
<Header />

// Features:
// - Logo/brand
// - Navigation links
// - User menu (avatar, name, dropdown)
// - Theme toggle
// - Mobile menu button
```

#### PageContainer

```typescript
import { PageContainer } from '@/components/layout/PageContainer';

<PageContainer>
  <h1>Page Title</h1>
  <p>Page content...</p>
</PageContainer>

// Provides:
// - Consistent padding
// - Max-width container
// - Responsive layout
```

#### PageHeader

```typescript
import { PageHeader } from '@/components/common/PageHeader';

<PageHeader
  title="Users"
  description="Manage system users"
  action={<Button>Create User</Button>}
/>
```

### 2.2 Data Display Components

#### DataTable

Generic, reusable data table with sorting, filtering, and pagination.

```typescript
import { DataTable } from '@/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';

// Define columns
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button onClick={() => handleEdit(row.original)}>Edit</Button>
    ),
  },
];

// Use DataTable
<DataTable
  columns={columns}
  data={users}
  searchKey="name"
  searchPlaceholder="Search users..."
/>
```

#### LoadingSpinner

```typescript
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Sizes
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />

// With text
<LoadingSpinner size="md" className="my-8">
  <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
</LoadingSpinner>
```

#### EmptyState

```typescript
import { EmptyState } from '@/components/common/EmptyState';

<EmptyState
  icon={<Users className="h-12 w-12" />}
  title="No users found"
  description="Get started by creating a new user"
  action={
    <Button onClick={() => router.push('/admin/users/new')}>
      Create User
    </Button>
  }
/>
```

### 2.3 Admin Components

#### UserTable

```typescript
import { UserTable } from '@/components/admin/UserTable';

<UserTable
  filters={{ search: 'john', is_active: true }}
  onUserSelect={(user) => console.log(user)}
/>

// Features:
// - Search
// - Filters (role, status)
// - Sorting
// - Pagination
// - Bulk selection
// - Bulk actions (activate, deactivate, delete)
```

#### UserForm

```typescript
import { UserForm } from '@/components/admin/UserForm';

// Create mode
<UserForm
  mode="create"
  onSuccess={() => router.push('/admin/users')}
/>

// Edit mode
<UserForm
  mode="edit"
  user={user}
  onSuccess={() => toast.success('User updated')}
/>

// Features:
// - Validation with Zod
// - Field errors
// - Loading states
// - Cancel/Submit actions
```

#### OrganizationTable

```typescript
import { OrganizationTable } from '@/components/admin/OrganizationTable';

<OrganizationTable />

// Features:
// - Search
// - Member count display
// - Actions (edit, delete, view members)
```

#### BulkActionBar

```typescript
import { BulkActionBar } from '@/components/admin/BulkActionBar';

<BulkActionBar
  selectedIds={selectedUserIds}
  onAction={(action) => handleBulkAction(action, selectedUserIds)}
  onClearSelection={() => setSelectedUserIds([])}
  actions={[
    { value: 'activate', label: 'Activate' },
    { value: 'deactivate', label: 'Deactivate' },
    { value: 'delete', label: 'Delete', variant: 'destructive' },
  ]}
/>

// Displays:
// - Selection count
// - Action dropdown
// - Confirmation dialogs
// - Progress indicators
```

### 2.4 Settings Components

#### ProfileSettings

```typescript
import { ProfileSettings } from '@/components/settings/ProfileSettings';

<ProfileSettings
  user={currentUser}
  onUpdate={(updatedUser) => console.log('Updated:', updatedUser)}
/>

// Fields:
// - First name, last name
// - Email (readonly)
// - Phone number
// - Avatar upload (optional)
// - Preferences
```

#### PasswordSettings

```typescript
import { PasswordSettings } from '@/components/settings/PasswordSettings';

<PasswordSettings />

// Fields:
// - Current password
// - New password
// - Confirm password
// - Option to logout all other devices
```

#### SessionManagement

```typescript
import { SessionManagement } from '@/components/settings/SessionManagement';

<SessionManagement />

// Features:
// - List all active sessions
// - Current session badge
// - Device icons
// - Location display
// - Last used timestamp
// - Revoke session button
// - Logout all other devices button
```

#### SessionCard

```typescript
import { SessionCard } from '@/components/settings/SessionCard';

<SessionCard
  session={session}
  isCurrent={session.is_current}
  onRevoke={() => revokeSession(session.id)}
/>

// Displays:
// - Device icon (desktop/mobile/tablet)
// - Device name
// - Location (city, country)
// - IP address
// - Last used (relative time)
// - "This device" badge if current
// - Revoke button (disabled for current)
```

### 2.5 Chart Components

#### BarChartCard

```typescript
import { BarChartCard } from '@/components/charts/BarChartCard';

<BarChartCard
  title="User Registrations"
  description="Monthly user registrations"
  data={[
    { month: 'Jan', count: 45 },
    { month: 'Feb', count: 52 },
    { month: 'Mar', count: 61 },
  ]}
  dataKey="count"
  xAxisKey="month"
/>
```

#### LineChartCard

```typescript
import { LineChartCard } from '@/components/charts/LineChartCard';

<LineChartCard
  title="Active Users"
  description="Daily active users over time"
  data={dailyActiveUsers}
  dataKey="count"
  xAxisKey="date"
  color="hsl(var(--primary))"
/>
```

#### PieChartCard

```typescript
import { PieChartCard } from '@/components/charts/PieChartCard';

<PieChartCard
  title="Users by Role"
  description="Distribution of user roles"
  data={[
    { name: 'Admin', value: 10 },
    { name: 'User', value: 245 },
    { name: 'Guest', value: 56 },
  ]}
/>
```

---

## 3. Component Composition

### 3.1 Form + Dialog Pattern

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create User</DialogTitle>
      <DialogDescription>
        Add a new user to the system
      </DialogDescription>
    </DialogHeader>
    <UserForm
      mode="create"
      onSuccess={() => {
        setIsOpen(false);
        queryClient.invalidateQueries(['users']);
      }}
      onCancel={() => setIsOpen(false)}
    />
  </DialogContent>
</Dialog>
```

### 3.2 Card + Table Pattern

```typescript
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage system users</CardDescription>
      </div>
      <Button onClick={() => router.push('/admin/users/new')}>
        Create User
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <UserTable />
  </CardContent>
</Card>
```

### 3.3 Tabs + Settings Pattern

```typescript
<Card>
  <CardHeader>
    <CardTitle>Account Settings</CardTitle>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="profile">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileSettings />
      </TabsContent>
      <TabsContent value="password">
        <PasswordSettings />
      </TabsContent>
      <TabsContent value="sessions">
        <SessionManagement />
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

### 3.4 Bulk Actions Pattern

```typescript
function UserList() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: users } = useUsers();

  return (
    <div>
      {selectedIds.length > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          onAction={handleBulkAction}
          onClearSelection={() => setSelectedIds([])}
        />
      )}
      <DataTable
        data={users}
        columns={columns}
        enableRowSelection
        onRowSelectionChange={setSelectedIds}
      />
    </div>
  );
}
```

---

## 4. Customization

### 4.1 Theming

Colors are defined in `tailwind.config.ts` using CSS variables:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ...
      },
    },
  },
};
```

**Customize colors in `globals.css`:**
```css
@layer base {
  :root {
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... */
  }

  .dark {
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... */
  }
}
```

### 4.2 Component Variants

Add new variants to existing components:

```typescript
// components/ui/button.tsx
const buttonVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: '...',
        destructive: '...',
        outline: '...',
        // Add custom variant
        success: 'bg-green-600 text-white hover:bg-green-700',
      },
    },
  }
);

// Usage
<Button variant="success">Activate</Button>
```

### 4.3 Extending Components

Create wrapper components:

```typescript
// components/common/ConfirmDialog.tsx
interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 5. Accessibility

### 5.1 Keyboard Navigation

All shadcn/ui components support keyboard navigation:
- `Tab`: Move focus
- `Enter`/`Space`: Activate
- `Escape`: Close dialogs/dropdowns
- Arrow keys: Navigate lists/menus

### 5.2 Screen Reader Support

Components include proper ARIA labels:

```typescript
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

<div role="status" aria-live="polite">
  Loading users...
</div>

<input
  aria-invalid={!!errors.email}
  aria-describedby="email-error"
/>
```

### 5.3 Focus Management

Dialog components automatically manage focus:
- Focus trap inside dialog
- Return focus on close
- Focus first focusable element

### 5.4 Color Contrast

All theme colors meet WCAG 2.1 Level AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio

---

## Conclusion

This guide covers the essential components in the project. For more details:
- **shadcn/ui docs**: https://ui.shadcn.com
- **Radix UI docs**: https://www.radix-ui.com
- **TanStack Table docs**: https://tanstack.com/table
- **Recharts docs**: https://recharts.org

For implementation examples, see `FEATURE_EXAMPLES.md`.
