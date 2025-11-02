/**
 * Authentication Store - Zustand with secure token storage
 * Implements proper state management with validation and automatic persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { saveTokens, getTokens, clearTokens } from '@/lib/auth/storage';

/**
 * User type matching backend UserResponse
 * Aligns with generated API types from OpenAPI spec
 */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name?: string | null;
  phone_number?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at?: string | null;
}

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokenExpiresAt: number | null; // Unix timestamp

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string, expiresIn?: number) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string, expiresIn?: number) => Promise<void>;
  setUser: (user: User) => void;
  clearAuth: () => Promise<void>;
  loadAuthFromStorage: () => Promise<void>;
  isTokenExpired: () => boolean;
}

/**
 * Validate token format (basic JWT structure check)
 */
function isValidToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  // JWT format: header.payload.signature
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Calculate token expiry timestamp
 * @param expiresIn - Seconds until expiry
 * @returns Unix timestamp
 */
function calculateExpiry(expiresIn?: number): number {
  // Default to 15 minutes if not provided or invalid
  let seconds = expiresIn || 900;

  // Validate positive number and prevent overflow
  if (seconds <= 0 || seconds > 31536000) { // Max 1 year
    console.warn(`Invalid expiresIn value: ${expiresIn}, using default 900s`);
    seconds = 900;
  }

  return Date.now() + seconds * 1000;
}

/**
 * Custom storage adapter for Zustand persist
 * Uses our encrypted token storage functions
 */
const authStorage = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const tokens = await getTokens();
      if (!tokens) return null;

      // Return the tokens as a JSON string that persist middleware expects
      return JSON.stringify({
        state: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: !!(tokens.accessToken && tokens.refreshToken),
        },
      });
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
      return null;
    }
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      const { accessToken, refreshToken } = parsed.state;

      if (accessToken && refreshToken) {
        await saveTokens({ accessToken, refreshToken });
      }
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeItem: async (_name: string): Promise<void> => {
    try {
      await clearTokens();
    } catch (error) {
      console.error('Failed to clear auth from storage:', error);
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false, // No longer needed - persist handles hydration
      tokenExpiresAt: null,

  // Set complete auth state (user + tokens)
  setAuth: async (user, accessToken, refreshToken, expiresIn) => {
    // Validate inputs
    if (!user || !user.id || !user.email ||
        typeof user.id !== 'string' || typeof user.email !== 'string' ||
        user.id.trim() === '' || user.email.trim() === '') {
      throw new Error('Invalid user object: id and email must be non-empty strings');
    }

    if (!isValidToken(accessToken) || !isValidToken(refreshToken)) {
      throw new Error('Invalid token format');
    }

    // Store tokens securely
    try {
      await saveTokens({ accessToken, refreshToken });

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        tokenExpiresAt: calculateExpiry(expiresIn),
      });
    } catch (error) {
      console.error('Failed to save auth state:', error);
      throw error;
    }
  },

  // Update tokens only (for refresh flow)
  setTokens: async (accessToken, refreshToken, expiresIn) => {
    if (!isValidToken(accessToken) || !isValidToken(refreshToken)) {
      throw new Error('Invalid token format');
    }

    try {
      await saveTokens({ accessToken, refreshToken });

      set({
        accessToken,
        refreshToken,
        tokenExpiresAt: calculateExpiry(expiresIn),
        // Keep existing user and authenticated state
      });
    } catch (error) {
      console.error('Failed to update tokens:', error);
      throw error;
    }
  },

  // Update user only
  setUser: (user) => {
    if (!user || !user.id || !user.email ||
        typeof user.id !== 'string' || typeof user.email !== 'string' ||
        user.id.trim() === '' || user.email.trim() === '') {
      throw new Error('Invalid user object: id and email must be non-empty strings');
    }

    set({ user });
  },

  // Clear all auth state
  clearAuth: async () => {
    try {
      await clearTokens();
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      tokenExpiresAt: null,
    });
  },

      /**
       * @deprecated No longer needed with persist middleware
       * The persist middleware automatically hydrates tokens on store initialization
       * Kept for backward compatibility but does nothing
       */
      loadAuthFromStorage: async () => {
        // No-op: persist middleware handles this automatically
        console.warn('loadAuthFromStorage() is deprecated and no longer necessary');
      },

      // Check if current token is expired
      isTokenExpired: () => {
        const { tokenExpiresAt } = get();
        if (!tokenExpiresAt) return true;
        return Date.now() >= tokenExpiresAt;
      },
    }),
    {
      name: 'auth_store', // Storage key
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        // Only persist tokens and auth status, not user or computed values
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to rehydrate auth store:', error);
          }
        };
      },
    }
  )
);

/**
 * @deprecated No longer needed with persist middleware
 * The persist middleware automatically hydrates the store on initialization
 * Kept for backward compatibility but does nothing
 */
export async function initializeAuth(): Promise<void> {
  // No-op: persist middleware handles initialization automatically
  console.warn('initializeAuth() is deprecated and no longer necessary');
}
