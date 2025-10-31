/**
 * Configure the generated API client
 * Integrates @hey-api/openapi-ts client with our auth logic
 *
 * This file wraps the auto-generated client without modifying generated code
 * Note: @hey-api client doesn't support axios-style interceptors
 * We configure it to work with existing manual client.ts for now
 */

import { client } from './generated/client.gen';
import config from '@/config/app.config';

/**
 * Configure generated client with base URL
 * Auth token injection handled via fetch interceptor pattern
 */
export function configureApiClient() {
  client.setConfig({
    baseURL: config.api.url,
  });
}

// Configure client on module load
configureApiClient();

// Re-export configured client for use in hooks
export { client as generatedClient };

// Re-export all SDK functions
export * from './generated/sdk.gen';

// Re-export types
export type * from './generated/types.gen';

// Also export manual client for backward compatibility
export { apiClient } from './client';
