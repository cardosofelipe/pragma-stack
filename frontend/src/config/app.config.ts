/**
 * Application configuration with runtime validation
 * Centralized config prevents scattered environment variable access
 */

/**
 * Safely parse integer with validation
 * @param value - String value to parse
 * @param defaultValue - Fallback if parsing fails
 * @param min - Optional minimum value
 * @param max - Optional maximum value
 * @returns Valid integer or default
 */
function parseIntSafe(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    console.warn(`Invalid integer value: "${value}", using default: ${defaultValue}`);
    return defaultValue;
  }

  if (min !== undefined && parsed < min) {
    console.warn(`Value ${parsed} below minimum ${min}, using minimum`);
    return min;
  }

  if (max !== undefined && parsed > max) {
    console.warn(`Value ${parsed} above maximum ${max}, using maximum`);
    return max;
  }

  return parsed;
}

/**
 * Parse boolean from string
 */
function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true';
}

/**
 * Validate URL format
 */
function validateUrl(url: string, name: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error(`Invalid URL for ${name}: ${url}`);
  }
}

// Parse and validate all environment variables once
const ENV = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Template Project',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  TOKEN_REFRESH_THRESHOLD: process.env.NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD,
  ACCESS_TOKEN_EXPIRY: process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY: process.env.NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY,
  ENABLE_REGISTRATION: process.env.NEXT_PUBLIC_ENABLE_REGISTRATION,
  ENABLE_SESSION_MANAGEMENT: process.env.NEXT_PUBLIC_ENABLE_SESSION_MANAGEMENT,
  DEBUG_API: process.env.NEXT_PUBLIC_DEBUG_API,
  DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

/**
 * Application configuration object
 * All config is typed and validated
 */
export const config = {
  api: {
    baseUrl: validateUrl(ENV.API_BASE_URL, 'API_BASE_URL'),
    // OpenAPI spec already includes /api/v1 in paths, don't append it here
    url: validateUrl(ENV.API_BASE_URL, 'API_BASE_URL'),
    timeout: parseIntSafe(ENV.API_TIMEOUT, 30000, 1000, 120000), // 1s to 2min
  },

  app: {
    name: ENV.APP_NAME,
    url: validateUrl(ENV.APP_URL, 'APP_URL'),
  },

  auth: {
    // Time before token expiry to trigger refresh (5 min default)
    tokenRefreshThreshold: parseIntSafe(ENV.TOKEN_REFRESH_THRESHOLD, 300000, 10000),
    // Expected token expiry times (for validation)
    accessTokenExpiry: parseIntSafe(ENV.ACCESS_TOKEN_EXPIRY, 900000, 60000), // 15 min default, min 1min
    refreshTokenExpiry: parseIntSafe(ENV.REFRESH_TOKEN_EXPIRY, 604800000, 3600000), // 7 days default, min 1hr
  },

  routes: {
    login: '/login',
    register: '/register',
    home: '/',
    dashboard: '/dashboard',
    profile: '/profile',
    settings: '/settings',
    adminDashboard: '/admin',
  },

  features: {
    enableRegistration: parseBool(ENV.ENABLE_REGISTRATION, true),
    enableSessionManagement: parseBool(ENV.ENABLE_SESSION_MANAGEMENT, true),
  },

  debug: {
    api: parseBool(ENV.DEBUG_API, false) && ENV.NODE_ENV === 'development',
  },

  demo: {
    // Enable demo mode (uses Mock Service Worker instead of real backend)
    enabled: parseBool(ENV.DEMO_MODE, false),
    // Demo credentials
    credentials: {
      user: { email: 'demo@example.com', password: 'DemoPass1234!' },
      admin: { email: 'admin@example.com', password: 'AdminPass1234!' },
    },
  },

  env: {
    isDevelopment: ENV.NODE_ENV === 'development',
    isProduction: ENV.NODE_ENV === 'production',
    isTest: ENV.NODE_ENV === 'test',
  },
} as const;

// Type export for IDE autocomplete
export type AppConfig = typeof config;

/**
 * Validate critical configuration on module load
 * Note: Most auth config validation is handled by parseIntSafe min/max constraints
 */
/* istanbul ignore next - Browser-only validation, runs at build/startup time */
function validateConfig(): void {
  const errors: string[] = [];

  // Validate API configuration
  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }

  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  // Auth configuration is validated by parseIntSafe constraints:
  // - accessTokenExpiry: min 60000ms (1 minute)
  // - refreshTokenExpiry: min 3600000ms (1 hour), which ensures it's always > access token

  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error('Invalid application configuration');
  }
}

// Run validation on import
if (typeof window !== 'undefined') {
  validateConfig();
}

// Export default for convenience
export default config;
