/**
 * E2E Tests for OAuth Authentication
 * Tests OAuth button display and interaction on login/register pages
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedMocks, loginViaUI } from './helpers/auth';

test.describe('OAuth Authentication', () => {
  test.describe('Login Page OAuth', () => {
    test.beforeEach(async ({ page }) => {
      // Set up API mocks including OAuth providers
      await setupAuthenticatedMocks(page);
    });

    test('should display OAuth provider buttons on login page', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load (they fetch providers from API)
      await page.waitForSelector('text=Continue with Google', { timeout: 10000 });

      // Verify both OAuth buttons are visible
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
    });

    test('should display divider between form and OAuth buttons', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      await page.waitForSelector('text=Continue with Google', { timeout: 10000 });

      // Verify divider text is present
      await expect(page.getByText(/or continue with/i)).toBeVisible();
    });

    test('should have Google OAuth button with correct icon', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const googleButton = page.getByRole('button', { name: /continue with google/i });
      await googleButton.waitFor({ state: 'visible', timeout: 10000 });

      // Verify button contains an SVG icon
      const svg = googleButton.locator('svg');
      await expect(svg).toBeVisible();
    });

    test('should have GitHub OAuth button with correct icon', async ({ page }) => {
      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const githubButton = page.getByRole('button', { name: /continue with github/i });
      await githubButton.waitFor({ state: 'visible', timeout: 10000 });

      // Verify button contains an SVG icon
      const svg = githubButton.locator('svg');
      await expect(svg).toBeVisible();
    });
  });

  test.describe('Register Page OAuth', () => {
    test.beforeEach(async ({ page }) => {
      // Set up API mocks including OAuth providers
      await setupAuthenticatedMocks(page);
    });

    test('should display OAuth provider buttons on register page', async ({ page }) => {
      await page.goto('/en/register');

      // Wait for OAuth buttons to load
      await page.waitForSelector('text=Sign up with Google', { timeout: 10000 });

      // Verify both OAuth buttons are visible with register-specific text
      await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign up with github/i })).toBeVisible();
    });

    test('should display divider between form and OAuth buttons on register page', async ({
      page,
    }) => {
      await page.goto('/en/register');

      // Wait for OAuth buttons to load
      await page.waitForSelector('text=Sign up with Google', { timeout: 10000 });

      // Verify divider text is present
      await expect(page.getByText(/or continue with/i)).toBeVisible();
    });
  });

  test.describe('OAuth Button Interaction', () => {
    test.beforeEach(async ({ page }) => {
      // Set up API mocks including OAuth providers
      await setupAuthenticatedMocks(page);
    });

    test('should call OAuth authorization endpoint when clicking Google button', async ({
      page,
    }) => {
      // Track API calls
      let authorizationCalled = false;
      await page.route('**/api/v1/oauth/authorize/google*', async (route) => {
        authorizationCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authorization_url: 'https://accounts.google.com/o/oauth2/auth?mock=true',
            state: 'mock-state',
          }),
        });
      });

      // Prevent actual navigation to external URL
      await page.route('https://accounts.google.com/**', (route) => route.abort());

      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const googleButton = page.getByRole('button', { name: /continue with google/i });
      await googleButton.waitFor({ state: 'visible', timeout: 10000 });

      // Click Google OAuth button
      await googleButton.click();

      // Wait for API call to complete
      await page.waitForTimeout(500);

      // Verify authorization endpoint was called
      expect(authorizationCalled).toBe(true);
    });

    test('should call OAuth authorization endpoint when clicking GitHub button', async ({
      page,
    }) => {
      // Track API calls
      let authorizationCalled = false;
      await page.route('**/api/v1/oauth/authorize/github*', async (route) => {
        authorizationCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authorization_url: 'https://github.com/login/oauth/authorize?mock=true',
            state: 'mock-state',
          }),
        });
      });

      // Prevent actual navigation to external URL
      await page.route('https://github.com/**', (route) => route.abort());

      await page.goto('/en/login');

      // Wait for OAuth buttons to load
      const githubButton = page.getByRole('button', { name: /continue with github/i });
      await githubButton.waitFor({ state: 'visible', timeout: 10000 });

      // Click GitHub OAuth button
      await githubButton.click();

      // Wait for API call to complete
      await page.waitForTimeout(500);

      // Verify authorization endpoint was called
      expect(authorizationCalled).toBe(true);
    });
  });

  test.describe('OAuth Provider Consent Page', () => {
    const mockConsentParams = {
      client_id: 'test-mcp-client-id',
      client_name: 'Test MCP Application',
      redirect_uri: 'http://localhost:3001/callback',
      scope: 'openid profile email',
      state: 'mock-state-token-123',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256',
    };

    test.beforeEach(async ({ page }) => {
      // Set up API mocks
      await setupAuthenticatedMocks(page);
    });

    test('should display error when required params are missing', async ({ page }) => {
      // Navigate to consent page without params
      await page.goto('/en/auth/consent');

      // Should show error alert
      await expect(page.getByText(/invalid authorization request/i)).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(/missing required parameters/i)).toBeVisible();
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Build consent URL with params
      const params = new URLSearchParams(mockConsentParams);

      // Navigate to consent page without being logged in
      await page.goto(`/en/auth/consent?${params.toString()}`);

      // Should redirect to login page with return_to parameter
      await expect(page).toHaveURL(/\/login\?return_to=/i, { timeout: 10000 });
    });

    test('should display consent page with client info for authenticated user', async ({
      page,
    }) => {
      // First log in
      await loginViaUI(page);

      // Build consent URL with params
      const params = new URLSearchParams(mockConsentParams);

      // Navigate to consent page
      await page.goto(`/en/auth/consent?${params.toString()}`);

      // Should display authorization request header
      await expect(page.getByText(/authorization request/i)).toBeVisible({ timeout: 10000 });

      // Should display client name
      await expect(page.getByText('Test MCP Application')).toBeVisible();

      // Should display the requested scopes (use exact match to avoid duplicates)
      await expect(page.getByText('OpenID Connect')).toBeVisible();
      await expect(page.getByLabel('Profile')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();

      // Should display redirect URI
      await expect(page.getByText(/localhost:3001\/callback/i)).toBeVisible();

      // Should display Authorize and Deny buttons
      await expect(page.getByRole('button', { name: /authorize/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /deny/i })).toBeVisible();
    });

    test('should allow toggling scopes', async ({ page }) => {
      // First log in
      await loginViaUI(page);

      // Build consent URL with params
      const params = new URLSearchParams(mockConsentParams);
      await page.goto(`/en/auth/consent?${params.toString()}`);

      // Wait for page to load
      await expect(page.getByText(/authorization request/i)).toBeVisible({ timeout: 10000 });

      // Find OpenID scope checkbox and toggle it
      const openidCheckbox = page.locator('#scope-openid');
      await expect(openidCheckbox).toBeChecked();

      // Uncheck it
      await openidCheckbox.click();
      await expect(openidCheckbox).not.toBeChecked();

      // Check it again
      await openidCheckbox.click();
      await expect(openidCheckbox).toBeChecked();
    });

    test('should disable Authorize button when no scopes selected', async ({ page }) => {
      // First log in
      await loginViaUI(page);

      // Build consent URL with single scope for easier testing
      const params = new URLSearchParams({
        ...mockConsentParams,
        scope: 'openid',
      });
      await page.goto(`/en/auth/consent?${params.toString()}`);

      // Wait for page to load
      await expect(page.getByText(/authorization request/i)).toBeVisible({ timeout: 10000 });

      // Initially Authorize button should be enabled
      const authorizeButton = page.getByRole('button', { name: /authorize/i });
      await expect(authorizeButton).toBeEnabled();

      // Uncheck the only scope
      await page.locator('#scope-openid').click();

      // Now Authorize button should be disabled
      await expect(authorizeButton).toBeDisabled();
    });

    test('should call consent API when clicking Authorize', async ({ page }) => {
      // First log in
      await loginViaUI(page);

      // Mock the consent submission endpoint (use wildcard to catch all variations)
      let consentSubmitted = false;

      await page.route('**/api/v1/oauth/provider/authorize/consent', async (route) => {
        if (route.request().method() === 'POST') {
          consentSubmitted = true;

          // Simulate redirect response
          await route.fulfill({
            status: 302,
            headers: {
              Location: `${mockConsentParams.redirect_uri}?code=mock-auth-code&state=${mockConsentParams.state}`,
            },
          });
        } else {
          await route.continue();
        }
      });

      // Prevent actual navigation to callback URL
      await page.route('http://localhost:3001/**', (route) => route.fulfill({ status: 200 }));

      // Build consent URL with params
      const params = new URLSearchParams(mockConsentParams);
      await page.goto(`/en/auth/consent?${params.toString()}`);

      // Wait for page to load
      await expect(page.getByText(/authorization request/i)).toBeVisible({ timeout: 10000 });

      // Click Authorize
      await page.getByRole('button', { name: /authorize/i }).click();

      // Wait for API call
      await page.waitForTimeout(1000);

      // Verify consent was submitted
      expect(consentSubmitted).toBe(true);
    });

    test('should call consent API with approved=false when clicking Deny', async ({ page }) => {
      // First log in
      await loginViaUI(page);

      // Track the request
      let requestMade = false;
      let postDataContainsFalse = false;

      // Mock the consent submission endpoint
      await page.route('**/api/v1/oauth/provider/authorize/consent', async (route) => {
        requestMade = true;
        const postData = route.request().postData();
        // FormData is multipart, so we check if "false" appears after "approved"
        if (postData && postData.includes('name="approved"')) {
          // The multipart format has approved value after the field name line
          postDataContainsFalse = postData.includes('false');
        }
        // Return a simple success response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // Build consent URL with params
      const params = new URLSearchParams(mockConsentParams);
      await page.goto(`/en/auth/consent?${params.toString()}`);

      // Wait for page to load
      await expect(page.getByText(/authorization request/i)).toBeVisible({ timeout: 10000 });

      // Click Deny and wait for the request
      await Promise.all([
        page.waitForResponse('**/api/v1/oauth/provider/authorize/consent'),
        page.getByRole('button', { name: /deny/i }).click(),
      ]);

      // Verify the request was made with approved=false
      expect(requestMade).toBe(true);
      expect(postDataContainsFalse).toBe(true);
    });

    test('should show loading state while submitting', async ({ page }) => {
      // First log in
      await loginViaUI(page);

      // We'll use a promise that we can resolve manually to control when the request completes
      let resolveRequest: () => void;
      const requestComplete = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });

      // Mock the consent submission endpoint with controlled delay
      await page.route('**/api/v1/oauth/provider/authorize/consent', async (route) => {
        // Wait until we've verified the loading state, then complete
        await requestComplete;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      // Build consent URL with params
      const params = new URLSearchParams(mockConsentParams);
      await page.goto(`/en/auth/consent?${params.toString()}`);

      // Wait for page to load
      await expect(page.getByText(/authorization request/i)).toBeVisible({ timeout: 10000 });

      // Get buttons before clicking
      const authorizeBtn = page.getByRole('button', { name: /authorize/i });
      const denyBtn = page.getByRole('button', { name: /deny/i });

      // Verify buttons are initially enabled
      await expect(authorizeBtn).toBeEnabled();
      await expect(denyBtn).toBeEnabled();

      // Click Authorize (don't await - let it start the request)
      authorizeBtn.click();

      // Should show loading spinner while request is pending
      await expect(page.locator('.animate-spin').first()).toBeVisible({ timeout: 5000 });

      // Now resolve the request to clean up
      resolveRequest!();
    });
  });
});
