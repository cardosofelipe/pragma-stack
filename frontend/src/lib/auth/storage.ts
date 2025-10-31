/**
 * Secure token storage abstraction
 * Primary: httpOnly cookies (server-side)
 * Fallback: Encrypted localStorage (client-side)
 */

import { encryptData, decryptData, clearEncryptionKey } from './crypto';

export interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
}

const STORAGE_KEY = 'auth_tokens';
const STORAGE_METHOD_KEY = 'auth_storage_method';

export type StorageMethod = 'cookie' | 'localStorage';

/**
 * Get current storage method
 */
export function getStorageMethod(): StorageMethod {
  // Check if we previously set a storage method
  const stored = localStorage.getItem(STORAGE_METHOD_KEY);
  if (stored === 'cookie' || stored === 'localStorage') {
    return stored;
  }

  // Default to localStorage for client-side auth
  // In Phase 2, we'll add cookie detection from server
  return 'localStorage';
}

/**
 * Set storage method preference
 */
export function setStorageMethod(method: StorageMethod): void {
  localStorage.setItem(STORAGE_METHOD_KEY, method);
}

/**
 * Save tokens securely
 * @param tokens - Access and refresh tokens
 */
export async function saveTokens(tokens: TokenStorage): Promise<void> {
  const method = getStorageMethod();

  if (method === 'cookie') {
    // Cookies are handled server-side via Set-Cookie headers
    // This is a no-op for client-side, actual implementation in Phase 2
    // when we add server-side API route handlers
    console.debug('Token storage via cookies (server-side)');
    return;
  }

  // Fallback: Encrypted localStorage
  try {
    const encrypted = await encryptData(JSON.stringify(tokens));
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save tokens:', error);
    throw new Error('Token storage failed');
  }
}

/**
 * Retrieve tokens from storage
 * @returns Stored tokens or null
 */
export async function getTokens(): Promise<TokenStorage | null> {
  const method = getStorageMethod();

  if (method === 'cookie') {
    // Cookies are sent automatically with requests
    // For client-side access, we'll implement this in Phase 2
    // with a /api/auth/session endpoint
    console.debug('Token retrieval via cookies (server-side)');
    return null;
  }

  // Fallback: Encrypted localStorage
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return null;
    }

    const decrypted = await decryptData(encrypted);
    return JSON.parse(decrypted) as TokenStorage;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    // If decryption fails, clear invalid data
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Clear all tokens from storage
 */
export async function clearTokens(): Promise<void> {
  const method = getStorageMethod();

  if (method === 'cookie') {
    // Cookie clearing via server-side Set-Cookie with Max-Age=0
    // Implementation in Phase 2
    console.debug('Token clearing via cookies (server-side)');
  }

  // Always clear localStorage (belt and suspenders)
  localStorage.removeItem(STORAGE_KEY);
  clearEncryptionKey();
}

/**
 * Check if storage is available
 * @returns true if localStorage is accessible
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
