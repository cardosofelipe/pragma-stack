# API Integration Guide

**Project**: Next.js + FastAPI Template
**Version**: 1.0
**Last Updated**: 2025-10-31

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Generating the API Client](#2-generating-the-api-client)
3. [Making API Calls](#3-making-api-calls)
4. [Authentication Integration](#4-authentication-integration)
5. [Error Handling](#5-error-handling)
6. [React Query Integration](#6-react-query-integration)
7. [Testing API Integration](#7-testing-api-integration)
8. [Common Patterns](#8-common-patterns)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Quick Start

### 1.1 Prerequisites

1. Backend running at `http://localhost:8000`
2. Frontend environment variables configured:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

### 1.2 Generate API Client

```bash
cd frontend
npm run generate:api
```

This fetches the OpenAPI spec from the backend and generates TypeScript types and API client functions.

### 1.3 Make Your First API Call

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

function UserList() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get('/users');
      return response.data;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{/* Render users */}</div>;
}
```

---

## 2. Generating the API Client

### 2.1 Generation Script

The generation script fetches the OpenAPI specification from the backend and creates TypeScript types and API client code.

**Script Location**: `frontend/scripts/generate-api-client.sh`

```bash
#!/bin/bash
set -e

API_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000}"
OUTPUT_DIR="./src/lib/api/generated"

echo "Fetching OpenAPI spec from $API_URL/api/v1/openapi.json..."

npx @hey-api/openapi-ts \
  --input "$API_URL/api/v1/openapi.json" \
  --output "$OUTPUT_DIR" \
  --client axios \
  --types

echo "✅ API client generated successfully in $OUTPUT_DIR"
```

### 2.2 Generated Files

After running the script, you'll have:

```
src/lib/api/generated/
├── index.ts          # Main exports
├── models/           # TypeScript interfaces for all models
│   ├── User.ts
│   ├── Organization.ts
│   ├── UserSession.ts
│   └── ...
└── services/         # API service functions
    ├── AuthService.ts
    ├── UsersService.ts
    ├── OrganizationsService.ts
    └── ...
```

### 2.3 When to Regenerate

Regenerate the API client when:
- Backend API changes (new endpoints, updated models)
- After pulling backend changes from git
- When types don't match backend responses
- As part of CI/CD pipeline

---

## 3. Making API Calls

### 3.1 Using Generated Services

**Example: Fetching users**
```typescript
import { UsersService } from '@/lib/api/generated';

async function getUsers() {
  const users = await UsersService.getUsers({
    page: 1,
    pageSize: 20,
    search: 'john'
  });
  return users;
}
```

**Example: Creating a user**
```typescript
import { AdminService } from '@/lib/api/generated';

async function createUser(data: CreateUserDto) {
  const newUser = await AdminService.createUser({
    requestBody: data
  });
  return newUser;
}
```

### 3.2 Using Axios Client Directly

For more control, use the configured Axios instance:

```typescript
import { apiClient } from '@/lib/api/client';

// GET request
const response = await apiClient.get<User[]>('/users', {
  params: { page: 1, search: 'john' }
});

// POST request
const response = await apiClient.post<User>('/admin/users', {
  email: 'user@example.com',
  first_name: 'John',
  password: 'secure123'
});

// PATCH request
const response = await apiClient.patch<User>(`/users/${userId}`, {
  first_name: 'Jane'
});

// DELETE request
await apiClient.delete(`/users/${userId}`);
```

### 3.3 Request Configuration

**Timeouts:**
```typescript
const response = await apiClient.get('/users', {
  timeout: 5000 // 5 seconds
});
```

**Custom Headers:**
```typescript
const response = await apiClient.post('/users', data, {
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

**Request Cancellation:**
```typescript
const controller = new AbortController();

const response = await apiClient.get('/users', {
  signal: controller.signal
});

// Cancel the request
controller.abort();
```

---

## 4. Authentication Integration

### 4.1 Automatic Token Injection

The Axios client automatically adds the Authorization header to all requests:

```typescript
// src/lib/api/client.ts
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

You don't need to manually add auth headers - they're added automatically!

### 4.2 Token Refresh Flow

The response interceptor handles token refresh automatically:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh tokens
        const refreshToken = getRefreshToken();
        const { access_token, refresh_token } = await AuthService.refreshToken({
          requestBody: { refresh_token: refreshToken }
        });

        // Update stored tokens
        useAuthStore.getState().setTokens(access_token, refresh_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient.request(originalRequest);

      } catch (refreshError) {
        // Refresh failed - logout user
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### 4.3 Login Example

```typescript
import { AuthService } from '@/lib/api/generated';
import { useAuthStore } from '@/stores/authStore';

async function login(email: string, password: string) {
  try {
    const response = await AuthService.login({
      requestBody: { email, password }
    });

    // Store tokens and user
    useAuthStore.getState().setTokens(
      response.access_token,
      response.refresh_token
    );
    useAuthStore.getState().setUser(response.user);

    return response.user;
  } catch (error) {
    throw parseAPIError(error);
  }
}
```

---

## 5. Error Handling

### 5.1 Backend Error Format

The backend returns structured errors:

```typescript
{
  success: false,
  errors: [
    {
      code: "AUTH_001",
      message: "Invalid credentials",
      field: "email"
    }
  ]
}
```

### 5.2 Parsing Errors

**Error Parser** (`src/lib/api/errors.ts`):
```typescript
import type { AxiosError } from 'axios';

export interface APIError {
  code: string;
  message: string;
  field?: string;
}

export interface APIErrorResponse {
  success: false;
  errors: APIError[];
}

export function parseAPIError(error: AxiosError<APIErrorResponse>): APIError[] {
  // Backend structured errors
  if (error.response?.data?.errors) {
    return error.response.data.errors;
  }

  // Network errors
  if (!error.response) {
    return [{
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
    }];
  }

  // HTTP status errors
  const status = error.response.status;
  if (status === 403) {
    return [{
      code: 'FORBIDDEN',
      message: "You don't have permission to perform this action.",
    }];
  }

  if (status === 404) {
    return [{
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    }];
  }

  if (status === 429) {
    return [{
      code: 'RATE_LIMIT',
      message: 'Too many requests. Please slow down.',
    }];
  }

  if (status >= 500) {
    return [{
      code: 'SERVER_ERROR',
      message: 'A server error occurred. Please try again later.',
    }];
  }

  // Fallback
  return [{
    code: 'UNKNOWN',
    message: error.message || 'An unexpected error occurred.',
  }];
}
```

### 5.3 Error Code Mapping

**Error Messages** (`src/lib/api/errorMessages.ts`):
```typescript
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors (AUTH_xxx)
  'AUTH_001': 'Invalid email or password',
  'AUTH_002': 'Account is inactive',
  'AUTH_003': 'Invalid or expired token',

  // User errors (USER_xxx)
  'USER_001': 'User not found',
  'USER_002': 'This email is already registered',
  'USER_003': 'Invalid user data',

  // Validation errors (VAL_xxx)
  'VAL_001': 'Invalid input. Please check your data.',
  'VAL_002': 'Email format is invalid',
  'VAL_003': 'Password does not meet requirements',

  // Organization errors (ORG_xxx)
  'ORG_001': 'Organization name already exists',
  'ORG_002': 'Organization not found',

  // Permission errors (PERM_xxx)
  'PERM_001': 'Insufficient permissions',
  'PERM_002': 'Admin access required',

  // Rate limiting (RATE_xxx)
  'RATE_001': 'Too many requests. Please try again later.',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || 'An error occurred';
}
```

### 5.4 Displaying Errors

**In React Query:**
```typescript
import { toast } from 'sonner';
import { parseAPIError, getErrorMessage } from '@/lib/api/errors';

export function useUpdateUser() {
  return useMutation({
    mutationFn: updateUserFn,
    onError: (error: AxiosError) => {
      const errors = parseAPIError(error);
      const message = getErrorMessage(errors[0]?.code) || errors[0]?.message;
      toast.error(message);
    },
  });
}
```

**In Forms:**
```typescript
const onSubmit = async (data: FormData) => {
  try {
    await updateUser(data);
  } catch (error) {
    const errors = parseAPIError(error);

    // Set field-specific errors
    errors.forEach((err) => {
      if (err.field) {
        form.setError(err.field as any, {
          message: getErrorMessage(err.code) || err.message,
        });
      }
    });

    // Set general error
    if (errors.some(err => !err.field)) {
      form.setError('root', {
        message: errors.find(err => !err.field)?.message || 'An error occurred',
      });
    }
  }
};
```

---

## 6. React Query Integration

### 6.1 Creating Query Hooks

**Pattern: One hook per operation**

```typescript
// src/lib/api/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsersService, AdminService } from '@/lib/api/generated';
import { toast } from 'sonner';

// Query: List users
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => UsersService.getUsers(filters),
    staleTime: 60000, // 1 minute
  });
}

// Query: Single user
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => UsersService.getUser({ userId: userId! }),
    enabled: !!userId, // Only run if userId exists
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
      UsersService.updateUser({ userId: id, requestBody: data }),
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
```

### 6.2 Using Query Hooks in Components

```typescript
'use client';

import { useUsers, useDeleteUser } from '@/lib/api/hooks/useUsers';

export function UserList() {
  const [search, setSearch] = useState('');
  const { data: users, isLoading, error } = useUsers({ search });
  const deleteUser = useDeleteUser();

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure?')) {
      deleteUser.mutate(userId);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search users..."
      />
      <ul>
        {users?.map(user => (
          <li key={user.id}>
            {user.name}
            <button
              onClick={() => handleDelete(user.id)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 6.3 Optimistic Updates

For instant UI feedback:

```typescript
export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      AdminService.updateUser({
        userId,
        requestBody: { is_active: isActive }
      }),
    onMutate: async ({ userId, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['users', userId] });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(['users', userId]);

      // Optimistically update
      queryClient.setQueryData(['users', userId], (old: User) => ({
        ...old,
        is_active: isActive,
      }));

      return { previousUser };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(['users', variables.userId], context.previousUser);
      }
      toast.error('Failed to update user');
    },
    onSettled: (_, __, { userId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });
}
```

---

## 7. Testing API Integration

### 7.1 Mocking API Calls

**Using MSW (Mock Service Worker):**

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v1/users', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        ],
        pagination: {
          total: 2,
          page: 1,
          page_size: 20,
          total_pages: 1,
        },
      })
    );
  }),

  rest.post('/api/v1/admin/users', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.json({
        id: '3',
        ...body,
      })
    );
  }),

  rest.delete('/api/v1/admin/users/:userId', (req, res, ctx) => {
    return res(
      ctx.json({ success: true, message: 'User deleted' })
    );
  }),
];
```

### 7.2 Testing Query Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsers } from './useUsers';

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

test('fetches users successfully', async () => {
  const { result } = renderHook(() => useUsers(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data).toHaveLength(2);
  expect(result.current.data[0].name).toBe('John Doe');
});
```

---

## 8. Common Patterns

### 8.1 Pagination

```typescript
export function useUsersPaginated(page: number = 1, pageSize: number = 20) {
  return useQuery({
    queryKey: ['users', { page, pageSize }],
    queryFn: () => UsersService.getUsers({ page, pageSize }),
    keepPreviousData: true, // Keep old data while fetching new page
  });
}

// Component usage
function UserList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useUsersPaginated(page);

  return (
    <div>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <ul>
            {data?.data.map(user => <li key={user.id}>{user.name}</li>)}
          </ul>
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1 || isFetching}
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!data?.pagination.has_next || isFetching}
          >
            Next
          </button>
        </>
      )}
    </div>
  );
}
```

### 8.2 Infinite Scroll

```typescript
export function useUsersInfinite() {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      UsersService.getUsers({ page: pageParam, pageSize: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
  });
}

// Component usage
function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUsersInfinite();

  const allUsers = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <div>
      <ul>
        {allUsers.map(user => <li key={user.id}>{user.name}</li>)}
      </ul>
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### 8.3 Dependent Queries

```typescript
function UserDetail({ userId }: { userId: string }) {
  // First query
  const { data: user } = useUser(userId);

  // Second query depends on first
  const { data: sessions } = useQuery({
    queryKey: ['sessions', userId],
    queryFn: () => SessionService.getUserSessions({ userId }),
    enabled: !!user, // Only fetch when user is loaded
  });

  return (
    <div>
      <h1>{user?.name}</h1>
      <h2>Active Sessions</h2>
      <ul>
        {sessions?.map(session => <li key={session.id}>{session.device_name}</li>)}
      </ul>
    </div>
  );
}
```

---

## 9. Troubleshooting

### 9.1 CORS Errors

**Symptom**: `Access-Control-Allow-Origin` error in console

**Solution**: Ensure backend CORS is configured for frontend URL:
```python
# backend/app/main.py
BACKEND_CORS_ORIGINS = ["http://localhost:3000"]
```

### 9.2 401 Unauthorized

**Symptom**: All API calls return 401

**Possible Causes**:
1. No token in store: Check `useAuthStore.getState().accessToken`
2. Token expired: Check token expiration
3. Token invalid: Try logging in again
4. Interceptor not working: Check interceptor configuration

**Debug**:
```typescript
// Log token in interceptor
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  console.log('Token:', token ? 'Present' : 'Missing');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 9.3 Type Mismatches

**Symptom**: TypeScript errors about response types

**Solution**: Regenerate API client to sync with backend
```bash
npm run generate:api
```

### 9.4 Stale Data

**Symptom**: UI shows old data after mutation

**Solution**: Invalidate queries after mutations
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['users'] });
}
```

### 9.5 Network Timeout

**Symptom**: Requests timeout

**Solution**: Increase timeout or check backend performance
```typescript
const apiClient = axios.create({
  timeout: 60000, // 60 seconds
});
```

---

## Conclusion

This guide covers the essential patterns for integrating with the FastAPI backend. For more advanced use cases, refer to:
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Axios Documentation](https://axios-http.com/)
- Backend API documentation at `/docs` endpoint
