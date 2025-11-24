import { apiClient } from './client';
import type { Options } from './generated/sdk.gen';

export interface UserGrowthData {
  date: string;
  total_users: number;
  active_users: number;
}

export interface OrgDistributionData {
  name: string;
  value: number;
}

export interface RegistrationActivityData {
  date: string;
  registrations: number;
}

export interface UserStatusData {
  name: string;
  value: number;
}

export interface AdminStatsResponse {
  user_growth: UserGrowthData[];
  organization_distribution: OrgDistributionData[];
  registration_activity: RegistrationActivityData[];
  user_status: UserStatusData[];
}

export type AdminStatsData = {
  body?: never;
  path?: never;
  query?: never;
  url: '/api/v1/admin/stats';
};

/**
 * Admin: Get Dashboard Stats
 *
 * Get aggregated statistics for the admin dashboard (admin only)
 */
export const getAdminStats = <ThrowOnError extends boolean = false>(
  options?: Options<AdminStatsData, ThrowOnError>
) => {
  return (options?.client ?? apiClient).get<AdminStatsResponse, unknown, ThrowOnError>({
    responseType: 'json',
    security: [
      {
        scheme: 'bearer',
        type: 'http',
      },
    ],
    url: '/api/v1/admin/stats',
    ...options,
  });
};
