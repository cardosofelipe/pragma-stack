/**
 * Mock Admin Statistics Data
 *
 * Sample statistics for demo mode admin dashboard
 */

import type {
  AdminStatsResponse,
  UserGrowthData,
  OrgDistributionData,
  RegistrationActivityData,
  UserStatusData,
} from '@/lib/api/client';

/**
 * Generate user growth data for the last 30 days
 */
function generateUserGrowthData(): UserGrowthData[] {
  const data: UserGrowthData[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate growth with some randomness
    const baseTotal = 50 + Math.floor((29 - i) * 1.5);
    const baseActive = Math.floor(baseTotal * (0.7 + Math.random() * 0.2));

    data.push({
      date: date.toISOString().split('T')[0],
      total_users: baseTotal,
      active_users: baseActive,
    });
  }

  return data;
}

/**
 * Organization distribution data
 */
const orgDistribution: OrgDistributionData[] = [
  { name: 'Acme Corporation', value: 12 },
  { name: 'Tech Innovators', value: 8 },
  { name: 'Global Solutions Inc', value: 25 },
  { name: 'Startup Ventures', value: 5 },
  { name: 'Inactive Corp', value: 3 },
];

/**
 * Registration activity data (last 7 days)
 */
function generateRegistrationActivity(): RegistrationActivityData[] {
  const data: RegistrationActivityData[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate registration activity with some randomness
    const count = Math.floor(Math.random() * 5) + 1; // 1-5 registrations per day

    data.push({
      date: date.toISOString().split('T')[0],
      // @ts-ignore
      count,
    });
  }

  return data;
}

/**
 * User status distribution
 */
const userStatus: UserStatusData[] = [
  { name: 'Active', value: 89 },
  { name: 'Inactive', value: 11 },
];

/**
 * Complete admin stats response
 */
export const adminStats: AdminStatsResponse = {
  user_growth: generateUserGrowthData(),
  organization_distribution: orgDistribution,
  registration_activity: generateRegistrationActivity(),
  user_status: userStatus,
};
