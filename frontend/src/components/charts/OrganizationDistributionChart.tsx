/**
 * OrganizationDistributionChart Component
 * Displays organization member distribution using a bar chart
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_PALETTES } from '@/lib/chart-colors';

export interface OrganizationDistributionData {
  name: string;
  value: number;
}

interface OrganizationDistributionChartProps {
  data?: OrganizationDistributionData[];
  loading?: boolean;
  error?: string | null;
}

// Generate mock data for development/demo
function generateMockData(): OrganizationDistributionData[] {
  return [
    { name: 'Engineering', value: 45 },
    { name: 'Marketing', value: 28 },
    { name: 'Sales', value: 35 },
    { name: 'Operations', value: 22 },
    { name: 'HR', value: 15 },
    { name: 'Finance', value: 18 },
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
            stroke="hsl(var(--border))"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            stroke="hsl(var(--border))"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              color: 'hsl(var(--popover-foreground))',
            }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
          />
          <Bar
            dataKey="value"
            name="Total Members"
            fill={CHART_PALETTES.bar[0]}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
