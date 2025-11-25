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
import config from '@/config/app.config';

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

  /**
   * OAuth Providers Override
   * Returns list of available OAuth providers for demo mode
   */
  http.get(`${API_BASE_URL}/api/v1/oauth/providers`, async () => {
    await delay(NETWORK_DELAY);

    return HttpResponse.json({
      enabled: true,
      providers: [
        { provider: 'google', name: 'Google' },
        { provider: 'github', name: 'GitHub' },
      ],
    });
  }),

  /**
   * OAuth Authorization URL Override
   * Returns mock authorization URL (in demo mode, this won't actually redirect)
   */
  http.get(`${API_BASE_URL}/api/v1/oauth/authorize/:provider`, async ({ params }) => {
    await delay(NETWORK_DELAY);

    const { provider } = params;

    // In demo mode, we return a mock URL that will show a demo message
    return HttpResponse.json({
      authorization_url: `${config.app.url}/en/login?demo_oauth=${provider}`,
      state: `demo-state-${Date.now()}`,
    });
  }),

  /**
   * OAuth Callback Override
   * Handles mock OAuth callback in demo mode
   */
  http.post(`${API_BASE_URL}/api/v1/oauth/callback/:provider`, async ({ params }) => {
    await delay(NETWORK_DELAY);

    const { provider } = params;

    // Create a demo user based on the provider
    const demoOAuthUser = {
      id: `oauth-demo-${Date.now()}`,
      email: `demo.${provider}@example.com`,
      first_name: 'Demo',
      last_name: `${provider === 'google' ? 'Google' : 'GitHub'} User`,
      phone_number: null,
      is_active: true,
      is_superuser: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      organization_count: 0,
    };

    setCurrentUser(demoOAuthUser);

    return HttpResponse.json({
      access_token: generateMockToken('access', demoOAuthUser.id),
      refresh_token: generateMockToken('refresh', demoOAuthUser.id),
      token_type: 'bearer',
      expires_in: 900,
      is_new_user: true,
    });
  }),

  /**
   * OAuth Accounts Override
   * Returns linked OAuth accounts for the current user
   */
  http.get(`${API_BASE_URL}/api/v1/oauth/accounts`, async () => {
    await delay(NETWORK_DELAY);

    // In demo mode, return empty accounts (user can "link" them)
    return HttpResponse.json({
      accounts: [],
    });
  }),
];
