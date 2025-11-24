/**
 * RegistrationActivityChart Component
 * Displays user registration activity over time using an area chart
 */

'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_PALETTES } from '@/lib/chart-colors';

export interface RegistrationActivityData {
  date: string;
  registrations: number;
}

interface RegistrationActivityChartProps {
  data?: RegistrationActivityData[];
  loading?: boolean;
  error?: string | null;
}

// Custom tooltip with proper theme colors
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RegistrationActivityData; value: number }>;
}

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
          New Registrations: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function RegistrationActivityChart({
  data,
  loading,
  error,
}: RegistrationActivityChartProps) {
  // Show empty chart if no data available
  const chartData = data || [];
  const hasData = chartData.length > 0 && chartData.some((d) => d.registrations > 0);

  return (
    <ChartCard
      title="User Registration Activity"
      description="New user registrations over the last 14 days"
      loading={loading}
      error={error}
    >
      {!hasData && !loading && !error ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>No registration data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PALETTES.area[0]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_PALETTES.area[0]} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" style={{ stroke: 'var(--muted)', opacity: 0.2 }} />
            <XAxis dataKey="date" style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }} />
            <YAxis style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
            <Area
              type="monotone"
              dataKey="registrations"
              name="New Registrations"
              stroke={CHART_PALETTES.area[0]}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRegistrations)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
