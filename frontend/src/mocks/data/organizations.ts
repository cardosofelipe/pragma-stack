/**
 * Mock Organization Data
 *
 * Sample organizations for demo mode, matching OpenAPI schemas
 */

import type { OrganizationResponse, OrganizationMemberResponse } from '@/lib/api/client';

/**
 * Sample organizations
 */
export const sampleOrganizations: OrganizationResponse[] = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    description: 'Leading provider of innovative solutions',
    is_active: true,
    settings: {
      theme: 'light',
      notifications: true,
    },
    member_count: 12,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'org-2',
    name: 'Tech Innovators',
    slug: 'tech-innovators',
    description: 'Pioneering the future of technology',
    is_active: true,
    settings: {
      theme: 'dark',
      notifications: false,
    },
    member_count: 8,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-03-10T14:30:00Z',
  },
  {
    id: 'org-3',
    name: 'Global Solutions Inc',
    slug: 'global-solutions',
    description: 'Worldwide consulting and services',
    is_active: true,
    settings: {},
    member_count: 25,
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2024-01-20T09:00:00Z',
  },
  {
    id: 'org-4',
    name: 'Startup Ventures',
    slug: 'startup-ventures',
    description: 'Fast-growing startup company',
    is_active: true,
    settings: {
      theme: 'auto',
    },
    member_count: 5,
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-03-20T11:00:00Z',
  },
  {
    id: 'org-5',
    name: 'Inactive Corp',
    slug: 'inactive-corp',
    description: 'Suspended organization',
    is_active: false,
    settings: {},
    member_count: 3,
    created_at: '2023-11-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
  },
];

/**
 * Sample organization members
 * Maps organization ID to its members
 */
export const organizationMembers: Record<string, OrganizationMemberResponse[]> = {
  'org-1': [
    {
      // @ts-ignore
      id: 'member-1',
      user_id: 'demo-user-id-1',
      user_email: 'demo@example.com',
      user_first_name: 'Demo',
      user_last_name: 'User',
      role: 'member',
      joined_at: '2024-01-15T10:00:00Z',
    },
    {
      // @ts-ignore
      id: 'member-2',
      user_id: 'demo-admin-id-1',
      user_email: 'admin@example.com',
      user_first_name: 'Admin',
      user_last_name: 'Demo',
      role: 'owner',
      joined_at: '2024-01-01T00:00:00Z',
    },
    {
      // @ts-ignore
      id: 'member-3',
      user_id: 'user-3',
      user_email: 'john.doe@example.com',
      user_first_name: 'John',
      user_last_name: 'Doe',
      role: 'admin',
      joined_at: '2024-02-01T12:00:00Z',
    },
  ],
  'org-2': [
    {
      // @ts-ignore
      id: 'member-4',
      user_id: 'demo-user-id-1',
      user_email: 'demo@example.com',
      user_first_name: 'Demo',
      user_last_name: 'User',
      role: 'owner',
      joined_at: '2024-02-01T00:00:00Z',
    },
    {
      // @ts-ignore
      id: 'member-5',
      user_id: 'user-4',
      user_email: 'jane.smith@example.com',
      user_first_name: 'Jane',
      user_last_name: 'Smith',
      role: 'member',
      joined_at: '2024-03-10T08:30:00Z',
    },
  ],
  'org-3': [
    {
      // @ts-ignore
      id: 'member-6',
      user_id: 'user-4',
      user_email: 'jane.smith@example.com',
      user_first_name: 'Jane',
      user_last_name: 'Smith',
      role: 'owner',
      joined_at: '2023-12-01T00:00:00Z',
    },
  ],
};

/**
 * Get organizations for a specific user
 */
export function getUserOrganizations(userId: string): OrganizationResponse[] {
  return sampleOrganizations.filter((org) => {
    const members = organizationMembers[org.id] || [];
    return members.some((m) => m.user_id === userId);
  });
}

/**
 * Get members for a specific organization
 */
export function getOrganizationMembersList(orgId: string): OrganizationMemberResponse[] {
  return organizationMembers[orgId] || [];
}
