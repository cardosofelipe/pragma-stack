/**
 * Tests for crypto utilities
 */

import { encryptData, decryptData, clearEncryptionKey } from '@/lib/auth/crypto';

describe('Crypto Utilities', () => {
  beforeEach(() => {
    // Clear encryption key before each test
    clearEncryptionKey();
    sessionStorage.clear();
  });

  describe('encryptData', () => {
    it('should encrypt string data', async () => {
      const plaintext = 'test data';
      const encrypted = await encryptData(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'test data';
      const encrypted1 = await encryptData(plaintext);
      const encrypted2 = await encryptData(plaintext);

      // Due to random IV, ciphertexts should be different
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', async () => {
      const encrypted = await encryptData('');
      expect(encrypted).toBeDefined();
    });

    it('should handle special characters', async () => {
      const special = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const encrypted = await encryptData(special);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBe(special);
    });
  });

  describe('decryptData', () => {
    it('should decrypt data encrypted by encryptData', async () => {
      const plaintext = 'test data';
      const encrypted = await encryptData(plaintext);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data', async () => {
      await expect(decryptData('invalid')).rejects.toThrow();
    });

    it('should throw error for tampered data', async () => {
      const plaintext = 'test data';
      const encrypted = await encryptData(plaintext);

      // Tamper with encrypted data
      const tampered = encrypted.slice(0, -4) + 'XXXX';

      await expect(decryptData(tampered)).rejects.toThrow();
    });
  });

  describe('clearEncryptionKey', () => {
    it('should clear encryption key from session', async () => {
      // Encrypt some data (creates key)
      await encryptData('test');

      // Clear key
      clearEncryptionKey();

      // Session storage should be empty
      expect(sessionStorage.getItem('auth_encryption_key')).toBeNull();
    });

    it('should invalidate previously encrypted data after key cleared', async () => {
      const plaintext = 'test data';
      const encrypted = await encryptData(plaintext);

      // Clear key
      clearEncryptionKey();

      // Try to decrypt - should fail because key is regenerated
      await expect(decryptData(encrypted)).rejects.toThrow();
    });
  });

  describe('Key persistence', () => {
    it('should reuse same key within session', async () => {
      const plaintext = 'test data';

      const encrypted1 = await encryptData(plaintext);
      const decrypted1 = await decryptData(encrypted1);

      const encrypted2 = await encryptData(plaintext);
      const decrypted2 = await decryptData(encrypted2);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });
  });
});
