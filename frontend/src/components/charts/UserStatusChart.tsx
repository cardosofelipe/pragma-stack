/**
 * UserStatusChart Component
 * Displays user status distribution using a pie chart
 */

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_PALETTES } from '@/lib/chart-colors';

export interface UserStatusData {
  name: string;
  value: number;
  color?: string;
}

interface UserStatusChartProps {
  data?: UserStatusData[];
  loading?: boolean;
  error?: string | null;
}

// Custom label component to show percentages
const renderLabel = (entry: { percent: number; name: string }) => {
  const percent = (entry.percent * 100).toFixed(0);
  return `${entry.name}: ${percent}%`;
};

export function UserStatusChart({ data, loading, error }: UserStatusChartProps) {
  // Show empty chart if no data available
  const rawData = data || [];
  const hasData = rawData.length > 0 && rawData.some((d) => d.value > 0);

  // Assign colors if missing
  const chartData = rawData.map((item, index) => ({
    ...item,
    color: item.color || CHART_PALETTES.pie[index % CHART_PALETTES.pie.length],
  }));

  return (
    <ChartCard
      title="User Status Distribution"
      description="Breakdown of users by status"
      loading={loading}
      error={error}
    >
      {!hasData && !loading && !error ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>No user status data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
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
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{
                paddingTop: '20px',
                color: 'hsl(var(--foreground))',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
