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
// eslint-disable-next-line no-restricted-imports -- This is the DI boundary, needs real store for production
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
 * Used for Context storage and test injection via props
 */
type AuthStoreHook = typeof useAuthStoreImpl;

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
 * Enables test isolation by allowing mock stores to be injected via the `store` prop.
 *
 * @example
 * ```tsx
 * // In production (root layout)
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * // In unit tests (with mock store)
 * <AuthProvider store={mockStore}>
 *   <ComponentUnderTest />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children, store }: AuthProviderProps) {
  // Use provided store for unit tests, otherwise use production singleton
  // E2E tests use the real auth store with mocked API routes
  const authStore = store ?? useAuthStoreImpl;

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

  // Call the Zustand hook internally (follows React Rules of Hooks)
  // This is the key difference from returning the hook function itself
  return selector ? storeHook(selector) : storeHook();
}
