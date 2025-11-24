/**
 * MSW Admin Endpoint Handlers
 *
 * Handles admin dashboard, user management, org management
 * Only accessible to superusers (is_superuser = true)
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  UserResponse,
  OrganizationResponse,
  UserCreate,
  UserUpdate,
  OrganizationCreate,
  OrganizationUpdate,
  AdminStatsResponse,
  BulkUserAction,
  BulkActionResult,
} from '@/lib/api/client';
import { currentUser, sampleUsers } from '../data/users';
import { sampleOrganizations, getOrganizationMembersList } from '../data/organizations';
import { adminStats } from '../data/stats';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const NETWORK_DELAY = 200;

/**
 * Check if request is from a superuser
 */
function isSuperuser(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  return currentUser?.is_superuser === true;
}

/**
 * Admin endpoint handlers
 */
export const adminHandlers = [
  /**
   * GET /api/v1/admin/stats - Get dashboard statistics
   */
  http.get(`${API_BASE_URL}/api/v1/admin/stats`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    return HttpResponse.json(adminStats);
  }),

  /**
   * GET /api/v1/admin/users - List all users (paginated)
   */
  http.get(`${API_BASE_URL}/api/v1/admin/users`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '50');
    const search = url.searchParams.get('search') || '';
    const isActive = url.searchParams.get('is_active');

    // Filter users
    let filteredUsers = [...sampleUsers];

    if (search) {
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.first_name.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      filteredUsers = filteredUsers.filter((u) => u.is_active === activeFilter);
    }

    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedUsers = filteredUsers.slice(start, end);

    return HttpResponse.json({
      data: paginatedUsers,
      pagination: {
        total: filteredUsers.length,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(filteredUsers.length / pageSize),
        has_next: end < filteredUsers.length,
        has_prev: page > 1,
      },
    });
  }),

  /**
   * GET /api/v1/admin/users/:id - Get user by ID
   */
  http.get(`${API_BASE_URL}/api/v1/admin/users/:id`, async ({ request, params }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
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
   * POST /api/v1/admin/users - Create new user
   */
  http.post(`${API_BASE_URL}/api/v1/admin/users`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UserCreate;

    // Check if email exists
    if (sampleUsers.some((u) => u.email === body.email)) {
      return HttpResponse.json(
        {
          detail: 'User with this email already exists',
        },
        { status: 400 }
      );
    }

    // Create user (in-memory, will be lost on reload)
    const newUser: UserResponse = {
      id: `user-new-${Date.now()}`,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name || null,
      phone_number: body.phone_number || null,
      is_active: body.is_active !== false,
      is_superuser: body.is_superuser === true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: null,
      organization_count: 0,
    };

    sampleUsers.push(newUser);

    return HttpResponse.json(newUser, { status: 201 });
  }),

  /**
   * PATCH /api/v1/admin/users/:id - Update user
   */
  http.patch(`${API_BASE_URL}/api/v1/admin/users/:id`, async ({ request, params }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const { id } = params;
    const userIndex = sampleUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return HttpResponse.json(
        {
          detail: 'User not found',
        },
        { status: 404 }
      );
    }

    const body = (await request.json()) as UserUpdate;

    // Update user
    sampleUsers[userIndex] = {
      ...sampleUsers[userIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(sampleUsers[userIndex]);
  }),

  /**
   * DELETE /api/v1/admin/users/:id - Delete user
   */
  http.delete(`${API_BASE_URL}/api/v1/admin/users/:id`, async ({ request, params }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const { id } = params;
    const userIndex = sampleUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return HttpResponse.json(
        {
          detail: 'User not found',
        },
        { status: 404 }
      );
    }

    sampleUsers.splice(userIndex, 1);

    return HttpResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  }),

  /**
   * POST /api/v1/admin/users/bulk - Bulk user action
   */
  http.post(`${API_BASE_URL}/api/v1/admin/users/bulk`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as BulkUserAction;
    const { action, user_ids } = body;

    let affected = 0;
    let failed = 0;

    for (const userId of user_ids) {
      const userIndex = sampleUsers.findIndex((u) => u.id === userId);
      if (userIndex !== -1) {
        switch (action) {
          case 'activate':
            sampleUsers[userIndex].is_active = true;
            affected++;
            break;
          case 'deactivate':
            sampleUsers[userIndex].is_active = false;
            affected++;
            break;
          case 'delete':
            sampleUsers.splice(userIndex, 1);
            affected++;
            break;
        }
      } else {
        failed++;
      }
    }

    const result: BulkActionResult = {
      success: failed === 0,
      affected_count: affected,
      failed_count: failed,
      message: `${action} completed: ${affected} users affected`,
      failed_ids: [],
    };

    return HttpResponse.json(result);
  }),

  /**
   * GET /api/v1/admin/organizations - List all organizations (paginated)
   */
  http.get(`${API_BASE_URL}/api/v1/admin/organizations`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '50');
    const search = url.searchParams.get('search') || '';

    // Filter organizations
    let filteredOrgs = [...sampleOrganizations];

    if (search) {
      filteredOrgs = filteredOrgs.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.slug.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Paginate
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedOrgs = filteredOrgs.slice(start, end);

    return HttpResponse.json({
      data: paginatedOrgs,
      pagination: {
        total: filteredOrgs.length,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(filteredOrgs.length / pageSize),
        has_next: end < filteredOrgs.length,
        has_prev: page > 1,
      },
    });
  }),

  /**
   * GET /api/v1/admin/organizations/:id - Get organization by ID
   */
  http.get(`${API_BASE_URL}/api/v1/admin/organizations/:id`, async ({ request, params }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    const { id } = params;
    const org = sampleOrganizations.find((o) => o.id === id);

    if (!org) {
      return HttpResponse.json(
        {
          detail: 'Organization not found',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(org);
  }),

  /**
   * GET /api/v1/admin/organizations/:id/members - Get organization members
   */
  http.get(
    `${API_BASE_URL}/api/v1/admin/organizations/:id/members`,
    async ({ request, params }) => {
      await delay(NETWORK_DELAY);

      if (!isSuperuser(request)) {
        return HttpResponse.json(
          {
            detail: 'Admin access required',
          },
          { status: 403 }
        );
      }

      const { id } = params as { id: string };
      const members = getOrganizationMembersList(id);

      // Parse pagination params
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '20');

      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedMembers = members.slice(start, end);

      return HttpResponse.json({
        data: paginatedMembers,
        pagination: {
          total: members.length,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(members.length / pageSize),
          has_next: end < members.length,
          has_prev: page > 1,
        },
      });
    }
  ),

  /**
   * GET /api/v1/admin/sessions - Get all sessions (admin view)
   */
  http.get(`${API_BASE_URL}/api/v1/admin/sessions`, async ({ request }) => {
    await delay(NETWORK_DELAY);

    if (!isSuperuser(request)) {
      return HttpResponse.json(
        {
          detail: 'Admin access required',
        },
        { status: 403 }
      );
    }

    // Mock session data
    const sessions = [
      {
        id: 'session-1',
        user_id: 'demo-user-id-1',
        user_email: 'demo@example.com',
        user_full_name: 'Demo User',
        device_name: 'Chrome on macOS',
        device_id: 'device-1',
        ip_address: '192.168.1.100',
        location_city: 'San Francisco',
        location_country: 'United States',
        last_used_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
    ];

    return HttpResponse.json({
      data: sessions,
      pagination: {
        total: sessions.length,
        page: 1,
        page_size: 100,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      },
    });
  }),
];
