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

export interface UserStatusData {
    name: string;
    value: number;
}

export interface AdminStatsResponse {
    user_growth: UserGrowthData[];
    organization_distribution: OrgDistributionData[];
    user_status: UserStatusData[];
}

/**
 * Admin: Get Dashboard Stats
 *
 * Get aggregated statistics for the admin dashboard (admin only)
 */
export const getAdminStats = <ThrowOnError extends boolean = false>(
    options?: Options<any, ThrowOnError>
) => {
    return (options?.client ?? apiClient).get<AdminStatsResponse, any, ThrowOnError>({
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
