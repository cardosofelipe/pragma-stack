/**
 * Mock User Data
 *
 * Sample users for demo mode, matching OpenAPI UserResponse schema
 */

import type { UserResponse } from '@/lib/api/client';

/**
 * Demo user (regular user)
 * Credentials: demo@example.com / DemoPass123
 */
export const demoUser: UserResponse = {
  id: 'demo-user-id-1',
  email: 'demo@example.com',
  first_name: 'Demo',
  last_name: 'User',
  phone_number: null,
  is_active: true,
  is_superuser: false,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-20T15:30:00Z',
  last_login: '2025-01-24T08:00:00Z',
  organization_count: 2,
};

/**
 * Demo admin user (superuser)
 * Credentials: admin@example.com / AdminPass123
 */
export const demoAdmin: UserResponse = {
  id: 'demo-admin-id-1',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'Demo',
  phone_number: '+1-555-0100',
  is_active: true,
  is_superuser: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-24T10:00:00Z',
  last_login: '2025-01-24T09:00:00Z',
  organization_count: 1,
};

/**
 * Additional sample users for admin panel
 */
export const sampleUsers: UserResponse[] = [
  demoUser,
  demoAdmin,
  {
    id: 'user-3',
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '+1-555-0101',
    is_active: true,
    is_superuser: false,
    created_at: '2024-02-01T12:00:00Z',
    updated_at: '2024-02-05T14:30:00Z',
    last_login: '2025-01-23T16:45:00Z',
    organization_count: 1,
  },
  {
    id: 'user-4',
    email: 'jane.smith@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    phone_number: null,
    is_active: true,
    is_superuser: false,
    created_at: '2024-03-10T08:30:00Z',
    updated_at: '2024-03-15T11:00:00Z',
    last_login: '2025-01-22T10:20:00Z',
    organization_count: 3,
  },
  {
    id: 'user-5',
    email: 'inactive@example.com',
    first_name: 'Inactive',
    last_name: 'User',
    phone_number: null,
    is_active: false,
    is_superuser: false,
    created_at: '2024-01-20T14:00:00Z',
    updated_at: '2024-06-01T09:00:00Z',
    last_login: '2024-06-01T09:00:00Z',
    organization_count: 0,
  },
];

/**
 * In-memory store for current user state
 * This simulates session state and allows profile updates
 */
export let currentUser: UserResponse | null = null;

/**
 * Set the current logged-in user
 */
export function setCurrentUser(user: UserResponse | null) {
  currentUser = user;
}

/**
 * Update current user profile
 */
export function updateCurrentUser(updates: Partial<UserResponse>) {
  if (currentUser) {
    currentUser = {
      ...currentUser,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Validate demo credentials
 */
export function validateCredentials(email: string, password: string): UserResponse | null {
  // Demo user
  if (email === 'demo@example.com' && password === 'DemoPass123') {
    return demoUser;
  }

  // Demo admin
  if (email === 'admin@example.com' && password === 'AdminPass123') {
    return demoAdmin;
  }

  // Sample users (generic password for demo)
  const user = sampleUsers.find((u) => u.email === email);
  if (user && password === 'DemoPass123') {
    return user;
  }

  return null;
}
