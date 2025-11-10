/**
 * E2E Coverage Helpers
 *
 * Utilities for collecting code coverage during Playwright E2E tests.
 * Supports both V8 coverage (Chromium-only) and Istanbul instrumentation.
 *
 * Usage in E2E tests:
 *
 * ```typescript
 * import { startCoverage, stopAndSaveCoverage } from './helpers/coverage';
 *
 * test.describe('My Tests', () => {
 *   test.beforeEach(async ({ page }) => {
 *     await startCoverage(page);
 *     await page.goto('/');
 *   });
 *
 *   test.afterEach(async ({ page }, testInfo) => {
 *     await stopAndSaveCoverage(page, testInfo.title);
 *   });
 *
 *   test('my test', async ({ page }) => {
 *     // Your test code...
 *   });
 * });
 * ```
 */

import type { Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Check if coverage collection is enabled via environment variable
 */
export function isCoverageEnabled(): boolean {
  return process.env.E2E_COVERAGE === 'true';
}

/**
 * Start collecting V8 coverage for a page
 *
 * @param page - Playwright page instance
 * @param options - Coverage options
 */
export async function startCoverage(
  page: Page,
  options?: {
    resetOnNavigation?: boolean;
    includeRawScriptCoverage?: boolean;
  }
) {
  if (!isCoverageEnabled()) {
    return;
  }

  try {
      await page.coverage.startJSCoverage({
      resetOnNavigation: options?.resetOnNavigation ?? false,
      // @ts-ignore
      includeRawScriptCoverage: options?.includeRawScriptCoverage ?? false,
    });
  } catch (error) {
    console.warn('⚠️  Failed to start coverage:', error);
  }
}

/**
 * Stop coverage collection and save to file
 *
 * @param page - Playwright page instance
 * @param testName - Name of the test (used for filename)
 */
export async function stopAndSaveCoverage(page: Page, testName: string) {
  if (!isCoverageEnabled()) {
    return;
  }

  try {
    const coverage = await page.coverage.stopJSCoverage();

    if (coverage.length === 0) {
      console.warn('⚠️  No coverage collected for:', testName);
      return;
    }

    // Save V8 coverage
    await saveV8Coverage(coverage, testName);
  } catch (error) {
    console.warn('⚠️  Failed to stop/save coverage for', testName, ':', error);
  }
}

/**
 * Save V8 coverage data to disk
 *
 * @param coverage - V8 coverage data
 * @param testName - Test name for the filename
 */
async function saveV8Coverage(coverage: any[], testName: string) {
  const coverageDir = path.join(process.cwd(), 'coverage-e2e', 'raw');
  await fs.mkdir(coverageDir, { recursive: true });

  const filename = sanitizeFilename(testName);
  const filepath = path.join(coverageDir, `${filename}.json`);

  await fs.writeFile(filepath, JSON.stringify(coverage, null, 2));
}

/**
 * Collect Istanbul coverage from browser window object
 *
 * Use this if you're using Istanbul instrumentation instead of V8 coverage.
 * Requires babel-plugin-istanbul or similar instrumentation.
 *
 * @param page - Playwright page instance
 * @param testName - Name of the test
 */
export async function saveIstanbulCoverage(page: Page, testName: string) {
  if (!isCoverageEnabled()) {
    return;
  }

  try {
    // Extract coverage from window.__coverage__ (set by Istanbul instrumentation)
    const coverage = await page.evaluate(() => (window as any).__coverage__);

    if (!coverage) {
      console.warn('⚠️  No Istanbul coverage found for:', testName);
      console.warn('   Make sure babel-plugin-istanbul is configured');
      return;
    }

    // Save Istanbul coverage
    const coverageDir = path.join(process.cwd(), 'coverage-e2e', '.nyc_output');
    await fs.mkdir(coverageDir, { recursive: true });

    const filename = sanitizeFilename(testName);
    const filepath = path.join(coverageDir, `${filename}.json`);

    await fs.writeFile(filepath, JSON.stringify(coverage, null, 2));
  } catch (error) {
    console.warn('⚠️  Failed to save Istanbul coverage for', testName, ':', error);
  }
}

/**
 * Combined coverage helper for test hooks
 *
 * Automatically uses V8 coverage if available, falls back to Istanbul
 *
 * Usage in beforeEach/afterEach:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await withCoverage.start(page);
 * });
 *
 * test.afterEach(async ({ page }, testInfo) => {
 *   await withCoverage.stop(page, testInfo.title);
 * });
 * ```
 */
export const withCoverage = {
  /**
   * Start coverage collection (V8 approach)
   */
  async start(page: Page) {
    await startCoverage(page);
  },

  /**
   * Stop coverage and save (tries V8, then Istanbul)
   */
  async stop(page: Page, testName: string) {
    if (!isCoverageEnabled()) {
      return;
    }

    // Try V8 coverage first
    try {
      const v8Coverage = await page.coverage.stopJSCoverage();
      if (v8Coverage && v8Coverage.length > 0) {
        await saveV8Coverage(v8Coverage, testName);
        return;
      }
    } catch {
      // V8 coverage not available, try Istanbul
    }

    // Fall back to Istanbul coverage
    await saveIstanbulCoverage(page, testName);
  },
};

/**
 * Sanitize test name for use as filename
 *
 * @param name - Test name
 * @returns Sanitized filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, '') // Remove special chars
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .toLowerCase()
    .substring(0, 100);             // Limit length
}

/**
 * Get coverage statistics (for debugging)
 *
 * @param page - Playwright page instance
 * @returns Coverage statistics
 */
export async function getCoverageStats(page: Page): Promise<{
  v8Available: boolean;
  istanbulAvailable: boolean;
  istanbulFileCount?: number;
}> {
  const stats = {
    v8Available: false,
    istanbulAvailable: false,
    istanbulFileCount: undefined as number | undefined,
  };

  // Check V8 coverage
  try {
    await page.coverage.startJSCoverage();
    await page.coverage.stopJSCoverage();
    stats.v8Available = true;
  } catch {
    stats.v8Available = false;
  }

  // Check Istanbul coverage
  try {
    const coverage = await page.evaluate(() => (window as any).__coverage__);
    if (coverage) {
      stats.istanbulAvailable = true;
      stats.istanbulFileCount = Object.keys(coverage).length;
    }
  } catch {
    stats.istanbulAvailable = false;
  }

  return stats;
}

/**
 * Example usage in a test file:
 *
 * ```typescript
 * import { test, expect } from '@playwright/test';
 * import { withCoverage } from './helpers/coverage';
 *
 * test.describe('Homepage Tests', () => {
 *   test.beforeEach(async ({ page }) => {
 *     await withCoverage.start(page);
 *     await page.goto('/');
 *   });
 *
 *   test.afterEach(async ({ page }, testInfo) => {
 *     await withCoverage.stop(page, testInfo.title);
 *   });
 *
 *   test('displays header', async ({ page }) => {
 *     await expect(page.getByRole('heading')).toBeVisible();
 *   });
 * });
 * ```
 *
 * Then run with:
 * ```bash
 * E2E_COVERAGE=true npm run test:e2e
 * ```
 */
