/**
 * Mock for next-intl/routing
 */

export const defineRouting = (config: any) => config;

export const createNavigation = (_routing: any) => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  redirect: jest.fn(),
  usePathname: () => '/en/test',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
});
