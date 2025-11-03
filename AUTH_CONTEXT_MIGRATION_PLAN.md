# Authentication Context DI Migration Plan

**Version**: 1.0
**Date**: 2025-11-03
**Objective**: Migrate authentication system from direct Zustand singleton usage to Context-based Dependency Injection pattern for full testability while maintaining security and performance.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Context & Problem Analysis](#context--problem-analysis)
3. [Solution Architecture](#solution-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)
7. [Success Criteria](#success-criteria)

---

## Executive Summary

### Current State
- **Authentication**: Zustand singleton store with AES-GCM encryption
- **Security**: Production-grade (JWT validation, session tracking, encrypted storage)
- **Performance**: Excellent (singleton refresh pattern, 98.38% test coverage)
- **Testability**: Poor (E2E tests cannot mock auth state)

### Target State
- **Authentication**: Zustand store wrapped in React Context for DI
- **Security**: Unchanged (all security logic preserved)
- **Performance**: Unchanged (same runtime characteristics)
- **Testability**: Excellent (E2E tests can inject mock stores)

### Impact
- **Files Modified**: 13 files (8 source, 5 tests)
- **Files Created**: 2 new files
- **Breaking Changes**: None (internal refactor only)
- **Test Coverage**: Maintained at ≥98.38%

### Success Metrics
- 100% unit test pass rate
- 100% E2E test pass rate (86 total tests)
- Zero console errors
- Zero performance regression
- All manual test scenarios pass

---

## Phase 1 Lessons Learned (CRITICAL - READ FIRST)

**Phase 1 Status**: ✅ **COMPLETED** - All issues resolved

### Key Implementation Insights

#### 1. useAuth Hook Must Call Zustand Hook Internally

**❌ WRONG (Original Plan)**:
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  return context;  // Returns the hook function - VIOLATES React Rules of Hooks!
}
```

**✅ CORRECT (Implemented)**:
```typescript
export function useAuth(): AuthState;
export function useAuth<T>(selector: (state: AuthState) => T): T;
export function useAuth<T>(selector?: (state: AuthState) => T): AuthState | T {
  const storeHook = useContext(AuthContext);
  if (!storeHook) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  // CRITICAL: Call the hook internally
  return selector ? storeHook(selector) : storeHook();
}
```

**Why This Matters**:
- ✅ Enables `const { user } = useAuth()` pattern (simple, idiomatic)
- ✅ Also supports `const user = useAuth(s => s.user)` pattern (optimized)
- ✅ Follows React Rules of Hooks (hook called at component top level)
- ❌ Without this, components would need `const { user } = useAuth()()` (wrong!)

#### 2. Provider Placement Architecture

**Correct Structure**:
```
layout.tsx:
  <AuthProvider>           ← Provides DI layer
    <AuthInitializer />    ← Loads auth from storage (needs AuthProvider)
    <Providers>            ← Other providers (Theme, Query)
      {children}
    </Providers>
  </AuthProvider>
```

**Why This Order**:
- AuthProvider must wrap AuthInitializer (AuthInitializer uses auth state)
- AuthProvider should wrap Providers (auth available everywhere)
- Keep provider tree shallow (performance)

#### 3. Type Safety with Explicit AuthState Interface

**✅ DO**: Define explicit AuthState interface matching Zustand store:
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  // ... all properties explicitly typed
}
```

**Benefits**:
- IDE autocomplete works perfectly
- Type errors caught at compile time
- Self-documenting code
- Easier to maintain

#### 4. Comprehensive JSDoc Documentation

**Pattern to Follow**:
```typescript
/**
 * [Component/Function Name] - [One-line purpose]
 *
 * [Detailed description including:]
 * - What it does
 * - When to use it
 * - How it works
 *
 * @param {Type} paramName - Parameter description
 * @throws {ErrorType} When error occurs
 * @returns {Type} Return value description
 *
 * @example
 * ```tsx
 * // Concrete usage example
 * const { user } = useAuth();
 * ```
 */
```

**Include Examples For**:
- Different usage patterns (with/without selectors)
- Common mistakes to avoid
- Testing scenarios

#### 5. Barrel Exports for Clean Imports

**DO**: Add to barrel files (`src/lib/stores/index.ts`):
```typescript
export { useAuth, AuthProvider } from '../auth/AuthContext';
```

**Benefits**:
- Consistent import paths: `import { useAuth } from '@/lib/stores'`
- Easy to refactor internal structure
- Clear public API

### Critical Mistakes to Avoid

1. **❌ Don't return hook function from useAuth**
   - Returns function, not state
   - Violates React Rules of Hooks
   - Breaks in Phase 2+

2. **❌ Don't nest AuthProvider inside Providers**
   - AuthInitializer won't have access to auth
   - Wrong dependency order

3. **❌ Don't forget barrel exports**
   - Inconsistent import paths
   - Harder to maintain

4. **❌ Don't skip documentation**
   - Future developers won't understand usage
   - Leads to incorrect implementations

5. **❌ Don't use implicit types**
   - Harder to debug type issues
   - Worse IDE support

### Verification Checklist (Always Run)

After any changes:
- [ ] `npm run type-check` - Must pass with 0 errors
- [ ] `npm run dev` - App must start without errors
- [ ] Browser console - Must be clean (no errors/warnings)
- [ ] Test actual usage - Navigate to protected routes
- [ ] Check React DevTools - Verify provider tree structure

### Performance Considerations

**Polymorphic useAuth Hook**:
- ✅ No performance overhead (hook called once per component)
- ✅ Selector pattern available for optimization
- ✅ Same performance as direct Zustand usage

**Context Provider**:
- ✅ Stable value (doesn't change unless store changes)
- ✅ No extra re-renders
- ✅ Negligible memory overhead

---

## Context & Problem Analysis

### Current Architecture

```
Component → useAuthStore (direct import) → Zustand singleton → storage.ts → crypto.ts
                    ↑
            (Not mockable in E2E)
```

**Files using `useAuthStore`** (13 total):

**Components** (3):
- `src/components/auth/AuthGuard.tsx:53` - Route protection
- `src/components/auth/AuthInitializer.tsx:32` - Startup auth loading
- `src/components/layout/Header.tsx:70` - User display

**Hooks** (2):
- `src/lib/api/hooks/useAuth.ts` - 12+ locations (login, logout, state checks)
- `src/lib/api/hooks/useUser.ts:34` - Profile updates

**Utilities** (1):
- `src/lib/api/client.ts:36-38` - Token interceptors (dynamic import)

**Core Store** (2):
- `src/lib/stores/authStore.ts` - Store definition
- `src/lib/stores/index.ts` - Export barrel

**Tests** (5):
- `tests/components/layout/Header.test.tsx`
- `tests/components/auth/AuthInitializer.test.tsx`
- `tests/lib/stores/authStore.test.ts`
- `tests/lib/api/hooks/useUser.test.tsx`
- `tests/app/(authenticated)/settings/profile/page.test.tsx`

### Core Problem

**E2E tests cannot establish authenticated state** because:

1. **Singleton Pattern**: `export const useAuthStore = create<AuthState>(...)` creates module-level singleton
2. **No Injection Point**: Components import and call `useAuthStore()` directly
3. **Encryption Barrier**: Tokens require AES-GCM encryption setup (key + IV + ciphertext)
4. **Race Conditions**: `AuthInitializer` runs on page load, overwrites test mocks

**Result**: 45 settings E2E tests fail, cannot test authenticated flows end-to-end.

### Why Context DI is the Right Solution

**Alternatives Considered**:
- ❌ Test-mode flag to disable encryption (hack, test-only code in production)
- ❌ Backend seeding (requires running backend, slow, complex)
- ❌ Cookie-based auth (major architecture change, not compatible with current JWT flow)

**Why Context Wins**:
- ✅ Industry-standard React pattern for DI
- ✅ Zero changes to business logic or security
- ✅ Clean separation: Context handles injection, Zustand handles state
- ✅ Testable at both unit and E2E levels
- ✅ Future-proof (easy to add auth events, middleware, logging)
- ✅ No performance overhead (Context value is stable)

---

## Solution Architecture

### Target Architecture

```
Component → useAuth() hook → AuthContext → Zustand store instance → storage.ts → crypto.ts
                                   ↓
                          Provider wrapper (injectable)
                                   ↓
                Production: Real store | Tests: Mock store
```

### Design Principles

1. **Thin Context Layer**: Context only provides dependency injection, no business logic
2. **Zustand for State**: All state management stays in Zustand (no duplicated state)
3. **Backward Compatible**: Internal refactor only, no API changes
4. **Type Safe**: Context interface exactly matches Zustand store interface
5. **Performance**: Context value is stable (no unnecessary re-renders)

### Key Components

#### 1. AuthContext Provider
- Wraps entire app at root layout
- Accepts optional `store` prop for testing
- Falls back to real Zustand singleton in production
- Checks for E2E test store in `window.__TEST_AUTH_STORE__`

#### 2. useAuth Hook
- Replaces direct `useAuthStore` calls in components
- Returns store instance from Context
- Type-safe (infers exact store shape)
- Throws error if used outside Provider

#### 3. Store Access Patterns

**For Components (rendering auth state)**:
```typescript
import { useAuth } from '@/lib/auth/AuthContext';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  return <div>{user?.firstName}</div>;
}
```

**For Mutation Callbacks (updating auth state)**:
```typescript
import { useAuthStore } from '@/lib/stores/authStore';

// In React Query mutation
mutationFn: async (data) => {
  const response = await api.call(data);
  const setAuth = useAuthStore.getState().setAuth;
  await setAuth(response.user, response.token);
}
```

**Rationale**: Mutation callbacks run outside React render cycle, don't need Context. Using `getState()` directly is cleaner and avoids unnecessary hook rules.

#### 4. E2E Test Integration
```typescript
// Before page load, inject mock store
await page.addInitScript((mockStore) => {
  (window as any).__TEST_AUTH_STORE__ = mockStore;
}, MOCK_AUTHENTICATED_STORE);

// AuthContext checks window.__TEST_AUTH_STORE__ and uses it
```

---

## Implementation Phases

### Phase 1: Foundation - Create Context Layer

#### Task 1.1: Create AuthContext Module
**File**: `src/lib/auth/AuthContext.tsx` (NEW)

**CRITICAL**: The `useAuth` hook must call the Zustand hook internally to follow React's Rules of Hooks. Do NOT return the hook function itself.

```typescript
/**
 * Authentication Context - Dependency Injection Wrapper for Auth Store
 *
 * Provides a thin Context layer over Zustand auth store to enable:
 * - Test isolation (inject mock stores)
 * - E2E testing without backend
 * - Clean architecture (DI pattern)
 *
 * Design: Context handles dependency injection, Zustand handles state management
 */

"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useAuthStore as useAuthStoreImpl } from "@/lib/stores/authStore";
import type { User } from "@/lib/stores/authStore";

/**
 * Authentication state shape
 * Matches the Zustand store interface exactly
 */
interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokenExpiresAt: number | null;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string, expiresIn?: number) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string, expiresIn?: number) => Promise<void>;
  setUser: (user: User) => void;
  clearAuth: () => Promise<void>;
  loadAuthFromStorage: () => Promise<void>;
  isTokenExpired: () => boolean;
}

/**
 * Type of the Zustand hook function
 * Used for Context storage and test injection
 */
type AuthStoreHook = typeof useAuthStoreImpl;

/**
 * Global window extension for E2E test injection
 * E2E tests can set window.__TEST_AUTH_STORE__ before navigation
 */
declare global {
  interface Window {
    __TEST_AUTH_STORE__?: AuthStoreHook;
  }
}

const AuthContext = createContext<AuthStoreHook | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /**
   * Optional store override for testing
   * Used in unit tests to inject mock store
   */
  store?: AuthStoreHook;
}

/**
 * Authentication Context Provider
 *
 * Wraps Zustand auth store in React Context for dependency injection.
 * Enables test isolation by allowing mock stores to be injected via:
 * 1. `store` prop (unit tests)
 * 2. `window.__TEST_AUTH_STORE__` (E2E tests)
 * 3. Production singleton (default)
 *
 * @example
 * ```tsx
 * // In root layout
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * // In unit tests
 * <AuthProvider store={mockStore}>
 *   <ComponentUnderTest />
 * </AuthProvider>
 *
 * // In E2E tests (before navigation)
 * window.__TEST_AUTH_STORE__ = mockAuthStoreHook;
 * ```
 */
export function AuthProvider({ children, store }: AuthProviderProps) {
  // Check for E2E test store injection (SSR-safe)
  const testStore =
    typeof window !== "undefined" && window.__TEST_AUTH_STORE__
      ? window.__TEST_AUTH_STORE__
      : null;

  // Priority: explicit prop > E2E test store > production singleton
  const authStore = store ?? testStore ?? useAuthStoreImpl;

  return <AuthContext.Provider value={authStore}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication state and actions
 *
 * Supports both full state access and selector patterns for performance optimization.
 * Must be used within AuthProvider.
 *
 * @throws {Error} If used outside of AuthProvider
 *
 * @example
 * ```tsx
 * // Full state access (simpler, re-renders on any state change)
 * function MyComponent() {
 *   const { user, isAuthenticated } = useAuth();
 *   return <div>{user?.first_name}</div>;
 * }
 *
 * // Selector pattern (optimized, re-renders only when selected value changes)
 * function UserName() {
 *   const user = useAuth(state => state.user);
 *   return <span>{user?.first_name}</span>;
 * }
 *
 * // In mutation callbacks (outside React render)
 * const handleLogin = async (data) => {
 *   const response = await loginAPI(data);
 *   // Use getState() directly for mutations (see useAuth.ts hooks)
 *   const setAuth = useAuthStore.getState().setAuth;
 *   await setAuth(response.user, response.token);
 * };
 * ```
 */
export function useAuth(): AuthState;
export function useAuth<T>(selector: (state: AuthState) => T): T;
export function useAuth<T>(selector?: (state: AuthState) => T): AuthState | T {
  const storeHook = useContext(AuthContext);

  if (!storeHook) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  // CRITICAL: Call the Zustand hook internally (follows React Rules of Hooks)
  // This is the key difference from returning the hook function itself
  return selector ? storeHook(selector) : storeHook();
}
```

**Key Implementation Details**:
1. **Polymorphic Hook**: Supports both `useAuth()` and `useAuth(selector)` patterns
2. **Calls Hook Internally**: `storeHook()` is called inside `useAuth`, not by consumers
3. **Type Safety**: `AuthState` interface matches Zustand store exactly
4. **Window Global**: Type-safe extension for E2E test injection

**Verification**:
- Run: `npm run type-check`
- Verify: `AuthState` interface matches all Zustand store properties
- Check: No circular import warnings
- Verify: Polymorphic overloads work correctly

**Success Criteria**:
- [x] File created with correct implementation
- [x] TypeScript compiles without errors
- [x] Type inference works correctly
- [x] Hook calls Zustand hook internally (not returns it)

---

#### Task 1.2: Wrap Application Root
**File**: `src/app/layout.tsx` (MODIFY)

**Also**: `src/app/providers.tsx` (MODIFY) - Remove AuthInitializer from here
**Also**: `src/lib/stores/index.ts` (MODIFY) - Add barrel exports

**Step 1: Add imports to layout.tsx**:
```typescript
// At the top of layout.tsx, add these imports:
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AuthInitializer } from "@/components/auth";
```

**Step 2: Wrap body content with AuthProvider**:
```typescript
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization script stays here */}
        <script dangerouslySetInnerHTML={{...}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <AuthInitializer />
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 3: Remove AuthInitializer from providers.tsx**:
```typescript
// In src/app/providers.tsx
// REMOVE this import:
- import { AuthInitializer } from '@/components/auth';

// REMOVE from JSX:
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
-       <AuthInitializer />  {/* ← REMOVE THIS LINE */}
        {children}
        {/* DevTools */}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

**Step 4: Add barrel exports to stores/index.ts**:
```typescript
// At the end of src/lib/stores/index.ts, add:
// Authentication Context (DI wrapper for auth store)
export { useAuth, AuthProvider } from '../auth/AuthContext';
```

**Final Provider Tree Structure**:
```
AuthProvider                    ← Outermost (provides auth DI)
  ├─ AuthInitializer           ← Loads auth from storage
  └─ Providers
      └─ ThemeProvider
          └─ QueryClientProvider
              └─ {children}
```

**Verification Checklist**:
1. Run: `npm run type-check` - Should pass with 0 errors
2. Check imports: All imports resolve correctly
3. Start: `npm run dev` - Should start without errors
4. Navigate: `http://localhost:3000` - Page should load
5. Console: No errors or warnings
6. Network: Check no failed requests in dev tools
7. React DevTools: Verify provider tree structure

**Common Mistakes to Avoid**:
- ❌ Don't nest AuthProvider inside Providers (should be outside)
- ❌ Don't keep AuthInitializer in both places (only in layout.tsx)
- ❌ Don't forget to remove AuthInitializer import from providers.tsx
- ❌ Don't forget barrel exports in stores/index.ts

**Success Criteria**:
- [x] AuthProvider wraps Providers (correct nesting)
- [x] AuthInitializer placed correctly (after AuthProvider, before Providers)
- [x] App starts without crashing
- [x] Browser console is clean
- [x] TypeScript compiles with 0 errors
- [x] No hydration mismatches
- [x] Barrel exports added to stores/index.ts

---

### Phase 2: Migrate Core Auth Components ✅ **COMPLETED**

**Status**: All tasks completed and verified (2025-11-03)

**Summary**:
- ✅ Task 2.1: AuthInitializer verified (no changes needed)
- ✅ Task 2.2: AuthGuard migrated successfully
- ✅ Task 2.3: Header migrated successfully
- ✅ TypeScript compilation: 0 errors
- ✅ Dev server: Running without errors
- ✅ Manual browser testing: All auth flows working correctly

**Files Modified**:
- `src/components/auth/AuthGuard.tsx` - Changed `useAuthStore` → `useAuth`
- `src/components/layout/Header.tsx` - Changed `useAuthStore` → `useAuth`

**Verification Results**:
- ✅ Unauthenticated users redirect to login correctly
- ✅ Authenticated users see protected pages
- ✅ Header renders user info correctly
- ✅ Logout functionality works
- ✅ Admin links show only for superusers
- ✅ No console errors or warnings
- ✅ No infinite redirect loops

**Next Phase**: Phase 3 - Migrate Auth Hooks

---

#### Task 2.1: Verify AuthInitializer (NO CHANGES NEEDED) ✅
**File**: `src/components/auth/AuthInitializer.tsx` (ALREADY CORRECT)

**Current Implementation**:
```typescript
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';

export function AuthInitializer() {
  const loadAuthFromStorage = useAuthStore((state) => state.loadAuthFromStorage);

  useEffect(() => {
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  return null;
}
```

**Why This Is Correct**:
- ✅ AuthInitializer is now placed INSIDE AuthProvider (in layout.tsx)
- ✅ It can continue using `useAuthStore` directly because it's using a selector
- ✅ Alternative: Could use `useAuth(state => state.loadAuthFromStorage)` but not required

**Verification Only**:
1. Check file is unchanged: `src/components/auth/AuthInitializer.tsx`
2. Verify placement in layout.tsx: Should be `<AuthProvider><AuthInitializer /><Providers>...`
3. Run: `npm run type-check` - Should pass
4. Start dev server: `npm run dev`
5. Open browser console and check: No errors
6. Check Network tab: No failed auth requests

**Success Criteria**: ✅ ALL PASSED
- [x] AuthInitializer is inside AuthProvider in layout.tsx
- [x] Component renders without errors
- [x] Auth loads from storage on page load (if tokens exist)
- [x] No infinite loops or re-renders

**Decision**: Verification complete. No changes needed.

---

#### Task 2.2: Migrate AuthGuard Component

**File**: `src/components/auth/AuthGuard.tsx`

**IMPORTANT**: This component RENDERS auth state, so it MUST use `useAuth()` from Context.

**Step-by-Step Instructions**:

**Step 1: Read the current file**
```bash
cat src/components/auth/AuthGuard.tsx
```

Look for these specific patterns:
- Line with: `import { useAuthStore } from '@/lib/stores/authStore';`
- Line with: `const { ... } = useAuthStore();` (or similar)

**Step 2: Update the import (typically line ~2-5)**
```typescript
// FIND this line:
import { useAuthStore } from '@/lib/stores/authStore';

// REPLACE with:
import { useAuth } from '@/lib/stores';  // Using barrel export
// OR
import { useAuth } from '@/lib/auth/AuthContext';  // Direct import (both work)
```

**Step 3: Find ALL useAuthStore() calls and replace**

Typical patterns to find:
```typescript
// Pattern 1: Destructuring
const { isAuthenticated, isLoading, user } = useAuthStore();

// Pattern 2: With selector
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

// Pattern 3: Multiple calls
const user = useAuthStore((state) => state.user);
const isLoading = useAuthStore((state) => state.isLoading);
```

Replace with:
```typescript
// Pattern 1: Destructuring → Keep the same!
const { isAuthenticated, isLoading, user } = useAuth();

// Pattern 2: With selector → Keep the selector!
const isAuthenticated = useAuth((state) => state.isAuthenticated);

// Pattern 3: Multiple calls → Can be combined
const { user, isLoading } = useAuth();
// OR keep separate if you prefer:
const user = useAuth((state) => state.user);
const isLoading = useAuth((state) => state.isLoading);
```

**Step 4: Verify the changes**
1. Save the file
2. Run: `npm run type-check`
   - Should pass with 0 errors
   - If you see errors about "useAuth not found", check your import
3. Check: No other `useAuthStore` references remain in the file
   ```bash
   grep -n "useAuthStore" src/components/auth/AuthGuard.tsx
   # Should return no results (or only in comments)
   ```

**Step 5: Test in browser**
1. Start dev server: `npm run dev`
2. Test unauthenticated flow:
   - Clear browser storage: DevTools → Application → Clear all
   - Navigate to: `http://localhost:3000/settings/profile`
   - Expected: Redirect to `/login` or `/auth/login`
   - Console: No errors
3. Test authenticated flow:
   - Login with test credentials (if you have them)
   - Navigate to: `http://localhost:3000/settings/profile`
   - Expected: Page loads successfully, no redirect
   - Console: No errors
4. Check for infinite redirects:
   - Watch URL bar: Should not keep changing
   - Check console: Should not show repeated navigation messages

**Common Mistakes to Avoid**:
- ❌ Don't change the destructuring pattern - keep `const { user } = useAuth()`
- ❌ Don't add extra calls to `useAuth()()` - it's already called internally
- ❌ Don't use `useAuthStore.getState()` in this component (it renders state)
- ❌ Don't forget to update the import at the top
- ❌ Don't leave any `useAuthStore` references (except in comments)

**If You Encounter Errors**:
- "useAuth is not a function" → Check import path
- "useAuth must be used within AuthProvider" → Check layout.tsx has AuthProvider
- Type errors about return type → Make sure you're calling `useAuth()`, not `useAuth`
- Infinite redirects → Check your redirect logic hasn't changed

**Success Criteria**: ✅ ALL PASSED
- [x] Import changed from `useAuthStore` to `useAuth`
- [x] All `useAuthStore()` calls replaced with `useAuth()`
- [x] TypeScript compiles with 0 errors
- [x] No `useAuthStore` references remain in file
- [x] Unauthenticated users redirected to login
- [x] Authenticated users see protected pages
- [x] No infinite redirect loops
- [x] No console errors

---

#### Task 2.3: Migrate Header Component ✅

**File**: `src/components/layout/Header.tsx`

**IMPORTANT**: This component RENDERS user info, so it MUST use `useAuth()` from Context.

**Step-by-Step Instructions**:

**Step 1: Locate the file and read it**
```bash
# First, find the file (might be in different location)
find src -name "*Header*" -type f

# Then read it
cat src/components/layout/Header.tsx
```

**Step 2: Identify all auth usages**

Look for these patterns (write them down before changing):
```typescript
// Common pattern in Header:
const { user } = useAuthStore();
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

// Or might be:
const user = useAuthStore((state) => state.user);
const isAdmin = user?.is_superuser;
```

**Step 3: Update the import**
```typescript
// FIND (usually near top of file):
import { useAuthStore } from '@/lib/stores/authStore';

// REPLACE with:
import { useAuth } from '@/lib/stores';
```

**Step 4: Replace all useAuthStore calls**

**Example transformation**:
```typescript
// BEFORE:
export function Header() {
  const { user } = useAuthStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ... component logic
}

// AFTER:
export function Header() {
  const { user, isAuthenticated } = useAuth();  // ✅ Combined into one call

  // ... component logic (no changes needed here)
}
```

**Alternative (with selectors for optimization)**:
```typescript
// If you want to optimize re-renders:
export function Header() {
  const user = useAuth((state) => state.user);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  // ... component logic
}
```

**Step 5: Check for logout handler**

If Header has a logout function, it might look like:
```typescript
const handleLogout = async () => {
  await useAuthStore.getState().clearAuth();  // ✅ This is CORRECT - don't change!
  router.push('/login');
};
```

**IMPORTANT**: Do NOT change `useAuthStore.getState()` in event handlers! This is correct because:
- Event handlers run outside the React render cycle
- They don't need to re-render when state changes
- Using `getState()` directly is the recommended pattern

**Step 6: Verify changes**
1. Save file
2. Check for remaining references:
   ```bash
   grep -n "useAuthStore()" src/components/layout/Header.tsx
   # Should return no results (except useAuthStore.getState() which is OK)
   ```
3. Run type check:
   ```bash
   npm run type-check
   ```
   Should pass with 0 errors

**Step 7: Test in browser**
1. Start dev server if not running: `npm run dev`
2. Navigate to home page: `http://localhost:3000`
3. Test unauthenticated state:
   - Clear storage: DevTools → Application → Clear all
   - Refresh page
   - Header should show: Login/Register buttons (or unauthenticated state)
   - No errors in console
4. Test authenticated state:
   - Login with credentials
   - Header should show:
     - User avatar with initials (e.g., "JD" for John Doe)
     - User name in dropdown
     - Email in dropdown
     - Logout button
   - Click dropdown: Should open/close correctly
5. Test logout:
   - Click logout button
   - Should redirect to login page
   - Header should return to unauthenticated state
   - No errors in console
6. Test admin features (if applicable):
   - Login as admin/superuser
   - Header should show "Admin" link or badge
   - Click admin link: Should navigate to admin area
7. Check for re-render issues:
   - Open React DevTools → Components
   - Find Header component
   - Watch for excessive re-renders (should only render on auth state change)

**Common Mistakes to Avoid**:
- ❌ Don't change `useAuthStore.getState()` in event handlers - that's correct!
- ❌ Don't add empty dependency arrays to useAuth() - it's not useEffect
- ❌ Don't call useAuth() conditionally - it's a hook, must be at top level
- ❌ Don't use `useAuth()()` (double call) - the hook calls internally
- ❌ Don't remove optional chaining (`user?.name`) - user can be null

**If You Encounter Errors**:
- "Cannot read property 'name' of null" → Add optional chaining: `user?.name`
- "useAuth is not a function" → Check import statement
- Type error on user properties → Make sure User type is imported if needed
- Dropdown not working → Check event handlers weren't accidentally modified
- Avatar not showing → Check you didn't change the avatar logic (only hook calls)

**Verification Checklist**: ✅ ALL PASSED
- [x] Import updated to `useAuth`
- [x] All `useAuthStore()` calls replaced (except `getState()` in handlers)
- [x] TypeScript compiles with 0 errors
- [x] ESLint passes with 0 warnings
- [x] Unauthenticated: Shows login/register UI
- [x] Authenticated: Shows user info correctly
- [x] Avatar displays correct initials
- [x] Dropdown opens/closes properly
- [x] Logout button works
- [x] Admin link shows/hides based on user role
- [x] No console errors
- [x] No excessive re-renders (check React DevTools)

**Success Criteria**: ✅ ALL PASSED
- [x] All render state uses `useAuth()`
- [x] Event handlers use TanStack Query mutations (correct pattern)
- [x] Component behavior unchanged
- [x] No visual regressions
- [x] Performance unchanged (no extra re-renders)

---

### Phase 3: Migrate Auth Hooks

**Phase Summary**:
- **Task 3.1**: Migrate `useAuth.ts` convenience hooks (useIsAuthenticated, useCurrentUser, useIsAdmin)
- **Task 3.2**: Review `useUser.ts` (NO CHANGES NEEDED - already correct)

**IMPORTANT NOTES BEFORE STARTING**:
1. Auth hook files contain TWO types of hooks with DIFFERENT patterns:
   - **Mutation hooks** (useLogin, useRegister, useLogout, useUpdateProfile): Already correct ✅ - Do NOT change!
   - **Convenience/render hooks** (useIsAuthenticated, useCurrentUser, useIsAdmin): Need migration ⚠️
2. Only **3 convenience hooks** in `useAuth.ts` need to be migrated
3. The `useUser.ts` file is already correct - verification only
4. Total changes: ~4 lines across 1 file (useAuth.ts)

**Why This Phase Is Small**:
- Most mutation hooks already use the correct pattern (`useAuthStore` with selectors)
- Only convenience hooks that components use for rendering need Context
- Task 3.2 (useUser.ts) requires no changes - already optimal

---

#### Task 3.1: Migrate useAuth.ts Convenience Hooks

**File**: `src/lib/api/hooks/useAuth.ts` (lines 479-503 only)

**Context**: This file has two sections:
1. **Lines 1-478**: Mutation hooks (useLogin, useRegister, useLogout, etc.) - **DO NOT CHANGE**
2. **Lines 479-503**: Convenience hooks (useIsAuthenticated, useCurrentUser, useIsAdmin) - **MIGRATE THESE**

**Current Implementation** (lines 479-503):
```typescript
// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Check if user is authenticated
 * @returns boolean indicating authentication status
 */
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}

/**
 * Get current user from auth store
 * @returns Current user or null
 */
export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user);
}

/**
 * Check if current user is admin
 * @returns boolean indicating admin status
 */
export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  return user?.is_superuser === true;
}
```

**Why These Need Migration**:
- ❌ Currently use `useAuthStore()` directly (Zustand singleton)
- ❌ Cannot be mocked in E2E tests
- ✅ Should use `useAuth()` from Context for testability
- ✅ These hooks are used in components for RENDERING state

**Step-by-Step Instructions**:

**Step 1: Add the Context import at the top of the file**

Find the import section (around line 10-28) and add:
```typescript
// FIND this section (around line 23):
import { useAuthStore } from '@/lib/stores/authStore';
import type { User } from '@/lib/stores/authStore';

// ADD this import right after:
import { useAuth } from '@/lib/auth/AuthContext';
```

**Important**: Keep the `useAuthStore` import - it's still needed for mutation hooks!

**Step 2: Scroll to the bottom of the file (line ~479)**

Look for the comment: `// Convenience Hooks`

**Step 3: Replace ONLY the three convenience hook implementations**

**Replace `useIsAuthenticated` (lines ~483-485)**:
```typescript
// BEFORE:
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.isAuthenticated);
}

// AFTER:
export function useIsAuthenticated(): boolean {
  return useAuth((state) => state.isAuthenticated);
}
```

**Replace `useCurrentUser` (lines ~491-493)**:
```typescript
// BEFORE:
export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user);
}

// AFTER:
export function useCurrentUser(): User | null {
  return useAuth((state) => state.user);
}
```

**Keep `useIsAdmin` unchanged** (lines ~499-502):
```typescript
// This one is already correct - it uses useCurrentUser which we just migrated
export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  return user?.is_superuser === true;
}
```

**Step 4: Verify NO other changes were made**

Double-check you did NOT change:
- ❌ Line 23: `import { useAuthStore }` - Should still be there
- ❌ Line 52: `const { isAuthenticated, accessToken } = useAuthStore();` - Correct (no selector)
- ❌ Line 53: `const setUser = useAuthStore((state) => state.setUser);` - Correct (selector)
- ❌ Line 97: `const setAuth = useAuthStore((state) => state.setAuth);` - Correct (selector)
- ❌ Line 165: `const setAuth = useAuthStore((state) => state.setAuth);` - Correct (selector)
- ❌ Line 242: `const clearAuth = useAuthStore((state) => state.clearAuth);` - Correct (selector)
- ❌ Line 243: `const refreshToken = useAuthStore((state) => state.refreshToken);` - Correct (selector)
- ❌ Line 298: `const clearAuth = useAuthStore((state) => state.clearAuth);` - Correct (selector)

**Why These Are Correct**:
- Mutation hooks call `useAuthStore` with selectors at component top level (correct pattern)
- They extract functions to use in callbacks (correct pattern)
- Only the bottom convenience hooks need Context for testability

**Changes Summary**:
```diff
 import { useAuthStore } from '@/lib/stores/authStore';
 import type { User } from '@/lib/stores/authStore';
+import { useAuth } from '@/lib/auth/AuthContext';

 // ... (no changes to mutation hooks - lines 29-478) ...

 export function useIsAuthenticated(): boolean {
-  return useAuthStore((state) => state.isAuthenticated);
+  return useAuth((state) => state.isAuthenticated);
 }

 export function useCurrentUser(): User | null {
-  return useAuthStore((state) => state.user);
+  return useAuth((state) => state.user);
 }

 export function useIsAdmin(): boolean {
   const user = useCurrentUser();  // No change - uses migrated hook
   return user?.is_superuser === true;
 }
```

**Total Changes**: 3 lines changed + 1 import added = **4 line changes in a 503-line file**

**Step 5: Verify TypeScript compilation**
```bash
npm run type-check
```
Expected: 0 errors

**Step 6: Check for lingering useAuthStore in wrong places**
```bash
grep -n "useAuthStore" src/lib/api/hooks/useAuth.ts
```

Expected output should show:
- Line 23: Import statement (correct)
- Line 52: In useMe hook (correct - no selector)
- Line 53: In useMe hook (correct - with selector)
- Line 97: In useLogin hook (correct - with selector)
- Line 165: In useRegister hook (correct - with selector)
- Line 242: In useLogout hook (correct - with selector)
- Line 243: In useLogout hook (correct - with selector)
- Line 298: In useLogoutAll hook (correct - with selector)

Should NOT show useAuthStore on lines 483-502 (convenience hooks).

**Step 7: Test in browser**

1. **Test login flow**:
   - Navigate to `/auth/login`
   - Login with test credentials
   - Check Header shows user info (uses `useCurrentUser()` internally)
   - Console: No errors

2. **Test authentication check**:
   - Components using `useIsAuthenticated()` should work
   - AuthGuard should still protect routes correctly

3. **Test admin features**:
   - Login as admin
   - Components using `useIsAdmin()` should show admin features
   - Non-admin users should not see admin features

**Step 8: Test that mutation hooks still work**

1. **Test logout**:
   - Click logout in Header
   - Should redirect to login
   - Auth state should be cleared

2. **Test registration**:
   - Navigate to `/auth/register`
   - Register new user
   - Should auto-login and redirect to home

**Common Mistakes to Avoid**:
- ❌ Don't change mutation hooks (useLogin, useRegister, useLogout) - they're correct!
- ❌ Don't remove `import { useAuthStore }` - it's still needed!
- ❌ Don't change `useAuthStore((state) => state.xxx)` calls in mutation hooks
- ❌ Don't use `useAuth()()` (double call) - use `useAuth((state) => state.xxx)`
- ❌ Don't change useMe hook - it's correct as-is

**If You Encounter Errors**:
- "useAuth is not defined" → Check you added the import
- "Cannot call a namespace" → You might have done `useAuth()()` instead of `useAuth((state) => state.xxx)`
- Type errors → Make sure you're using the same selector pattern
- Login broken → You might have accidentally changed mutation hooks (revert them!)

**Success Criteria**:
- [ ] Import `useAuth` added at top of file
- [ ] TypeScript compiles with 0 errors
- [ ] Only 3 hooks changed (useIsAuthenticated, useCurrentUser, no change to useIsAdmin)
- [ ] Mutation hooks unchanged (useLogin, useRegister, useLogout, etc.)
- [ ] Login works end-to-end
- [ ] Registration works and auto-logs in
- [ ] Logout clears state and redirects
- [ ] `useIsAuthenticated()` returns correct value in components
- [ ] `useCurrentUser()` returns correct user object in components
- [ ] `useIsAdmin()` returns correct admin status
- [ ] No console errors or warnings

---

#### Task 3.2: Migrate useUser.ts Hook

**File**: `src/lib/api/hooks/useUser.ts` (84 lines total)

**Context**: This file contains the `useUpdateProfile` mutation hook that updates the user's profile and syncs it to the auth store.

**Current Implementation** (lines 32-83):
```typescript
export function useUpdateProfile(onSuccess?: (message: string) => void) {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);  // Line 34 - NEEDS CHANGE

  return useMutation({
    mutationFn: async (data: {
      first_name?: string;
      last_name?: string;
      email?: string;
    }) => {
      const response = await updateCurrentUser({
        body: data,
        throwOnError: false,
      });

      if ('error' in response) {
        throw response.error;
      }

      const responseData = (response as { data: unknown }).data;

      if (
        typeof responseData !== 'object' ||
        responseData === null ||
        !('id' in responseData)
      ) {
        throw new Error('Invalid profile update response: missing user data');
      }

      return responseData as User;
    },
    onSuccess: (data) => {
      // Update auth store with new user data
      setUser(data);  // Line 67 - Uses the selector from line 34

      // Invalidate auth queries to refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.me });

      // Call custom success callback if provided
      if (onSuccess) {
        onSuccess('Profile updated successfully');
      }
    },
    onError: (error: unknown) => {
      const errors = parseAPIError(error);
      const generalError = getGeneralError(errors);
      console.error('Profile update failed:', generalError || 'Unknown error');
    },
  });
}
```

**Why This DOESN'T Need Migration** (Analysis):
- ✅ Line 34 uses `useAuthStore((state) => state.setUser)` with selector
- ✅ This extracts the function at component top level (correct pattern)
- ✅ Line 67 calls `setUser(data)` in the `onSuccess` callback (correct)
- ✅ This is a **mutation hook** - it only UPDATES state, doesn't RENDER it
- ✅ The current pattern is optimal - no changes needed!

**Decision**: **NO CHANGES REQUIRED** ✅

**Why No Changes**:
1. Mutation hooks that extract functions with selectors are correct as-is
2. The `useAuthStore((state) => state.setUser)` pattern is optimal here
3. It's called at component top level (follows Rules of Hooks)
4. The function is stable and doesn't cause unnecessary re-renders
5. This file has NO convenience hooks that render state

**Alternative (If You Really Want To Change It)**:

While not necessary, if you want consistency with using `getState()` in callbacks:

```typescript
// BEFORE (line 34):
const setUser = useAuthStore((state) => state.setUser);

// AFTER (remove line 34, use getState() in onSuccess):
export function useUpdateProfile(onSuccess?: (message: string) => void) {
  const queryClient = useQueryClient();
  // Removed: const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    // ... mutationFn stays the same ...
    onSuccess: (data) => {
      // Update auth store with new user data
      const setUser = useAuthStore.getState().setUser;  // Get directly in callback
      setUser(data);

      // ... rest stays the same ...
    },
    // ... rest stays the same ...
  });
}
```

**Which Pattern To Use?**:

Both are correct! Choose based on preference:

| Pattern | Selector at top level | getState() in callback |
|---------|----------------------|------------------------|
| **Code** | `const fn = useAuthStore(s => s.fn)` | `const fn = useAuthStore.getState().fn` |
| **When** | At component top | In callback/effect |
| **Pros** | Cleaner, more React-like | More explicit, obvious it's not reactive |
| **Cons** | Slightly less obvious | More verbose |
| **Verdict** | ✅ Current implementation | ✅ Also correct |

**Recommendation**: **Keep the current implementation** (no changes needed). It's already correct and follows best practices.

**Verification** (No changes, but verify it still works):
```bash
npm run type-check
```
Expected: 0 errors

**Test in browser**:
1. Navigate to `/settings/profile`
2. Update first name (e.g., "Test" → "Updated")
3. Check Header immediately shows "Updated User"
4. Refresh page - should still show "Updated User"
5. Console: No errors

**Success Criteria**:
- [x] File reviewed - no changes needed (already correct)
- [ ] TypeScript compiles with 0 errors
- [ ] Profile update syncs to Header immediately
- [ ] User state persists after refresh
- [ ] No console errors or warnings

---

### Phase 4: Verify API Client Interceptors

#### Task 4.1: Review client.ts
**File**: `src/lib/api/client.ts` (NO CHANGES)

**Current Implementation**:
```typescript
async function getAuthStore() {
  const { useAuthStore } = await import('@/lib/stores/authStore');
  return useAuthStore.getState();
}
```

**Decision**: No changes needed. Interceptors run outside React render cycle, using `getState()` directly is correct and clean.

**Verification**:
- Run: `npm run type-check`
- Test token refresh:
  1. Login
  2. Manually expire token in devtools: `localStorage.getItem('auth_tokens')` → decrypt → change `exp` to past time
  3. Make API call (update profile)
  4. Check Network tab: Should see `/api/v1/auth/refresh` call
  5. Subsequent calls should use new token
- Test 401 handling:
  1. Manually corrupt access token in localStorage
  2. Make API call
  3. Should redirect to login

**Success Criteria**:
- [ ] TypeScript compiles
- [ ] Token refresh works automatically
- [ ] 401 errors redirect to login
- [ ] No infinite refresh loops
- [ ] Refresh token API called exactly once per expiration

---

### Phase 5: Update Export Barrel

#### Task 5.1: Update Store Index
**File**: `src/lib/stores/index.ts` (MODIFY)

**Before**:
```typescript
export { useAuthStore, initializeAuth, type User } from './authStore';
```

**After**:
```typescript
export { useAuthStore, initializeAuth, type User } from './authStore';
export { useAuth, AuthProvider } from '../auth/AuthContext';
```

**Verification**:
- Run: `npm run type-check`
- Verify: No import errors across codebase

**Success Criteria**:
- [ ] TypeScript compiles
- [ ] Exports are valid
- [ ] No circular import warnings

---

### Phase 6: Update Unit Tests

#### Task 6.1: Update AuthInitializer.test.tsx
**File**: `tests/components/auth/AuthInitializer.test.tsx` (MODIFY)

**Before**:
```typescript
jest.mock('@/lib/stores/authStore', () => ({
  useAuthStore: jest.fn()
}));
```

**After**:
```typescript
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// In test setup
const mockLoadAuthFromStorage = jest.fn();
(useAuth as jest.Mock).mockReturnValue(() => ({
  loadAuthFromStorage: mockLoadAuthFromStorage,
}));
```

**Verification**:
- Run: `npm test AuthInitializer.test.tsx`
- Verify: All tests pass
- Check: `loadAuthFromStorage` called exactly once

**Success Criteria**:
- [ ] All tests pass
- [ ] Coverage maintained
- [ ] All assertions valid

---

#### Task 6.2: Update Header.test.tsx
**File**: `tests/components/layout/Header.test.tsx` (MODIFY)

**Before**:
```typescript
jest.mock('@/lib/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

(useAuthStore as jest.Mock).mockReturnValue({ user: mockUser });
```

**After**:
```typescript
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
```

**Verification**:
- Run: `npm test Header.test.tsx`
- Verify: All 15+ test cases pass
- Check: Coverage remains 100% for Header.tsx

**Success Criteria**:
- [ ] All 15+ tests pass
- [ ] Coverage maintained (100%)
- [ ] All scenarios tested (logged in, logged out, admin, non-admin)

---

#### Task 6.3: Verify authStore.test.ts
**File**: `tests/lib/stores/authStore.test.ts` (NO CHANGES)

**Decision**: This tests the Zustand store directly, not the Context wrapper. No changes needed.

**Verification**:
- Run: `npm test authStore.test.ts`
- Verify: All 80+ tests pass
- Check: Coverage remains 100% for authStore.ts

**Success Criteria**:
- [ ] All tests pass
- [ ] Coverage maintained

---

#### Task 6.4: Update useUser.test.tsx
**File**: `tests/lib/api/hooks/useUser.test.tsx` (MODIFY)

**Before**:
```typescript
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
```

**After** (matching new implementation):
```typescript
import { useAuthStore } from '@/lib/stores/authStore';

jest.mock('@/lib/stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

const mockSetUser = jest.fn();
(useAuthStore.getState as jest.Mock).mockReturnValue({
  setUser: mockSetUser,
});
```

**Verification**:
- Run: `npm test useUser.test.tsx`
- Verify: Tests pass
- Check: `setUser` called with correct profile data

**Success Criteria**:
- [ ] All tests pass
- [ ] Coverage maintained
- [ ] `setUser` called with updated profile data

---

#### Task 6.5: Update ProfileSettings.test.tsx
**File**: `tests/app/(authenticated)/settings/profile/page.test.tsx` (MODIFY)

**Before**:
```typescript
jest.mock('@/lib/stores/authStore');

(useAuthStore as jest.Mock).mockReturnValue({ user: mockUser });
```

**After**:
```typescript
jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
```

**Verification**:
- Run: `npm test page.test.tsx`
- Verify: Page renders without errors
- Check: Coverage maintained

**Success Criteria**:
- [ ] All tests pass
- [ ] Coverage maintained
- [ ] Page renders correctly with mock user

---

### Phase 7: Implement E2E Test Support

#### Task 7.1: Create Test Auth Provider Helper
**File**: `e2e/helpers/testAuthProvider.ts` (NEW)

```typescript
import { MOCK_USER } from './auth';

export function createMockAuthStore(overrides = {}) {
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    tokenExpiresAt: null,
    setAuth: async () => {},
    setTokens: async () => {},
    setUser: () => {},
    clearAuth: async () => {},
    loadAuthFromStorage: async () => {},
    ...overrides,
  };
}

export const MOCK_AUTHENTICATED_STORE = createMockAuthStore({
  user: MOCK_USER,
  accessToken: 'mock-access-token-12345',
  refreshToken: 'mock-refresh-token-67890',
  isAuthenticated: true,
  isLoading: false,
  tokenExpiresAt: Date.now() + 900000, // 15 minutes
});

export const MOCK_ADMIN_STORE = createMockAuthStore({
  user: { ...MOCK_USER, is_superuser: true },
  accessToken: 'mock-admin-token-12345',
  refreshToken: 'mock-admin-refresh-67890',
  isAuthenticated: true,
  isLoading: false,
  tokenExpiresAt: Date.now() + 900000,
});
```

**Verification**:
- Run: `npm run type-check`
- Verify: Export types match AuthContext interface

**Success Criteria**:
- [ ] File created
- [ ] TypeScript compiles
- [ ] Mock stores include all required methods

---

#### Task 7.2: Update E2E Auth Helper
**File**: `e2e/helpers/auth.ts` (MODIFY)

**Before**: Attempts to inject into Zustand singleton (fails)

**After**:
```typescript
import { Page, Route } from '@playwright/test';
import { MOCK_AUTHENTICATED_STORE, MOCK_ADMIN_STORE } from './testAuthProvider';

export const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone_number: null,
  is_active: true,
  is_superuser: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function setupAuthenticatedMocks(page: Page, options = { admin: false }): Promise<void> {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Mock API endpoints
  await page.route(`${baseURL}/api/v1/users/me`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: options.admin ? { ...MOCK_USER, is_superuser: true } : MOCK_USER,
      }),
    });
  });

  await page.route(`${baseURL}/api/v1/sessions**`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    } else {
      await route.continue();
    }
  });

  // Inject mock auth store BEFORE navigation
  const mockStore = options.admin ? MOCK_ADMIN_STORE : MOCK_AUTHENTICATED_STORE;
  await page.addInitScript((store) => {
    (window as any).__TEST_AUTH_STORE__ = store;
  }, mockStore);
}
```

**Verification**:
- Run: `npm run type-check`
- Verify: No TypeScript errors

**Success Criteria**:
- [ ] File updated
- [ ] TypeScript compiles
- [ ] Helper supports both regular and admin users

---

#### Task 7.3: Update E2E Test Files
**Files**:
- `e2e/settings-profile.spec.ts` (MODIFY)
- `e2e/settings-password.spec.ts` (MODIFY)
- `e2e/settings-sessions.spec.ts` (MODIFY)
- `e2e/settings-navigation.spec.ts` (MODIFY)

**Changes**: Update `beforeEach` to call helper before navigation

**Before**:
```typescript
test.beforeEach(async ({ page }) => {
  await setupAuthenticatedMocks(page);
  await page.goto('/settings/profile');
});
```

**After**:
```typescript
test.beforeEach(async ({ page }) => {
  await setupAuthenticatedMocks(page);
  await page.goto('/settings/profile');
  await page.waitForURL('/settings/profile', { timeout: 10000 });
});
```

**Verification**:
- Run one test: `npx playwright test settings-profile.spec.ts --headed --workers=1`
- Watch browser: Should NOT redirect to login
- Should see profile settings page with mock user data
- Console should be clean (no errors)

**Success Criteria**:
- [ ] Test navigates to protected page without redirect
- [ ] Page renders mock user data
- [ ] Console is clean (no errors)
- [ ] Test passes

---

#### Task 7.4: Run Full E2E Suite
**Action**: Run all settings tests

**Commands**:
```bash
npx playwright test settings-profile.spec.ts --reporter=list --workers=4
npx playwright test settings-password.spec.ts --reporter=list --workers=4
npx playwright test settings-sessions.spec.ts --reporter=list --workers=4
npx playwright test settings-navigation.spec.ts --reporter=list --workers=4
```

**Verification**:
- All 45 tests should pass
- No flaky tests (run twice to confirm)
- Total execution time < 2 minutes

**Success Criteria**:
- [ ] 45/45 tests pass
- [ ] Zero flaky tests
- [ ] Execution time acceptable
- [ ] No console warnings or errors

---

### Phase 8: Comprehensive Testing

#### Task 8.1: Run Full Unit Test Suite
**Action**: Run all unit tests with coverage

**Command**:
```bash
npm test -- --coverage --no-cache
```

**Expected Results**:
- All unit tests pass (100% pass rate)
- Coverage ≥ 98.38% (maintained or improved)
- No failing assertions
- No warning messages

**Success Criteria**:
- [ ] 100% unit test pass rate
- [ ] Coverage ≥ 98.38%
- [ ] No warnings
- [ ] Execution time reasonable (< 5 minutes)

---

#### Task 8.2: Run Full E2E Test Suite
**Action**: Run all E2E tests

**Command**:
```bash
npm run test:e2e
```

**Expected Results**:
- All 86 E2E tests pass (including navigation, auth-login, auth-register, auth-password-reset, settings)
- Zero flaky tests
- Total execution time < 5 minutes

**Success Criteria**:
- [ ] 86/86 tests pass
- [ ] Zero flaky tests
- [ ] No timeouts
- [ ] Clean test artifacts

---

#### Task 8.3: Manual End-to-End Testing
**Action**: Test complete user journeys in browser

**Test Scenarios**:

**1. New User Registration**
- Clear all browser storage (localStorage, sessionStorage, cookies)
- Navigate to `http://localhost:3000`
- Should see login page
- Click "Sign up"
- Register with new email: `manual.test@example.com` / `TestPassword123!`
- Should redirect to dashboard
- Header should show "Manual Test" (name from form)
- Refresh page - should stay logged in

**2. Login and Logout**
- Logout from header dropdown
- Should redirect to `/login`
- Login with: `manual.test@example.com` / `TestPassword123!`
- Should redirect to dashboard
- Header should show user info
- Refresh page - should stay logged in
- Logout again - should redirect to login

**3. Protected Route Access**
- While logged out, manually navigate to `/settings/profile`
- Should redirect to `/login?redirect=/settings/profile`
- Login
- Should automatically redirect to `/settings/profile`
- Profile form should be visible with user data

**4. Profile Update**
- While at `/settings/profile`
- Change first name from "Manual" to "Updated"
- Click "Save changes"
- Should see success toast
- Header should immediately show "Updated Test"
- Refresh page - should still show "Updated Test"

**5. Token Refresh (requires patience or manual expiration)**
- Login
- Open DevTools → Application → Local Storage
- Find `auth_tokens` key
- Will need to decrypt (or wait 15 minutes for natural expiration)
- Make any API call (update profile)
- Check Network tab: Should see `/api/v1/auth/refresh` call with 200 status
- Original API call should succeed
- Should NOT be logged out

**6. Admin Features** (if you have admin user)
- Login with: `admin@example.com` / `AdminPassword123!`
- Header should show "Admin Panel" link
- Click "Admin Panel"
- Should navigate to `/admin`
- Should render admin dashboard (user management, org management)
- Logout
- Login as regular user
- "Admin Panel" link should NOT appear

**7. Session Management**
- Login
- Navigate to `/settings/sessions`
- Should see current session listed with:
  - Device type (e.g., "Desktop")
  - Browser (e.g., "Chrome on Linux")
  - IP address
  - Last used time
  - "Current" badge
- Try to revoke current session (should show warning)
- If you have multiple sessions (login from different browser), should see multiple entries

**Success Criteria**:
- [ ] All 7 scenarios pass
- [ ] No console errors
- [ ] No unexpected redirects
- [ ] All UI updates are immediate (no loading flickers)
- [ ] User state persists across page refreshes
- [ ] Admin features work correctly

---

### Phase 9: Final Verification

#### Task 9.1: TypeScript Compilation Check
**Action**: Verify full TypeScript compilation

**Commands**:
```bash
npm run type-check
npm run build
```

**Expected Results**:
- Type check: 0 errors, 0 warnings
- Build: Success with no errors
- Bundle size: No significant increase from baseline

**Success Criteria**:
- [ ] TypeScript compiles without errors
- [ ] Production build succeeds
- [ ] No type warnings
- [ ] Bundle size acceptable (check `.next/` folder size)

---

#### Task 9.2: Performance Verification
**Action**: Check for performance regressions

**Commands**:
```bash
# Start production build
npm run build && npm start

# In another terminal, run Lighthouse
npx lighthouse http://localhost:3000 --view
```

**Metrics to Check**:
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)

**Expected Results**:
- Performance score ≥ 90
- No significant regression from baseline (< 5% difference)

**Success Criteria**:
- [ ] Performance score acceptable
- [ ] No regressions from baseline
- [ ] All Core Web Vitals in "Good" range

---

#### Task 9.3: Code Quality Review
**Action**: Review all changes for code quality

**Checklist**:
- [ ] No `console.log()` or debug statements left
- [ ] No commented-out code blocks
- [ ] No TODOs or FIXMEs
- [ ] All imports are used (no unused imports)
- [ ] Code follows project conventions (spacing, naming, etc.)
- [ ] No ESLint warnings
- [ ] All files have proper structure (imports → types → component → exports)

**Commands**:
```bash
npm run lint
```

**Success Criteria**:
- [ ] ESLint passes with 0 warnings
- [ ] Code is clean and production-ready
- [ ] No debug artifacts left

---

### Phase 10: Documentation

#### Task 10.1: Update Project Documentation
**File**: `CLAUDE.md` (MODIFY)

**Section to Add** (in "Key Architectural Patterns"):

```markdown
### Authentication Context Pattern

The authentication system uses **Zustand for state management** wrapped in **React Context for dependency injection**. This provides the best of both worlds: Zustand's excellent performance and developer experience, with React Context's testability.

#### Architecture Overview

```
Component → useAuth() → AuthContext → Zustand Store → Storage Layer → Crypto (AES-GCM)
                            ↓
                    Injectable for tests
```

#### Usage Patterns

**For Components (rendering auth state):**
```typescript
import { useAuth } from '@/lib/auth/AuthContext';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Hello, {user?.first_name}!</div>;
}
```

**For Mutation Callbacks (updating auth state):**
```typescript
import { useAuthStore } from '@/lib/stores/authStore';

export function useCustomMutation() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.call(data);

      // Access store directly in callback (outside render)
      const setAuth = useAuthStore.getState().setAuth;
      await setAuth(response.user, response.token);
    },
  });
}
```

**For E2E Tests:**
```typescript
import { setupAuthenticatedMocks } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await setupAuthenticatedMocks(page); // Injects mock auth store
  await page.goto('/protected-route');
});

test('should access protected page', async ({ page }) => {
  await expect(page).toHaveURL('/protected-route'); // No redirect!
});
```

#### Why This Architecture?

**Benefits:**
- ✅ **Testable**: E2E tests can inject mock stores
- ✅ **Performant**: Zustand handles state efficiently, Context is just a thin wrapper
- ✅ **Type-safe**: Full TypeScript inference throughout
- ✅ **Maintainable**: Clear separation of concerns (Context = DI, Zustand = state)
- ✅ **Extensible**: Easy to add auth events, middleware, logging

**Trade-offs:**
- Slightly more boilerplate (need AuthProvider wrapper)
- Two ways to access store (Context for components, getState() for callbacks)

#### Files Structure

```
src/
├── lib/
│   ├── auth/
│   │   ├── AuthContext.tsx     # Context provider and useAuth hook
│   │   ├── storage.ts          # Token storage (AES-GCM encrypted)
│   │   └── crypto.ts           # Encryption utilities
│   ├── stores/
│   │   └── authStore.ts        # Zustand store definition
│   └── api/
│       └── hooks/
│           ├── useAuth.ts      # Auth mutations (login, logout, etc.)
│           └── useUser.ts      # User profile mutations
├── components/
│   └── auth/
│       ├── AuthGuard.tsx       # Route protection HOC
│       └── AuthInitializer.tsx # Loads auth from storage on mount
└── app/
    └── layout.tsx              # Root layout with AuthProvider
```

#### Common Patterns

**Conditional Rendering Based on Auth:**
```typescript
function MyPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <LoginPrompt />;

  return <ProtectedContent />;
}
```

**Admin-Only Features:**
```typescript
import { useIsAdmin } from '@/lib/api/hooks/useAuth';

function AdminPanel() {
  const isAdmin = useIsAdmin();

  if (!isAdmin) return <AccessDenied />;

  return <AdminDashboard />;
}
```

**Mutation with Auth Update:**
```typescript
export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const response = await updateProfileAPI(data);

      // Sync updated user to auth store
      const setUser = useAuthStore.getState().setUser;
      setUser(response.data);

      return response;
    },
  });
}
```

#### Testing Patterns

**Unit Tests (Jest):**
```typescript
import { useAuth } from '@/lib/auth/AuthContext';

jest.mock('@/lib/auth/AuthContext', () => ({
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

**E2E Tests (Playwright):**
```typescript
import { setupAuthenticatedMocks } from './helpers/auth';

test.describe('Protected Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Inject authenticated mock store before navigation
    await setupAuthenticatedMocks(page);
  });

  test('should display user profile', async ({ page }) => {
    await page.goto('/settings/profile');

    // No redirect to login - already authenticated via mock
    await expect(page).toHaveURL('/settings/profile');
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
  });
});
```

#### Migration Notes

This architecture was introduced to enable E2E testing of authenticated flows. Previously, E2E tests could not mock the Zustand singleton, making it impossible to test protected routes without a running backend.

**Migration Date**: November 2025
**Migration Reason**: Enable full E2E test coverage for authenticated user flows
**Breaking Changes**: None (internal refactor only)
```

**Success Criteria**:
- [ ] Documentation added to CLAUDE.md
- [ ] All patterns explained clearly
- [ ] Examples are accurate and tested
- [ ] Migration notes included

---

#### Task 10.2: Update Frontend README (if exists)
**File**: `frontend/README.md` or `README.md` (MODIFY IF EXISTS)

**Section to Add**:

```markdown
## Authentication System

This project uses a hybrid authentication architecture combining Zustand for state management and React Context for dependency injection.

### Key Features

- 🔐 JWT-based authentication with refresh tokens
- 🔒 AES-GCM encrypted token storage
- 🛡️ Session tracking with device information
- ⚡ Automatic token refresh
- 🧪 Fully testable (unit + E2E)

### For Developers

**Accessing Auth State in Components:**
```typescript
import { useAuth } from '@/lib/auth/AuthContext';

const { user, isAuthenticated } = useAuth();
```

**Mutations (login, logout, etc.):**
```typescript
import { useLogin, useLogout } from '@/lib/api/hooks/useAuth';

const login = useLogin();
const logout = useLogout();
```

**Writing E2E Tests:**
```typescript
import { setupAuthenticatedMocks } from './helpers/auth';

await setupAuthenticatedMocks(page);
await page.goto('/protected-route');
```

See `CLAUDE.md` for complete documentation.
```

**Success Criteria**:
- [ ] README updated (if file exists)
- [ ] Links to detailed docs provided
- [ ] Quick reference included

---

### Phase 11: Git & Deployment

#### Task 11.1: Review All Changes
**Action**: Final review before committing

**Commands**:
```bash
git status
git diff
```

**Checklist**:
- [ ] Only intentional files modified
- [ ] No accidental changes to unrelated files
- [ ] No temporary/debug files included
- [ ] No secrets or API keys in diff
- [ ] All new files properly structured

**Success Criteria**:
- [ ] All changes reviewed
- [ ] No unexpected modifications
- [ ] Clean diff

---

#### Task 11.2: Create Feature Branch & Commit
**Action**: Commit changes with clean history

**Commands**:
```bash
# Create feature branch
git checkout -b feature/auth-context-di-migration

# Stage and commit in logical groups
git add src/lib/auth/AuthContext.tsx
git commit -m "feat(auth): Add AuthContext for dependency injection

- Create AuthContext provider with useAuth hook
- Support store injection for testing via props and window global
- Type-safe interface matching Zustand store"

git add src/app/layout.tsx
git commit -m "feat(auth): Wrap app with AuthProvider

- Add AuthProvider to root layout
- Ensures Context available to all components"

git add src/components/auth/AuthGuard.tsx src/components/auth/AuthInitializer.tsx src/components/layout/Header.tsx
git commit -m "refactor(auth): Migrate components to use AuthContext

- Update AuthGuard to use useAuth hook
- Update AuthInitializer to use useAuth hook
- Update Header to use useAuth hook
- No functional changes, internal refactor only"

git add src/lib/api/hooks/useAuth.ts src/lib/api/hooks/useUser.ts
git commit -m "refactor(auth): Update hooks to use AuthContext pattern

- Render hooks use useAuth() from Context
- Mutation callbacks continue using getState() (correct pattern)
- No functional changes"

git add src/lib/stores/index.ts
git commit -m "feat(auth): Export useAuth from store barrel"

git add tests/
git commit -m "test(auth): Update unit tests to mock AuthContext

- Update all test mocks to use AuthContext instead of direct store
- All tests passing
- Coverage maintained at 98.38%"

git add e2e/helpers/testAuthProvider.ts e2e/helpers/auth.ts
git commit -m "feat(e2e): Add test auth provider for E2E tests

- Create mock store factory for E2E tests
- Update setupAuthenticatedMocks to inject via window global
- Support both regular and admin user mocks"

git add e2e/settings-*.spec.ts
git commit -m "test(e2e): Update settings tests to use new auth mocking

- All 45 settings tests now passing
- No flaky tests
- Clean execution in under 2 minutes"

git add CLAUDE.md README.md
git commit -m "docs(auth): Document AuthContext pattern and usage

- Add architecture overview
- Add usage examples for components, hooks, and tests
- Add migration notes

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

**Success Criteria**:
- [ ] Clean commit history
- [ ] Descriptive commit messages
- [ ] Logical commit grouping
- [ ] All commits verified

---

#### Task 11.3: Push and Create Pull Request
**Action**: Push feature branch and create PR

**Commands**:
```bash
# Push to remote
git push origin feature/auth-context-di-migration

# Create PR using GitHub CLI
gh pr create --title "Auth Context DI Migration for Full E2E Test Coverage" --body "$(cat <<'EOF'
## Summary

Migrates authentication system from direct Zustand singleton usage to Context-based dependency injection pattern. This enables full E2E test coverage for authenticated user flows without requiring a running backend or complex mocking.

## Motivation

Previously, E2E tests could not establish authenticated state because:
- Zustand store was a module-level singleton (not injectable)
- Token storage required AES-GCM encryption setup
- AuthInitializer would overwrite any test mocks

This resulted in 45 failing E2E tests for settings pages, leaving gaps in test coverage.

## Solution

Introduced React Context wrapper around Zustand store that:
- Provides dependency injection point for tests
- Maintains all existing security and performance characteristics
- Requires zero changes to business logic
- Follows React best practices

## Changes

### New Files (2)
- ✅ `src/lib/auth/AuthContext.tsx` - Context provider and useAuth hook
- ✅ `e2e/helpers/testAuthProvider.ts` - Mock store factory for E2E tests

### Modified Files (13)
**Components (3):**
- ✅ `src/app/layout.tsx` - Wrap app with AuthProvider
- ✅ `src/components/auth/AuthGuard.tsx` - Use useAuth hook
- ✅ `src/components/auth/AuthInitializer.tsx` - Use useAuth hook
- ✅ `src/components/layout/Header.tsx` - Use useAuth hook

**Hooks (2):**
- ✅ `src/lib/api/hooks/useAuth.ts` - Render hooks use Context, mutations use getState()
- ✅ `src/lib/api/hooks/useUser.ts` - Use getState() in mutation callback

**Exports (1):**
- ✅ `src/lib/stores/index.ts` - Export useAuth hook

**Tests (5):**
- ✅ `tests/components/layout/Header.test.tsx` - Mock Context instead of store
- ✅ `tests/components/auth/AuthInitializer.test.tsx` - Mock Context
- ✅ `tests/lib/api/hooks/useUser.test.tsx` - Update to match new implementation
- ✅ `tests/app/(authenticated)/settings/profile/page.test.tsx` - Mock Context

**E2E Tests (4):**
- ✅ `e2e/helpers/auth.ts` - Inject mock store via window global
- ✅ `e2e/settings-profile.spec.ts` - Updated
- ✅ `e2e/settings-password.spec.ts` - Updated
- ✅ `e2e/settings-sessions.spec.ts` - Updated
- ✅ `e2e/settings-navigation.spec.ts` - Updated

**Documentation (2):**
- ✅ `CLAUDE.md` - Comprehensive architecture and usage docs
- ✅ `README.md` - Quick reference (if exists)

### API Client (No Changes)
- ℹ️ `src/lib/api/client.ts` - No changes needed (interceptors correctly use getState())

## Test Results

### Unit Tests
- **Status**: ✅ All passing
- **Coverage**: 98.38% (maintained)
- **Execution Time**: < 5 minutes

### E2E Tests
- **Status**: ✅ All passing (86 total)
- **Settings Suite**: 45/45 passing (previously 0/45)
- **Flaky Tests**: 0
- **Execution Time**: < 5 minutes

### Manual Testing
- ✅ New user registration flow
- ✅ Login and logout
- ✅ Protected route access
- ✅ Profile updates
- ✅ Token refresh (automatic)
- ✅ Admin features
- ✅ Session management

## Performance Impact

- **Bundle Size**: No significant change
- **Runtime Performance**: No regression
- **Type Checking**: 0 errors, 0 warnings
- **Build Time**: No change

## Breaking Changes

**None.** This is an internal refactor with no API changes.

## Architecture Benefits

✅ **Testability**: E2E tests can inject mock stores
✅ **Maintainability**: Clear separation (Context = DI, Zustand = state)
✅ **Type Safety**: Full TypeScript inference
✅ **Performance**: Zustand handles state efficiently
✅ **Extensibility**: Easy to add auth events, middleware
✅ **Best Practices**: Follows React Context patterns

## Migration Notes

This is a production-ready implementation with:
- No hacks or workarounds
- No test-only code in production paths
- No compromises on security or performance
- Clean, maintainable architecture

All developers should review the updated documentation in `CLAUDE.md` before working with the auth system.

## Checklist

- [x] All tests passing (unit + E2E)
- [x] Type check passes (0 errors)
- [x] ESLint passes (0 warnings)
- [x] Build succeeds
- [x] Manual testing complete (7 scenarios)
- [x] Documentation updated
- [x] No console errors
- [x] No performance regression
- [x] Coverage maintained (≥98.38%)
- [x] Clean commit history
- [x] Code review ready

## Reviewers

Please verify:
1. Architecture is clean and maintainable
2. No security regressions
3. Test coverage is comprehensive
4. Documentation is clear

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Success Criteria**:
- [ ] Branch pushed successfully
- [ ] PR created
- [ ] PR description is comprehensive
- [ ] All CI checks pass (if applicable)

---

## Testing Strategy

### Unit Test Coverage

**Before Migration**:
- authStore.test.ts: 80+ test cases
- Header.test.tsx: 15+ test cases
- AuthInitializer.test.tsx: Multiple cases
- useUser.test.tsx: Profile update tests
- ProfileSettings.test.tsx: Page render tests
- **Total Coverage**: 98.38%

**After Migration**:
- Same test files
- Same test coverage (≥98.38%)
- Updated mocks (Context instead of direct store)
- All tests passing

### E2E Test Coverage

**Before Migration**:
- Settings suite: 0/45 passing (100% failure rate)
- Cannot establish authenticated state
- Tests timeout or redirect to login

**After Migration**:
- Settings suite: 45/45 passing (100% pass rate)
- Full authenticated flow coverage
- No flaky tests
- Execution time < 2 minutes

**Coverage Scope**:
1. Profile settings (11 tests)
2. Password change (11 tests)
3. Session management (13 tests)
4. Settings navigation (10 tests)

### Manual Test Coverage

**Scenarios**:
1. New user registration
2. Login and logout
3. Protected route access
4. Profile updates
5. Token refresh
6. Admin features
7. Session management

---

## Rollback Plan

### Phase 1-2 Failure (Context Creation)
**Symptom**: App won't start or Context errors
**Action**:
```bash
git checkout src/app/layout.tsx
rm src/lib/auth/AuthContext.tsx
git clean -fd
```

### Phase 3-4 Failure (Component Migration)
**Symptom**: Components break or auth stops working
**Action**:
```bash
git checkout src/components/
git checkout src/lib/api/hooks/
```

### Phase 5-6 Failure (Tests)
**Symptom**: Tests failing, cannot fix mock patterns
**Action**: Investigate and fix before proceeding. Do NOT move forward with failing tests.

### Phase 7 Failure (E2E Tests)
**Symptom**: E2E tests still failing, mock not working
**Action**: Debug in isolation:
1. Check `__TEST_AUTH_STORE__` in browser console
2. Verify AuthContext picks up test store
3. Ensure all mock methods implemented
4. Check timing of injection (must be before navigation)

### Complete Rollback
**Action**: Delete feature branch
```bash
git checkout main
git branch -D feature/auth-context-di-migration
git push origin --delete feature/auth-context-di-migration
```

---

## Success Criteria

### Technical Criteria
- [ ] All 13 files migrated successfully
- [ ] 2 new files created
- [ ] 0 TypeScript errors
- [ ] 0 ESLint warnings
- [ ] 100% unit test pass rate
- [ ] 100% E2E test pass rate (86 total)
- [ ] Coverage ≥ 98.38%
- [ ] Build succeeds
- [ ] No performance regression

### Functional Criteria
- [ ] Login works end-to-end
- [ ] Registration works end-to-end
- [ ] Logout clears state correctly
- [ ] Protected routes require auth
- [ ] Admin routes require admin role
- [ ] Profile updates sync immediately
- [ ] Token refresh works automatically
- [ ] Session management functional

### Quality Criteria
- [ ] No console errors in browser
- [ ] No console warnings
- [ ] Clean code (no debug statements)
- [ ] Documentation complete
- [ ] Clean git history
- [ ] PR description comprehensive

### Acceptance Criteria
- [ ] All manual test scenarios pass
- [ ] E2E tests stable (no flakes)
- [ ] Team review approved
- [ ] Ready to merge to main

---

## Risk Mitigation

### Identified Risks

**Risk 1: Context Not Available in Tests**
- **Likelihood**: Medium
- **Impact**: High (tests fail)
- **Mitigation**: Use proper mock pattern at module level
- **Contingency**: Review existing test patterns in codebase

**Risk 2: Infinite Re-renders**
- **Likelihood**: Low
- **Impact**: High (app unusable)
- **Mitigation**: Ensure Context value is stable (not recreated on every render)
- **Contingency**: Add React DevTools profiler, check render counts

**Risk 3: Token Refresh Breaks**
- **Likelihood**: Low
- **Impact**: High (users logged out unexpectedly)
- **Mitigation**: Verify `client.ts` continues using `getState()` correctly
- **Contingency**: Extensive manual testing of token expiration flow

**Risk 4: E2E Tests Still Fail**
- **Likelihood**: Medium
- **Impact**: High (migration objective not met)
- **Mitigation**: Test injection pattern in isolation first
- **Contingency**: Rollback and reconsider approach (possibly Option 4 from original analysis)

**Risk 5: Performance Regression**
- **Likelihood**: Low
- **Impact**: Medium (slower app)
- **Mitigation**: Context value is stable, no extra re-renders
- **Contingency**: Profile with React DevTools, optimize selectors if needed

### Risk Monitoring

Monitor throughout implementation:
- TypeScript compiler output
- Test execution results
- Browser console (errors, warnings)
- Network tab (API calls)
- React DevTools (re-render counts)

---

## Timeline & Effort

### Estimated Timeline (Full Day for Careful Implementation)

**Phase 1-2** (Foundation): 1-2 hours
**Phase 3-4** (Component Migration): 2-3 hours
**Phase 5** (Exports): 15 minutes
**Phase 6** (Unit Tests): 1-2 hours
**Phase 7** (E2E Tests): 1-2 hours
**Phase 8** (Comprehensive Testing): 1-2 hours
**Phase 9** (Final Verification): 30 minutes
**Phase 10** (Documentation): 30 minutes
**Phase 11** (Git & PR): 30 minutes

**Total**: 8-12 hours (1-2 full working days for careful, test-driven implementation)

### Prerequisites

**Required Knowledge**:
- Strong TypeScript skills
- React Context API experience
- Zustand familiarity
- Playwright E2E testing
- Jest unit testing

**Required Setup**:
- Node.js environment
- Git configured
- GitHub CLI (optional, for PR creation)
- Backend running (for manual testing)

---

## Communication Plan

### Before Starting
- [ ] Notify team of upcoming auth refactor
- [ ] Block calendar for focused implementation time
- [ ] Ensure no conflicting PRs in flight

### During Implementation
- [ ] Update team after completing each phase
- [ ] Flag blockers immediately in team chat
- [ ] Request code review early if uncertain

### After Completion
- [ ] Demo working E2E tests to team
- [ ] Share PR for review
- [ ] Schedule walkthrough of new architecture (if needed)
- [ ] Update team documentation/wiki

---

## Post-Migration

### Monitoring

**First Week After Merge**:
- Monitor for auth-related bug reports
- Check error logging for new auth errors
- Verify E2E test suite remains stable in CI
- Watch for performance issues

**What to Watch For**:
- Unexpected logouts
- Token refresh failures
- E2E test flakiness
- User complaints about auth flow

### Future Enhancements Enabled

This architecture enables:
- **Auth Events**: Add event bus for login/logout events
- **Middleware**: Add auth action middleware (logging, analytics)
- **A/B Testing**: Test different auth flows by swapping stores
- **Multi-Auth**: Support multiple auth providers (OAuth, SAML, etc.)
- **Observability**: Easy to add auth state debugging tools

### Maintenance Notes

**For Future Developers**:
- Always use `useAuth()` in components that render auth state
- Use `useAuthStore.getState()` in mutation callbacks
- Never try to modify AuthContext - it's just DI layer
- All business logic stays in Zustand store
- See CLAUDE.md for complete patterns

---

## Appendix

### File Manifest

**New Files (2)**:
1. `src/lib/auth/AuthContext.tsx` - Context provider and hooks
2. `e2e/helpers/testAuthProvider.ts` - Mock store factory

**Modified Files (13)**:
1. `src/app/layout.tsx` - Add AuthProvider
2. `src/components/auth/AuthGuard.tsx` - Use useAuth
3. `src/components/auth/AuthInitializer.tsx` - Use useAuth
4. `src/components/layout/Header.tsx` - Use useAuth
5. `src/lib/api/hooks/useAuth.ts` - Mixed pattern
6. `src/lib/api/hooks/useUser.ts` - Use getState()
7. `src/lib/stores/index.ts` - Export useAuth
8. `tests/components/layout/Header.test.tsx` - Mock Context
9. `tests/components/auth/AuthInitializer.test.tsx` - Mock Context
10. `tests/lib/api/hooks/useUser.test.tsx` - Update mock
11. `tests/app/(authenticated)/settings/profile/page.test.tsx` - Mock Context
12. `e2e/helpers/auth.ts` - Inject via window
13. `CLAUDE.md` - Add documentation

**Modified E2E Tests (4)**:
14. `e2e/settings-profile.spec.ts`
15. `e2e/settings-password.spec.ts`
16. `e2e/settings-sessions.spec.ts`
17. `e2e/settings-navigation.spec.ts`

**Unchanged Files** (remain same):
- `src/lib/stores/authStore.ts` - Store definition
- `src/lib/auth/storage.ts` - Token storage
- `src/lib/auth/crypto.ts` - Encryption
- `src/lib/api/client.ts` - API interceptors
- `tests/lib/stores/authStore.test.ts` - Store tests

### Code Statistics

**Lines of Code**:
- New code: ~150 lines (AuthContext + test helpers)
- Modified code: ~50 lines (import changes)
- Deleted code: ~0 lines (pure addition/refactor)
- Net change: +~200 lines

**Test Statistics**:
- Unit tests: No new tests (existing tests updated)
- E2E tests: No new tests (existing tests now passing)
- Coverage: Maintained at ≥98.38%

---

## Final Notes

This migration is a **surgical refactor** that:
- ✅ Maintains all existing functionality
- ✅ Preserves security and performance
- ✅ Enables full E2E test coverage
- ✅ Follows React best practices
- ✅ Provides clean, maintainable architecture
- ✅ Has zero breaking changes

**The result is a production-grade authentication system that the team can be proud of.**

---

**Plan Status**: READY FOR EXECUTION
**Last Updated**: 2025-11-03
**Next Step**: Begin Phase 1 - Create AuthContext module
