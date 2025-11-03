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

  // Call the Zustand hook internally (follows React Rules of Hooks)
  // This is the key difference from returning the hook function itself
  return selector ? storeHook(selector) : storeHook();
}
