/**
 * MSW Auth Endpoint Handlers
 *
 * Mirrors backend auth endpoints for demo mode
 * Consistent with E2E test mocks in e2e/helpers/auth.ts
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  LoginRequest,
  TokenResponse,
  UserCreate,
  RegisterResponse,
  RefreshTokenRequest,
  LogoutRequest,
  MessageResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
} from '@/lib/api/client';
import {
  validateCredentials,
  setCurrentUser,
  currentUser,
  demoUser,
  demoAdmin,
  sampleUsers,
} from '../data/users';

// API base URL (same as app config)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Simulate network delay (realistic UX)
const NETWORK_DELAY = 300;

// In-memory session store (resets on page reload, which is fine for demo)
let activeTokens = new Set<string>();

/**
 * Auth endpoint handlers
 */
export const authHandlers = [
  /**
   * POST /api/v1/auth/register - Register new user
   */
  http.post(`${API_BASE_URL}/api/v1/auth/register`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    const body = (await request.json()) as UserCreate;

    // Validate required fields
    if (!body.email || !body.password || !body.first_name) {
      return HttpResponse.json(
        {
          detail: 'Missing required fields',
        },
        { status: 422 }
      );
    }

    // Check if email already exists
    const existingUser = sampleUsers.find((u) => u.email === body.email);
    if (existingUser) {
      return HttpResponse.json(
        {
          detail: 'User with this email already exists',
        },
        { status: 400 }
      );
    }

    // Create new user (in real app, this would be persisted)
    const newUser: RegisterResponse['user'] = {
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

    // Generate tokens
    const accessToken = `demo-access-${Date.now()}`;
    const refreshToken = `demo-refresh-${Date.now()}`;
    activeTokens.add(accessToken);
    activeTokens.add(refreshToken);

    // Set as current user
    setCurrentUser(newUser);

    const response: RegisterResponse = {
      user: newUser,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 900, // 15 minutes
    };

    return HttpResponse.json(response);
  }),

  /**
   * POST /api/v1/auth/login - Login with email and password
   */
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    const body = (await request.json()) as LoginRequest;

    // Validate credentials
    const user = validateCredentials(body.email, body.password);

    if (!user) {
      return HttpResponse.json(
        {
          detail: 'Incorrect email or password',
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return HttpResponse.json(
        {
          detail: 'Account is deactivated',
        },
        { status: 403 }
      );
    }

    // Generate tokens
    const accessToken = `demo-access-${user.id}-${Date.now()}`;
    const refreshToken = `demo-refresh-${user.id}-${Date.now()}`;
    activeTokens.add(accessToken);
    activeTokens.add(refreshToken);

    // Update last login
    const updatedUser = {
      ...user,
      last_login: new Date().toISOString(),
    };
    setCurrentUser(updatedUser);

    const response: TokenResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 900, // 15 minutes
    };

    return HttpResponse.json(response);
  }),

  /**
   * POST /api/v1/auth/refresh - Refresh access token
   */
  http.post(`${API_BASE_URL}/api/v1/auth/refresh`, async ({ request }) => {
    await delay(100); // Fast refresh

    const body = (await request.json()) as RefreshTokenRequest;

    // Validate refresh token
    if (!body.refresh_token || !activeTokens.has(body.refresh_token)) {
      return HttpResponse.json(
        {
          detail: 'Invalid or expired refresh token',
        },
        { status: 401 }
      );
    }

    // Generate new tokens
    const newAccessToken = `demo-access-refreshed-${Date.now()}`;
    const newRefreshToken = `demo-refresh-refreshed-${Date.now()}`;

    // Remove old tokens, add new ones
    activeTokens.delete(body.refresh_token);
    activeTokens.add(newAccessToken);
    activeTokens.add(newRefreshToken);

    const response: TokenResponse = {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer',
      expires_in: 900,
    };

    return HttpResponse.json(response);
  }),

  /**
   * POST /api/v1/auth/logout - Logout (revoke tokens)
   */
  http.post(`${API_BASE_URL}/api/v1/auth/logout`, async ({ request }) => {
    await delay(100);

    const body = (await request.json()) as LogoutRequest;

    // Remove token from active set
    if (body.refresh_token) {
      activeTokens.delete(body.refresh_token);
    }

    // Clear current user
    setCurrentUser(null);

    const response: MessageResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    return HttpResponse.json(response);
  }),

  /**
   * POST /api/v1/auth/logout-all - Logout from all devices
   */
  http.post(`${API_BASE_URL}/api/v1/auth/logout-all`, async () => {
    await delay(100);

    // Clear all tokens
    activeTokens.clear();
    setCurrentUser(null);

    const response: MessageResponse = {
      success: true,
      message: 'Logged out from all devices',
    };

    return HttpResponse.json(response);
  }),

  /**
   * POST /api/v1/auth/password-reset - Request password reset
   */
  http.post(`${API_BASE_URL}/api/v1/auth/password-reset`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    const body = (await request.json()) as PasswordResetRequest;

    // In demo mode, always return success (don't reveal if email exists)
    const response: MessageResponse = {
      success: true,
      message: 'If an account exists with that email, you will receive a password reset link.',
    };

    return HttpResponse.json(response);
  }),

  /**
   * POST /api/v1/auth/password-reset/confirm - Confirm password reset
   */
  http.post(`${API_BASE_URL}/api/v1/auth/password-reset/confirm`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    const body = (await request.json()) as PasswordResetConfirm;

    // Validate token (in demo, accept any token that looks valid)
    if (!body.token || body.token.length < 10) {
      return HttpResponse.json(
        {
          detail: 'Invalid or expired reset token',
        },
        { status: 400 }
      );
    }

    // Validate password requirements
    if (!body.new_password || body.new_password.length < 8) {
      return HttpResponse.json(
        {
          detail: 'Password must be at least 8 characters',
        },
        { status: 422 }
      );
    }

    const response: MessageResponse = {
      success: true,
      message: 'Password reset successfully',
    };

    return HttpResponse.json(response);
  }),

  /**
   * POST /api/v1/auth/change-password - Change password (authenticated)
   */
  http.post(`${API_BASE_URL}/api/v1/auth/change-password`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    // Check if user is authenticated
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          detail: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    if (!currentUser) {
      return HttpResponse.json(
        {
          detail: 'User not found',
        },
        { status: 404 }
      );
    }

    const response: MessageResponse = {
      success: true,
      message: 'Password changed successfully',
    };

    return HttpResponse.json(response);
  }),
];
