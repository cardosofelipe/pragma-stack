/**
 * Tests for Admin Layout
 * Verifies layout rendering, auth guard, and accessibility features
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminLayout from '@/app/[locale]/admin/layout';
import { useAuth } from '@/lib/auth/AuthContext';

// Mock dependencies
jest.mock('@/lib/auth/AuthContext');
jest.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));
jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));
jest.mock('@/components/admin/AdminSidebar', () => ({
  AdminSidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));
jest.mock('@/components/admin/Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs">Breadcrumbs</div>,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/admin',
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AdminLayout', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders layout with all components for superuser', () => {
    mockUseAuth.mockReturnValue({
      user: { is_superuser: true } as any,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      { wrapper }
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders skip link with correct attributes', () => {
    mockUseAuth.mockReturnValue({
      user: { is_superuser: true } as any,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      { wrapper }
    );

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink).toHaveClass('sr-only');
  });

  it('renders main element with id', () => {
    mockUseAuth.mockReturnValue({
      user: { is_superuser: true } as any,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    const { container } = render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      { wrapper }
    );

    const mainElement = container.querySelector('#main-content');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement?.tagName).toBe('MAIN');
  });

  it('renders children inside main content area', () => {
    mockUseAuth.mockReturnValue({
      user: { is_superuser: true } as any,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <AdminLayout>
        <div data-testid="child-content">Child Content</div>
      </AdminLayout>,
      { wrapper }
    );

    const mainElement = screen.getByTestId('child-content').closest('main');
    expect(mainElement).toHaveAttribute('id', 'main-content');
  });

  it('applies correct layout structure classes', () => {
    mockUseAuth.mockReturnValue({
      user: { is_superuser: true } as any,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    const { container } = render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      { wrapper }
    );

    // Check root container has min-height class
    const rootDiv = container.querySelector('.min-h-screen');
    expect(rootDiv).toBeInTheDocument();
    expect(rootDiv).toHaveClass('flex', 'flex-col');

    // Check main content area has flex and overflow classes
    const mainElement = container.querySelector('#main-content');
    expect(mainElement).toHaveClass('flex-1', 'overflow-y-auto');
  });
});
