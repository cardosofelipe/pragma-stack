/**
 * Mock for next-intl/navigation
 */

// Create shared mock instances that tests can manipulate
// Note: next-intl's usePathname returns paths WITHOUT locale prefix
export const mockUsePathname = jest.fn(() => '/');
export const mockPush = jest.fn();
export const mockReplace = jest.fn();
export const mockUseRouter = jest.fn(() => ({
  push: mockPush,
  replace: mockReplace,
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}));
export const mockRedirect = jest.fn();

export const createNavigation = (_routing: any) => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  redirect: mockRedirect,
  usePathname: mockUsePathname,
  useRouter: mockUseRouter,
});
