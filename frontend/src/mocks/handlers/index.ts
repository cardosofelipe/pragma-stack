/**
 * MSW Handlers Index
 *
 * Exports all request handlers for Mock Service Worker
 * Organized by domain: auth, users, admin
 */

import { authHandlers } from './auth';
import { userHandlers } from './users';
import { adminHandlers } from './admin';

/**
 * All request handlers for MSW
 * Order matters: more specific handlers should come first
 */
export const handlers = [...authHandlers, ...userHandlers, ...adminHandlers];
