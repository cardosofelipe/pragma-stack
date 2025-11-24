/**
 * MSW User Endpoint Handlers
 *
 * Handles user profile, organizations, and session management
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  UserResponse,
  UserUpdate,
  OrganizationResponse,
  SessionResponse,
  MessageResponse,
} from '@/lib/api/client';
import { currentUser, updateCurrentUser, sampleUsers } from '../data/users';
import { getUserOrganizations } from '../data/organizations';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const NETWORK_DELAY = 200;

// In-memory session store for demo
const mockSessions: SessionResponse[] = [
  {
    id: 'session-1',
    user_id: 'demo-user-id-1',
    device_name: 'Chrome on macOS',
    device_id: 'device-1',
    ip_address: '192.168.1.100',
    location_city: 'San Francisco',
    location_country: 'United States',
    last_used_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    is_active: true,
  },
  {
    id: 'session-2',
    user_id: 'demo-user-id-1',
    device_name: 'Safari on iPhone',
    device_id: 'device-2',
    ip_address: '192.168.1.101',
    location_city: 'San Francisco',
    location_country: 'United States',
    last_used_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
];

/**
 * Check if request is authenticated
 */
function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return Boolean(authHeader && authHeader.startsWith('Bearer '));
}

/**
 * User endpoint handlers
 */
export const userHandlers = [
  /**
   * GET /api/v1/users/me - Get current user profile
   */
  http.get(`${API_BASE_URL}/api/v1/users/me`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
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

    return HttpResponse.json(currentUser);
  }),

  /**
   * PATCH /api/v1/users/me - Update current user profile
   */
  http.patch(`${API_BASE_URL}/api/v1/users/me`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
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

    const body = (await request.json()) as UserUpdate;

    // Update user profile
    updateCurrentUser(body);

    return HttpResponse.json(currentUser);
  }),

  /**
   * DELETE /api/v1/users/me - Delete current user account
   */
  http.delete(`${API_BASE_URL}/api/v1/users/me`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        {
          detail: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    const response: MessageResponse = {
      success: true,
      message: 'Account deleted successfully',
    };

    return HttpResponse.json(response);
  }),

  /**
   * GET /api/v1/users/:id - Get user by ID (public profile)
   */
  http.get(`${API_BASE_URL}/api/v1/users/:id`, async ({ request, params }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        {
          detail: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    const { id } = params;
    const user = sampleUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json(
        {
          detail: 'User not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(user);
  }),

  /**
   * GET /api/v1/users - List users (paginated)
   */
  http.get(`${API_BASE_URL}/api/v1/users`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        {
          detail: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '20');

    // Simple pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedUsers = sampleUsers.slice(start, end);

    return HttpResponse.json({
      data: paginatedUsers,
      pagination: {
        total: sampleUsers.length,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(sampleUsers.length / pageSize),
        has_next: end < sampleUsers.length,
        has_prev: page > 1,
      },
    });
  }),

  /**
   * GET /api/v1/organizations/me - Get current user's organizations
   */
  http.get(`${API_BASE_URL}/api/v1/organizations/me`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        {
          detail: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    if (!currentUser) {
      return HttpResponse.json([], { status: 200 });
    }

    const organizations = getUserOrganizations(currentUser.id);
    return HttpResponse.json(organizations);
  }),

  /**
   * GET /api/v1/sessions - Get current user's sessions
   */
  http.get(`${API_BASE_URL}/api/v1/sessions`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        {
          detail: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    if (!currentUser) {
      return HttpResponse.json({ sessions: [] });
    }

    // Filter sessions for current user
    const userSessions = mockSessions.filter((s) => s.user_id === currentUser.id);

    return HttpResponse.json({
      sessions: userSessions,
    });
  }),

  /**
   * DELETE /api/v1/sessions/:id - Revoke a session
   */
  http.delete(`${API_BASE_URL}/api/v1/sessions/:id`, async ({ request, params }) => {
    await delay(NETWORK_DELAY);

    if (!isAuthenticated(request)) {
      return HttpResponse.json(
        {
          detail: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    const { id } = params;

    // Find session
    const sessionIndex = mockSessions.findIndex((s) => s.id === id);
    if (sessionIndex === -1) {
      return HttpResponse.json(
        {
          detail: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Remove session
    mockSessions.splice(sessionIndex, 1);

    const response: MessageResponse = {
      success: true,
      message: 'Session revoked successfully',
    };

    return HttpResponse.json(response);
  }),
];
