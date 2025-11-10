/**
 * Tests for auth store
 */

import { useAuthStore, type User } from '@/lib/stores/authStore';
import * as storage from '@/lib/auth/storage';

// Mock storage module
jest.mock('@/lib/auth/storage');

/**
 * Helper to create mock user object with all required fields
 */
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone_number: null,
    is_active: true,
    is_superuser: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    ...overrides,
  };
}

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      tokenExpiresAt: null,
    });

    jest.clearAllMocks();

    // Reset storage mocks to default successful implementations
    (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);
    (storage.getTokens as jest.Mock).mockResolvedValue(null);
    (storage.clearTokens as jest.Mock).mockResolvedValue(undefined);
  });

  describe('User validation', () => {
    it('should reject empty string user ID', async () => {
      const invalidUser = createMockUser({ id: '' });

      await expect(
        useAuthStore.getState().setAuth(invalidUser, 'valid.access.token', 'valid.refresh.token')
      ).rejects.toThrow('Invalid user object');
    });

    it('should reject whitespace-only user ID', async () => {
      const invalidUser = createMockUser({ id: '   ' });

      await expect(
        useAuthStore.getState().setAuth(invalidUser, 'valid.access.token', 'valid.refresh.token')
      ).rejects.toThrow('Invalid user object');
    });

    it('should reject empty string email', async () => {
      const invalidUser = createMockUser({ email: '' });

      await expect(
        useAuthStore.getState().setAuth(invalidUser, 'valid.access.token', 'valid.refresh.token')
      ).rejects.toThrow('Invalid user object');
    });

    it('should reject non-string user ID', async () => {
      const invalidUser = createMockUser({ id: 123 as any });

      await expect(
        useAuthStore.getState().setAuth(
          invalidUser as any, // Testing runtime validation with invalid type
          'valid.access.token',
          'valid.refresh.token'
        )
      ).rejects.toThrow('Invalid user object');
    });

    it('should accept valid user', async () => {
      const validUser = createMockUser();

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      await expect(
        useAuthStore
          .getState()
          .setAuth(validUser, 'header.payload.signature', 'header.payload.signature')
      ).resolves.not.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(validUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Token validation', () => {
    it('should reject invalid JWT format (not 3 parts)', async () => {
      const validUser = createMockUser();

      await expect(
        useAuthStore.getState().setAuth(
          validUser,
          'invalid.token', // Only 2 parts
          'header.payload.signature'
        )
      ).rejects.toThrow('Invalid token format');
    });

    it('should reject JWT with empty parts', async () => {
      const validUser = createMockUser();

      await expect(
        useAuthStore.getState().setAuth(
          validUser,
          'header..signature', // Empty payload
          'header.payload.signature'
        )
      ).rejects.toThrow('Invalid token format');
    });

    it('should accept valid JWT format', async () => {
      const validUser = createMockUser();

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      await expect(
        useAuthStore
          .getState()
          .setAuth(validUser, 'header.payload.signature', 'header.payload.signature')
      ).resolves.not.toThrow();
    });
  });

  describe('Token expiry calculation', () => {
    it('should reject negative expiresIn', async () => {
      const validUser = createMockUser();

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      // Should not throw, but should use default
      await useAuthStore.getState().setAuth(
        validUser,
        'header.payload.signature',
        'header.payload.signature',
        -1 // Negative!
      );

      const state = useAuthStore.getState();
      const expectedExpiry = Date.now() + 900 * 1000; // Should use default 900s

      // Allow 1 second tolerance
      expect(state.tokenExpiresAt).toBeGreaterThan(expectedExpiry - 1000);
      expect(state.tokenExpiresAt).toBeLessThan(expectedExpiry + 1000);
    });

    it('should reject zero expiresIn', async () => {
      const validUser = createMockUser();

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().setAuth(
        validUser,
        'header.payload.signature',
        'header.payload.signature',
        0 // Zero!
      );

      const state = useAuthStore.getState();
      const expectedExpiry = Date.now() + 900 * 1000;

      expect(state.tokenExpiresAt).toBeGreaterThan(expectedExpiry - 1000);
      expect(state.tokenExpiresAt).toBeLessThan(expectedExpiry + 1000);
    });

    it('should reject excessively large expiresIn', async () => {
      const validUser = createMockUser();

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().setAuth(
        validUser,
        'header.payload.signature',
        'header.payload.signature',
        99999999 // Way too large!
      );

      const state = useAuthStore.getState();
      const expectedExpiry = Date.now() + 900 * 1000; // Should use default

      expect(state.tokenExpiresAt).toBeGreaterThan(expectedExpiry - 1000);
      expect(state.tokenExpiresAt).toBeLessThan(expectedExpiry + 1000);
    });

    it('should accept valid expiresIn', async () => {
      const validUser = createMockUser();

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().setAuth(
        validUser,
        'header.payload.signature',
        'header.payload.signature',
        3600 // 1 hour
      );

      const state = useAuthStore.getState();
      const expectedExpiry = Date.now() + 3600 * 1000;

      expect(state.tokenExpiresAt).toBeGreaterThan(expectedExpiry - 1000);
      expect(state.tokenExpiresAt).toBeLessThan(expectedExpiry + 1000);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no expiry set', () => {
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('should return true when token is expired', () => {
      useAuthStore.setState({
        tokenExpiresAt: Date.now() - 1000, // 1 second ago
      });

      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('should return false when token is still valid', () => {
      useAuthStore.setState({
        tokenExpiresAt: Date.now() + 10000, // 10 seconds from now
      });

      expect(useAuthStore.getState().isTokenExpired()).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth state', async () => {
      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);
      (storage.clearTokens as jest.Mock).mockResolvedValue(undefined);

      // First set auth
      const validUser = createMockUser();

      await useAuthStore
        .getState()
        .setAuth(validUser, 'header.payload.signature', 'header.payload.signature');

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then clear
      await useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tokenExpiresAt).toBeNull();

      expect(storage.clearTokens).toHaveBeenCalled();
    });

    it('should not throw if clearTokens fails', async () => {
      (storage.clearTokens as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(useAuthStore.getState().clearAuth()).resolves.not.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('should update tokens while preserving user state', async () => {
      // First set initial auth with user
      await useAuthStore
        .getState()
        .setAuth(createMockUser({ id: 'user-1' }), 'old.access.token', 'old.refresh.token');

      const oldUser = useAuthStore.getState().user;

      // Now update just the tokens
      await useAuthStore.getState().setTokens('new.access.token', 'new.refresh.token', 900);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new.access.token');
      expect(state.refreshToken).toBe('new.refresh.token');
      expect(state.user).toBe(oldUser); // User should remain unchanged
      expect(state.tokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it('should reject invalid access token in setTokens', async () => {
      await expect(
        useAuthStore.getState().setTokens('invalid', 'valid.refresh.token', 900)
      ).rejects.toThrow('Invalid token format');
    });

    it('should reject invalid refresh token in setTokens', async () => {
      await expect(
        useAuthStore.getState().setTokens('valid.access.token', 'invalid', 900)
      ).rejects.toThrow('Invalid token format');
    });

    it('should throw if storage fails in setTokens', async () => {
      (storage.saveTokens as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(
        useAuthStore.getState().setTokens('valid.access.token', 'valid.refresh.token', 900)
      ).rejects.toThrow();
    });
  });

  describe('setUser', () => {
    it('should update user while preserving auth state', async () => {
      // First set initial auth
      await useAuthStore
        .getState()
        .setAuth(createMockUser({ id: 'user-1' }), 'valid.access.token', 'valid.refresh.token');

      const oldToken = useAuthStore.getState().accessToken;

      // Update just the user
      const newUser = createMockUser({
        id: 'user-1',
        email: 'updated@example.com',
        is_superuser: true,
      });
      useAuthStore.getState().setUser(newUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(newUser);
      expect(state.accessToken).toBe(oldToken); // Tokens unchanged
    });

    it('should reject null user', () => {
      expect(() => {
        useAuthStore.getState().setUser(null as any);
      }).toThrow('Invalid user object');
    });

    it('should reject user with empty id', () => {
      expect(() => {
        useAuthStore.getState().setUser(createMockUser({ id: '' }));
      }).toThrow('Invalid user object');
    });

    it('should reject user with whitespace-only id', () => {
      expect(() => {
        useAuthStore.getState().setUser(createMockUser({ id: '   ' }));
      }).toThrow('Invalid user object');
    });

    it('should reject user with non-string email', () => {
      expect(() => {
        useAuthStore.getState().setUser(createMockUser({ id: 'user-1', email: 123 as any }));
      }).toThrow('Invalid user object');
    });
  });

  describe('loadAuthFromStorage', () => {
    it('should load valid tokens from storage', async () => {
      const mockTokens = {
        accessToken: 'valid.access.token',
        refreshToken: 'valid.refresh.token',
      };
      (storage.getTokens as jest.Mock).mockResolvedValue(mockTokens);

      await useAuthStore.getState().loadAuthFromStorage();

      expect(useAuthStore.getState().accessToken).toBe(mockTokens.accessToken);
      expect(useAuthStore.getState().refreshToken).toBe(mockTokens.refreshToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to false when no tokens found', async () => {
      (storage.getTokens as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().loadAuthFromStorage();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should ignore invalid tokens from storage', async () => {
      const invalidTokens = {
        accessToken: 'invalid-token', // Not in JWT format
        refreshToken: 'valid.refresh.token',
      };
      (storage.getTokens as jest.Mock).mockResolvedValue(invalidTokens);

      await useAuthStore.getState().loadAuthFromStorage();

      // Should not set auth state with invalid tokens
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      (storage.getTokens as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await useAuthStore.getState().loadAuthFromStorage();

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('initializeAuth', () => {
    it('should call loadAuthFromStorage', async () => {
      const mockTokens = {
        accessToken: 'valid.access.token',
        refreshToken: 'valid.refresh.token',
      };
      (storage.getTokens as jest.Mock).mockResolvedValue(mockTokens);

      const { initializeAuth } = await import('@/lib/stores/authStore');
      await initializeAuth();

      expect(storage.getTokens).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should not throw on error and log error', async () => {
      (storage.getTokens as jest.Mock).mockRejectedValue(new Error('Init error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { initializeAuth } = await import('@/lib/stores/authStore');
      await expect(initializeAuth()).resolves.not.toThrow();

      // Verify error was logged by loadAuthFromStorage (which initializeAuth calls)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load auth from storage:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Storage error handling', () => {
    it('should handle saveTokens failure in setAuth', async () => {
      const mockUser = createMockUser();
      (storage.saveTokens as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        useAuthStore.getState().setAuth(mockUser, 'valid.access.token', 'valid.refresh.token')
      ).rejects.toThrow('Storage error');

      // Verify error was logged before throwing
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save auth state:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});
