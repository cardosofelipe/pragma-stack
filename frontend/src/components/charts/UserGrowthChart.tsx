/**
 * UserGrowthChart Component
 * Displays user growth over time using a line chart
 */

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartCard } from './ChartCard';
import { format, subDays } from 'date-fns';

export interface UserGrowthData {
  date: string;
  totalUsers: number;
  activeUsers: number;
}

interface UserGrowthChartProps {
  data?: UserGrowthData[];
  loading?: boolean;
  error?: string | null;
}

// Generate mock data for development/demo
function generateMockData(): UserGrowthData[] {
  const data: UserGrowthData[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    const baseUsers = 100 + i * 3;
    data.push({
      date: format(date, 'MMM d'),
      totalUsers: baseUsers + Math.floor(Math.random() * 10),
      activeUsers: Math.floor(baseUsers * 0.8) + Math.floor(Math.random() * 5),
    });
  }

  return data;
}

export function UserGrowthChart({ data, loading, error }: UserGrowthChartProps) {
  const chartData = data || generateMockData();

  return (
    <ChartCard
      title="User Growth"
      description="Total and active users over the last 30 days"
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
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
          <Line
            type="monotone"
            dataKey="totalUsers"
            name="Total Users"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="activeUsers"
            name="Active Users"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
