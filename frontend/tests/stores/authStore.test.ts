/**
 * Tests for auth store
 */

import { useAuthStore } from '@/stores/authStore';
import * as storage from '@/lib/auth/storage';

// Mock storage module
jest.mock('@/lib/auth/storage');

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
  });

  describe('User validation', () => {
    it('should reject empty string user ID', async () => {
      const invalidUser = {
        id: '',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      await expect(
        useAuthStore.getState().setAuth(
          invalidUser,
          'valid.access.token',
          'valid.refresh.token'
        )
      ).rejects.toThrow('Invalid user object');
    });

    it('should reject whitespace-only user ID', async () => {
      const invalidUser = {
        id: '   ',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      await expect(
        useAuthStore.getState().setAuth(
          invalidUser,
          'valid.access.token',
          'valid.refresh.token'
        )
      ).rejects.toThrow('Invalid user object');
    });

    it('should reject empty string email', async () => {
      const invalidUser = {
        id: 'user-123',
        email: '',
        is_active: true,
        is_superuser: false,
      };

      await expect(
        useAuthStore.getState().setAuth(
          invalidUser,
          'valid.access.token',
          'valid.refresh.token'
        )
      ).rejects.toThrow('Invalid user object');
    });

    it('should reject non-string user ID', async () => {
      const invalidUser = {
        id: 123,
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      await expect(
        // @ts-expect-error - Testing invalid input
        useAuthStore.getState().setAuth(
          invalidUser,
          'valid.access.token',
          'valid.refresh.token'
        )
      ).rejects.toThrow('Invalid user object');
    });

    it('should accept valid user', async () => {
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      await expect(
        useAuthStore.getState().setAuth(
          validUser,
          'header.payload.signature',
          'header.payload.signature'
        )
      ).resolves.not.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(validUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Token validation', () => {
    it('should reject invalid JWT format (not 3 parts)', async () => {
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      await expect(
        useAuthStore.getState().setAuth(
          validUser,
          'invalid.token', // Only 2 parts
          'header.payload.signature'
        )
      ).rejects.toThrow('Invalid token format');
    });

    it('should reject JWT with empty parts', async () => {
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      await expect(
        useAuthStore.getState().setAuth(
          validUser,
          'header..signature', // Empty payload
          'header.payload.signature'
        )
      ).rejects.toThrow('Invalid token format');
    });

    it('should accept valid JWT format', async () => {
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      (storage.saveTokens as jest.Mock).mockResolvedValue(undefined);

      await expect(
        useAuthStore.getState().setAuth(
          validUser,
          'header.payload.signature',
          'header.payload.signature'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Token expiry calculation', () => {
    it('should reject negative expiresIn', async () => {
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

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
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

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
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

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
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

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
      const validUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      };

      await useAuthStore.getState().setAuth(
        validUser,
        'header.payload.signature',
        'header.payload.signature'
      );

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
});
