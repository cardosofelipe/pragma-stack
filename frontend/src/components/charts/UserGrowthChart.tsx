/**
 * UserGrowthChart Component
 * Displays user growth over time using a line chart
 */

'use client';

import { ChartCard } from './ChartCard';
import { CHART_PALETTES } from '@/lib/chart-colors';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface UserGrowthData {
  date: string;
  total_users: number;
  active_users: number;
}

export interface UserGrowthChartProps {
  data?: UserGrowthData[];
  loading?: boolean;
  error?: string | null;
}

// Custom tooltip with proper theme colors
// istanbul ignore next - recharts tooltip rendering is tested via e2e
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: UserGrowthData; value: number }>;
}

/* istanbul ignore next */
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px',
          padding: '8px 12px',
        }}
      >
        <p
          style={{
            color: 'hsl(var(--popover-foreground))',
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {payload[0].payload.date}
        </p>
        <p
          style={{ color: 'hsl(var(--popover-foreground))', margin: '4px 0 0 0', fontSize: '12px' }}
        >
          Total Users: {payload[0].value}
        </p>
        {payload[1] && (
          <p
            style={{
              color: 'hsl(var(--popover-foreground))',
              margin: '2px 0 0 0',
              fontSize: '12px',
            }}
          >
            Active Users: {payload[1].value}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function UserGrowthChart({ data, loading, error }: UserGrowthChartProps) {
  // Show empty chart if no data available
  const rawData = data || [];
  const hasData =
    rawData.length > 0 && rawData.some((d) => d.total_users > 0 || d.active_users > 0);

  return (
    <ChartCard
      title="User Growth"
      description="Total and active users over the last 30 days"
      loading={loading}
      error={error}
    >
      {!hasData && !loading && !error ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>No user growth data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={rawData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" style={{ stroke: 'var(--muted)', opacity: 0.2 }} />
            <XAxis dataKey="date" style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }} />
            <YAxis
              style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }}
              label={{
                value: 'Users',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'var(--muted-foreground)', textAnchor: 'middle' },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
            <Line
              type="monotone"
              dataKey="total_users"
              name="Total Users"
              stroke={CHART_PALETTES.line[0]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="active_users"
              name="Active Users"
              stroke={CHART_PALETTES.line[1]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
