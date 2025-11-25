import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI and locally to handle flaky tests */
  retries: process.env.CI ? 2 : 1,
  /* Use 8 workers locally (optimized for parallel execution), 1 on CI to reduce resource usage */
  workers: process.env.CI ? 1 : 16,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'github' : 'list',
  /* Suppress console output unless VERBOSE=true */
  quiet: process.env.VERBOSE !== 'true',
  /* Optimized timeout values for faster test execution */
  timeout: 25000, // Per-test timeout (reduced from 30s default, slowest test is 20s)
  expect: {
    timeout: 8000, // Per-assertion timeout (reduced from 10s default, most elements load <3s)
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    // /* Screenshot on failure */
    // screenshot: 'only-on-failure',
    // /* Record video for failed tests to diagnose flakiness */
    // video: 'retain-on-failure',
  },

  /* Configure projects with authentication state caching for performance */
  projects: [
    /**
     * Setup Project - Runs FIRST
     * Creates authenticated browser states (admin + regular user)
     * Saves to e2e/.auth/*.json for reuse across tests
     * Performance: Login 2 times instead of 133 times (~11min savings!)
     */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /**
     * Admin Tests - Superuser Authenticated
     * Requires admin/superuser privileges (access to /admin routes)
     * Uses cached auth state from setup project
     */
    {
      name: 'admin tests',
      testMatch: /admin-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'e2e', '.auth', 'admin.json'), // Reuse admin auth state
      },
      dependencies: ['setup'], // Wait for setup to create admin.json
    },

    /**
     * Settings Tests - Regular User Authenticated
     * Requires regular user auth (access to /settings routes)
     * Uses cached auth state from setup project
     */
    {
      name: 'settings tests',
      testMatch: /settings-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'e2e', '.auth', 'user.json'), // Reuse user auth state
      },
      dependencies: ['setup'], // Wait for setup to create user.json
    },

    /**
     * Auth Guard Tests - Tests Auth System Itself
     * Tests authentication flows, guards, redirects
     * Needs to test both authenticated and unauthenticated states
     * Dependencies on setup to ensure auth system works
     */
    {
      name: 'auth guard tests',
      testMatch: /auth-guard\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'], // Ensure auth system is working first
    },

    /**
     * Public Tests - No Authentication Required
     * Tests public pages: homepage, login, register, password reset
     * No dependency on setup (faster startup for these tests)
     */
    {
      name: 'public tests',
      testMatch: [
        /homepage\.spec\.ts/,
        /auth-login\.spec\.ts/,
        /auth-register\.spec\.ts/,
        /auth-password-reset\.spec\.ts/,
        /auth-flows\.spec\.ts/,
        /theme-toggle\.spec\.ts/,
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // Commented out - expects dev server to already be running
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});
