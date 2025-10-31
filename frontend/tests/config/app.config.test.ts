/**
 * Tests for application configuration
 */

describe('App Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Clear module cache to test with different env vars
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('parseIntSafe', () => {
    it('should parse valid integers', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = '5000';

      // Dynamically import to pick up new env
      const { config } = require('@/config/app.config');

      expect(config.api.timeout).toBe(5000);
    });

    it('should use default for NaN', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = 'not_a_number';

      const { config } = require('@/config/app.config');

      expect(config.api.timeout).toBe(30000); // default
    });

    it('should enforce minimum values', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = '500'; // Below min of 1000

      const { config } = require('@/config/app.config');

      expect(config.api.timeout).toBe(1000); // minimum
    });

    it('should enforce maximum values', () => {
      process.env.NEXT_PUBLIC_API_TIMEOUT = '999999'; // Above max of 120000

      const { config } = require('@/config/app.config');

      expect(config.api.timeout).toBe(120000); // maximum
    });

    it('should handle negative numbers', () => {
      process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY = '-100';

      const { config } = require('@/config/app.config');

      expect(config.auth.accessTokenExpiry).toBe(60000); // minimum
    });
  });

  describe('URL validation', () => {
    it('should accept valid URLs', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';

      const { config } = require('@/config/app.config');

      expect(config.api.baseUrl).toBe('https://api.example.com');
    });

    it('should throw on invalid URLs', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'not a url';

      // Mock window to undefined to prevent validation
      const originalWindow = global.window;
      (global as any).window = undefined;

      expect(() => {
        require('@/config/app.config');
      }).toThrow('Invalid URL');

      (global as any).window = originalWindow;
    });
  });

  describe('Config validation', () => {
    it('should clamp access token expiry to minimum', () => {
      process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY = '-1000';
      const { config } = require('@/config/app.config');

      // Negative values get clamped to min (60000ms)
      expect(config.auth.accessTokenExpiry).toBe(60000);
    });

    it('should clamp refresh token expiry to minimum', () => {
      process.env.NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY = '500000';
      const { config } = require('@/config/app.config');

      // Values below min get clamped to min (3600000ms / 1 hour)
      expect(config.auth.refreshTokenExpiry).toBe(3600000);
    });
  });

  describe('Boolean parsing', () => {
    it('should parse "true" as true', () => {
      process.env.NEXT_PUBLIC_ENABLE_REGISTRATION = 'true';

      const { config } = require('@/config/app.config');

      expect(config.features.enableRegistration).toBe(true);
    });

    it('should parse anything else as false', () => {
      process.env.NEXT_PUBLIC_ENABLE_REGISTRATION = 'yes';

      const { config } = require('@/config/app.config');

      expect(config.features.enableRegistration).toBe(false);
    });

    it('should use default when undefined', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_REGISTRATION;

      const { config } = require('@/config/app.config');

      expect(config.features.enableRegistration).toBe(true); // default
    });
  });

  describe('Environment detection', () => {
    it('should detect test environment', () => {
      // NODE_ENV is set by Jest to 'test'
      const { config } = require('@/config/app.config');

      expect(config.env.isTest).toBe(true);
    });
  });
});
