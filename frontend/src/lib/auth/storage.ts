/**
 * Secure token storage abstraction
 * Primary: httpOnly cookies (server-side)
 * Fallback: Encrypted localStorage (client-side)
 * SSR-safe: All browser APIs guarded
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
 * Check if localStorage is available (browser only)
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current storage method
 * SSR-safe: Returns 'localStorage' as default (actual check happens client-side)
 */
export function getStorageMethod(): StorageMethod {
  if (!isLocalStorageAvailable()) {
    return 'localStorage'; // Default, will be checked again client-side
  }

  try {
    // Check if we previously set a storage method
    const stored = localStorage.getItem(STORAGE_METHOD_KEY);
    if (stored === 'cookie' || stored === 'localStorage') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to get storage method:', error);
  }

  // Default to localStorage for client-side auth
  // In Phase 2, we'll add cookie detection from server
  return 'localStorage';
}

/**
 * Set storage method preference
 * SSR-safe: No-op if localStorage not available
 */
export function setStorageMethod(method: StorageMethod): void {
  if (!isLocalStorageAvailable()) {
    console.warn('Cannot set storage method: localStorage not available');
    return;
  }

  try {
    localStorage.setItem(STORAGE_METHOD_KEY, method);
  } catch (error) {
    console.error('Failed to set storage method:', error);
  }
}

/**
 * Save tokens securely
 * @param tokens - Access and refresh tokens
 * @throws Error if storage fails
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
  if (!isLocalStorageAvailable()) {
    throw new Error('localStorage not available - cannot save tokens');
  }

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
 * SSR-safe: Returns null if localStorage not available
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
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return null;
    }

    const decrypted = await decryptData(encrypted);
    const parsed = JSON.parse(decrypted);

    // Validate structure - must have required fields
    if (!parsed || typeof parsed !== 'object' ||
        !('accessToken' in parsed) || !('refreshToken' in parsed) ||
        (parsed.accessToken !== null && typeof parsed.accessToken !== 'string') ||
        (parsed.refreshToken !== null && typeof parsed.refreshToken !== 'string')) {
      throw new Error('Invalid token structure');
    }

    return parsed as TokenStorage;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    // If decryption fails, clear invalid data
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return null;
  }
}

/**
 * Clear all tokens from storage
 * SSR-safe: No-op if localStorage not available
 */
export async function clearTokens(): Promise<void> {
  const method = getStorageMethod();

  if (method === 'cookie') {
    // Cookie clearing via server-side Set-Cookie with Max-Age=0
    // Implementation in Phase 2
    console.debug('Token clearing via cookies (server-side)');
  }

  // Always clear localStorage (belt and suspenders)
  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear tokens from localStorage:', error);
    }
  }

  // Clear encryption key
  clearEncryptionKey();
}

/**
 * Check if storage is available
 * @returns true if localStorage is accessible
 * SSR-safe: Returns false on server
 */
export function isStorageAvailable(): boolean {
  return isLocalStorageAvailable();
}
