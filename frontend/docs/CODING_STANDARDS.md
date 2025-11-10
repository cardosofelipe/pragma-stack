# Frontend Coding Standards

**Project**: Next.js + FastAPI Template
**Version**: 1.0
**Last Updated**: 2025-10-31
**Status**: Enforced

---

## Table of Contents

1. [TypeScript Standards](#1-typescript-standards)
2. [React Component Standards](#2-react-component-standards)
3. [Naming Conventions](#3-naming-conventions)
4. [File Organization](#4-file-organization)
5. [State Management](#5-state-management)
6. [API Integration](#6-api-integration)
7. [Form Handling](#7-form-handling)
8. [Styling Standards](#8-styling-standards)
9. [Error Handling](#9-error-handling)
10. [Testing Standards](#10-testing-standards)
11. [Accessibility Standards](#11-accessibility-standards)
12. [Performance Best Practices](#12-performance-best-practices)
13. [Security Best Practices](#13-security-best-practices)
14. [Code Review Checklist](#14-code-review-checklist)

---

## 1. TypeScript Standards

### 1.1 General Principles

**✅ DO:**

- Enable strict mode in `tsconfig.json`
- Define explicit types for all function parameters and return values
- Use TypeScript's type inference where obvious
- Prefer `interface` for object shapes, `type` for unions/primitives
- Use generics for reusable, type-safe components and functions

**❌ DON'T:**

- Use `any` (use `unknown` if type is truly unknown)
- Use `as any` casts (refactor to proper types)
- Use `@ts-ignore` or `@ts-nocheck` (fix the underlying issue)
- Leave implicit `any` types

### 1.2 Interfaces vs Types

**Use `interface` for object shapes:**

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface UserFormProps {
  user?: User;
  onSubmit: (data: User) => void;
  isLoading?: boolean;
}
```

**Use `type` for unions, intersections, and primitives:**

```typescript
// ✅ Good
type UserRole = 'admin' | 'user' | 'guest';
type UserId = string;
type UserOrNull = User | null;
type UserWithPermissions = User & { permissions: string[] };
```

### 1.3 Function Signatures

**Always type function parameters and return values:**

```typescript
// ✅ Good
function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

async function fetchUser(id: string): Promise<User> {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
}

// ❌ Bad
function formatUserName(user) {
  // Implicit any
  return `${user.firstName} ${user.lastName}`;
}
```

### 1.4 Generics

**Use generics for reusable, type-safe code:**

```typescript
// ✅ Good: Generic data table
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ data, columns, onRowClick }: DataTableProps<T>) {
  // Implementation
}

// Usage is fully type-safe
<DataTable<User> data={users} columns={userColumns} />
```

### 1.5 Unknown vs Any

**Use `unknown` for truly unknown types:**

```typescript
// ✅ Good: Force type checking
function parseJSON(jsonString: string): unknown {
  return JSON.parse(jsonString);
}

const result = parseJSON('{"name": "John"}');
// Must narrow type before use
if (typeof result === 'object' && result !== null && 'name' in result) {
  console.log(result.name);
}

// ❌ Bad: Bypasses all type checking
function parseJSON(jsonString: string): any {
  return JSON.parse(jsonString);
}
```

### 1.6 Type Guards

**Create type guards for runtime type checking:**

```typescript
// ✅ Good
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'email' in value;
}

// Usage
if (isUser(data)) {
  // TypeScript knows data is User here
  console.log(data.email);
}
```

### 1.7 Utility Types

**Use TypeScript utility types:**

```typescript
// Partial - make all properties optional
type UserUpdate = Partial<User>;

// Pick - select specific properties
type UserPreview = Pick<User, 'id' | 'name' | 'email'>;

// Omit - exclude specific properties
type UserWithoutPassword = Omit<User, 'password'>;

// Record - create object type with specific keys
type UserRolePermissions = Record<UserRole, string[]>;

// Extract - extract from union
type AdminRole = Extract<UserRole, 'admin'>;

// Exclude - exclude from union
type NonAdminRole = Exclude<UserRole, 'admin'>;
```

---

## 2. React Component Standards

### 2.1 Component Structure

**Standard component template:**

```typescript
// 1. Imports (React, external libs, internal, types, styles)
'use client';  // If client component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/lib/api/hooks/useUsers';

// 2. Types
interface UserListProps {
  initialFilters?: UserFilters;
  onUserSelect?: (user: User) => void;
  className?: string;
}

// 3. Component
export function UserList({
  initialFilters,
  onUserSelect,
  className
}: UserListProps) {
  // 3a. Hooks (state, effects, router, query)
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const { data, isLoading, error } = useUsers(filters);

  // 3b. Derived state
  const hasUsers = data && data.length > 0;
  const isEmpty = !isLoading && !hasUsers;

  // 3c. Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // 3d. Event handlers
  const handleUserClick = (user: User) => {
    onUserSelect?.(user);
  };

  // 3e. Render conditions
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (isEmpty) return <EmptyState message="No users found" />;

  // 3f. Main render
  return (
    <div className={className}>
      {/* JSX */}
    </div>
  );
}
```

### 2.2 Server Components vs Client Components

**Server Components by default:**

```typescript
// ✅ Good: Server Component (default)
// app/(authenticated)/users/page.tsx
export default async function UsersPage() {
  // Could fetch data here, but we use client components with React Query
  return (
    <div>
      <PageHeader title="Users" />
      <UserList />
    </div>
  );
}
```

**Client Components only when needed:**

```typescript
// ✅ Good: Client Component (interactive)
'use client';

import { useState } from 'react';
import { useUsers } from '@/lib/api/hooks/useUsers';

export function UserList() {
  const [search, setSearch] = useState('');
  const { data } = useUsers({ search });

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {/* Render users */}
    </div>
  );
}
```

**When to use Client Components:**

- Using React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (window, document, localStorage)
- React Context consumers

### 2.3 Props

**Always type props explicitly:**

```typescript
// ✅ Good: Explicit interface
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Button({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  className,
}: ButtonProps) {
  // Implementation
}
```

**Destructure props in function signature:**

```typescript
// ✅ Good
function UserCard({ user, onEdit }: UserCardProps) {
  return <div>{user.name}</div>;
}

// ❌ Bad
function UserCard(props: UserCardProps) {
  return <div>{props.user.name}</div>;
}
```

**Allow className override:**

```typescript
// ✅ Good: Allow consumers to add classes
interface CardProps {
  title: string;
  className?: string;
}

export function Card({ title, className }: CardProps) {
  return (
    <div className={cn('default-classes', className)}>
      {title}
    </div>
  );
}
```

### 2.4 Composition Over Prop Drilling

**Use composition patterns:**

```typescript
// ✅ Good: Composition
<Card>
  <CardHeader>
    <CardTitle>Users</CardTitle>
    <CardDescription>Manage system users</CardDescription>
  </CardHeader>
  <CardContent>
    <UserTable />
  </CardContent>
  <CardFooter>
    <Button>Create User</Button>
  </CardFooter>
</Card>

// ❌ Bad: Complex props
<Card
  title="Users"
  description="Manage system users"
  content={<UserTable />}
  footerAction={<Button>Create User</Button>}
/>
```

### 2.5 Named Exports vs Default Exports

**Prefer named exports:**

```typescript
// ✅ Good: Named export
export function UserList() {
  // Implementation
}

// Easier to refactor, better IDE support, explicit imports
import { UserList } from './UserList';

// ❌ Avoid: Default export
export default function UserList() {
  // Implementation
}

// Can be renamed on import, less explicit
import WhateverName from './UserList';
```

**Exception: Next.js pages must use default export**

```typescript
// pages and route handlers require default export
export default function UsersPage() {
  return <div>Users</div>;
}
```

### 2.6 Custom Hooks

**Extract reusable logic:**

```typescript
// ✅ Good: Custom hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { data } = useUsers({ search: debouncedSearch });

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

**Hook naming: Always prefix with "use":**

```typescript
// ✅ Good
function useAuth() {}
function useUsers() {}
function useDebounce() {}

// ❌ Bad
function auth() {}
function getUsers() {}
```

---

## 3. Naming Conventions

### 3.1 Files and Directories

| Type            | Convention                      | Example                                 |
| --------------- | ------------------------------- | --------------------------------------- |
| Components      | PascalCase                      | `UserTable.tsx`, `LoginForm.tsx`        |
| Hooks           | camelCase with `use` prefix     | `useAuth.ts`, `useDebounce.ts`          |
| Utilities       | camelCase                       | `formatDate.ts`, `parseError.ts`        |
| Types           | camelCase                       | `user.ts`, `api.ts`                     |
| Constants       | camelCase or UPPER_SNAKE_CASE   | `constants.ts`, `API_ENDPOINTS.ts`      |
| Stores          | camelCase with `Store` suffix   | `authStore.ts`, `uiStore.ts`            |
| Services        | camelCase with `Service` suffix | `authService.ts`, `adminService.ts`     |
| Pages (Next.js) | lowercase                       | `page.tsx`, `layout.tsx`, `loading.tsx` |

### 3.2 Variables and Functions

**Variables:**

```typescript
// ✅ Good: camelCase
const userName = 'John';
const isAuthenticated = true;
const userList = [];

// ❌ Bad
const UserName = 'John'; // PascalCase for variable
const user_name = 'John'; // snake_case
```

**Functions:**

```typescript
// ✅ Good: camelCase, descriptive verb + noun
function getUserById(id: string): User {}
function formatDate(date: Date): string {}
function handleSubmit(data: FormData): void {}

// ❌ Bad
function User(id: string) {} // Looks like a class
function get_user(id: string) {} // snake_case
function gub(id: string) {} // Not descriptive
```

**Event Handlers:**

```typescript
// ✅ Good: handle + EventName
const handleClick = () => {};
const handleSubmit = () => {};
const handleInputChange = () => {};

// ❌ Bad
const onClick = () => {}; // Confusing with prop name
const submit = () => {};
```

**Boolean Variables:**

```typescript
// ✅ Good: is/has/should prefix
const isLoading = true;
const hasError = false;
const shouldRedirect = true;
const canEdit = false;

// ❌ Bad
const loading = true;
const error = false;
```

### 3.3 Constants

**Use UPPER_SNAKE_CASE for true constants:**

```typescript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;

// Constants object
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;
```

### 3.4 Types and Interfaces

**PascalCase for types and interfaces:**

```typescript
// ✅ Good
interface User {}
interface UserFormProps {}
type UserId = string;
type UserRole = 'admin' | 'user';

// ❌ Bad
interface user {}
interface user_form_props {}
type userId = string;
```

---

## 4. File Organization

### 4.1 Import Order

**Organize imports in this order:**

```typescript
// 1. React and Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

// 3. Internal components (UI first, then features)
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserTable } from '@/components/admin/UserTable';

// 4. Internal hooks and utilities
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/lib/api/hooks/useUsers';
import { cn } from '@/lib/utils/cn';

// 5. Types
import type { User, UserFilters } from '@/types/user';

// 6. Styles (if any)
import styles from './Component.module.css';
```

### 4.2 Co-location

**Group related files together:**

```
components/admin/
├── UserTable/
│   ├── UserTable.tsx
│   ├── UserTable.test.tsx
│   ├── UserTableRow.tsx
│   ├── UserTableFilters.tsx
│   └── index.ts  (re-export)
```

**Or flat structure for simpler components:**

```
components/admin/
├── UserTable.tsx
├── UserTable.test.tsx
├── UserForm.tsx
├── UserForm.test.tsx
```

### 4.3 Barrel Exports

**Use index.ts for clean imports:**

```typescript
// components/ui/index.ts
export { Button } from './button';
export { Card, CardHeader, CardContent } from './card';
export { Input } from './input';

// Usage
import { Button, Card, Input } from '@/components/ui';
```

---

## 5. State Management

### 5.1 State Placement

**Keep state as local as possible:**

```typescript
// ✅ Good: Local state
function UserFilter() {
  const [search, setSearch] = useState('');
  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}

// ❌ Bad: Unnecessary global state
// Don't put search in Zustand store
```

### 5.2 TanStack Query Usage

**Standard query pattern:**

```typescript
// lib/api/hooks/useUsers.ts
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => UserService.getUsers(filters),
    staleTime: 60000, // 1 minute
  });
}

// Component usage
function UserList() {
  const { data, isLoading, error, refetch } = useUsers({ search: 'john' });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;

  return <div>{/* Render data */}</div>;
}
```

**Standard mutation pattern:**

```typescript
// lib/api/hooks/useUsers.ts
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      UserService.updateUser(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error: APIError[]) => {
      toast.error(error[0]?.message || 'Failed to update user');
    },
  });
}

// Component usage
function UserForm({ userId }: { userId: string }) {
  const updateUser = useUpdateUser();

  const handleSubmit = (data: UpdateUserDto) => {
    updateUser.mutate({ id: userId, data });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={updateUser.isPending}>
        {updateUser.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

**Query key structure:**

```typescript
// ✅ Good: Consistent query keys
['users'][('users', userId)][('users', { search: 'john', page: 1 })][ // List all // Single user // Filtered list
  ('organizations', orgId, 'members')
][ // Nested resource
  // ❌ Bad: Inconsistent
  'userList'
]['user-' + userId][('getUsersBySearch', 'john')];
```

### 5.3 Zustand Store Pattern

**Auth store example:**

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken });
        // Store refresh token separately (localStorage or cookie)
        localStorage.setItem('refreshToken', refreshToken);
      },

      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        localStorage.removeItem('refreshToken');
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user
    }
  )
);

// Usage with selector (performance optimization)
function UserAvatar() {
  const user = useAuthStore((state) => state.user);
  return <Avatar src={user?.avatar} />;
}
```

**UI store example:**

```typescript
// stores/uiStore.ts
interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ui-storage' }
  )
);
```

---

## 6. API Integration

### 6.1 API Client Structure

**Axios instance configuration:**

```typescript
// lib/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
      try {
        await refreshToken();
        return apiClient.request(error.config);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(parseAPIError(error));
  }
);
```

### 6.2 Error Handling

**Parse API errors:**

```typescript
// lib/api/errors.ts
export interface APIError {
  code: string;
  message: string;
  field?: string;
}

export function parseAPIError(error: AxiosError): APIError[] {
  if (error.response?.data?.errors) {
    return error.response.data.errors;
  }

  return [
    {
      code: 'UNKNOWN',
      message: error.message || 'An unexpected error occurred',
    },
  ];
}

// Error code mapping
export const ERROR_MESSAGES: Record<string, string> = {
  AUTH_001: 'Invalid email or password',
  USER_002: 'This email is already registered',
  VAL_001: 'Please check your input',
  ORG_001: 'Organization name already exists',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'An error occurred';
}
```

### 6.3 Hook Organization

**One hook file per resource:**

```typescript
// lib/api/hooks/useUsers.ts
export function useUsers(filters?: UserFilters) {}
export function useUser(userId: string) {}
export function useCreateUser() {}
export function useUpdateUser() {}
export function useDeleteUser() {}

// lib/api/hooks/useOrganizations.ts
export function useOrganizations() {}
export function useOrganization(orgId: string) {}
export function useCreateOrganization() {}
// ...
```

---

## 7. Form Handling

### 7.1 Form Pattern with react-hook-form + Zod

**Standard form implementation:**

```typescript
// components/auth/LoginForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// 2. Component
export function LoginForm() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 3. Submit handler
  const onSubmit = async (data: LoginFormData) => {
    try {
      await authService.login(data);
      router.push('/dashboard');
    } catch (error) {
      form.setError('root', {
        message: 'Invalid credentials',
      });
    }
  };

  // 4. Render
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        {...form.register('email')}
        type="email"
        placeholder="Email"
        error={form.formState.errors.email?.message}
      />
      <Input
        {...form.register('password')}
        type="password"
        placeholder="Password"
        error={form.formState.errors.password?.message}
      />
      {form.formState.errors.root && (
        <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

### 7.2 Form Validation

**Complex validation with Zod:**

```typescript
const userSchema = z
  .object({
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8, 'Min 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

### 7.3 Form Accessibility

**Always include labels and error messages:**

```typescript
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    {...form.register('email')}
    aria-invalid={!!form.formState.errors.email}
    aria-describedby="email-error"
  />
  {form.formState.errors.email && (
    <span id="email-error" className="text-red-500 text-sm">
      {form.formState.errors.email.message}
    </span>
  )}
</div>
```

---

## 8. Styling Standards

### 8.1 Tailwind CSS Usage

**Use utility classes:**

```typescript
// ✅ Good
<button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
  Click me
</button>

// ❌ Bad: Inline styles
<button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
  Click me
</button>
```

**Use cn() for conditional classes:**

```typescript
import { cn } from '@/lib/utils/cn';

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'disabled-classes',
  className  // Allow override
)} />
```

### 8.2 Responsive Design

**Mobile-first approach:**

```typescript
<div className="
  w-full p-4           /* Mobile */
  sm:w-1/2 sm:p-6      /* Small screens */
  md:w-1/3 md:p-8      /* Medium screens */
  lg:w-1/4 lg:p-10     /* Large screens */
">
  Content
</div>
```

### 8.3 Dark Mode

**Use dark mode classes:**

```typescript
<div className="
  bg-white text-black
  dark:bg-gray-900 dark:text-white
">
  Content
</div>
```

---

## 10. Testing Standards

### 10.1 Test File Organization

```
src/
├── components/
│   ├── UserTable.tsx
│   └── UserTable.test.tsx
└── lib/
    ├── utils/
    │   ├── formatDate.ts
    │   └── formatDate.test.ts
```

### 10.2 Test Naming

**Use descriptive test names:**

```typescript
// ✅ Good
test('displays user list when data is loaded', async () => {});
test('shows loading spinner while fetching users', () => {});
test('displays error message when API request fails', () => {});
test('redirects to login when user is not authenticated', () => {});

// ❌ Bad
test('works', () => {});
test('test1', () => {});
test('renders', () => {});
```

### 10.3 Component Testing

**Test user interactions, not implementation:**

```typescript
// UserTable.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { UserTable } from './UserTable';

test('allows user to search for users', async () => {
  const user = userEvent.setup();
  render(<UserTable />);

  const searchInput = screen.getByPlaceholderText('Search users');
  await user.type(searchInput, 'john');

  expect(await screen.findByText('John Doe')).toBeInTheDocument();
  expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
});
```

### 10.4 Accessibility Testing

**Test with accessibility queries:**

```typescript
// Prefer getByRole over getByTestId
const button = screen.getByRole('button', { name: 'Submit' });
const heading = screen.getByRole('heading', { name: 'Users' });
const textbox = screen.getByRole('textbox', { name: 'Email' });
```

---

## 11. Accessibility Standards

### 11.1 Semantic HTML

```typescript
// ✅ Good: Semantic
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Title</h1>
    <p>Content</p>
  </article>
</main>
<footer>...</footer>

// ❌ Bad: Div soup
<div className="header">
  <div className="nav">
    <div className="link">Home</div>
  </div>
</div>
```

### 11.2 ARIA Labels

**Use ARIA when semantic HTML isn't enough:**

```typescript
<button aria-label="Close dialog">
  <X className="w-4 h-4" />
</button>

<div role="status" aria-live="polite">
  Loading...
</div>
```

### 11.3 Keyboard Navigation

**Ensure all interactive elements are keyboard accessible:**

```typescript
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

---

## 12. Performance Best Practices

### 12.1 Code Splitting

**Dynamic imports for heavy components:**

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

### 12.2 Memoization

**Use React.memo for expensive renders:**

```typescript
export const UserCard = React.memo(function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
});
```

**Use useMemo for expensive calculations:**

```typescript
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);
```

### 12.3 Image Optimization

**Always use Next.js Image component:**

```typescript
import Image from 'next/image';

<Image
  src="/avatar.jpg"
  alt="User avatar"
  width={40}
  height={40}
  loading="lazy"
/>
```

---

## 13. Security Best Practices

### 13.1 Input Sanitization

**Never render raw HTML:**

```typescript
// ✅ Good: React escapes by default
<div>{userInput}</div>

// ❌ Bad: XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 13.2 Environment Variables

**Never commit secrets:**

```typescript
// ✅ Good: Use env variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ Bad: Hardcoded
const apiUrl = 'https://api.example.com';
```

**Public vs Private:**

- `NEXT_PUBLIC_*`: Exposed to browser
- Other vars: Server-side only

---

## 14. Code Review Checklist

**Before submitting PR:**

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Code follows naming conventions
- [ ] Components are typed
- [ ] Accessibility considerations met
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Documentation updated if needed

---

## Conclusion

These standards ensure consistency, maintainability, and quality across the codebase. Follow them rigorously, and update this document as the project evolves.

For specific patterns and examples, refer to:

- **ARCHITECTURE.md**: System design and patterns
- **COMPONENT_GUIDE.md**: Component usage and examples
- **FEATURE_EXAMPLES.md**: Step-by-step implementation guides
