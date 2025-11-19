/**
 * Type declarations for test mocks
 * Augments modules to include mock exports for testing
 */

// Augment next-intl/navigation to include mock exports without removing original exports
declare module 'next-intl/navigation' {
  // Re-export all original exports
  export * from 'next-intl/dist/types/navigation.react-client';

  // Explicitly export createNavigation (it's a named export of a default, so export * might miss it)
  export { createNavigation } from 'next-intl/dist/types/navigation/react-client/index';

  // Add mock exports for testing
  export const mockUsePathname: jest.Mock;
  export const mockPush: jest.Mock;
  export const mockReplace: jest.Mock;
  export const mockUseRouter: jest.Mock;
  export const mockRedirect: jest.Mock;
}
