/**
 * Cryptographic utilities for secure token storage
 * Implements AES-GCM encryption for localStorage fallback
 * SSR-safe: All browser APIs guarded
 */

const ENCRYPTION_KEY_NAME = 'auth_encryption_key';

/**
 * Check if crypto APIs are available (browser only)
 */
function isCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof sessionStorage !== 'undefined'
  );
}

/**
 * Generate or retrieve encryption key
 * Key is stored in sessionStorage (cleared on browser close)
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  /* istanbul ignore next - SSR guard, should never be hit due to guards in encrypt/decrypt */
  if (!isCryptoAvailable()) {
    throw new Error('Crypto API not available - must be called in browser context');
  }

  // Check if key exists in session
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME);

  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      // Corrupted key, regenerate
      console.warn('Failed to import stored key, generating new key:', error);
      sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Store key in sessionStorage
  try {
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));
  } catch (error) {
    /* istanbul ignore next - Error logging only, key continues in memory */
    console.warn('Failed to store encryption key:', error);
    // Continue anyway - key is in memory
  }

  return key;
}

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt
 * @returns Base64 encoded encrypted data with IV
 * @throws Error if crypto is not available or encryption fails
 */
export async function encryptData(data: string): Promise<string> {
  /* istanbul ignore next - SSR guard tested in E2E */
  if (!isCryptoAvailable()) {
    throw new Error('Encryption not available in SSR context');
  }

  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    /* istanbul ignore next - Error logging before throw */
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data encrypted with encryptData
 * @param encryptedData - Base64 encoded encrypted data with IV
 * @returns Decrypted string
 * @throws Error if crypto is not available or decryption fails
 */
export async function decryptData(encryptedData: string): Promise<string> {
  /* istanbul ignore next - SSR guard tested in E2E */
  if (!isCryptoAvailable()) {
    throw new Error('Decryption not available in SSR context');
  }

  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Clear encryption key from session
 * Call this on logout to invalidate encrypted data
 * SSR-safe: No-op if sessionStorage not available
 */
export function clearEncryptionKey(): void {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
    } catch (error) {
      /* istanbul ignore next - Error logging only */
      console.warn('Failed to clear encryption key:', error);
    }
  }
}
