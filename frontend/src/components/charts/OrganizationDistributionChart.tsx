/**
 * OrganizationDistributionChart Component
 * Displays organization member distribution using a bar chart
 */

'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './ChartCard';
import { CHART_PALETTES } from '@/lib/chart-colors';

export interface OrgDistributionData {
  name: string;
  value: number;
}

interface OrganizationDistributionChartProps {
  data?: OrgDistributionData[];
  loading?: boolean;
  error?: string | null;
}

// Custom tooltip with proper theme colors
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: OrgDistributionData; value: number }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'hsl(var(--popover) / 0.95)',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 2px 2px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p
          style={{
            color: 'hsl(var(--popover-foreground))',
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {payload[0].payload.name}
        </p>
        <p style={{ color: 'hsl(var(--muted-foreground))', margin: '4px 0 0 0', fontSize: '13px' }}>
          Members:{' '}
          <span style={{ fontWeight: 600, color: 'hsl(var(--popover-foreground))' }}>
            {payload[0].value}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function OrganizationDistributionChart({
  data,
  loading,
  error,
}: OrganizationDistributionChartProps) {
  // Show empty chart if no data available
  const rawData = data || [];
  const hasData = rawData.length > 0 && rawData.some((d) => d.value > 0);

  return (
    <ChartCard
      title="Organization Distribution"
      description="Member count by organization"
      loading={loading}
      error={error}
    >
      {!hasData && !loading && !error ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>No organization data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rawData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" style={{ stroke: 'var(--muted)', opacity: 0.2 }} />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }}
            />
            <YAxis style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill={CHART_PALETTES.bar[0]}
              radius={[4, 4, 0, 0]}
              activeBar={{ fill: CHART_PALETTES.bar[0] }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
