# Feature Implementation Examples

**Project**: Next.js + FastAPI Template
**Version**: 1.0
**Last Updated**: 2025-10-31

---

## Table of Contents

1. [Example 1: User Management Feature](#example-1-user-management-feature)
2. [Example 2: Session Management Feature](#example-2-session-management-feature)
3. [Example 3: Adding Charts to Admin Dashboard](#example-3-adding-charts-to-admin-dashboard)

---

## Example 1: User Management Feature

This example shows how to implement a complete user management feature with list, create, edit, and delete functionality.

### Step 1: Create API Hooks

**File**: `src/lib/api/hooks/useUsers.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsersService, AdminService } from '@/lib/api/generated';
import type { User, CreateUserDto, UpdateUserDto } from '@/lib/api/generated/models';
import { toast } from 'sonner';
import { parseAPIError } from '@/lib/api/errors';

export interface UserFilters {
  search?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  page?: number;
  page_size?: number;
}

// Query: List users
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const response = await AdminService.getUsers({
        search: filters?.search,
        isActive: filters?.is_active,
        isSuperuser: filters?.is_superuser,
        page: filters?.page || 1,
        pageSize: filters?.page_size || 20,
      });
      return response;
    },
    staleTime: 60000, // 1 minute
  });
}

// Query: Single user
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => AdminService.getUser({ userId: userId! }),
    enabled: !!userId,
  });
}

// Mutation: Create user
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) =>
      AdminService.createUser({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error) => {
      const errors = parseAPIError(error);
      toast.error(errors[0]?.message || 'Failed to create user');
    },
  });
}

// Mutation: Update user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      AdminService.updateUser({ userId: id, requestBody: data }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error) => {
      const errors = parseAPIError(error);
      toast.error(errors[0]?.message || 'Failed to update user');
    },
  });
}

// Mutation: Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      AdminService.deleteUser({ userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      const errors = parseAPIError(error);
      toast.error(errors[0]?.message || 'Failed to delete user');
    },
  });
}

// Mutation: Activate/Deactivate user
export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      AdminService[isActive ? 'activateUser' : 'deactivateUser']({ userId }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (error) => {
      const errors = parseAPIError(error);
      toast.error(errors[0]?.message || 'Failed to update user status');
    },
  });
}

// Mutation: Bulk actions
export function useBulkUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, userIds }: { action: string; userIds: string[] }) =>
      AdminService.bulkUserAction({
        requestBody: { action, user_ids: userIds }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Bulk action completed successfully');
    },
    onError: (error) => {
      const errors = parseAPIError(error);
      toast.error(errors[0]?.message || 'Failed to perform bulk action');
    },
  });
}
```

### Step 2: Create User Table Component

**File**: `src/components/admin/UserTable.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers, useDeleteUser, useBulkUserAction } from '@/lib/api/hooks/useUsers';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '@/lib/api/generated/models';

export function UserTable() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
  });

  const { data, isLoading } = useUsers(filters);
  const deleteUser = useDeleteUser();
  const bulkAction = useBulkUserAction();

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
    },
    {
      accessorKey: 'first_name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.first_name} {row.original.last_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_superuser',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant={row.original.is_superuser ? 'default' : 'outline'}>
          {row.original.is_superuser ? 'Admin' : 'User'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push(`/admin/users/${row.original.id}`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleDelete = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser.mutate(userId);
    }
  };

  const handleBulkAction = async (action: string) => {
    bulkAction.mutate({ action, userIds: selectedIds });
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          onAction={handleBulkAction}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        searchKey="first_name"
        searchPlaceholder="Search users..."
        isLoading={isLoading}
        pagination={data?.pagination}
        onPaginationChange={(page) => setFilters({ ...filters, page })}
        onRowSelectionChange={setSelectedIds}
      />
    </div>
  );
}
```

### Step 3: Create User Form Component

**File**: `src/components/admin/UserForm.tsx`

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateUser, useUpdateUser } from '@/lib/api/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { User } from '@/lib/api/generated/models';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  is_active: z.boolean().default(true),
  is_superuser: z.boolean().default(false),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: user || {
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      is_active: true,
      is_superuser: false,
    },
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      if (user) {
        await updateUser.mutateAsync({ id: user.id, data });
      } else {
        await createUser.mutateAsync(data);
      }
      onSuccess?.();
    } catch (error) {
      // Error handling is done in hooks
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!user && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="John" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">Active</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_superuser"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">Admin</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={createUser.isPending || updateUser.isPending}
          >
            {createUser.isPending || updateUser.isPending
              ? 'Saving...'
              : user
              ? 'Update'
              : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### Step 4: Create User List Page

**File**: `src/app/(authenticated)/admin/users/page.tsx`

```typescript
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { UserTable } from '@/components/admin/UserTable';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage application users',
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage application users"
        action={
          <Button asChild>
            <Link href="/admin/users/new">Create User</Link>
          </Button>
        }
      />

      <UserTable />
    </div>
  );
}
```

### Step 5: Create User Detail Page

**File**: `src/app/(authenticated)/admin/users/[id]/page.tsx`

```typescript
import { Metadata } from 'next';
import { UserForm } from '@/components/admin/UserForm';
import { PageHeader } from '@/components/common/PageHeader';

export const metadata: Metadata = {
  title: 'Edit User',
  description: 'Edit user details',
};

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Edit User" description="Update user details" />

      <div className="max-w-2xl">
        <UserForm userId={params.id} />
      </div>
    </div>
  );
}
```

### Step 6: Create New User Page

**File**: `src/app/(authenticated)/admin/users/new/page.tsx`

```typescript
import { Metadata } from 'next';
import { UserForm } from '@/components/admin/UserForm';
import { PageHeader } from '@/components/common/PageHeader';

export const metadata: Metadata = {
  title: 'Create User',
  description: 'Add a new user',
};

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Create User" description="Add a new user to the system" />

      <div className="max-w-2xl">
        <UserForm />
      </div>
    </div>
  );
}
```

### Testing the Feature

**Test the user management flow:**
1. Navigate to `/admin/users`
2. Search for users
3. Click "Create User" and fill the form
4. Edit an existing user
5. Delete a user (with confirmation)
6. Test bulk actions (select multiple users, activate/deactivate)
7. Test pagination

---

## Example 2: Session Management Feature

This example shows how to implement per-device session management.

### Step 1: Create Session Hooks

**File**: `src/lib/api/hooks/useSessions.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SessionsService } from '@/lib/api/generated';
import { toast } from 'sonner';
import { parseAPIError } from '@/lib/api/errors';

// Query: List my sessions
export function useMySessions() {
  return useQuery({
    queryKey: ['sessions', 'me'],
    queryFn: () => SessionsService.getMySessions(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Mutation: Revoke session
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      SessionsService.revokeSession({ sessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session revoked successfully');
    },
    onError: (error) => {
      const errors = parseAPIError(error);
      toast.error(errors[0]?.message || 'Failed to revoke session');
    },
  });
}

// Mutation: Logout all devices
export function useLogoutAllDevices() {
  return useMutation({
    mutationFn: () => AuthService.logoutAll(),
    onSuccess: () => {
      // This will logout the user
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    },
    onError: (error) => {
      const errors = parseAPIError(error);
      toast.error(errors[0]?.message || 'Failed to logout all devices');
    },
  });
}
```

### Step 2: Create Session Card Component

**File**: `src/components/settings/SessionCard.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { UserSession } from '@/lib/api/generated/models';

interface SessionCardProps {
  session: UserSession;
  onRevoke: () => void;
  isRevoking?: boolean;
}

export function SessionCard({ session, onRevoke, isRevoking }: SessionCardProps) {
  const getDeviceIcon = () => {
    const deviceName = session.device_name?.toLowerCase() || '';
    if (deviceName.includes('mobile') || deviceName.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (deviceName.includes('tablet') || deviceName.includes('ipad')) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getLocation = () => {
    const parts = [];
    if (session.location_city) parts.push(session.location_city);
    if (session.location_country) parts.push(session.location_country);
    return parts.join(', ') || 'Unknown location';
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-start space-x-4">
          <div className="p-2 rounded-lg bg-muted">
            {getDeviceIcon()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <p className="font-medium">
                {session.device_name || 'Unknown Device'}
              </p>
              {session.is_current && (
                <Badge variant="success">This device</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {getLocation()}
            </p>

            <p className="text-xs text-muted-foreground">
              IP: {session.ip_address || 'Unknown'}
            </p>

            <p className="text-xs text-muted-foreground">
              Last used {formatDistanceToNow(new Date(session.last_used_at))} ago
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRevoke}
          disabled={session.is_current || isRevoking}
        >
          {isRevoking ? 'Revoking...' : 'Revoke'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Create Session Management Component

**File**: `src/components/settings/SessionManagement.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useMySessions, useRevokeSession, useLogoutAllDevices } from '@/lib/api/hooks/useSessions';
import { SessionCard } from './SessionCard';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Smartphone } from 'lucide-react';

export function SessionManagement() {
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);
  const { data: sessions, isLoading } = useMySessions();
  const revokeSession = useRevokeSession();
  const logoutAll = useLogoutAllDevices();

  const otherSessions = sessions?.filter(s => !s.is_current) || [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Active Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Manage your active sessions across devices
          </p>
        </div>

        {otherSessions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowLogoutAllDialog(true)}
          >
            Logout All Other Devices
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {sessions?.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            onRevoke={() => revokeSession.mutate(session.id)}
            isRevoking={revokeSession.isPending}
          />
        ))}
      </div>

      {sessions?.length === 0 && (
        <EmptyState
          icon={<Smartphone />}
          title="No active sessions"
          description="You don't have any active sessions"
        />
      )}

      <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout All Other Devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log you out of all other devices. You'll remain logged in on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => logoutAll.mutate()}>
              Logout All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### Step 4: Create Sessions Page

**File**: `src/app/(authenticated)/settings/sessions/page.tsx`

```typescript
import { Metadata } from 'next';
import { SessionManagement } from '@/components/settings/SessionManagement';

export const metadata: Metadata = {
  title: 'Sessions',
  description: 'Manage your active sessions',
};

export default function SessionsPage() {
  return <SessionManagement />;
}
```

---

## Example 3: Adding Charts to Admin Dashboard

This example shows how to add charts to the admin dashboard.

### Step 1: Create Chart Components (if not exists)

**File**: `src/components/charts/LineChartCard.tsx`

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartCardProps {
  title: string;
  description?: string;
  data: any[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
}

export function LineChartCard({
  title,
  description,
  data,
  dataKey,
  xAxisKey,
  color = 'hsl(var(--primary))',
}: LineChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Create Admin Stats Hook

**File**: `src/lib/api/hooks/useAdminStats.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_organizations: number;
  user_growth: Array<{ date: string; count: number }>;
  org_growth: Array<{ date: string; count: number }>;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<AdminStats>('/admin/stats');
      return response.data;
    },
    staleTime: 300000, // 5 minutes
  });
}
```

### Step 3: Create Admin Dashboard Page

**File**: `src/app/(authenticated)/admin/page.tsx`

```typescript
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { Users, Building, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin statistics and overview',
};

// Note: This would be a client component in real implementation
// to use useAdminStats hook
export default function AdminDashboardPage() {
  // const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +20% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,180</div>
            <p className="text-xs text-muted-foreground">
              95.6% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              +5 this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <LineChartCard
          title="User Growth"
          description="New user registrations over time"
          data={[
            { date: 'Jan', count: 45 },
            { date: 'Feb', count: 52 },
            { date: 'Mar', count: 61 },
            { date: 'Apr', count: 70 },
            { date: 'May', count: 85 },
            { date: 'Jun', count: 95 },
          ]}
          dataKey="count"
          xAxisKey="date"
        />

        <LineChartCard
          title="Organization Growth"
          description="New organizations created"
          data={[
            { date: 'Jan', count: 5 },
            { date: 'Feb', count: 8 },
            { date: 'Mar', count: 12 },
            { date: 'Apr', count: 15 },
            { date: 'May', count: 18 },
            { date: 'Jun', count: 22 },
          ]}
          dataKey="count"
          xAxisKey="date"
          color="hsl(var(--destructive))"
        />
      </div>
    </div>
  );
}
```

---

## Conclusion

These examples demonstrate:
1. **Complete CRUD operations** (User Management)
2. **Real-time data with polling** (Session Management)
3. **Data visualization** (Admin Dashboard Charts)

Each example follows the established patterns:
- API hooks for data fetching
- Reusable components
- Proper error handling
- Loading states
- Type safety with TypeScript

For more patterns and best practices, refer to:
- **ARCHITECTURE.md**: System design
- **CODING_STANDARDS.md**: Code style
- **COMPONENT_GUIDE.md**: Component usage
- **API_INTEGRATION.md**: API patterns
