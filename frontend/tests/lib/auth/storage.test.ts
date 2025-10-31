/**
 * Tests for secure storage module
 */

import { saveTokens, getTokens, clearTokens, isStorageAvailable } from '@/lib/auth/storage';

// Mock crypto functions for testing
jest.mock('@/lib/auth/crypto', () => ({
  encryptData: jest.fn((data: string) => Promise.resolve(`encrypted_${data}`)),
  decryptData: jest.fn((data: string) => Promise.resolve(data.replace('encrypted_', ''))),
  clearEncryptionKey: jest.fn(),
}));

describe('Storage Module', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  describe('isStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should handle quota exceeded errors gracefully', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      expect(isStorageAvailable()).toBe(false);

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('saveTokens and getTokens', () => {
    it('should save and retrieve tokens', async () => {
      const tokens = {
        accessToken: 'test.access.token',
        refreshToken: 'test.refresh.token',
      };

      await saveTokens(tokens);
      const retrieved = await getTokens();

      expect(retrieved).toEqual(tokens);
    });

    it('should return null when no tokens are stored', async () => {
      const result = await getTokens();
      expect(result).toBeNull();
    });

    it('should handle corrupted data gracefully', async () => {
      // Manually set invalid encrypted data
      localStorage.setItem('auth_tokens', 'invalid_encrypted_data');

      const { decryptData } = require('@/lib/auth/crypto');
      decryptData.mockRejectedValueOnce(new Error('Decryption failed'));

      const result = await getTokens();
      expect(result).toBeNull();

      // Should clear corrupted data
      expect(localStorage.getItem('auth_tokens')).toBeNull();
    });

    it('should validate token structure after decryption', async () => {
      const { decryptData } = require('@/lib/auth/crypto');

      // Mock decryptData to return invalid structure
      decryptData.mockResolvedValueOnce('not_an_object');

      localStorage.setItem('auth_tokens', 'encrypted_data');

      const result = await getTokens();
      expect(result).toBeNull();
    });

    it('should reject tokens with missing fields', async () => {
      const { decryptData } = require('@/lib/auth/crypto');

      // Mock decryptData to return incomplete tokens
      decryptData.mockResolvedValueOnce(JSON.stringify({ accessToken: 'only_access' }));

      localStorage.setItem('auth_tokens', 'encrypted_data');

      const result = await getTokens();

      // Should reject incomplete tokens and return null
      expect(result).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should clear all stored tokens', async () => {
      const tokens = {
        accessToken: 'test.access.token',
        refreshToken: 'test.refresh.token',
      };

      await saveTokens(tokens);
      expect(localStorage.getItem('auth_tokens')).not.toBeNull();

      await clearTokens();
      expect(localStorage.getItem('auth_tokens')).toBeNull();
    });

    it('should not throw if no tokens exist', async () => {
      await expect(clearTokens()).resolves.not.toThrow();
    });

    it('should call clearEncryptionKey', async () => {
      const { clearEncryptionKey } = require('@/lib/auth/crypto');

      await clearTokens();

      expect(clearEncryptionKey).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw clear error when localStorage not available', async () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('localStorage disabled');
      });

      const tokens = {
        accessToken: 'test.access.token',
        refreshToken: 'test.refresh.token',
      };

      // When setItem throws, isLocalStorageAvailable() returns false
      await expect(saveTokens(tokens)).rejects.toThrow('localStorage not available - cannot save tokens');

      Storage.prototype.setItem = originalSetItem;
    });
  });
});
