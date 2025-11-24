/**
 * MSW Handler Overrides
 *
 * Custom handlers that override or extend auto-generated ones.
 * Use this file for complex logic that can't be auto-generated.
 *
 * Examples:
 * - Complex validation logic
 * - Stateful interactions
 * - Error simulation scenarios
 * - Special edge cases
 */

import { http, HttpResponse, delay } from 'msw';
import { generateMockToken } from '../utils/tokens';
import { validateCredentials, setCurrentUser, currentUser } from '../data/users';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const NETWORK_DELAY = 300; // ms - simulate realistic network delay

/**
 * Custom handler overrides
 *
 * These handlers take precedence over generated ones.
 * Add custom implementations here as needed.
 */
export const overrideHandlers = [
  /**
   * Login Override
   * Custom handler to return proper JWT tokens and user data
   */
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    const body = (await request.json()) as any;
    const user = validateCredentials(body.email, body.password);

    if (!user) {
      return HttpResponse.json({ detail: 'Incorrect email or password' }, { status: 401 });
    }

    setCurrentUser(user);

    return HttpResponse.json({
      access_token: generateMockToken('access', user.id),
      refresh_token: generateMockToken('refresh', user.id),
      token_type: 'bearer',
      expires_in: 900,
      user: user,
    });
  }),

  /**
   * Register Override
   * Custom handler to return proper JWT tokens and user data
   */
  http.post(`${API_BASE_URL}/api/v1/auth/register`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    const body = (await request.json()) as any;

    const newUser = {
      id: `new-user-${Date.now()}`,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name || null,
      phone_number: body.phone_number || null,
      is_active: true,
      is_superuser: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: null,
      organization_count: 0,
    };

    setCurrentUser(newUser);

    return HttpResponse.json({
      user: newUser,
      access_token: generateMockToken('access', newUser.id),
      refresh_token: generateMockToken('refresh', newUser.id),
      token_type: 'bearer',
      expires_in: 900,
    });
  }),

  /**
   * Refresh Token Override
   * Custom handler to return proper JWT tokens
   */
  http.post(`${API_BASE_URL}/api/v1/auth/refresh`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    // Use current user's ID if available, otherwise generate a generic token
    const userId = currentUser?.id || 'refreshed-user';

    return HttpResponse.json({
      access_token: generateMockToken('access', userId),
      refresh_token: generateMockToken('refresh', userId),
      token_type: 'bearer',
      expires_in: 900,
    });
  }),
];
