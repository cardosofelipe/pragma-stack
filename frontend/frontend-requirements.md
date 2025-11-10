# Frontend Requirements Document

## Next.js + FastAPI Template Project

---

## 1. Project Overview

This document specifies the requirements for a production-ready Next.js frontend template that integrates with a FastAPI backend. The template is designed to accelerate development of modern web applications with authentication, user management, and organization management capabilities.

### 1.1 Purpose

Provide a robust, scalable, and maintainable frontend foundation that:

- Integrates seamlessly with the existing FastAPI backend
- Follows modern React and Next.js best practices
- Implements a clear and consistent architecture
- Enables rapid feature development with minimal boilerplate
- Serves as a reference implementation for team standards

### 1.2 Scope

The frontend encompasses:

- User authentication and session management
- User and organization administration interfaces
- Reusable component library
- API integration layer
- State management infrastructure
- Development utilities and tooling

---

## 2. Technology Stack

### 2.1 Core Framework

**Next.js (Latest Version)**

- App Router architecture (not Pages Router)
- Server Components by default, Client Components where interactivity is needed
- TypeScript throughout the entire codebase
- Strict mode enabled

### 2.2 Styling

**Tailwind CSS (Latest Version)**

- Custom configuration for project-specific design tokens
- Dark mode support (class-based strategy)
- Responsive design utilities
- Custom utilities as needed for common patterns

**shadcn/ui (Latest)**

- Component system built on Radix UI primitives
- Customizable and accessible components
- Components copied into project (not npm dependency)
- Consistent with Tailwind configuration

### 2.3 Data Fetching & State Management

**TanStack Query (React Query v5)**

- Server state management
- Automatic background refetching
- Cache management and invalidation
- Optimistic updates for mutations
- Request deduplication
- Pagination and infinite query support

**Zustand (Latest Version)**

- Client-side application state (non-server state)
- Authentication state
- UI state (modals, sidebars, preferences)
- Simple stores without excessive boilerplate
- Minimal usage - prefer server state via TanStack Query

### 2.4 Data Visualization

**Recharts (Latest Version)**

- Chart components for admin dashboards
- Responsive charts
- Customizable with Tailwind theme colors

### 2.5 API Client Generation

**OpenAPI TypeScript Codegen**

- Generator: `openapi-typescript-codegen` (or `@hey-api/openapi-ts` as modern alternative)
- Output: TypeScript types and Axios-based API client
- Generation source: Backend OpenAPI spec endpoint
- Two generation scripts:
  1. Frontend-local script (for frontend-only development)
  2. Root-level script (for monorepo/multi-module setups)

### 2.6 HTTP Client

**Axios (Latest Version)**

- Used by generated API client
- Interceptors for:
  - Authentication token injection
  - Error handling
  - Request/response logging (dev mode)
  - Token refresh logic

### 2.7 Additional Libraries

- **zod**: Runtime type validation and schema definition
- **react-hook-form**: Form state management
- **date-fns**: Date manipulation and formatting
- **clsx** / **tailwind-merge**: Conditional class name handling
- **lucide-react**: Icon system

---

## 3. Project Structure

### 3.1 Directory Layout

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth group layout
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (authenticated)/          # Protected routes group
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── new/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── organizations/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── [id]/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── new/
│   │   │   │           └── page.tsx
│   │   │   └── page.tsx              # Authenticated home
│   │   ├── dev/                      # Development-only routes
│   │   │   ├── components/
│   │   │   │   └── page.tsx          # Component showcase
│   │   │   └── layout.tsx
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Public home
│   │   └── providers.tsx             # Client-side providers
│   ├── components/
│   │   ├── ui/                       # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...                   # Other core components
│   │   ├── auth/                     # Authentication components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── admin/                    # Admin-specific components
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserForm.tsx
│   │   │   ├── OrganizationTable.tsx
│   │   │   ├── OrganizationForm.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   └── AdminHeader.tsx
│   │   ├── charts/                   # Recharts wrappers
│   │   │   ├── BarChartCard.tsx
│   │   │   ├── LineChartCard.tsx
│   │   │   └── PieChartCard.tsx
│   │   ├── layout/                   # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageContainer.tsx
│   │   ├── settings/                 # Settings page components
│   │   │   ├── ProfileSettings.tsx
│   │   │   ├── PasswordSettings.tsx
│   │   │   ├── SessionManagement.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   └── PreferencesSettings.tsx
│   │   └── common/                   # Reusable common components
│   │       ├── DataTable.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── PageHeader.tsx
│   ├── lib/
│   │   ├── api/                      # Generated API client
│   │   │   ├── client.ts             # Axios instance configuration
│   │   │   ├── generated/            # Auto-generated code
│   │   │   │   ├── index.ts
│   │   │   │   ├── models/
│   │   │   │   └── services/
│   │   │   └── hooks/                # TanStack Query hooks
│   │   │       ├── useAuth.ts
│   │   │       ├── useUsers.ts
│   │   │       ├── useOrganizations.ts
│   │   │       └── useSessions.ts
│   │   ├── auth/                     # Authentication utilities
│   │   │   ├── authClient.ts
│   │   │   ├── tokens.ts
│   │   │   └── session.ts
│   │   ├── utils/                    # Utility functions
│   │   │   ├── cn.ts                 # Class name utility
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── errorUtils.ts         # Error handling utilities
│   │   ├── errors.ts                 # Error types and code mapping
│   │   └── constants.ts              # Application constants
│   ├── services/                     # Business logic services
│   │   ├── authService.ts            # Authentication operations
│   │   ├── sessionService.ts         # Session management
│   │   └── adminService.ts           # Admin-specific logic
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useUser.ts
│   │   ├── useMediaQuery.ts
│   │   └── useDebounce.ts
│   ├── stores/                       # Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── index.ts
│   ├── types/                        # TypeScript types
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── organization.ts
│   │   └── common.ts
│   ├── contexts/                     # React contexts (if needed)
│   │   └── index.ts
│   ├── config/                       # Configuration files
│   │   ├── env.ts                    # Environment variables with validation
│   │   ├── api.ts                    # API configuration
│   │   └── queryClient.ts            # TanStack Query configuration
│   └── styles/
│       └── globals.css               # Global styles and Tailwind directives
├── public/
│   ├── images/
│   └── icons/
├── scripts/
│   └── generate-api-client.sh        # Frontend API generation script
├── docs/
│   ├── ARCHITECTURE.md               # Architecture overview
│   ├── CODING_STANDARDS.md           # Coding standards
│   ├── FEATURE_EXAMPLES.md           # Feature implementation examples
│   └── COMPONENT_GUIDE.md            # Component usage guide
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── components.json                    # shadcn configuration
└── package.json

# Root level (multi-module project)
root/
├── scripts/
│   └── generate-frontend-api.sh      # Root-level API generation
├── frontend/                          # As above
└── backend/                           # FastAPI backend
```

### 3.2 File Naming Conventions

- **Components**: PascalCase with `.tsx` extension (e.g., `UserTable.tsx`)
- **Utilities**: camelCase with `.ts` extension (e.g., `formatDate.ts`)
- **Hooks**: camelCase prefixed with `use` (e.g., `useAuth.ts`)
- **Stores**: camelCase suffixed with `Store` (e.g., `authStore.ts`)
- **Types**: camelCase with `.ts` extension (e.g., `user.ts`)
- **Pages**: Next.js convention (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow

**Requirements:**

- Integration with FastAPI backend authentication endpoints
- JWT-based authentication (access token + refresh token pattern)
- Secure token storage strategy:
  - **Access Token**: Stored in memory (React state) or sessionStorage (15-minute expiry)
  - **Refresh Token**: Stored in httpOnly cookie (preferred) or secure localStorage with encryption (7-day expiry)
  - All API requests include: `Authorization: Bearer {access_token}` header
- Automatic token refresh before expiration
- Session persistence across browser reloads
- Clear session expiration handling
- Per-device session tracking with backend

**Login Flow:**

1. User submits credentials via `LoginForm`
2. API client calls backend `/api/v1/auth/login` endpoint
3. Backend returns access token and refresh token
4. Backend creates session record with device information
5. Access token stored in memory/sessionStorage (short-lived, 15 minutes)
6. Refresh token stored in httpOnly cookie or secure localStorage (long-lived, 7 days)
7. Auth store updated with user information
8. Redirect to intended destination or home
9. Axios interceptor adds `Authorization: Bearer {accessToken}` to all requests

**Token Refresh Flow:**

1. Axios interceptor detects 401 response
2. Attempts token refresh via `/api/v1/auth/refresh` endpoint with refresh token
3. Backend validates refresh token JTI (JWT ID) against active session in database
4. If session valid, backend generates NEW access token and NEW refresh token (token rotation)
5. Backend updates session with new JTI and expiration timestamp
6. Frontend stores new tokens and retries original request
7. Old refresh token is invalidated (cannot be reused)

**Logout Flow:**

1. User initiates logout
2. API client calls backend `/api/v1/auth/logout` endpoint with refresh token
3. Backend deactivates the specific session (device) using the refresh token's JTI
4. Other devices remain logged in (per-device session management)
5. Clear all tokens from storage (memory, sessionStorage, localStorage, cookies)
6. Clear auth store
7. Clear TanStack Query cache
8. Redirect to login or home page

**Logout All Devices Flow:**

1. User selects "Logout All Devices" (from session management or security page)
2. API client calls backend `/api/v1/auth/logout-all` endpoint
3. Backend deactivates all sessions for the current user
4. Clear local tokens and state
5. Redirect to login page

### 4.2 Protected Routes

**Route Guard Implementation:**

- Middleware or layout-based protection for authenticated routes
- Server-side session validation where possible
- Client-side auth state checks for immediate UI updates
- Graceful handling of unauthenticated access (redirect to login with return URL)

**Permission Levels:**

- Public routes: accessible to all (home, login, register)
- Authenticated routes: require valid session
- Admin routes: require authenticated user with admin role
- Organization routes: require membership in organization

### 4.3 Auth Components

**LoginForm**

- Username/email and password fields
- Form validation with react-hook-form and zod
- Error handling with user-friendly messages
- Loading states during submission
- "Remember me" option (if applicable)
- Link to registration and password reset

**RegisterForm**

- User registration fields (as required by backend)
- Client-side validation matching backend requirements
- Terms of service acceptance
- Email verification flow (if applicable)

**AuthGuard**

- HOC or component for protecting routes
- Handles loading state during auth check
- Redirects if unauthorized
- Passes through if authorized

### 4.3 Password Reset Flow

**Password Reset Request:**

1. User provides email on reset form
2. API client calls `/api/v1/auth/password-reset/request` with email
3. Backend sends email with reset token (if email exists)
4. Backend always returns success to prevent email enumeration attacks
5. Frontend displays message: "If your email is registered, you'll receive a reset link"
6. User receives email with password reset link containing token parameter

**Password Reset Confirmation:**

1. User clicks email link with token parameter (e.g., `/password-reset/confirm?token=...`)
2. Frontend validates token parameter is present
3. User enters new password (with confirmation)
4. Client-side validation: minimum 8 characters, 1 digit, 1 uppercase letter
5. API client calls `/api/v1/auth/password-reset/confirm` with token and new password
6. Backend validates token, checks expiration, updates password
7. Redirect to login with success message
8. User can now login with new password

**Password Change (Authenticated Users):**

1. User navigates to password settings page
2. User provides current password and new password
3. API client calls `/api/v1/users/me/password` with current and new passwords
4. Backend verifies current password, validates new password, updates password hash
5. Show success message
6. Optional: Logout all other devices for security

### 4.4 Auth State Management

**Zustand Store Requirements:**

```typescript
interface AuthStore {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>; // Logout current device
  logoutAll: () => Promise<void>; // Logout all devices
  refreshTokens: () => Promise<void>; // Refresh access token
  checkAuth: () => Promise<void>; // Verify current session

  // Token management
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void; // Clear all auth state
}
```

**TanStack Query Integration:**

- `useAuth` hook wrapping auth operations
- Automatic user data refetching on window focus
- Cache invalidation on logout
- Optimistic updates where appropriate

### 4.5 Session Management

The backend implements comprehensive per-device session tracking. Users can view active sessions across all devices and manage them individually.

**Session Data Model:**

```typescript
interface UserSession {
  id: UUID; // Session identifier
  device_name: string | null; // "iPhone 14", "Chrome on MacBook"
  device_id: string | null; // Persistent device identifier
  ip_address: string | null; // Last known IP address
  location_city: string | null; // Geolocation city
  location_country: string | null; // Geolocation country
  last_used_at: datetime; // Last activity timestamp
  created_at: datetime; // Session creation time
  expires_at: datetime; // Session expiration time
  is_current: boolean; // Is this the current session?
}
```

**Session Management UI Requirements:**

**Session List Page** (`/settings/sessions`):

- Display all active sessions for the current user
- Show device name, location, last used time, and created date
- Highlight the current session with "This device" or "Current session" badge
- Action button to revoke each non-current session
- "Logout All Other Devices" button at the top
- Confirm before revoking sessions
- Auto-refresh session list periodically

**Session Information Display:**

- Device icon based on device type (desktop, mobile, tablet)
- Location display: "San Francisco, United States" (if available)
- Time display: "Last used 2 hours ago" (relative time with date-fns)
- Expiration display: "Expires in 6 days"
- "This device" badge for current session (different style, cannot revoke)

**Session API Integration:**

- `GET /api/v1/sessions/me` - List all active sessions with pagination
- `DELETE /api/v1/sessions/{session_id}` - Revoke specific session (not current)
- `POST /api/v1/auth/logout` - Logout current device
- `POST /api/v1/auth/logout-all` - Logout all devices
- `DELETE /api/v1/sessions/me/expired` - Cleanup expired sessions (optional, admin-only)

**Component Requirements:**

- `SessionList.tsx` - Display active sessions table or card grid
- `SessionCard.tsx` - Individual session display with device info
- `RevokeSessionDialog.tsx` - Confirmation dialog before revoking
- Integration with settings layout
- Empty state: "No other active sessions"

**User Experience Considerations:**

- Prevent revoking the current session via the session list (only via logout button)
- Show loading state when revoking sessions
- Show success toast: "Session revoked successfully"
- Update session list immediately after revoking
- Warn before "Logout All Other Devices": "This will log you out of all other devices"
- Consider security notifications: "New login from Unknown Device in New York, USA"

---

## 5. API Integration

### 5.1 OpenAPI Client Generation

**Generation Scripts:**

**Frontend Script** (`frontend/scripts/generate-api-client.sh`):

- Fetches OpenAPI spec from backend at `/api/v1/openapi.json`
  - Development: `http://localhost:8000/api/v1/openapi.json`
  - Docker: `http://backend:8000/api/v1/openapi.json`
- Generates TypeScript client in `src/lib/api/generated/`
- Runs as npm script: `npm run generate:api`
- Can be run independently for frontend-only development

**Root Script** (`root/scripts/generate-frontend-api.sh`):

- Orchestrates generation for multi-module setup
- Ensures backend is available (or uses spec file)
- Navigates to frontend directory and runs generation
- Useful for CI/CD and monorepo workflows

**Generator Configuration:**

- Tool: `@hey-api/openapi-ts` (modern, actively maintained)
- Output language: TypeScript
- HTTP client: Axios
- Generate client services: Yes
- Generate models: Yes
- Generate request bodies: Yes
- Export schemas: Yes
- Use union types: Yes
- Generate hooks: Optional (we'll create custom React Query hooks)

### 5.2 Axios Client Configuration

**Requirements:**

```typescript
// src/lib/api/client.ts
- Base Axios instance with configured baseURL
- Request interceptor for adding auth tokens
- Response interceptor for error handling
- Request interceptor for logging (dev mode only)
- Timeout configuration
- Retry logic for transient failures
- Support for request cancellation
```

**Interceptor Responsibilities:**

- **Request Interceptor:**
  - Add `Authorization: Bearer {token}` header
  - Add common headers (Content-Type, etc.)
  - Log requests in development
- **Response Interceptor:**
  - Handle 401 errors (trigger token refresh)
  - Handle 403 errors (insufficient permissions)
  - Handle 500 errors (show user-friendly message)
  - Handle network errors
  - Log responses in development

**Error Response Handling:**

The backend returns structured error responses that must be properly parsed:

```typescript
// Backend error response format
interface APIErrorResponse {
  success: false;
  errors: Array<{
    code: string; // e.g., "AUTH_001", "USER_002", "VAL_001"
    message: string; // Human-readable error message
    field?: string; // Field that caused the error (for form validation)
  }>;
}
```

**Error Handling Requirements:**

- Extract error messages from `errors` array
- Display field-specific errors in forms (match `field` property to form fields)
- Map error codes to user-friendly messages (create error code dictionary)
- Handle specific HTTP status codes:
  - **401 Unauthorized**: Trigger token refresh, then retry request
  - **403 Forbidden**: Show "You don't have permission" message
  - **429 Too Many Requests**: Show "Please slow down" with retry time
  - **500 Internal Server Error**: Show generic error, log details for debugging
  - **Network errors**: Show "Check your internet connection" message
- Log full error details to console in development mode (never in production)
- Never expose sensitive error details to users (stack traces, internal paths, etc.)

**Error Code Mapping Example:**

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  AUTH_001: 'Invalid email or password',
  USER_002: 'This email is already registered',
  USER_003: 'User not found',
  VAL_001: 'Please check your input',
  ORG_001: 'Organization name already exists',
  // ... map all backend error codes
};
```

### 5.3 TanStack Query Integration

**Query Configuration** (`src/config/queryClient.ts`):

```typescript
- Default staleTime: 60000 (1 minute)
- Default cacheTime: 300000 (5 minutes)
- Retry logic: 3 attempts with exponential backoff
- RefetchOnWindowFocus: true (for data freshness)
- RefetchOnReconnect: true
- Error handling defaults
```

**Query Hooks Pattern:**

Each API endpoint should have corresponding hooks in `src/lib/api/hooks/`:

```typescript
// Example: useUsers.ts
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => apiClient.users.getUsers(filters),
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => apiClient.users.getUser(userId),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDto) => apiClient.users.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      apiClient.users.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.users.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

**Hook Organization:**

- One file per resource/entity (users, organizations, etc.)
- Query hooks for GET operations
- Mutation hooks for POST/PUT/PATCH/DELETE operations
- Consistent naming: `use[Resource]`, `use[Resource]s`, `useCreate[Resource]`, etc.
- Proper query key structure for cache invalidation
- Optimistic updates for better UX where appropriate

---

## 6. State Management Architecture

### 6.1 State Management Philosophy

**Pragmatic Approach:**

- Use TanStack Query for all server state (primary state management)
- Use Zustand sparingly for client-only state
- Avoid prop drilling with minimal context providers
- Keep state as local as possible
- Lift state only when necessary

**State Categories:**

1. **Server State** (TanStack Query):
   - User data
   - Organization data
   - Session data (list of active sessions)
   - Any data fetched from API
   - Managed through query hooks

2. **Auth State** (Zustand):
   - Current user
   - Authentication status
   - Token management (access token, refresh token)
   - Token refresh logic

3. **UI State** (Zustand):
   - Sidebar open/closed
   - Theme preference
   - Active modals
   - Toast notifications

4. **Form State** (react-hook-form):
   - Form values
   - Validation errors
   - Submit status

5. **Local Component State** (useState):
   - UI toggles
   - Temporary input values
   - Component-specific flags

### 6.2 Zustand Stores

**Auth Store** (`src/stores/authStore.ts`):

```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
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
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

**Store Guidelines:**

- Keep stores small and focused
- Avoid duplicating server state
- Use selectors for computed values
- Persist where appropriate (localStorage)
- Document why Zustand is chosen over alternatives for each store

### 6.3 Context Providers (Minimal Usage)

**When to Use Contexts:**

- Wrapping app with TanStack Query provider
- Theme provider (if not using Zustand)
- Providing deeply nested utilities (rare)

**When NOT to Use Contexts:**

- Server state (use TanStack Query)
- Auth state (use Zustand)
- Component props that can be passed directly

### 6.4 Custom Hooks

**Custom Hook Requirements:**

- Abstract common patterns
- Compose other hooks when needed
- Return consistent interfaces
- Handle loading and error states
- Include proper TypeScript types

**Example Custom Hooks:**

- `useAuth()`: Wraps auth store and operations
- `useUser()`: Gets current user with loading state
- `useDebounce()`: Debounce input values
- `useMediaQuery()`: Responsive breakpoint detection
- `usePermissions()`: Check user permissions

---

## 7. UI Components

### 7.1 shadcn/ui Components

**Core Components Required:**

- Button
- Card
- Dialog / Modal
- Form components (Input, Label, Select, Textarea, Checkbox, Radio)
- Table
- Tabs
- Toast / Notification
- Dropdown Menu
- Popover
- Sheet (Sidebar)
- Avatar
- Badge
- Separator
- Skeleton (loading states)
- Alert
- Command (search/command palette)
- Progress

**Admin Components:**

- DataTable (enhanced table with sorting, filtering, pagination)
- Calendar
- Date Picker
- Multi-select

**Installation:**

- Install via shadcn CLI: `npx shadcn-ui@latest add [component]`
- Customize theme in `tailwind.config.ts`
- Document customizations in `COMPONENT_GUIDE.md`

### 7.2 Custom Components

**Layout Components** (`src/components/layout/`):

**Header.tsx**

- App logo/title
- Navigation links
- User menu dropdown
- Theme toggle
- Mobile menu button

**Footer.tsx**

- Copyright information
- Links to docs, support
- Social media links (if applicable)

**Sidebar.tsx**

- Navigation menu for authenticated users
- Collapsible sections
- Active route highlighting
- Responsive (drawer on mobile)

**PageContainer.tsx**

- Consistent page padding
- Max-width container
- Responsive layout

**Admin Components** (`src/components/admin/`):

**UserTable.tsx**

- Display users in data table
- Sortable columns: name, email, role, created date
- Filterable by role, status
- Searchable by name/email
- Actions: edit, delete, impersonate (if applicable)
- Pagination
- Row selection for bulk operations

**UserForm.tsx**

- Create/edit user form
- Fields: name, email, role, status, organization assignment
- Validation with react-hook-form + zod
- Submit and cancel actions
- Loading and error states

**OrganizationTable.tsx**

- Display organizations in data table
- Sortable columns: name, member count, created date
- Searchable by name
- Actions: edit, delete, view members
- Pagination

**OrganizationForm.tsx**

- Create/edit organization form
- Fields: name, description, settings
- Validation
- Submit and cancel actions

**AdminSidebar.tsx**

- Admin navigation menu
- Links to user management, org management, settings
- Collapsible sections
- Active route indication

**AdminHeader.tsx**

- Admin page title
- Breadcrumbs
- Action buttons (contextual)

**AdminStats.tsx**

- Dashboard statistics cards
- Display total users, active users, total organizations
- Growth indicators (percentage change)
- Optional chart integration (mini sparklines)
- Responsive card grid

**BulkActionBar.tsx**

- Appears when rows are selected in admin tables
- Selection count display ("3 users selected")
- Action dropdown (Activate, Deactivate, Delete)
- Confirmation dialog before destructive actions
- Progress indicator for bulk operations
- Clear selection button

**UserActivationToggle.tsx**

- Toggle or button to activate/deactivate individual users
- Show current status (Active/Inactive)
- Confirmation for deactivation
- Admin-only component (permission check)
- Optimistic UI updates

**OrganizationMemberManager.tsx**

- Add members to organization (user search/select)
- Remove members from organization
- Change member roles (owner, admin, member)
- Display member list with roles
- Role badge styling
- Permission checks (who can manage members)

**Chart Components** (`src/components/charts/`):

**BarChartCard.tsx**

- Wrapped Recharts BarChart
- Card container with title and description
- Responsive
- Themed colors

**LineChartCard.tsx**

- Wrapped Recharts LineChart
- Similar structure to BarChartCard

**PieChartCard.tsx**

- Wrapped Recharts PieChart
- Legend
- Tooltips

**Settings Components** (`src/components/settings/`):

**ProfileSettings.tsx**

- User profile edit form
- Fields: first_name, last_name, email, phone_number
- Avatar upload (optional)
- Preferences JSON editor (optional)
- Form validation and submission

**PasswordSettings.tsx**

- Password change form
- Fields: current password, new password, confirm new password
- Password strength indicator
- Validation: min 8 chars, 1 digit, 1 uppercase
- Option to logout all other devices after change

**SessionManagement.tsx**

- List all active sessions
- Display session cards with device info
- Revoke session functionality
- "Logout All Other Devices" button
- Current session highlighting

**SessionCard.tsx**

- Individual session display
- Device icon (desktop, mobile, tablet)
- Location and IP display
- Last used timestamp (relative time)
- Revoke button (disabled for current session)

**PreferencesSettings.tsx**

- User preferences form (theme, notifications, etc.)
- Stored in User.preferences JSON field
- Theme toggle (light, dark, system)
- Optional email notification settings

**Common Components** (`src/components/common/`):

**DataTable.tsx**

- Generic reusable data table
- Props: data, columns, pagination, sorting, filtering
- Built on shadcn Table component
- TypeScript generic for type safety

**LoadingSpinner.tsx**

- Centered spinner
- Size variants
- Accessible (aria-label)

**ErrorBoundary.tsx**

- React error boundary
- Display fallback UI on errors
- Error reporting hook

**PageHeader.tsx**

- Page title
- Optional description
- Optional action buttons

### 7.3 Component Guidelines

**Component Structure:**

```typescript
// Imports
import { ... } from 'react';
import { ... } from 'external-lib';
import { ... } from '@/components/ui';
import { ... } from '@/lib';

// Types
interface ComponentProps {
  // ...
}

// Component
export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks
  // Derived state
  // Event handlers

  // Render
  return (
    // JSX
  );
}
```

**Best Practices:**

- Prefer named exports over default exports
- Co-locate types with component file
- Use TypeScript for all props
- Destructure props in function signature
- Keep components focused (single responsibility)
- Extract reusable logic to hooks
- Use composition over prop drilling
- Implement proper loading and error states
- Make components accessible (ARIA labels, keyboard navigation)

---

## 8. Routing & Pages

### 8.1 Route Structure

**Public Routes:**

- `/` - Home page (accessible to all)
- `/login` - Login page
- `/register` - Registration page

**Authenticated Routes:**

- `/` - Home page (authenticated view, different from public)
- `/dashboard` - Optional: user dashboard

**Admin Routes:**

- `/admin` - Admin dashboard/landing with statistics and charts
- `/admin/users` - User list with search, filters, and bulk actions
- `/admin/users/[id]` - User detail/edit with sessions and organizations
- `/admin/users/new` - Create user (can set superuser status)
- `/admin/organizations` - Organization list with search and filters
- `/admin/organizations/[id]` - Organization detail/edit with settings
- `/admin/organizations/[id]/members` - Organization member management
- `/admin/organizations/new` - Create organization

**Account/Settings Routes:**

- `/settings` - Settings layout (redirects to /settings/profile)
- `/settings/profile` - User profile edit (first_name, last_name, email, phone, preferences)
- `/settings/password` - Change password (current + new password)
- `/settings/sessions` - View and manage active sessions across devices
- `/settings/preferences` - User preferences (theme, notifications, etc.)

**Development Routes (dev environment only):**

- `/dev/components` - Component showcase/storybook
- `/dev/icons` - Icon preview
- `/dev/theme` - Theme preview

### 8.2 Page Specifications

**Home Page** (`/`):

**Public View:**

- Hero section with project description
- Feature highlights
- Call-to-action (login/register buttons)
- Example components showcasing capabilities
- Footer

**Authenticated View:**

- Welcome message with user name
- Quick stats or dashboard widgets
- Recent activity
- Navigation to key areas (admin, profile)

**Admin Landing** (`/admin`):

- Overview dashboard
- Key metrics cards (total users, total organizations, active sessions)
- Charts showing trends (user growth, organization growth)
- Quick links to management sections
- Recent activity log

**User Management** (`/admin/users`):

- User table with all features (search, sort, filter, paginate)
- "Create User" button
- Bulk actions (if applicable)
- Export functionality (optional)

**User Detail** (`/admin/users/[id]`):

- User information display
- Edit form
- Organization memberships
- Activity log
- Danger zone (delete user)

**User Creation** (`/admin/users/new`):

- User creation form
- Form validation
- Success redirect to user list or detail

**Organization Management** (`/admin/organizations`):

- Organization table with all features
- "Create Organization" button
- Bulk actions (if applicable)

**Organization Detail** (`/admin/organizations/[id]`):

- Organization information display
- Edit form
- Member list
- Settings
- Danger zone (delete organization)

**Organization Creation** (`/admin/organizations/new`):

- Organization creation form
- Form validation
- Success redirect

**Component Showcase** (`/dev/components`):

- Grid or list of all reusable components
- Each component shown in various states (default, loading, error, disabled)
- Interactive controls to test component props
- Code snippets showing usage
- Only accessible in development environment

### 8.3 Layout Strategy

**Root Layout** (`src/app/layout.tsx`):

- HTML structure
- TanStack Query provider
- Theme provider
- Toast provider
- Global metadata

**Auth Group Layout** (`src/app/(auth)/layout.tsx`):

- Centered form layout
- No header/footer
- Background styling

**Authenticated Group Layout** (`src/app/(authenticated)/layout.tsx`):

- Header
- Optional sidebar
- Main content area
- Footer
- Auth guard

**Admin Layout** (`src/app/(authenticated)/admin/layout.tsx`):

- Admin header
- Admin sidebar
- Breadcrumbs
- Admin-specific auth guard (role check)

**Dev Layout** (`src/app/dev/layout.tsx`):

- Simple layout
- Environment check (only render in dev)
- Navigation between dev pages

### 8.4 Page Components

**Structure:**

- Each page is a Server Component by default
- Client Components used for interactivity
- Loading states via `loading.tsx`
- Error handling via `error.tsx`
- Metadata exported for SEO

**Example:**

```typescript
// src/app/(authenticated)/admin/users/page.tsx
import { Metadata } from 'next';
import { UserTable } from '@/components/admin/UserTable';

export const metadata: Metadata = {
  title: 'User Management',
  description: 'Manage application users',
};

export default function UsersPage() {
  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage application users"
      />
      <UserTable />
    </div>
  );
}
```

---

## 9. Development Environment

### 9.1 Environment Variables

**Required Environment Variables:**

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000

# Authentication
NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD=300000  # 5 minutes in ms (refresh before expiry)
NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY=900000      # 15 minutes in ms
NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY=604800000  # 7 days in ms

# App Configuration
NEXT_PUBLIC_APP_NAME=Template Project
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_REGISTRATION=true
NEXT_PUBLIC_ENABLE_SESSION_MANAGEMENT=true

# Development
NODE_ENV=development

# Optional: Debugging
NEXT_PUBLIC_DEBUG_API=false
```

**Environment File Structure:**

- `.env.example` - Template with all variables (committed)
- `.env.local` - Local overrides (gitignored)
- `.env.development` - Development defaults (optional)
- `.env.production` - Production values (optional, for reference)

**Environment Validation:**

- Use zod to validate environment variables at build time
- Fail fast if required variables are missing
- Type-safe access via `src/config/env.ts`

### 9.2 Development Scripts

**package.json Scripts:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "generate:api": "./scripts/generate-api-client.sh",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### 9.3 Code Quality Tools

**ESLint:**

- Next.js ESLint configuration
- TypeScript ESLint rules
- React hooks rules
- Import order rules
- Accessibility rules (eslint-plugin-jsx-a11y)

**Prettier:**

- Consistent code formatting
- Integrated with ESLint
- Pre-commit hook (optional: husky + lint-staged)

**TypeScript:**

- Strict mode enabled
- Path aliases configured (`@/*` -> `src/*`)
- Incremental compilation
- No implicit any

### 9.4 Development Routes Requirements

**Environment Check:**

- `/dev/*` routes only accessible when `NODE_ENV === 'development'`
- Display 404 or redirect in production

**Component Showcase Page:**

- Organized by category (UI, Admin, Layout, Common, Charts)
- Each component in isolated container
- Interactive props (where applicable)
- Copy code snippet button
- Search/filter components
- Dark mode toggle to preview components in both themes

---

## 10. Code Standards & Conventions

### 10.1 TypeScript Standards

**Type Definitions:**

- Define types in `src/types/` for shared types
- Co-locate types with components for component-specific types
- Use interfaces for object shapes, types for unions/primitives
- Avoid `any` - use `unknown` if type is truly unknown
- Use generic types for reusable components and utilities

**Naming:**

- Interfaces: PascalCase with descriptive names (e.g., `UserProfile`, `ApiResponse`)
- Type aliases: PascalCase (e.g., `UserId`, `DateString`)
- Enums: PascalCase for enum name, UPPER_SNAKE_CASE for values

**Import Aliases:**

- `@/` alias maps to `src/`
- Use `@/components/ui` instead of relative paths for UI components
- Use `@/lib` for library code
- Use `@/types` for shared types

### 10.2 Component Standards

**Naming:**

- PascalCase for component files and component names
- Match file name with component name

**Structure:**

- One component per file
- Extract complex logic into custom hooks
- Separate concerns (presentation vs. logic)

**Props:**

- Define explicit prop interfaces
- Use destructuring in function signature
- Provide defaults via destructuring when appropriate
- Document complex props with JSDoc comments

**State:**

- Keep state as local as possible
- Use appropriate state management for each use case
- Avoid redundant state (derive when possible)

### 10.3 Styling Standards

**Tailwind Usage:**

- Use Tailwind utility classes directly in JSX
- Avoid inline styles unless absolutely necessary
- Use `cn()` utility for conditional classes
- Extract repeated class combinations into components

**Responsive Design:**

- Mobile-first approach
- Use Tailwind responsive modifiers (sm, md, lg, xl, 2xl)
- Test on multiple screen sizes

**Dark Mode:**

- Use Tailwind dark mode classes (dark:\*)
- Ensure all components support dark mode
- Test both light and dark themes

### 10.4 API Integration Standards

**Query Hooks:**

- One hook per operation
- Consistent naming: `use[Resource]`, `use[Resource]s`, `useCreate[Resource]`, etc.
- Proper query keys for cache management
- Handle loading, error, and success states

**Mutation Hooks:**

- Return mutation function and status
- Invalidate relevant queries on success
- Handle errors gracefully
- Provide user feedback (toast notifications)

**Error Handling:**

- Display user-friendly error messages
- Log errors to console (or error service)
- Show retry options when appropriate
- Avoid exposing technical details to users

### 10.5 Form Standards

**Form Implementation:**

- Use react-hook-form for form state
- Use zod for validation schemas
- Use shadcn Form components for consistent UI
- Provide immediate validation feedback
- Disable submit button during submission
- Show loading state during submission

**Form Structure:**

```typescript
// Define schema
const formSchema = z.object({
  // fields
});

// Use hook
const form = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: {
    // defaults
  },
});

// Submit handler
const onSubmit = async (data: z.infer<typeof formSchema>) => {
  // mutation logic
};
```

### 10.6 Testing Standards (Future)

**Test Structure:**

- Unit tests for utilities and hooks
- Integration tests for API hooks
- Component tests for reusable components
- E2E tests for critical user flows

**Testing Tools:**

- Jest for unit tests
- React Testing Library for component tests
- Playwright or Cypress for E2E tests (optional)

---

## 11. Documentation Requirements

### 11.1 Architecture Documentation

**ARCHITECTURE.md Requirements:**

**System Overview:**

- High-level architecture diagram
- Explanation of chosen technologies and why
- Data flow diagrams (authentication, API calls, state management)
- Folder structure rationale

**Key Concepts:**

- App Router vs. Pages Router decision
- Server Components vs. Client Components usage
- State management philosophy
- API integration approach

**Architecture Decisions:**

- Why TanStack Query over alternatives
- Why Zustand over alternatives
- OpenAPI client generation rationale
- Authentication strategy explanation

### 11.2 Coding Standards Documentation

**CODING_STANDARDS.md Requirements:**

**TypeScript Guidelines:**

- Type definition best practices
- When to use interfaces vs. types
- How to handle unknown types
- Generic type usage

**Component Guidelines:**

- Component structure template
- Prop definition standards
- State management in components
- Hook usage patterns

**Styling Guidelines:**

- Tailwind usage patterns
- Responsive design approach
- Dark mode implementation
- Component styling dos and don'ts

**API Integration Guidelines:**

- How to create query hooks
- How to create mutation hooks
- Error handling patterns
- Cache invalidation strategies

**Form Guidelines:**

- react-hook-form setup
- Validation with zod
- Error display
- Submit handling

### 11.3 Feature Implementation Examples

**FEATURE_EXAMPLES.md Requirements:**

Provide 2-3 complete feature implementation walkthroughs, including:

**Example 1: User Management Feature**

- Backend API endpoints used
- Generated API client usage
- Query hooks creation (`src/lib/api/hooks/useUsers.ts`)
- Component implementation (`src/components/admin/UserTable.tsx`)
- Page implementation (`src/app/(authenticated)/admin/users/page.tsx`)
- Form implementation (`src/components/admin/UserForm.tsx`)
- Complete code snippets for each file

**Example 2: Organization Management Feature**

- Similar structure to Example 1
- Highlights differences and patterns

**Example 3: Adding a New Chart to Admin Dashboard**

- Data fetching setup
- Chart component creation
- Integration into dashboard page
- Styling and responsiveness

**Each Example Should Show:**

1. What files to create/modify
2. Where each file goes in the project structure
3. Complete, working code for each file
4. How files interact with each other
5. Testing the feature (manual testing steps)

### 11.4 Component Usage Guide

**COMPONENT_GUIDE.md Requirements:**

**shadcn/ui Components:**

- List of installed components
- Usage examples for each
- Customization examples
- Common patterns (forms, dialogs, tables)

**Custom Components:**

- Purpose and when to use
- Props documentation
- Usage examples
- Styling and customization

**Component Composition:**

- How to compose components together
- Common patterns (Card + Table, Dialog + Form)
- Best practices for component composition

---

## 12. Non-Functional Requirements

### 12.1 Performance

**Target Metrics:**

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Performance Score: > 90

**Optimization Strategies:**

- Image optimization (next/image)
- Code splitting and lazy loading
- Minimize client-side JavaScript
- Efficient bundle size (monitor with Bundle Analyzer)
- Proper caching strategies

### 12.2 Accessibility

**Standards:**

- WCAG 2.1 Level AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support
- Proper semantic HTML
- ARIA labels where necessary
- Color contrast ratios (4.5:1 for normal text, 3:1 for large text)

**Testing:**

- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)
- Lighthouse accessibility audit
- axe DevTools scanning

### 12.3 Browser Support

**Target Browsers:**

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

**Mobile:**

- iOS Safari (last 2 versions)
- Chrome Android (last 2 versions)

### 12.4 Security

**Client-Side Security:**

- XSS prevention (React defaults + sanitization where needed)
- CSRF protection (if not handled by backend)
- Secure token storage
- No sensitive data in localStorage or client-side code
- Content Security Policy headers
- HTTPS only in production

**Dependency Security:**

- Regular dependency updates
- Security audit via `npm audit`
- Automated security scanning (Dependabot, Snyk)

### 12.5 SEO

**Requirements:**

- Semantic HTML structure
- Proper meta tags (title, description)
- Open Graph tags for social sharing
- Sitemap generation
- robots.txt configuration
- Structured data where applicable

---

## 13. Implementation Priorities

While detailed implementation planning is out of scope for this document, the following priority order is recommended:

**Phase 1: Foundation**

1. Project setup and configuration
2. API client generation setup
3. Authentication implementation
4. Basic layout components

**Phase 2: Core Features**

1. User management pages
2. Organization management pages
3. Admin dashboard

**Phase 3: Polish**

1. Development showcase pages
2. Advanced components
3. Charts and analytics
4. Documentation completion

**Phase 4: Production Readiness**

1. Performance optimization
2. Accessibility audit and fixes
3. Security hardening
4. Testing implementation

---

## 14. Success Criteria

The frontend template will be considered complete when:

1. **Functionality:**
   - All specified pages are implemented and functional
   - Authentication flow works end-to-end
   - User and organization CRUD operations work
   - API integration is complete and reliable

2. **Code Quality:**
   - TypeScript strict mode passes without errors
   - ESLint passes without warnings
   - All code follows documented standards
   - No console errors in production build

3. **Documentation:**
   - All required documentation files are complete
   - Code examples are accurate and tested
   - Architecture is clearly explained
   - New developers can onboard using documentation alone

4. **User Experience:**
   - UI is responsive on all target devices
   - Loading states are shown appropriately
   - Error messages are user-friendly
   - Dark mode works throughout the app

5. **Developer Experience:**
   - Clear project structure is easy to navigate
   - API client generation works reliably
   - Adding new features follows clear patterns
   - Development environment is easy to set up

---

## 15. Backend API Endpoint Reference

Complete reference of all backend API endpoints for frontend integration. All endpoints are prefixed with `/api/v1/`.

### 15.1 Authentication Endpoints

| Method | Endpoint                              | Purpose                              | Auth Required       | Request Body                    | Response                            |
| ------ | ------------------------------------- | ------------------------------------ | ------------------- | ------------------------------- | ----------------------------------- |
| POST   | `/api/v1/auth/register`               | Register new user account            | No                  | `{email, password, first_name}` | User + tokens                       |
| POST   | `/api/v1/auth/login`                  | Authenticate user                    | No                  | `{email, password}`             | User + access_token + refresh_token |
| POST   | `/api/v1/auth/login/oauth`            | OAuth2-compatible login (Swagger UI) | No                  | Form data                       | tokens                              |
| POST   | `/api/v1/auth/refresh`                | Refresh access token                 | Yes (refresh token) | `{refresh_token}`               | New access_token + refresh_token    |
| GET    | `/api/v1/auth/me`                     | Get current user from token          | Yes                 | -                               | User object                         |
| POST   | `/api/v1/auth/logout`                 | Logout current device                | Yes                 | -                               | Success message                     |
| POST   | `/api/v1/auth/logout-all`             | Logout all devices                   | Yes                 | -                               | Success message                     |
| POST   | `/api/v1/auth/password-reset/request` | Request password reset email         | No                  | `{email}`                       | Success message (always)            |
| POST   | `/api/v1/auth/password-reset/confirm` | Reset password with token            | No                  | `{token, new_password}`         | Success message                     |

**Authentication Response Format:**

```typescript
{
  access_token: string; // JWT, expires in 15 minutes
  refresh_token: string; // JWT, expires in 7 days
  token_type: 'bearer';
  user: User;
}
```

### 15.2 User Endpoints

| Method | Endpoint                    | Purpose                    | Auth Required      | Query Params                                  | Response        |
| ------ | --------------------------- | -------------------------- | ------------------ | --------------------------------------------- | --------------- |
| GET    | `/api/v1/users`             | List all users (paginated) | Admin only         | `page, page_size, search`                     | Paginated users |
| GET    | `/api/v1/users/me`          | Get own profile            | Yes                | -                                             | User object     |
| PATCH  | `/api/v1/users/me`          | Update own profile         | Yes                | `{first_name, last_name, phone, preferences}` | Updated user    |
| PATCH  | `/api/v1/users/me/password` | Change own password        | Yes                | `{current_password, new_password}`            | Success message |
| GET    | `/api/v1/users/{user_id}`   | Get user by ID             | Yes (own or admin) | -                                             | User object     |
| PATCH  | `/api/v1/users/{user_id}`   | Update user                | Yes (own or admin) | User fields                                   | Updated user    |
| DELETE | `/api/v1/users/{user_id}`   | Soft delete user           | Admin only         | -                                             | Success message |

**User Model Fields:**

```typescript
{
  id: UUID;
  email: string;
  first_name: string; // Required
  last_name: string | null;
  phone_number: string | null;
  is_active: boolean;
  is_superuser: boolean;
  preferences: Record<string, any> | null;
  created_at: datetime;
  updated_at: datetime | null;
}
```

### 15.3 Session Management Endpoints

| Method | Endpoint                        | Purpose                  | Auth Required     | Response          |
| ------ | ------------------------------- | ------------------------ | ----------------- | ----------------- |
| GET    | `/api/v1/sessions/me`           | List my active sessions  | Yes               | Array of sessions |
| DELETE | `/api/v1/sessions/{session_id}` | Revoke specific session  | Yes (own session) | Success message   |
| DELETE | `/api/v1/sessions/me/expired`   | Cleanup expired sessions | Yes               | Success message   |

**Session Model:**

```typescript
{
  id: UUID;
  device_name: string | null;
  device_id: string | null;
  ip_address: string | null;
  location_city: string | null;
  location_country: string | null;
  last_used_at: datetime;
  created_at: datetime;
  expires_at: datetime;
  is_current: boolean;
}
```

### 15.4 Admin User Management Endpoints

| Method | Endpoint                                   | Purpose                         | Auth Required | Request Body                            | Response            |
| ------ | ------------------------------------------ | ------------------------------- | ------------- | --------------------------------------- | ------------------- |
| GET    | `/api/v1/admin/users`                      | List all users with filters     | Admin only    | `search, is_active, is_superuser, page` | Paginated users     |
| POST   | `/api/v1/admin/users`                      | Create user (can set superuser) | Admin only    | User fields + `is_superuser`            | Created user        |
| GET    | `/api/v1/admin/users/{user_id}`            | Get user details                | Admin only    | -                                       | User with relations |
| PUT    | `/api/v1/admin/users/{user_id}`            | Update user (full update)       | Admin only    | All user fields                         | Updated user        |
| DELETE | `/api/v1/admin/users/{user_id}`            | Soft delete user                | Admin only    | -                                       | Success message     |
| POST   | `/api/v1/admin/users/{user_id}/activate`   | Activate user account           | Admin only    | -                                       | Updated user        |
| POST   | `/api/v1/admin/users/{user_id}/deactivate` | Deactivate user account         | Admin only    | -                                       | Updated user        |
| POST   | `/api/v1/admin/users/bulk-action`          | Bulk activate/deactivate/delete | Admin only    | `{action, user_ids[]}`                  | Results array       |

**Bulk Action Request:**

```typescript
{
  action: "activate" | "deactivate" | "delete";
  user_ids: UUID[];
}
```

### 15.5 Organization Endpoints

| Method | Endpoint                         | Purpose                  | Auth Required         | Response               |
| ------ | -------------------------------- | ------------------------ | --------------------- | ---------------------- |
| GET    | `/api/v1/organizations`          | List organizations       | Yes                   | Array of organizations |
| POST   | `/api/v1/organizations`          | Create organization      | Yes                   | Created organization   |
| GET    | `/api/v1/organizations/{org_id}` | Get organization details | Yes (member or admin) | Organization           |
| PUT    | `/api/v1/organizations/{org_id}` | Update organization      | Yes (admin of org)    | Updated organization   |
| DELETE | `/api/v1/organizations/{org_id}` | Delete organization      | Yes (admin of org)    | Success message        |

**Organization Model:**

```typescript
{
  id: UUID;
  name: string;
  slug: string; // URL-friendly identifier
  description: string | null;
  is_active: boolean;
  settings: Record<string, any>; // JSON settings
  member_count: number; // Computed field
  created_at: datetime;
  updated_at: datetime | null;
}
```

### 15.6 Admin Organization Management Endpoints

| Method | Endpoint                                                 | Purpose                   | Auth Required | Request Body                          | Response         |
| ------ | -------------------------------------------------------- | ------------------------- | ------------- | ------------------------------------- | ---------------- |
| GET    | `/api/v1/admin/organizations`                            | List all orgs with search | Admin only    | `search, page`                        | Paginated orgs   |
| POST   | `/api/v1/admin/organizations`                            | Create organization       | Admin only    | `{name, slug, description, settings}` | Created org      |
| GET    | `/api/v1/admin/organizations/{org_id}`                   | Get org details           | Admin only    | -                                     | Organization     |
| PUT    | `/api/v1/admin/organizations/{org_id}`                   | Update organization       | Admin only    | Org fields                            | Updated org      |
| DELETE | `/api/v1/admin/organizations/{org_id}`                   | Delete organization       | Admin only    | -                                     | Success message  |
| GET    | `/api/v1/admin/organizations/{org_id}/members`           | List organization members | Admin only    | -                                     | Array of members |
| POST   | `/api/v1/admin/organizations/{org_id}/members`           | Add member with role      | Admin only    | `{user_id, role}`                     | Member object    |
| DELETE | `/api/v1/admin/organizations/{org_id}/members/{user_id}` | Remove member             | Admin only    | -                                     | Success message  |

**Organization Member:**

```typescript
{
  user_id: UUID;
  user_email: string;
  user_name: string; // first_name + last_name
  role: 'owner' | 'admin' | 'member';
  joined_at: datetime;
}
```

### 15.7 Response Formats

**Success Response (Data):**

```typescript
{
  data: T | T[];                   // Single object or array
  pagination?: {                   // For paginated endpoints
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

**Success Response (Message):**

```typescript
{
  success: true;
  message: string;
}
```

**Error Response:**

```typescript
{
  success: false;
  errors: Array<{
    code: string; // e.g., "AUTH_001", "USER_002"
    message: string;
    field?: string; // Optional field name for form errors
  }>;
}
```

### 15.8 Common Query Parameters

| Parameter      | Type    | Description                     | Default | Example               |
| -------------- | ------- | ------------------------------- | ------- | --------------------- |
| `page`         | integer | Page number (1-indexed)         | 1       | `?page=2`             |
| `page_size`    | integer | Items per page                  | 20      | `?page_size=50`       |
| `search`       | string  | Search term (name, email, etc.) | -       | `?search=john`        |
| `is_active`    | boolean | Filter by active status         | -       | `?is_active=true`     |
| `is_superuser` | boolean | Filter by superuser status      | -       | `?is_superuser=false` |
| `sort_by`      | string  | Sort field                      | -       | `?sort_by=created_at` |
| `sort_order`   | string  | Sort direction (asc/desc)       | desc    | `?sort_order=asc`     |

### 15.9 Authentication Header Format

All authenticated requests must include:

```
Authorization: Bearer {access_token}
```

Example:

```typescript
headers: {
  'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`,
  'Content-Type': 'application/json'
}
```

### 15.10 Rate Limiting

Backend implements rate limiting per endpoint:

- **Auth endpoints**: 5 requests/minute
- **Read operations**: 60 requests/minute
- **Write operations**: 10-20 requests/minute

Rate limit headers in response:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1234567890
```

When rate limit exceeded, backend returns `429 Too Many Requests`.

---

## Appendix A: Technology Versions

Latest stable versions as of document creation:

- Next.js: 15.x
- React: 18.x
- TypeScript: 5.x
- Tailwind CSS: 3.x
- TanStack Query: 5.x
- Zustand: 4.x
- Recharts: 2.x
- Axios: 1.x
- react-hook-form: 7.x
- zod: 3.x

---

## Appendix B: Useful Resources

- **Next.js Documentation:** https://nextjs.org/docs
- **TanStack Query Documentation:** https://tanstack.com/query/latest
- **shadcn/ui Documentation:** https://ui.shadcn.com
- **Tailwind CSS Documentation:** https://tailwindcss.com/docs
- **Zustand Documentation:** https://docs.pmnd.rs/zustand
- **OpenAPI TypeScript Codegen:** https://github.com/ferdikoomen/openapi-typescript-codegen
- **Hey API:** https://github.com/hey-api/openapi-ts

---

## Document Metadata

- **Version:** 1.0
- **Date:** October 31, 2025
- **Status:** Draft
- **Next Review:** Upon implementation start
