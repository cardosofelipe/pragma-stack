# Frontend Common Pitfalls & Solutions

**Project**: Next.js + FastAPI Template
**Version**: 1.0
**Last Updated**: 2025-11-03
**Status**: Living Document

---

## Table of Contents

1. [React Hooks](#1-react-hooks)
2. [Context API & State Management](#2-context-api--state-management)
3. [Zustand Store Patterns](#3-zustand-store-patterns)
4. [TypeScript Type Safety](#4-typescript-type-safety)
5. [Component Patterns](#5-component-patterns)
6. [Provider Architecture](#6-provider-architecture)
7. [Event Handlers & Callbacks](#7-event-handlers--callbacks)
8. [Testing Pitfalls](#8-testing-pitfalls)
9. [Performance](#9-performance)
10. [Import/Export Patterns](#10-importexport-patterns)

---

## 1. React Hooks

### Pitfall 1.1: Returning Hook Function Instead of Calling It

**❌ WRONG:**

```typescript
// Custom hook that wraps Zustand
export function useAuth() {
  const storeHook = useContext(AuthContext);
  return storeHook; // Returns the hook function itself!
}

// Consumer component
function MyComponent() {
  const authHook = useAuth(); // Got the hook function
  const { user } = authHook(); // Have to call it here ❌ Rules of Hooks violation!
}
```

**Why It's Wrong:**

- Violates React Rules of Hooks (hook called conditionally/in wrong place)
- Confusing API for consumers
- Can't use in conditionals or callbacks safely
- Type inference breaks

**✅ CORRECT:**

```typescript
// Custom hook that calls the wrapped hook internally
export function useAuth() {
  const storeHook = useContext(AuthContext);
  if (!storeHook) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return storeHook(); // Call the hook HERE, return the state
}

// Consumer component
function MyComponent() {
  const { user } = useAuth(); // Direct access to state ✅
}
```

**✅ EVEN BETTER (Polymorphic):**

```typescript
// Support both patterns
export function useAuth(): AuthState;
export function useAuth<T>(selector: (state: AuthState) => T): T;
export function useAuth<T>(selector?: (state: AuthState) => T): AuthState | T {
  const storeHook = useContext(AuthContext);
  if (!storeHook) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return selector ? storeHook(selector) : storeHook();
}

// Usage - both work!
const { user } = useAuth(); // Full state
const user = useAuth((s) => s.user); // Optimized selector
```

**Key Takeaway:**

- **Always call hooks internally in custom hooks**
- Return state/values, not hook functions
- Support selectors for performance optimization

---

### Pitfall 1.2: Calling Hooks Conditionally

**❌ WRONG:**

```typescript
function MyComponent({ showUser }) {
  if (showUser) {
    const { user } = useAuth();  // ❌ Conditional hook call!
    return <div>{user?.name}</div>;
  }
  return null;
}
```

**✅ CORRECT:**

```typescript
function MyComponent({ showUser }) {
  const { user } = useAuth();  // ✅ Always call at top level

  if (!showUser) {
    return null;
  }

  return <div>{user?.name}</div>;
}
```

**Key Takeaway:**

- **Always call hooks at the top level of your component**
- Never call hooks inside conditionals, loops, or nested functions
- Return early after hooks are called

---

## 2. Context API & State Management

### Pitfall 2.1: Creating New Context Value on Every Render

**❌ WRONG:**

```typescript
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // New object created every render! ❌
  const value = { user, setUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Why It's Wrong:**

- Every render creates a new object
- All consumers re-render even if values unchanged
- Performance nightmare in large apps

**✅ CORRECT:**

```typescript
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Memoize value - only changes when dependencies change
  const value = useMemo(() => ({ user, setUser }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**✅ EVEN BETTER (Zustand + Context):**

```typescript
export function AuthProvider({ children, store }) {
  // Zustand hook function is stable (doesn't change)
  const authStore = store ?? useAuthStoreImpl;

  // No useMemo needed - hook functions are stable references
  return <AuthContext.Provider value={authStore}>{children}</AuthContext.Provider>;
}
```

**Key Takeaway:**

- **Use `useMemo` for Context values that are objects**
- Or use stable references (Zustand hooks, refs)
- Monitor re-renders with React DevTools

---

### Pitfall 2.2: Prop Drilling Instead of Context

**❌ WRONG:**

```typescript
// Passing through 5 levels
<Layout user={user}>
  <Sidebar user={user}>
    <Navigation user={user}>
      <UserMenu user={user}>
        <Avatar user={user} />
      </UserMenu>
    </Navigation>
  </Sidebar>
</Layout>
```

**✅ CORRECT:**

```typescript
// Provider at top
<AuthProvider>
  <Layout>
    <Sidebar>
      <Navigation>
        <UserMenu>
          <Avatar />  {/* Gets user from useAuth() */}
        </UserMenu>
      </Navigation>
    </Sidebar>
  </Layout>
</AuthProvider>
```

**Key Takeaway:**

- **Use Context for data needed by many components**
- Avoid prop drilling beyond 2-3 levels
- But don't overuse - local state is often better

---

## 3. Zustand Store Patterns

### Pitfall 3.1: Mixing Render State Access and Mutation Logic

**❌ WRONG (Mixing patterns):**

```typescript
function MyComponent() {
  // Using hook for render state
  const { user } = useAuthStore();

  const handleLogin = async (data) => {
    // Also using hook in callback ❌ Inconsistent!
    const setAuth = useAuthStore((s) => s.setAuth);
    await setAuth(data.user, data.token);
  };
}
```

**✅ CORRECT (Separate patterns):**

```typescript
function MyComponent() {
  // Hook for render state (subscribes to changes)
  const { user } = useAuthStore();

  const handleLogin = async (data) => {
    // getState() for mutations (no subscription)
    const setAuth = useAuthStore.getState().setAuth;
    await setAuth(data.user, data.token);
  };
}
```

**Why This Pattern?**

- **Render state**: Use hook → component re-renders on changes
- **Mutations**: Use `getState()` → no subscription, no re-renders
- **Performance**: Event handlers don't need to subscribe
- **Clarity**: Clear distinction between read and write

**Key Takeaway:**

- **Use hooks for state that affects rendering**
- **Use `getState()` for mutations in callbacks**
- Don't subscribe when you don't need to

---

### Pitfall 3.2: Not Using Selectors for Optimization

**❌ SUBOPTIMAL:**

```typescript
function UserAvatar() {
  // Re-renders on ANY auth state change! ❌
  const { user, accessToken, isLoading, isAuthenticated } = useAuthStore();

  return <Avatar src={user?.avatar} />;
}
```

**✅ OPTIMIZED:**

```typescript
function UserAvatar() {
  // Only re-renders when user changes ✅
  const user = useAuthStore((state) => state.user);

  return <Avatar src={user?.avatar} />;
}
```

**Key Takeaway:**

- **Use selectors for components that only need subset of state**
- Reduces unnecessary re-renders
- Especially important in frequently updating stores

---

## 4. TypeScript Type Safety

### Pitfall 4.1: Using `any` Type

**❌ WRONG:**

```typescript
function processUser(user: any) {
  // ❌ Loses all type safety
  return user.name.toUpperCase(); // No error if user.name is undefined
}
```

**✅ CORRECT:**

```typescript
function processUser(user: User | null) {
  if (!user?.name) {
    return '';
  }
  return user.name.toUpperCase();
}
```

**Key Takeaway:**

- **Never use `any` - use `unknown` if type is truly unknown**
- Define proper types for all function parameters
- Use type guards for runtime checks

---

### Pitfall 4.2: Implicit Types Leading to Errors

**❌ WRONG:**

```typescript
// No explicit return type - type inference can be wrong
export function useAuth() {
  const context = useContext(AuthContext);
  return context; // What type is this? ❌
}
```

**✅ CORRECT:**

```typescript
// Explicit return type with overloads
export function useAuth(): AuthState;
export function useAuth<T>(selector: (state: AuthState) => T): T;
export function useAuth<T>(selector?: (state: AuthState) => T): AuthState | T {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return selector ? context(selector) : context();
}
```

**Key Takeaway:**

- **Always provide explicit return types for public APIs**
- Use function overloads for polymorphic functions
- Document types in JSDoc comments

---

### Pitfall 4.3: Not Using `import type` for Type-Only Imports

**❌ SUBOPTIMAL:**

```typescript
import { ReactNode } from 'react'; // Might be bundled even if only used for types
```

**✅ CORRECT:**

```typescript
import type { ReactNode } from 'react'; // Guaranteed to be stripped from bundle
```

**Key Takeaway:**

- **Use `import type` for type-only imports**
- Smaller bundle size
- Clearer intent

---

## 5. Component Patterns

### Pitfall 5.1: Forgetting Optional Chaining for Nullable Values

**❌ WRONG:**

```typescript
function UserProfile() {
  const { user } = useAuth();
  return <div>{user.name}</div>;  // ❌ Crashes if user is null
}
```

**✅ CORRECT:**

```typescript
function UserProfile() {
  const { user } = useAuth();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return <div>{user.name}</div>;  // ✅ Safe
}

// OR with optional chaining
function UserProfile() {
  const { user } = useAuth();
  return <div>{user?.name ?? 'Guest'}</div>;  // ✅ Safe
}
```

**Key Takeaway:**

- **Always handle null/undefined cases**
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Provide fallback UI for missing data

---

### Pitfall 5.2: Mixing Concerns in Components

**❌ WRONG:**

```typescript
function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Data fetching mixed with component logic ❌
  useEffect(() => {
    setLoading(true);
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  // Business logic mixed with rendering ❌
  const activeUsers = users.filter(u => u.isActive);
  const sortedUsers = activeUsers.sort((a, b) => a.name.localeCompare(b.name));

  return <div>{/* Render sortedUsers */}</div>;
}
```

**✅ CORRECT:**

```typescript
// Custom hook for data fetching
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => UserService.getUsers(),
  });
}

// Custom hook for business logic
function useActiveUsersSorted(users: User[] | undefined) {
  return useMemo(() => {
    if (!users) return [];
    return users
      .filter(u => u.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);
}

// Component only handles rendering
function UserDashboard() {
  const { data: users, isLoading } = useUsers();
  const sortedUsers = useActiveUsersSorted(users);

  if (isLoading) return <LoadingSpinner />;

  return <div>{/* Render sortedUsers */}</div>;
}
```

**Key Takeaway:**

- **Separate concerns: data fetching, business logic, rendering**
- Extract logic to custom hooks
- Keep components focused on UI

---

## 6. Provider Architecture

### Pitfall 6.1: Wrong Provider Order

**❌ WRONG:**

```typescript
// AuthInitializer outside AuthProvider ❌
function RootLayout({ children }) {
  return (
    <Providers>
      <AuthInitializer />  {/* Can't access auth context! */}
      <AuthProvider>
        {children}
      </AuthProvider>
    </Providers>
  );
}
```

**✅ CORRECT:**

```typescript
function RootLayout({ children }) {
  return (
    <AuthProvider>           {/* Provider first */}
      <AuthInitializer />    {/* Can access auth context */}
      <Providers>
        {children}
      </Providers>
    </AuthProvider>
  );
}
```

**Key Takeaway:**

- **Providers must wrap components that use them**
- Order matters when there are dependencies
- Keep provider tree shallow (performance)

---

### Pitfall 6.2: Creating Too Many Providers

**❌ WRONG:**

```typescript
// Separate provider for every piece of state ❌
<UserProvider>
  <ThemeProvider>
    <LanguageProvider>
      <NotificationProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </NotificationProvider>
    </LanguageProvider>
  </ThemeProvider>
</UserProvider>
```

**✅ BETTER:**

```typescript
// Combine related state, use Zustand for most things
<AuthProvider>         {/* Only for auth DI */}
  <ThemeProvider>      {/* Built-in from lib */}
    <QueryClientProvider>  {/* React Query */}
      <App />
    </QueryClientProvider>
  </ThemeProvider>
</AuthProvider>

// Most other state in Zustand stores (no providers needed)
const useUIStore = create(...);  // Theme, sidebar, modals
const useUserPreferences = create(...);  // User settings
```

**Key Takeaway:**

- **Use Context only when necessary** (DI, third-party integrations)
- **Use Zustand for most global state** (no provider needed)
- Avoid provider hell

---

## 7. Event Handlers & Callbacks

### Pitfall 7.1: Using Hooks in Event Handlers

**❌ WRONG:**

```typescript
function MyComponent() {
  const handleClick = () => {
    const { user } = useAuth();  // ❌ Hook called in callback!
    console.log(user);
  };

  return <button onClick={handleClick}>Click</button>;
}
```

**✅ CORRECT:**

```typescript
function MyComponent() {
  const { user } = useAuth();  // ✅ Hook at component top level

  const handleClick = () => {
    console.log(user);  // Access from closure
  };

  return <button onClick={handleClick}>Click</button>;
}

// OR for mutations, use getState()
function MyComponent() {
  const handleLogout = async () => {
    const clearAuth = useAuthStore.getState().clearAuth;  // ✅ Not a hook call
    await clearAuth();
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

**Key Takeaway:**

- **Never call hooks inside event handlers**
- For render state: Call hook at top level, access in closure
- For mutations: Use `store.getState().method()`

---

### Pitfall 7.2: Not Handling Async Errors in Event Handlers

**❌ WRONG:**

```typescript
const handleSubmit = async (data: FormData) => {
  await apiCall(data); // ❌ No error handling!
};
```

**✅ CORRECT:**

```typescript
const handleSubmit = async (data: FormData) => {
  try {
    await apiCall(data);
    toast.success('Success!');
  } catch (error) {
    console.error('Failed to submit:', error);
    toast.error('Failed to submit form');
  }
};
```

**Key Takeaway:**

- **Always wrap async calls in try/catch**
- Provide user feedback for both success and errors
- Log errors for debugging

---

## 8. Testing Pitfalls

### Pitfall 8.1: Not Mocking Context Providers in Tests

**❌ WRONG:**

```typescript
// Test without provider ❌
test('renders user name', () => {
  render(<UserProfile />);  // Will crash - no AuthProvider!
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

**✅ CORRECT:**

```typescript
// Mock the hook
jest.mock('@/lib/stores', () => ({
  useAuth: jest.fn(),
}));

test('renders user name', () => {
  (useAuth as jest.Mock).mockReturnValue({
    user: { id: '1', name: 'John' },
    isAuthenticated: true,
  });

  render(<UserProfile />);
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

**Key Takeaway:**

- **Mock hooks at module level in tests**
- Provide necessary return values for each test case
- Test both success and error states

---

### Pitfall 8.2: Testing Implementation Details

**❌ WRONG:**

```typescript
test('calls useAuthStore hook', () => {
  const spy = jest.spyOn(require('@/lib/stores'), 'useAuthStore');
  render(<MyComponent />);
  expect(spy).toHaveBeenCalled();  // ❌ Testing implementation!
});
```

**✅ CORRECT:**

```typescript
test('displays user name when authenticated', () => {
  (useAuth as jest.Mock).mockReturnValue({
    user: { name: 'John' },
    isAuthenticated: true,
  });

  render(<MyComponent />);
  expect(screen.getByText('John')).toBeInTheDocument();  // ✅ Testing behavior!
});
```

**Key Takeaway:**

- **Test behavior, not implementation**
- Focus on what the user sees/does
- Don't test internal API calls unless critical

---

## 9. Performance

### Pitfall 9.1: Not Using React.memo for Expensive Components

**❌ SUBOPTIMAL:**

```typescript
// Re-renders every time parent re-renders ❌
function ExpensiveChart({ data }) {
  // Heavy computation/rendering
  return <ComplexVisualization data={data} />;
}
```

**✅ OPTIMIZED:**

```typescript
// Only re-renders when data changes ✅
export const ExpensiveChart = React.memo(function ExpensiveChart({ data }) {
  return <ComplexVisualization data={data} />;
});
```

**Key Takeaway:**

- **Use `React.memo` for expensive components**
- Especially useful for list items, charts, heavy UI
- Profile with React DevTools to identify candidates

---

### Pitfall 9.2: Creating Functions Inside Render

**❌ SUBOPTIMAL:**

```typescript
function MyComponent() {
  return (
    <button onClick={() => console.log('clicked')}>  {/* New function every render */}
      Click
    </button>
  );
}
```

**✅ OPTIMIZED:**

```typescript
function MyComponent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <button onClick={handleClick}>Click</button>;
}
```

**When to Optimize:**

- **For memoized child components** (memo, PureComponent)
- **For expensive event handlers**
- **When profiling shows performance issues**

**When NOT to optimize:**

- **Simple components with cheap operations** (premature optimization)
- **One-off event handlers**

**Key Takeaway:**

- **Use `useCallback` for functions passed to memoized children**
- But don't optimize everything - profile first

---

## 10. Import/Export Patterns

### Pitfall 10.1: Not Using Barrel Exports

**❌ INCONSISTENT:**

```typescript
// Deep imports all over the codebase
import { useAuth } from '@/lib/auth/AuthContext';
import { useAuthStore } from '@/lib/stores/authStore';
import { User } from '@/lib/stores/authStore';
```

**✅ CONSISTENT:**

```typescript
// Barrel exports in stores/index.ts
export { useAuth, AuthProvider } from '../auth/AuthContext';
export { useAuthStore, type User } from './authStore';

// Clean imports everywhere
import { useAuth, useAuthStore, User } from '@/lib/stores';
```

**Key Takeaway:**

- **Create barrel exports (index.ts) for public APIs**
- Easier to refactor internal structure
- Consistent import paths across codebase

---

### Pitfall 10.2: Circular Dependencies

**❌ WRONG:**

```typescript
// fileA.ts
import { functionB } from './fileB';
export function functionA() {
  return functionB();
}

// fileB.ts
import { functionA } from './fileA'; // ❌ Circular!
export function functionB() {
  return functionA();
}
```

**✅ CORRECT:**

```typescript
// utils.ts
export function sharedFunction() {
  /* shared logic */
}

// fileA.ts
import { sharedFunction } from './utils';
export function functionA() {
  return sharedFunction();
}

// fileB.ts
import { sharedFunction } from './utils';
export function functionB() {
  return sharedFunction();
}
```

**Key Takeaway:**

- **Avoid circular imports**
- Extract shared code to separate modules
- Keep dependency graph acyclic

---

## Verification Checklist

Before committing code, always run:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm test

# Build check
npm run build
```

**In browser:**

- [ ] No console errors or warnings
- [ ] Components render correctly
- [ ] No infinite loops or excessive re-renders (React DevTools)
- [ ] Proper error handling (test error states)

---

## Additional Resources

- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about#priority)

---

**Last Updated**: 2025-11-03
**Maintainer**: Development Team
**Status**: Living Document - Add new pitfalls as they're discovered
