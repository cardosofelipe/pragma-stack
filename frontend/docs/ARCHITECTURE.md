# Frontend Architecture Documentation

**Project**: Next.js + FastAPI Template
**Version**: 1.0
**Last Updated**: 2025-10-31
**Status**: Living Document

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Data Flow](#4-data-flow)
5. [State Management Strategy](#5-state-management-strategy)
6. [Authentication Architecture](#6-authentication-architecture)
7. [API Integration](#7-api-integration)
8. [Routing Strategy](#8-routing-strategy)
9. [Component Organization](#9-component-organization)
10. [Testing Strategy](#10-testing-strategy)
11. [Performance Considerations](#11-performance-considerations)
12. [Security Architecture](#12-security-architecture)
13. [Design Decisions & Rationale](#13-design-decisions--rationale)
14. [Deployment Architecture](#14-deployment-architecture)

---

## 1. System Overview

### 1.1 Purpose

This frontend template provides a production-ready foundation for building modern web applications with Next.js 15 and FastAPI backend integration. It implements comprehensive authentication, admin dashboards, user management, and organization management out of the box.

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                       │
├─────────────────────────────────────────────────────────────┤
│  App Router (RSC)  │  Client Components  │  API Routes     │
├────────────────────┼────────────────────┼──────────────────┤
│  Pages & Layouts   │  Interactive UI    │  Middleware      │
│  (Server-side)     │  (Client-side)     │  (Auth Guards)   │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
                  ┌──────────────────────┐
                  │   State Management   │
                  ├──────────────────────┤
                  │  TanStack Query      │ ← Server State
                  │  (React Query v5)    │
                  ├──────────────────────┤
                  │  Zustand Stores      │ ← Client State
                  │  (Auth, UI)          │
                  └──────────────────────┘
                            ↓ ↑
                  ┌──────────────────────┐
                  │   API Client Layer   │
                  ├──────────────────────┤
                  │  Axios Instance      │
                  │  + Interceptors      │
                  ├──────────────────────┤
                  │  Generated Client    │
                  │  (OpenAPI → TS)      │
                  └──────────────────────┘
                            ↓ ↑
                  ┌──────────────────────┐
                  │   FastAPI Backend    │
                  │   /api/v1/*          │
                  └──────────────────────┘
```

### 1.3 Key Features

- **Authentication**: JWT-based with token rotation, per-device session tracking
- **Admin Dashboard**: User management, organization management, analytics
- **State Management**: TanStack Query for server state, Zustand for auth/UI
- **Type Safety**: Full TypeScript with generated types from OpenAPI spec
- **Component Library**: shadcn/ui with Radix UI primitives
- **Testing**: 90%+ coverage target with Jest, React Testing Library, Playwright
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Dark Mode**: Full theme support with Tailwind CSS

---

## 2. Technology Stack

### 2.1 Core Framework

**Next.js 15.x (App Router)**

- **Why**: Modern React framework with RSC, excellent DX, optimized performance
- **App Router**: Preferred over Pages Router for better data fetching, layouts, and streaming
- **Server Components**: Default for better performance, client components for interactivity
- **TypeScript**: Strict mode enabled for maximum type safety

### 2.2 State Management

**TanStack Query (React Query v5)**

- **Purpose**: Server state management (all API data)
- **Why**: Automatic caching, background refetching, request deduplication, optimistic updates
- **Usage**: All data fetching goes through React Query hooks

**Zustand 4.x**

- **Purpose**: Client-only state (authentication, UI preferences)
- **Why**: Minimal boilerplate, no Context API overhead, simple API
- **Usage**: Auth store, UI store (sidebar, theme, modals)
- **Philosophy**: Use sparingly, prefer server state via React Query

### 2.3 UI Layer

**shadcn/ui**

- **Why**: Accessible components (Radix UI), customizable, copy-paste (not npm dependency)
- **Components**: Button, Card, Dialog, Form, Input, Table, Toast, etc.
- **Customization**: Tailwind-based, easy to adapt to design system

**Tailwind CSS 4.x**

- **Why**: Utility-first, excellent DX, small bundle size, dark mode support
- **Strategy**: Class-based dark mode, mobile-first responsive design
- **Customization**: Custom theme colors, design tokens

**Recharts 2.x**

- **Purpose**: Charts for admin dashboard
- **Why**: React-native, composable, responsive, themed with Tailwind colors

### 2.4 API Layer

**@hey-api/openapi-ts**

- **Purpose**: Generate TypeScript client from backend OpenAPI spec
- **Why**: Type-safe API calls, auto-generated types matching backend
- **Alternative**: Considered `openapi-typescript-codegen` but this is more actively maintained

**Axios 1.x**

- **Purpose**: HTTP client for API calls
- **Why**: Interceptor support for auth, better error handling than fetch
- **Usage**: Wrapped in generated API client, configured with auth interceptors

### 2.5 Forms & Validation

**react-hook-form 7.x**

- **Purpose**: Form state management
- **Why**: Excellent performance, minimal re-renders, great DX

**Zod 3.x**

- **Purpose**: Runtime type validation and schema definition
- **Why**: Type inference, composable schemas, integrates with react-hook-form
- **Usage**: All forms use Zod schemas with `zodResolver`

### 2.6 Testing

**Jest + React Testing Library**

- **Purpose**: Unit and component tests
- **Why**: Industry standard, excellent React support, accessibility-focused

**Playwright**

- **Purpose**: End-to-end testing
- **Why**: Fast, reliable, multi-browser, great debugging tools
- **Coverage Target**: 90%+ for template robustness

### 2.7 Additional Libraries

- **date-fns**: Date manipulation and formatting (lighter than moment.js)
- **clsx** + **tailwind-merge**: Conditional class names with conflict resolution
- **lucide-react**: Icon system (tree-shakeable, consistent design)

---

## 3. Architecture Patterns

### 3.1 Layered Architecture

Inspired by backend's 5-layer architecture, frontend follows similar separation of concerns:

```
┌────────────────────────────────────────────────────────────┐
│ Layer 1: Pages & Layouts (app/*)                           │
│ - Route definitions, page components, layouts              │
│ - Mostly Server Components, minimal logic                  │
│ - Delegates to hooks and components                        │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 2: React Hooks (hooks/, lib/api/hooks/)             │
│ - Custom hooks for component logic                         │
│ - React Query hooks for data fetching                      │
│ - Reusable logic extraction                                │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 3: Services (services/)                             │
│ - Business logic (if complex)                              │
│ - Multi-step operations                                    │
│ - Data transformations                                     │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 4: API Client (lib/api/*)                           │
│ - Axios instance with interceptors                         │
│ - Generated API client from OpenAPI                        │
│ - Error handling                                            │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 5: Types & Models (types/, lib/api/generated/)      │
│ - TypeScript interfaces                                    │
│ - Generated types from OpenAPI                             │
│ - Validation schemas (Zod)                                 │
└────────────────────────────────────────────────────────────┘
```

**Key Rules:**

- Pages/Layouts should NOT contain business logic
- Components should NOT call API client directly (use hooks)
- Hooks should NOT contain display logic
- API client should NOT contain business logic
- Types should NOT import from upper layers

### 3.2 Component Patterns

**Server Components by Default:**

```typescript
// app/(authenticated)/admin/users/page.tsx
// Server Component - can fetch data directly
export default async function UsersPage() {
  // Could fetch data here, but we delegate to client components with React Query
  return (
    <div>
      <PageHeader title="Users" />
      <UserTable />  {/* Client Component with data fetching */}
    </div>
  );
}
```

**Client Components for Interactivity:**

```typescript
// components/admin/UserTable.tsx
'use client';

import { useUsers } from '@/lib/api/hooks/useUsers';

export function UserTable() {
  const { data, isLoading, error } = useUsers();
  // ... render logic
}
```

**Composition Over Prop Drilling:**

```typescript
// Good: Use composition
<Card>
  <CardHeader>
    <CardTitle>Users</CardTitle>
  </CardHeader>
  <CardContent>
    <UserTable />
  </CardContent>
</Card>

// Avoid: Deep prop drilling
<Card title="Users" content={<UserTable />} />
```

### 3.3 Single Responsibility Principle

Each module has one clear responsibility:

- **Pages**: Routing and layout structure
- **Components**: UI rendering and user interaction
- **Hooks**: Data fetching and reusable logic
- **Services**: Complex business logic (multi-step operations)
- **API Client**: HTTP communication
- **Stores**: Global client state
- **Types**: Type definitions

---

## 4. Data Flow

### 4.1 Request Flow (API Call)

```
┌──────────────┐
│ User Action  │ (e.g., Click "Save User")
└──────┬───────┘
       ↓
┌──────────────────┐
│ Component        │ Calls hook: updateUser.mutate(data)
└──────┬───────────┘
       ↓
┌──────────────────┐
│ React Query Hook │ useMutation with API client call
│ (useUpdateUser)  │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ API Client       │ Axios PUT request with interceptors
│ (Axios)          │
└──────┬───────────┘
       ↓
┌──────────────────┐
│ Request          │ Add Authorization header
│ Interceptor      │ token = authStore.accessToken
└──────┬───────────┘
       ↓
┌──────────────────┐
│ FastAPI Backend  │ PUT /api/v1/users/{id}
└──────┬───────────┘
       ↓
┌──────────────────┐
│ Response         │ Check status code
│ Interceptor      │ - 401: Refresh token → retry
│                  │ - 200: Parse success
│                  │ - 4xx/5xx: Parse error
└──────┬───────────┘
       ↓
┌──────────────────┐
│ React Query      │ Cache invalidation
│                  │ queryClient.invalidateQueries(['users'])
└──────┬───────────┘
       ↓
┌──────────────────┐
│ Component        │ Re-renders with updated data
│ (via useUsers)   │ Shows success toast
└──────────────────┘
```

### 4.2 Authentication Flow

```
┌──────────────┐
│ Login Form   │ User enters email + password
└──────┬───────┘
       ↓
┌──────────────────────┐
│ authStore.login()    │ Zustand action
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ API: POST /auth/login│ Backend validates credentials
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Backend Response     │ { access_token, refresh_token, user }
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ authStore.setTokens()│ Store tokens (sessionStorage + localStorage/cookie)
│ authStore.setUser()  │ Store user object
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Axios Interceptor    │ Now adds Authorization header to all requests
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Redirect to Home     │ User is authenticated
└──────────────────────┘
```

**Token Refresh Flow (Automatic):**

```
API Request → 401 Response → Check if refresh token exists
   ↓ Yes                                    ↓ No
POST /auth/refresh                      Redirect to Login
   ↓
New Tokens → Update Store → Retry Original Request
```

### 4.3 State Updates

**Server State (React Query):**

- Automatic background refetch
- Cache invalidation on mutations
- Optimistic updates where appropriate

**Client State (Zustand):**

- Direct store updates
- No actions/reducers boilerplate
- Subscriptions for components

---

## 5. State Management Strategy

### 5.1 Philosophy

**Use the Right Tool for the Right Job:**

- Server data → TanStack Query
- Auth & tokens → Zustand
- UI state → Zustand (minimal)
- Form state → react-hook-form
- Component state → useState/useReducer

**Avoid Redundancy:**

- DON'T duplicate server data in Zustand
- DON'T store API responses in global state
- DO keep state as local as possible

### 5.2 TanStack Query Configuration

**Global Config** (`src/config/queryClient.ts`):

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      cacheTime: 300000, // 5 minutes
      retry: 3, // Retry failed requests
      refetchOnWindowFocus: true, // Refetch on tab focus
      refetchOnReconnect: true, // Refetch on network reconnect
    },
    mutations: {
      retry: 1, // Retry mutations once
    },
  },
});
```

**Query Key Structure:**

```typescript
['users'][('users', userId)][('users', { page: 1, search: 'john' })][ // List all users // Single user // Filtered list
  ('organizations', orgId, 'members')
]; // Nested resource
```

### 5.3 Zustand Stores

**Auth Store** (`src/stores/authStore.ts`):

```typescript
interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  setTokens: (access, refresh) => void;
  clearAuth: () => void;
}
```

**UI Store** (`src/stores/uiStore.ts`):

```typescript
interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme) => void;
}
```

**Store Guidelines:**

- Keep stores small and focused
- Use selectors for computed values
- Persist to localStorage where appropriate
- Document why Zustand over alternatives

---

## 6. Authentication Architecture

### 6.1 Context-Based Dependency Injection Pattern

**Architecture Overview:**

This project uses a **hybrid authentication pattern** combining Zustand for state management and React Context for dependency injection. This provides the best of both worlds:

```
Component → useAuth() hook → AuthContext → Zustand Store → Storage Layer → Crypto (AES-GCM)
                                  ↓
                          Injectable for tests
                                  ↓
                Production: Real store | Tests: Mock store
```

**Why This Pattern?**

✅ **Benefits:**

- **Testable**: E2E tests can inject mock stores without backend
- **Performant**: Zustand handles state efficiently, Context is just a thin wrapper
- **Type-safe**: Full TypeScript inference throughout
- **Maintainable**: Clear separation (Context = DI, Zustand = state)
- **Extensible**: Easy to add auth events, middleware, logging
- **React-idiomatic**: Follows React best practices

**Key Design Principles:**

1. **Thin Context Layer**: Context only provides dependency injection, no business logic
2. **Zustand for State**: All state management stays in Zustand (no duplicated state)
3. **Backward Compatible**: Internal refactor only, no API changes
4. **Type Safe**: Context interface exactly matches Zustand store interface
5. **Performance**: Context value is stable (no unnecessary re-renders)

### 6.2 Implementation Components

#### AuthContext Provider (`src/lib/auth/AuthContext.tsx`)

**Purpose**: Wraps Zustand store in React Context for dependency injection

```typescript
// Accepts optional store prop for testing
<AuthProvider store={mockStore}>  // Unit tests
  <App />
</AuthProvider>

// Or checks window global for E2E tests
window.__TEST_AUTH_STORE__ = mockStoreHook;

// Or uses production singleton (default)
<AuthProvider>
  <App />
</AuthProvider>
```

**Implementation Details:**

- Stores Zustand hook function (not state) in Context
- Priority: explicit prop → E2E test store → production singleton
- Type-safe window global extension for E2E injection
- Calls hook internally (follows React Rules of Hooks)

#### useAuth Hook (Polymorphic)

**Supports two usage patterns:**

```typescript
// Pattern 1: Full state access (simple)
const { user, isAuthenticated } = useAuth();

// Pattern 2: Selector (optimized for performance)
const user = useAuth((state) => state.user);
```

**Why Polymorphic?**

- Simple pattern for most use cases
- Optimized pattern available when needed
- Type-safe with function overloads
- No performance overhead

**Critical Implementation Detail:**

```typescript
export function useAuth(): AuthState;
export function useAuth<T>(selector: (state: AuthState) => T): T;
export function useAuth<T>(selector?: (state: AuthState) => T): AuthState | T {
  const storeHook = useContext(AuthContext);
  if (!storeHook) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  // CRITICAL: Call the hook internally (follows React Rules of Hooks)
  return selector ? storeHook(selector) : storeHook();
}
```

**Do NOT** return the hook function itself - this violates React Rules of Hooks!

### 6.3 Usage Patterns

#### For Components (Rendering Auth State)

**Use `useAuth()` from Context:**

```typescript
import { useAuth } from '@/lib/stores';

function MyComponent() {
  // Full state access
  const { user, isAuthenticated } = useAuth();

  // Or with selector for optimization
  const user = useAuth(state => state.user);

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <div>Hello, {user?.first_name}!</div>;
}
```

**Why?**

- Component re-renders when auth state changes
- Type-safe access to all state properties
- Clean, idiomatic React code

#### For Mutation Callbacks (Updating Auth State)

**Use `useAuthStore.getState()` directly:**

```typescript
import { useAuthStore } from '@/lib/stores/authStore';

export function useLogin() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await loginAPI(data);

      // Access store directly in callback (outside render)
      const setAuth = useAuthStore.getState().setAuth;
      await setAuth(response.user, response.token);
    },
  });
}
```

**Why?**

- Event handlers run outside React render cycle
- Don't need to re-render when state changes
- Using `getState()` directly is cleaner
- Avoids unnecessary hook rules complexity

#### Admin-Only Features

```typescript
import { useAuth } from '@/lib/stores';

function AdminPanel() {
  const user = useAuth(state => state.user);
  const isAdmin = user?.is_superuser ?? false;

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return <AdminDashboard />;
}
```

### 6.4 Testing Integration

#### Unit Tests (Jest)

```typescript
import { useAuth } from '@/lib/stores';

jest.mock('@/lib/stores', () => ({
  useAuth: jest.fn(),
}));

test('renders user name', () => {
  (useAuth as jest.Mock).mockReturnValue({
    user: { first_name: 'John', last_name: 'Doe' },
    isAuthenticated: true,
  });

  render(<MyComponent />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

#### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Protected Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock store before navigation
    await page.addInitScript(() => {
      (window as any).__TEST_AUTH_STORE__ = () => ({
        user: { id: '1', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        isAuthenticated: true,
        isLoading: false,
        tokenExpiresAt: Date.now() + 900000,
      });
    });
  });

  test('should display user profile', async ({ page }) => {
    await page.goto('/settings/profile');

    // No redirect to login - authenticated via mock
    await expect(page).toHaveURL('/settings/profile');
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
  });
});
```

### 6.5 Provider Tree Structure

**Correct Order** (Critical for Functionality):

```typescript
// src/app/layout.tsx
<AuthProvider>           {/* 1. Provides auth DI layer */}
  <AuthInitializer />    {/* 2. Loads auth from storage (needs AuthProvider) */}
  <Providers>            {/* 3. Other providers (Theme, Query) */}
    {children}
  </Providers>
</AuthProvider>
```

**Why This Order?**

- AuthProvider must wrap AuthInitializer (AuthInitializer uses auth state)
- AuthProvider should wrap all app providers (auth available everywhere)
- Keep provider tree shallow for performance

### 6.6 Token Management Strategy

**Two-Token System:**

- **Access Token**: Short-lived (15 min), stored in memory/sessionStorage
- **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie (preferred) or localStorage

**Token Storage Decision:**

- **Primary**: httpOnly cookies (most secure, prevents XSS)
- **Fallback**: localStorage with encryption wrapper (if cookies not feasible)
- **Access Token**: sessionStorage or React state (short-lived, acceptable risk)

**Token Rotation:**

- On refresh, both tokens are rotated
- Old refresh token is invalidated immediately
- Prevents token replay attacks

### 6.2 Per-Device Session Tracking

Backend tracks sessions per device:

- Each login creates a unique session with device info
- Users can view all active sessions
- Users can revoke individual sessions
- Logout only affects current device
- "Logout All" deactivates all sessions

Frontend Implementation:

- Session list page at `/settings/sessions`
- Display device name, IP, location, last used
- Highlight current session
- Revoke button for non-current sessions

### 6.3 Auth Guard Implementation

**Layout-Based Protection:**

```typescript
// app/(authenticated)/layout.tsx
export default function AuthenticatedLayout({ children }) {
  return (
    <AuthGuard>
      <Header />
      <main>{children}</main>
      <Footer />
    </AuthGuard>
  );
}
```

**Permission Checks:**

```typescript
// app/(authenticated)/admin/layout.tsx
export default function AdminLayout({ children }) {
  const { user } = useAuth();

  if (!user?.is_superuser) {
    redirect('/403');
  }

  return <AdminLayoutUI>{children}</AdminLayoutUI>;
}
```

### 6.4 Security Best Practices

1. **No tokens in localStorage** (access token in sessionStorage acceptable due to short expiry)
2. **Always use HTTPS in production**
3. **Automatic token refresh before expiry** (5 min threshold)
4. **Clear all auth state on logout**
5. **Validate token ownership** (backend checks JTI against session)
6. **Rate limiting awareness** (handle 429 responses)
7. **CSRF protection** (if not using cookies for main token)

---

## 7. API Integration

### 7.1 OpenAPI Client Generation

**Workflow:**

```
Backend OpenAPI Spec → @hey-api/openapi-ts → TypeScript Client
(/api/v1/openapi.json)                     (src/lib/api/generated/)
```

**Generation Script** (`scripts/generate-api-client.sh`):

```bash
#!/bin/bash
API_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000}"
npx @hey-api/openapi-ts \
  --input "$API_URL/api/v1/openapi.json" \
  --output ./src/lib/api/generated \
  --client axios
```

**Benefits:**

- Type-safe API calls
- Auto-completion in IDE
- Compile-time error checking
- No manual type definition
- Always in sync with backend

### 7.2 Axios Configuration

**Base Instance** (`src/lib/api/client.ts`):

```typescript
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Request Interceptor:**

```typescript
apiClient.interceptors.request.use(
  (config) => {
    const token = authStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

**Response Interceptor:**

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        await authStore.getState().refreshTokens();
        // Retry original request
        return apiClient.request(error.config);
      } catch {
        // Refresh failed, logout
        authStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(parseAPIError(error));
  }
);
```

### 7.3 Error Handling

**Backend Error Format:**

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

**Frontend Error Parsing:**

```typescript
export function parseAPIError(error: AxiosError): APIError {
  if (error.response?.data?.errors) {
    return error.response.data.errors;
  }
  return [
    {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred',
    },
  ];
}
```

**Error Code Mapping:**

```typescript
const ERROR_MESSAGES = {
  AUTH_001: 'Invalid email or password',
  USER_002: 'This email is already registered',
  VAL_001: 'Please check your input',
  // ... all backend error codes
};
```

### 7.4 React Query Hooks Pattern

**Standard Pattern:**

```typescript
// lib/api/hooks/useUsers.ts
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => UserService.getUsers(filters),
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => UserService.getUser(userId),
    enabled: !!userId,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      UserService.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error: APIError[]) => {
      toast.error(error[0]?.message || 'Failed to update user');
    },
  });
}
```

---

## 8. Routing Strategy

### 8.1 App Router Structure

```
app/
├── (auth)/              # Auth route group (no auth layout)
│   ├── layout.tsx
│   ├── login/
│   └── register/
├── (authenticated)/     # Protected route group
│   ├── layout.tsx       # Auth guard + header/footer
│   ├── page.tsx         # Home
│   ├── settings/
│   │   ├── layout.tsx   # Settings sidebar
│   │   ├── profile/
│   │   ├── password/
│   │   └── sessions/
│   └── admin/
│       ├── layout.tsx   # Admin sidebar + permission check
│       ├── users/
│       └── organizations/
├── dev/                 # Development-only routes
│   ├── layout.tsx       # NODE_ENV check
│   └── components/
├── layout.tsx           # Root layout
└── page.tsx             # Public home
```

**Route Groups** (parentheses in folder name):

- Organize routes without affecting URL
- Apply different layouts to route subsets
- Example: `(auth)` and `(authenticated)` have different layouts

### 8.2 Layout Strategy

**Root Layout** (`app/layout.tsx`):

- HTML structure
- React Query provider
- Theme provider
- Global metadata

**Auth Layout** (`app/(auth)/layout.tsx`):

- Centered form container
- No header/footer
- Minimal styling

**Authenticated Layout** (`app/(authenticated)/layout.tsx`):

- Auth guard (redirect if not authenticated)
- Header with user menu
- Main content area
- Footer

**Admin Layout** (`app/(authenticated)/admin/layout.tsx`):

- Admin sidebar
- Breadcrumbs
- Admin permission check (is_superuser)

### 8.3 Loading & Error States

```
app/(authenticated)/admin/users/
├── page.tsx           # Main page
├── loading.tsx        # Streaming UI / Suspense fallback
└── error.tsx          # Error boundary
```

**loading.tsx**: Displayed while page/component is loading
**error.tsx**: Displayed when error occurs (with retry button)

---

## 9. Component Organization

### 9.1 Directory Structure

```
components/
├── ui/                # shadcn components (copy-paste)
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── auth/              # Authentication components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── AuthGuard.tsx
├── admin/             # Admin-specific components
│   ├── UserTable.tsx
│   ├── UserForm.tsx
│   ├── BulkActionBar.tsx
│   └── ...
├── settings/          # Settings page components
│   ├── ProfileSettings.tsx
│   ├── SessionManagement.tsx
│   └── ...
├── charts/            # Chart wrappers
│   ├── BarChartCard.tsx
│   └── ...
├── layout/            # Layout components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── ...
└── common/            # Reusable components
    ├── DataTable.tsx
    ├── LoadingSpinner.tsx
    └── ...
```

### 9.2 Component Guidelines

**Naming:**

- PascalCase for components: `UserTable.tsx`
- Match file name with component name
- One component per file

**Structure:**

```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/lib/api/hooks/useUsers';

// 2. Types
interface UserTableProps {
  filters?: UserFilters;
}

// 3. Component
export function UserTable({ filters }: UserTableProps) {
  // Hooks
  const { data, isLoading } = useUsers(filters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Derived state
  const hasSelection = selectedIds.length > 0;

  // Event handlers
  const handleSelectAll = () => {
    setSelectedIds(data?.map(u => u.id) || []);
  };

  // Render
  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

**Best Practices:**

- Prefer named exports over default exports
- Destructure props in function signature
- Extract complex logic to hooks
- Keep components focused (single responsibility)
- Use composition over prop drilling

### 9.3 Styling Strategy

**Tailwind Utility Classes:**

```typescript
<button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
  Click Me
</button>
```

**Conditional Classes with cn():**

```typescript
import { cn } from '@/lib/utils/cn';

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className // Allow override from props
)} />
```

**Dark Mode:**

```typescript
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

```
           ┌─────────┐
          /  E2E Tests  \     (10% - Critical flows)
         /               \
        /_________________\
       /                   \
      / Integration Tests   \  (30% - Component + API)
     /                       \
    /_________________________\
   /                           \
  /       Unit Tests            \ (60% - Hooks, Utils, Libs)
 /_______________________________\
```

### 10.2 Test Categories

**Unit Tests** (60% of suite):

- Utilities (`lib/utils/`)
- Custom hooks (`hooks/`)
- Services (`services/`)
- Pure functions

**Component Tests** (30% of suite):

- Reusable components (`components/`)
- Forms with validation
- User interactions
- Accessibility

**Integration Tests** (E2E with Playwright, 10% of suite):

- Critical user flows:
  - Login → Dashboard
  - Admin: Create/Edit/Delete User
  - Admin: Manage Organizations
  - Session Management
- Multi-page journeys
- Real backend interaction (or mock server)

### 10.3 Testing Tools

**Jest + React Testing Library:**

```typescript
// UserTable.test.tsx
import { render, screen } from '@testing-library/react';
import { UserTable } from './UserTable';

test('renders user table with data', async () => {
  render(<UserTable />);
  expect(await screen.findByText('John Doe')).toBeInTheDocument();
});
```

**Playwright E2E:**

```typescript
// tests/e2e/auth.spec.ts
test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### 10.4 Coverage Target

**Goal: 90%+ Overall Coverage**

- Unit tests: 95%+
- Component tests: 85%+
- Integration tests: Critical paths only

**Justification for 90%:**

- This is a template for production projects
- High coverage ensures robustness
- Confidence for extension and customization

---

## 11. Performance Considerations

### 11.1 Optimization Strategies

**Code Splitting:**

```typescript
// Dynamic imports for heavy components
const AdminDashboard = dynamic(() => import('./AdminDashboard'), {
  loading: () => <LoadingSpinner />,
});
```

**Image Optimization:**

```typescript
import Image from 'next/image';

<Image
  src="/user-avatar.jpg"
  alt="User"
  width={40}
  height={40}
  loading="lazy"
/>
```

**React Query Caching:**

- Stale time: 1 minute (reduce unnecessary refetches)
- Cache time: 5 minutes (keep data in memory)
- Background refetch: Yes (keep data fresh)

**Bundle Size Monitoring:**

```bash
npm run build && npm run analyze
# Use webpack-bundle-analyzer to identify large dependencies
```

### 11.2 Performance Targets

**Lighthouse Scores:**

- Performance: >90
- Accessibility: 100
- Best Practices: >90
- SEO: >90

**Core Web Vitals:**

- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

---

## 12. Security Architecture

### 12.1 Client-Side Security

**XSS Prevention:**

- React's default escaping (JSX)
- Sanitize user input if rendering HTML
- CSP headers (configured in backend)

**Token Security:**

- Access token: sessionStorage or memory (15 min expiry mitigates risk)
- Refresh token: httpOnly cookie (preferred) or encrypted localStorage
- Never log tokens to console in production

**HTTPS Only:**

- All production requests over HTTPS
- Cookies with Secure flag
- No mixed content

### 12.2 Input Validation

**Client-Side Validation:**

- Zod schemas for all forms
- Immediate feedback to users
- Prevent malformed requests

**Remember:**

- Client validation is for UX
- Backend validation is for security
- Always trust backend, not client

### 12.3 Dependency Security

**Regular Audits:**

```bash
npm audit
npm audit fix
```

**Automated Scanning:**

- Dependabot (GitHub)
- Snyk (CI/CD integration)

---

## 13. Design Decisions & Rationale

### 13.1 Why Next.js App Router?

**Pros:**

- Server Components reduce client bundle
- Better data fetching patterns
- Streaming and Suspense built-in
- Simpler layouts and error handling

**Cons:**

- Newer, less mature than Pages Router
- Learning curve for team

**Decision:** App Router is the future, worth the investment

### 13.2 Why TanStack Query?

**Alternatives Considered:**

- SWR: Similar but less features
- Redux Toolkit Query: Too much boilerplate for our use case
- Apollo Client: Overkill for REST API

**Why TanStack Query:**

- Best-in-class caching and refetching
- Framework-agnostic (not tied to Next.js)
- Excellent DevTools
- Optimistic updates out of the box

### 13.3 Why Zustand over Redux?

**Why NOT Redux:**

- Too much boilerplate (actions, reducers, middleware)
- We don't need time-travel debugging
- Most state is server state (handled by React Query)

**Why Zustand:**

- Minimal API (easy to learn)
- No Context API overhead
- Can use outside React (interceptors)
- Only ~1KB

### 13.4 Why shadcn/ui over Component Libraries?

**Alternatives Considered:**

- Material-UI: Heavy, opinionated styling
- Chakra UI: Good, but still an npm dependency
- Ant Design: Too opinionated for template

**Why shadcn/ui:**

- Copy-paste (full control)
- Accessible (Radix UI primitives)
- Tailwind-based (consistent with our stack)
- Customizable without ejecting

### 13.5 Why Axios over Fetch?

**Why NOT Fetch:**

- No request/response interceptors
- Manual timeout handling
- Less ergonomic error handling

**Why Axios:**

- Interceptors (essential for auth)
- Automatic JSON parsing
- Better error handling
- Request cancellation
- Timeout configuration

### 13.6 Token Storage Strategy

**Decision: httpOnly Cookies (Primary), localStorage (Fallback)**

**Why httpOnly Cookies:**

- Most secure (not accessible to JavaScript)
- Prevents XSS token theft
- Automatic sending with requests (if CORS configured)

**Why Fallback to localStorage:**

- Simpler initial setup (no backend cookie handling)
- Still secure with proper measures:
  - Short access token expiry (15 min)
  - Token rotation on refresh
  - HTTPS only
  - Encrypted wrapper (optional)

**Implementation:**

- Try httpOnly cookies first
- Fall back to localStorage if not feasible
- Document choice in code

---

## 14. Deployment Architecture

### 14.1 Production Deployment

**Recommended Platform: Vercel**

- Native Next.js support
- Edge functions for middleware
- Automatic preview deployments
- CDN with global edge network

**Alternative: Docker**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 14.2 Environment Configuration

**Development:**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NODE_ENV=development
```

**Production:**

```env
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
NODE_ENV=production
```

**Secrets:**

- Never commit `.env.local`
- Use platform-specific secret management (Vercel Secrets, Docker Secrets)

### 14.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run linter
        run: npm run lint
      - name: Type check
        run: npm run type-check
      - name: Build
        run: npm run build
```

---

## Conclusion

This architecture document provides a comprehensive overview of the frontend system design, patterns, and decisions. It should serve as a reference for developers working on the project and guide future architectural decisions.

For specific implementation details, refer to:

- **CODING_STANDARDS.md**: Code style and conventions
- **COMPONENT_GUIDE.md**: Component usage and patterns
- **FEATURE_EXAMPLES.md**: Step-by-step feature implementation
- **API_INTEGRATION.md**: Detailed API integration guide

**Remember**: This is a living document. Update it as the architecture evolves.
