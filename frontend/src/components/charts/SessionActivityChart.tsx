/**
 * SessionActivityChart Component
 * Displays session activity over time using an area chart
 */

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { format, subDays } from 'date-fns';
import { CHART_PALETTES } from '@/lib/chart-colors';

export interface SessionActivityData {
  date: string;
  activeSessions: number;
  newSessions: number;
}

interface SessionActivityChartProps {
  data?: SessionActivityData[];
  loading?: boolean;
  error?: string | null;
}

// Generate mock data for development/demo
function generateMockData(): SessionActivityData[] {
  const data: SessionActivityData[] = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = subDays(today, i);
    data.push({
      date: format(date, 'MMM d'),
      activeSessions: 30 + Math.floor(Math.random() * 20),
      newSessions: 5 + Math.floor(Math.random() * 10),
    });
  }

  return data;
}

export function SessionActivityChart({ data, loading, error }: SessionActivityChartProps) {
  const chartData = data || generateMockData();

  return (
    <ChartCard
      title="Session Activity"
      description="Active and new sessions over the last 14 days"
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_PALETTES.area[0]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_PALETTES.area[0]} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_PALETTES.area[1]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_PALETTES.area[1]} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
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
          <Area
            type="monotone"
            dataKey="activeSessions"
            name="Active Sessions"
            stroke={CHART_PALETTES.area[0]}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorActive)"
          />
          <Area
            type="monotone"
            dataKey="newSessions"
            name="New Sessions"
            stroke={CHART_PALETTES.area[1]}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorNew)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
