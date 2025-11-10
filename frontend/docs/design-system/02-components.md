# Components

**Master the shadcn/ui component library**: Learn all variants, composition patterns, and when to use each component. This is your complete reference for building consistent interfaces.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Form Components](#form-components)
4. [Feedback Components](#feedback-components)
5. [Overlay Components](#overlay-components)
6. [Data Display Components](#data-display-components)
7. [Composition Patterns](#composition-patterns)
8. [Quick Reference](#quick-reference)

---

## Overview

### About shadcn/ui

We use **[shadcn/ui](https://ui.shadcn.com)**, a collection of accessible, customizable components built on **Radix UI primitives**.

**Key features:**

- ✅ **Accessible** - WCAG AA compliant, keyboard navigation, screen reader support
- ✅ **Customizable** - Components are copied into your project (not npm dependencies)
- ✅ **Composable** - Build complex UIs from simple primitives
- ✅ **Dark mode** - All components work in light and dark modes
- ✅ **Type-safe** - Full TypeScript support

### Installation Method

```bash
# Add new components
npx shadcn@latest add button card input dialog

# List available components
npx shadcn@latest add
```

**Installed components** (in `/src/components/ui/`):

- alert, avatar, badge, button, card, checkbox, dialog
- dropdown-menu, input, label, popover, select, separator
- sheet, skeleton, table, tabs, textarea, toast

---

## Core Components

### Button

**Purpose**: Trigger actions, navigate, submit forms

```tsx
import { Button } from '@/components/ui/button';

// Variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Subtle Action</Button>
<Button variant="link">Link Style</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon className="h-4 w-4" /></Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// As Link (Next.js)
<Button asChild>
  <Link href="/users">View Users</Link>
</Button>
```

**When to use each variant:**

| Variant       | Use Case                | Example                    |
| ------------- | ----------------------- | -------------------------- |
| `default`     | Primary actions, CTAs   | Save, Submit, Create       |
| `secondary`   | Secondary actions       | Cancel, Back               |
| `outline`     | Alternative actions     | View Details, Edit         |
| `ghost`       | Subtle actions in lists | Icon buttons in table rows |
| `link`        | In-text actions         | Read more, Learn more      |
| `destructive` | Delete, remove actions  | Delete Account, Remove     |

**Accessibility**:

- Always add `aria-label` for icon-only buttons
- Use `disabled` for unavailable actions (not hidden)
- Loading state prevents double-submission

**[See live examples](/dev/components#button)**

---

### Badge

**Purpose**: Labels, tags, status indicators

```tsx
import { Badge } from '@/components/ui/badge';

// Variants
<Badge variant="default">New</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="outline">Pending</Badge>
<Badge variant="destructive">Critical</Badge>

// Custom colors (use sparingly)
<Badge className="bg-green-600 text-white">Active</Badge>
<Badge className="bg-yellow-600 text-white">Warning</Badge>
```

**Common patterns:**

```tsx
// Status badge
{user.is_active ? (
  <Badge variant="default">Active</Badge>
) : (
  <Badge variant="secondary">Inactive</Badge>
)}

// Count badge
<Badge variant="secondary">{itemCount}</Badge>

// Role badge
<Badge variant="outline">{user.role}</Badge>
```

---

### Avatar

**Purpose**: User profile pictures, placeholders

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// With image
<Avatar>
  <AvatarImage src="/avatars/user.jpg" alt="John Doe" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>

// Fallback only (initials)
<Avatar>
  <AvatarFallback>AB</AvatarFallback>
</Avatar>

// Sizes (custom classes)
<Avatar className="h-8 w-8">...</Avatar>
<Avatar className="h-12 w-12">...</Avatar>
<Avatar className="h-16 w-16">...</Avatar>
```

**Pattern: User menu**:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar>
      <AvatarImage src={user.avatar} />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Card

**Purpose**: Container for related content, groups information

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';

// Basic card
<Card>
  <CardHeader>
    <CardTitle>Users</CardTitle>
    <CardDescription>Manage system users</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>View All</Button>
  </CardFooter>
</Card>

// Minimal card (content only)
<Card className="p-6">
  <h3 className="text-lg font-semibold mb-2">Quick Stats</h3>
  <p className="text-3xl font-bold">1,234</p>
</Card>
```

**Common patterns:**

```tsx
// Card with action button in header
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Last 7 days</CardDescription>
      </div>
      <Button variant="outline" size="sm">View All</Button>
    </div>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
</Card>

// Dashboard metric card
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">
      Total Revenue
    </CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$45,231.89</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

---

### Separator

**Purpose**: Visual divider between content sections

```tsx
import { Separator } from '@/components/ui/separator';

// Horizontal (default)
<div className="space-y-4">
  <div>Section 1</div>
  <Separator />
  <div>Section 2</div>
</div>

// Vertical
<div className="flex gap-4">
  <div>Left</div>
  <Separator orientation="vertical" className="h-12" />
  <div>Right</div>
</div>

// Decorative (for screen readers)
<Separator decorative />
```

---

## Form Components

### Input

**Purpose**: Text input, email, password, etc.

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Basic input
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
  />
</div>

// With error state
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <Input
    id="password"
    type="password"
    aria-invalid={!!errors.password}
    aria-describedby={errors.password ? 'password-error' : undefined}
    className={errors.password ? 'border-destructive' : ''}
  />
  {errors.password && (
    <p id="password-error" className="text-sm text-destructive">
      {errors.password.message}
    </p>
  )}
</div>

// Disabled
<Input disabled placeholder="Disabled input" />

// Read-only
<Input readOnly value="Read-only value" />
```

**Input types:**

- `text` - Default text input
- `email` - Email address
- `password` - Password field
- `number` - Numeric input
- `tel` - Telephone number
- `url` - URL input
- `search` - Search field

**See [Forms Guide](./06-forms.md) for complete form patterns**

---

### Textarea

**Purpose**: Multi-line text input

```tsx
import { Textarea } from '@/components/ui/textarea';

<div className="space-y-2">
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    placeholder="Enter description..."
    rows={4}
  />
</div>

// With character count
<div className="space-y-2">
  <Label htmlFor="bio">Bio</Label>
  <Textarea
    id="bio"
    maxLength={500}
    value={bio}
    onChange={(e) => setBio(e.target.value)}
  />
  <p className="text-xs text-muted-foreground text-right">
    {bio.length} / 500 characters
  </p>
</div>
```

---

### Select

**Purpose**: Dropdown selection

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';

<div className="space-y-2">
  <Label htmlFor="role">Role</Label>
  <Select onValueChange={setRole} defaultValue={role}>
    <SelectTrigger id="role">
      <SelectValue placeholder="Select a role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="user">User</SelectItem>
      <SelectItem value="guest">Guest</SelectItem>
    </SelectContent>
  </Select>
</div>

// With groups
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select timezone" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>North America</SelectLabel>
      <SelectItem value="est">Eastern Time</SelectItem>
      <SelectItem value="cst">Central Time</SelectItem>
      <SelectItem value="pst">Pacific Time</SelectItem>
    </SelectGroup>
    <SelectGroup>
      <SelectLabel>Europe</SelectLabel>
      <SelectItem value="gmt">GMT</SelectItem>
      <SelectItem value="cet">CET</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

---

### Checkbox

**Purpose**: Boolean selection, multi-select

```tsx
import { Checkbox } from '@/components/ui/checkbox';

// Basic checkbox
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>

// With controlled state
<div className="flex items-center space-x-2">
  <Checkbox
    id="newsletter"
    checked={subscribed}
    onCheckedChange={setSubscribed}
  />
  <Label htmlFor="newsletter">Subscribe to newsletter</Label>
</div>

// Indeterminate state (select all)
<Checkbox
  checked={selectedAll}
  onCheckedChange={handleSelectAll}
  indeterminate={someSelected}
/>
```

---

### Label

**Purpose**: Form field labels (accessibility)

```tsx
import { Label } from '@/components/ui/label';

// Basic label
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />

// With required indicator
<Label htmlFor="password">
  Password <span className="text-destructive">*</span>
</Label>
<Input id="password" type="password" required />

// With helper text
<div className="space-y-2">
  <Label htmlFor="username">Username</Label>
  <Input id="username" />
  <p className="text-sm text-muted-foreground">
    Choose a unique username (3-20 characters)
  </p>
</div>
```

**Accessibility**: Always associate labels with inputs using `htmlFor` and `id`.

---

## Feedback Components

### Alert

**Purpose**: Important messages, notifications

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

// Info alert (default)
<Alert>
  <Info className="h-4 w-4" />
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

// Success alert (custom)
<Alert className="bg-green-50 text-green-900 border-green-200">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>
    Your changes have been saved.
  </AlertDescription>
</Alert>

// Minimal alert (description only)
<Alert>
  <AlertDescription>
    Session will expire in 5 minutes.
  </AlertDescription>
</Alert>
```

**When to use:**

- ✅ Form-level errors
- ✅ Important warnings
- ✅ Success confirmations (inline)
- ❌ Don't use for transient notifications (use Toast)

---

### Toast (Sonner)

**Purpose**: Transient notifications, feedback

```tsx
import { toast } from 'sonner';

// Success
toast.success('User created successfully');

// Error
toast.error('Failed to delete user');

// Info
toast.info('Processing your request...');

// Warning
toast.warning('This action cannot be undone');

// Loading (with promise)
toast.promise(saveChanges(), {
  loading: 'Saving changes...',
  success: 'Changes saved!',
  error: 'Failed to save changes',
});

// Custom with action
toast('Event has been created', {
  description: 'Monday, January 3rd at 6:00pm',
  action: {
    label: 'Undo',
    onClick: () => undoAction(),
  },
});

// Dismiss all toasts
toast.dismiss();
```

**When to use:**

- ✅ Action confirmations (saved, deleted)
- ✅ Background task updates
- ✅ Temporary errors
- ❌ Critical errors (use Alert)
- ❌ Form validation errors (use inline errors)

---

### Skeleton

**Purpose**: Loading placeholders

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Basic skeleton
<Skeleton className="h-12 w-full" />

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-1/2 mt-2" />
  </CardHeader>
  <CardContent className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </CardContent>
</Card>

// Avatar skeleton
<Skeleton className="h-12 w-12 rounded-full" />

// Table skeleton
<Table>
  <TableBody>
    {[...Array(5)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Pattern: Loading states**:

```tsx
{
  isLoading ? <Skeleton className="h-48 w-full" /> : <div>{content}</div>;
}
```

---

## Overlay Components

### Dialog

**Purpose**: Modal windows, confirmations, forms

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

// Basic dialog
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to proceed? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button variant="destructive" onClick={handleConfirm}>
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;

// Controlled dialog
const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create User</DialogTitle>
    </DialogHeader>
    <UserForm
      onSuccess={() => {
        setIsOpen(false);
        toast.success('User created');
      }}
    />
  </DialogContent>
</Dialog>;
```

**Accessibility:**

- Escape key closes dialog
- Focus trapped inside dialog
- Returns focus to trigger on close

---

### Dropdown Menu

**Purpose**: Action menus, user menus, context menus

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';

// Basic dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleEdit}>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDuplicate}>
      <Copy className="mr-2 h-4 w-4" />
      Duplicate
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
      <Trash className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// User menu
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar>
      <AvatarImage src={user.avatar} />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// With checkboxes
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">View Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuCheckboxItem
      checked={showName}
      onCheckedChange={setShowName}
    >
      Name
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem
      checked={showEmail}
      onCheckedChange={setShowEmail}
    >
      Email
    </DropdownMenuCheckboxItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Popover

**Purpose**: Contextual information, mini-forms

```tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

// Basic popover
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-2">
      <h4 className="font-medium">Popover Title</h4>
      <p className="text-sm text-muted-foreground">
        Popover content goes here
      </p>
    </div>
  </PopoverContent>
</Popover>

// With form
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Add Tag</Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tag">Tag Name</Label>
        <Input id="tag" placeholder="Enter tag name" />
      </div>
      <Button className="w-full">Add Tag</Button>
    </div>
  </PopoverContent>
</Popover>
```

---

### Sheet

**Purpose**: Side panels, mobile navigation

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';

// Basic sheet
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open Sheet</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
      <SheetDescription>
        Sheet description goes here
      </SheetDescription>
    </SheetHeader>
    <div className="py-4">
      {/* Content */}
    </div>
    <SheetFooter>
      <SheetClose asChild>
        <Button>Close</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>

// Side variants
<SheetContent side="left">...</SheetContent>
<SheetContent side="right">...</SheetContent>  {/* Default */}
<SheetContent side="top">...</SheetContent>
<SheetContent side="bottom">...</SheetContent>

// Mobile navigation pattern
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="md:hidden">
      <Menu className="h-6 w-6" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <nav className="flex flex-col gap-4">
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/contact">Contact</Link>
    </nav>
  </SheetContent>
</Sheet>
```

---

## Data Display Components

### Table

**Purpose**: Display tabular data

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

<Table>
  <TableCaption>A list of your recent invoices</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Method</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {invoices.map((invoice) => (
      <TableRow key={invoice.id}>
        <TableCell className="font-medium">{invoice.id}</TableCell>
        <TableCell>{invoice.status}</TableCell>
        <TableCell>{invoice.method}</TableCell>
        <TableCell className="text-right">{invoice.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
  <TableFooter>
    <TableRow>
      <TableCell colSpan={3}>Total</TableCell>
      <TableCell className="text-right">$2,500.00</TableCell>
    </TableRow>
  </TableFooter>
</Table>;
```

**For advanced tables** (sorting, filtering, pagination), use **TanStack Table** with react-hook-form.

---

### Tabs

**Purpose**: Organize content into switchable panels

```tsx
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

// Full-width tabs
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
</TabsList>
```

---

## Composition Patterns

### Pattern 1: Card + Table

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage system users</CardDescription>
      </div>
      <Button onClick={() => router.push('/users/new')}>
        <Plus className="mr-2 h-4 w-4" />
        Create User
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

---

### Pattern 2: Dialog + Form

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Create User</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New User</DialogTitle>
      <DialogDescription>Add a new user to the system</DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

### Pattern 3: Tabs + Cards

```tsx
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

      <TabsContent value="profile" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" />
        </div>
        <Button>Save Changes</Button>
      </TabsContent>

      <TabsContent value="password" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Current Password</Label>
          <Input id="current" type="password" />
        </div>
        <Button>Update Password</Button>
      </TabsContent>

      <TabsContent value="sessions">
        <SessionList />
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

---

### Pattern 4: Dropdown + Table Row Actions

```tsx
<Table>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleView(user)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(user)} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Quick Reference

### Component Decision Tree

```
Need to trigger an action? → Button
Need to show status/label? → Badge
Need to display user image? → Avatar
Need to group content? → Card
Need to divide sections? → Separator

Need text input? → Input
Need multi-line input? → Textarea
Need dropdown selection? → Select
Need boolean option? → Checkbox
Need to label a field? → Label

Need important message? → Alert
Need transient notification? → Toast
Need loading placeholder? → Skeleton

Need modal/confirmation? → Dialog
Need action menu? → Dropdown Menu
Need contextual info? → Popover
Need side panel? → Sheet

Need tabular data? → Table
Need switchable panels? → Tabs
```

---

### Component Variants Quick Reference

**Button**:

- `default` - Primary action
- `secondary` - Secondary action
- `outline` - Alternative action
- `ghost` - Subtle action
- `link` - In-text action
- `destructive` - Delete/remove

**Badge**:

- `default` - Blue (new, active)
- `secondary` - Gray (draft, inactive)
- `outline` - Bordered (pending)
- `destructive` - Red (critical, error)

**Alert**:

- `default` - Info
- `destructive` - Error

---

## Next Steps

- **Interactive Examples**: [Component Showcase](/dev/components)
- **Form Patterns**: [Forms Guide](./06-forms.md)
- **Component Creation**: [Build custom components](./05-component-creation.md)
- **Accessibility**: [Accessibility Guide](./07-accessibility.md)

---

**Related Documentation:**

- [Quick Start](./00-quick-start.md) - Essential patterns
- [Foundations](./01-foundations.md) - Colors, typography, spacing
- [Layouts](./03-layouts.md) - Layout patterns
- [Forms](./06-forms.md) - Form validation and patterns

**External Resources:**

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)

**Last Updated**: November 2, 2025
