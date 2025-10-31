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
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

/**
 * Application configuration object
 * All config is typed and validated
 */
export const config = {
  api: {
    baseUrl: validateUrl(ENV.API_BASE_URL, 'API_BASE_URL'),
    // Construct versioned API URL consistently
    url: `${validateUrl(ENV.API_BASE_URL, 'API_BASE_URL')}/api/v1`,
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
 */
function validateConfig(): void {
  const errors: string[] = [];

  // Validate API configuration
  if (!config.api.baseUrl) {
    errors.push('API base URL is required');
  }

  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  // Validate auth configuration
  if (config.auth.accessTokenExpiry <= 0) {
    errors.push('Access token expiry must be positive');
  }

  if (config.auth.refreshTokenExpiry <= config.auth.accessTokenExpiry) {
    errors.push('Refresh token expiry must be greater than access token expiry');
  }

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
