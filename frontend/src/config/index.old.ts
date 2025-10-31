// Application configuration
// Environment variables, constants, feature flags, etc.

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  },
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Template Project',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  auth: {
    tokenRefreshThreshold: parseInt(process.env.NEXT_PUBLIC_TOKEN_REFRESH_THRESHOLD || '300000', 10),
    accessTokenExpiry: parseInt(process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY || '900000', 10),
    refreshTokenExpiry: parseInt(process.env.NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY || '604800000', 10),
  },
  features: {
    enableRegistration: process.env.NEXT_PUBLIC_ENABLE_REGISTRATION === 'true',
    enableSessionManagement: process.env.NEXT_PUBLIC_ENABLE_SESSION_MANAGEMENT === 'true',
  },
  debug: {
    api: process.env.NEXT_PUBLIC_DEBUG_API === 'true',
  },
} as const;

export type AppConfig = typeof config;
