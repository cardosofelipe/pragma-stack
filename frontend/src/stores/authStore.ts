/**
 * Authentication Store - Zustand with secure token storage
 * Implements proper state management with validation
 */

import { create } from 'zustand';
import { saveTokens, getTokens, clearTokens } from '@/lib/auth/storage';

// User type - will be replaced with generated types in Phase 2
export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  organization_id?: string;
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
  // Default to 15 minutes if not provided
  const seconds = expiresIn || 900;
  return Date.now() + seconds * 1000;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to check stored tokens
  tokenExpiresAt: null,

  // Set complete auth state (user + tokens)
  setAuth: async (user, accessToken, refreshToken, expiresIn) => {
    // Validate inputs
    if (!user || !user.id || !user.email) {
      throw new Error('Invalid user object');
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
    if (!user || !user.id || !user.email) {
      throw new Error('Invalid user object');
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

  // Load auth from storage on app start
  loadAuthFromStorage: async () => {
    try {
      const tokens = await getTokens();

      if (tokens?.accessToken && tokens?.refreshToken) {
        // Validate token format
        if (isValidToken(tokens.accessToken) && isValidToken(tokens.refreshToken)) {
          set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            // User will be loaded separately via API call
          });
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
    }

    // No valid tokens found
    set({ isLoading: false });
  },

  // Check if current token is expired
  isTokenExpired: () => {
    const { tokenExpiresAt } = get();
    if (!tokenExpiresAt) return true;
    return Date.now() >= tokenExpiresAt;
  },
}));

/**
 * Initialize auth store from storage
 * Call this on app startup
 */
export async function initializeAuth(): Promise<void> {
  await useAuthStore.getState().loadAuthFromStorage();
}
