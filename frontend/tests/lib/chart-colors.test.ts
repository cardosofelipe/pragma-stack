/**
 * Tests for chart-colors utility
 * Tests color configuration and helper functions for data visualization
 */

import { withOpacity, CHART_COLORS, CHART_PALETTES, CHART_GRADIENTS } from '@/lib/chart-colors';

describe('chart-colors', () => {
  describe('withOpacity', () => {
    it('converts opacity 0 to hex 00', () => {
      const result = withOpacity('#3b82f6', 0);
      expect(result).toBe('#3b82f600');
    });

    it('converts opacity 1 to hex ff', () => {
      const result = withOpacity('#3b82f6', 1);
      expect(result).toBe('#3b82f6ff');
    });

    it('converts opacity 0.5 to hex 80', () => {
      const result = withOpacity('#3b82f6', 0.5);
      expect(result).toBe('#3b82f680');
    });

    it('converts opacity 0.25 to hex 40', () => {
      const result = withOpacity('#3b82f6', 0.25);
      expect(result).toBe('#3b82f640');
    });

    it('converts opacity 0.75 to hex bf', () => {
      const result = withOpacity('#3b82f6', 0.75);
      expect(result).toBe('#3b82f6bf');
    });

    it('pads single digit hex values with zero', () => {
      const result = withOpacity('#3b82f6', 0.01);
      expect(result).toBe('#3b82f603');
    });

    it('works with 3-digit hex colors', () => {
      const result = withOpacity('#fff', 0.5);
      expect(result).toBe('#fff80');
    });

    it('works with uppercase hex colors', () => {
      const result = withOpacity('#3B82F6', 0.5);
      expect(result).toBe('#3B82F680');
    });

    it('handles edge case of very small opacity', () => {
      const result = withOpacity('#000000', 0.004);
      expect(result).toBe('#00000001');
    });

    it('handles edge case of very high opacity', () => {
      const result = withOpacity('#ffffff', 0.996);
      expect(result).toBe('#fffffffe');
    });
  });

  describe('CHART_COLORS', () => {
    it('exports primary color palette', () => {
      expect(CHART_COLORS.primary).toBe('#3b82f6');
      expect(CHART_COLORS.primaryLight).toBe('#60a5fa');
      expect(CHART_COLORS.primaryDark).toBe('#2563eb');
    });

    it('exports accent colors', () => {
      expect(CHART_COLORS.accent1).toBeDefined();
      expect(CHART_COLORS.accent2).toBeDefined();
      expect(CHART_COLORS.accent3).toBeDefined();
      expect(CHART_COLORS.accent4).toBeDefined();
      expect(CHART_COLORS.accent5).toBeDefined();
    });

    it('exports status colors', () => {
      expect(CHART_COLORS.success).toBeDefined();
      expect(CHART_COLORS.warning).toBeDefined();
      expect(CHART_COLORS.error).toBeDefined();
      expect(CHART_COLORS.info).toBeDefined();
    });
  });

  describe('CHART_PALETTES', () => {
    it('exports line chart palette', () => {
      expect(CHART_PALETTES.line).toHaveLength(2);
      expect(CHART_PALETTES.line).toContain(CHART_COLORS.primary);
      expect(CHART_PALETTES.line).toContain(CHART_COLORS.accent1);
    });

    it('exports bar chart palette', () => {
      expect(CHART_PALETTES.bar).toHaveLength(2);
      expect(CHART_PALETTES.bar).toContain(CHART_COLORS.primary);
      expect(CHART_PALETTES.bar).toContain(CHART_COLORS.accent2);
    });

    it('exports pie chart palette with 4 colors', () => {
      expect(CHART_PALETTES.pie).toHaveLength(4);
    });

    it('exports multi-series palette with 6 colors', () => {
      expect(CHART_PALETTES.multi).toHaveLength(6);
    });
  });

  describe('CHART_GRADIENTS', () => {
    it('exports primary gradient definition', () => {
      expect(CHART_GRADIENTS.primary.start).toBe(CHART_COLORS.primary);
      expect(CHART_GRADIENTS.primary.end).toMatch(/#3b82f6[a-f0-9]{2}/);
    });

    it('exports accent gradient definition', () => {
      expect(CHART_GRADIENTS.accent.start).toBe(CHART_COLORS.accent1);
      expect(CHART_GRADIENTS.accent.end).toMatch(/#8b5cf6[a-f0-9]{2}/);
    });
  });
});
