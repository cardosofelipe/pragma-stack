/**
 * Chart Color Configuration
 * Provides vibrant, accessible colors for data visualization
 * Converts design system colors to recharts-compatible formats
 */

export const CHART_COLORS = {
  // Primary blue palette - vibrant and professional
  primary: '#3b82f6',     // Blue 500
  primaryLight: '#60a5fa', // Blue 400
  primaryDark: '#2563eb',  // Blue 600

  // Secondary accent colors - complementary palette
  accent1: '#8b5cf6',     // Violet 500
  accent2: '#ec4899',     // Pink 500
  accent3: '#f59e0b',     // Amber 500
  accent4: '#10b981',     // Emerald 500
  accent5: '#06b6d4',     // Cyan 500

  // Status colors
  success: '#10b981',     // Emerald 500
  warning: '#f59e0b',     // Amber 500
  error: '#ef4444',       // Red 500
  info: '#3b82f6',        // Blue 500

  // Neutral colors for supporting elements
  muted: '#94a3b8',       // Slate 400
  mutedDark: '#64748b',   // Slate 500
};

// Chart-specific color palettes for different chart types
export const CHART_PALETTES = {
  // Line chart palette - 2 contrasting colors
  line: [CHART_COLORS.primary, CHART_COLORS.accent1],

  // Bar chart palette - 2 complementary colors
  bar: [CHART_COLORS.primary, CHART_COLORS.accent2],

  // Area chart palette - 2 harmonious colors with gradients
  area: [CHART_COLORS.primary, CHART_COLORS.accent5],

  // Pie chart palette - 4-5 distinct colors
  pie: [
    CHART_COLORS.primary,
    CHART_COLORS.accent1,
    CHART_COLORS.accent3,
    CHART_COLORS.accent4,
  ],

  // Multi-series palette - for charts with many data series
  multi: [
    CHART_COLORS.primary,
    CHART_COLORS.accent1,
    CHART_COLORS.accent2,
    CHART_COLORS.accent3,
    CHART_COLORS.accent4,
    CHART_COLORS.accent5,
  ],
};

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
  primary: {
    start: CHART_COLORS.primary,
    end: `${CHART_COLORS.primary}20`, // 20% opacity
  },
  accent: {
    start: CHART_COLORS.accent1,
    end: `${CHART_COLORS.accent1}20`, // 20% opacity
  },
};

// Helper function to get color with opacity
export function withOpacity(color: string, opacity: number): string {
  // Convert opacity (0-1) to hex (00-FF)
  const hex = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${color}${hex}`;
}
