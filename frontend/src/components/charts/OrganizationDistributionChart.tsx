/**
 * OrganizationDistributionChart Component
 * Displays organization member distribution using a bar chart
 */

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCard } from './ChartCard';

export interface OrganizationDistributionData {
  name: string;
  members: number;
  activeMembers: number;
}

interface OrganizationDistributionChartProps {
  data?: OrganizationDistributionData[];
  loading?: boolean;
  error?: string | null;
}

// Generate mock data for development/demo
function generateMockData(): OrganizationDistributionData[] {
  return [
    { name: 'Engineering', members: 45, activeMembers: 42 },
    { name: 'Marketing', members: 28, activeMembers: 25 },
    { name: 'Sales', members: 35, activeMembers: 33 },
    { name: 'Operations', members: 22, activeMembers: 20 },
    { name: 'HR', members: 15, activeMembers: 14 },
    { name: 'Finance', members: 18, activeMembers: 17 },
  ];
}

export function OrganizationDistributionChart({
  data,
  loading,
  error,
}: OrganizationDistributionChartProps) {
  const chartData = data || generateMockData();

  return (
    <ChartCard
      title="Organization Distribution"
      description="Member count by organization"
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
          />
          <Bar
            dataKey="members"
            name="Total Members"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="activeMembers"
            name="Active Members"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
