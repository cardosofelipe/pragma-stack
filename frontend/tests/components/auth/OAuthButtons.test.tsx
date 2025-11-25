/**
 * Tests for OAuthButtons Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { useOAuthProviders, useOAuthStart } from '@/lib/api/hooks/useOAuth';

// Mock the OAuth hooks
jest.mock('@/lib/api/hooks/useOAuth', () => ({
  useOAuthProviders: jest.fn(),
  useOAuthStart: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: { provider?: string }) => {
    const translations: Record<string, string> = {
      loading: 'Loading...',
      divider: 'or continue with',
      continueWith: `Continue with ${params?.provider || ''}`,
      signUpWith: `Sign up with ${params?.provider || ''}`,
    };
    return translations[key] || key;
  },
}));

// Mock config - must be complete to avoid undefined access
jest.mock('@/config/app.config', () => ({
  __esModule: true,
  default: {
    oauth: {
      enabled: true,
      providers: {
        google: { name: 'Google', enabled: true },
        github: { name: 'GitHub', enabled: true },
      },
      callbackPath: '/auth/callback',
    },
    routes: {
      dashboard: '/dashboard',
      login: '/login',
      profile: '/settings/profile',
    },
    app: {
      url: 'http://localhost:3000',
    },
  },
}));

describe('OAuthButtons', () => {
  const mockProviders = {
    enabled: true,
    providers: [
      { provider: 'google', name: 'Google' },
      { provider: 'github', name: 'GitHub' },
    ],
  };

  const mockOAuthStart = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: mockProviders,
      isLoading: false,
      error: null,
    });
    (useOAuthStart as jest.Mock).mockReturnValue(mockOAuthStart);
  });

  it('renders nothing when OAuth is disabled', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: { enabled: false, providers: [] },
      isLoading: false,
      error: null,
    });

    const { container } = render(<OAuthButtons mode="login" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no providers available', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: { enabled: true, providers: [] },
      isLoading: false,
      error: null,
    });

    const { container } = render(<OAuthButtons mode="login" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is an error', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: mockProviders,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    const { container } = render(<OAuthButtons mode="login" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows loading state', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<OAuthButtons mode="login" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders provider buttons in login mode', () => {
    render(<OAuthButtons mode="login" />);

    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
  });

  it('renders provider buttons in register mode', () => {
    render(<OAuthButtons mode="register" />);

    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
    expect(screen.getByText('Sign up with GitHub')).toBeInTheDocument();
  });

  it('renders divider when showDivider is true (default)', () => {
    render(<OAuthButtons mode="login" />);

    expect(screen.getByText('or continue with')).toBeInTheDocument();
  });

  it('does not render divider when showDivider is false', () => {
    render(<OAuthButtons mode="login" showDivider={false} />);

    expect(screen.queryByText('or continue with')).not.toBeInTheDocument();
  });

  it('calls OAuth start when clicking provider button', async () => {
    render(<OAuthButtons mode="login" />);

    const googleButton = screen.getByText('Continue with Google');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockOAuthStart.mutateAsync).toHaveBeenCalledWith({
        provider: 'google',
        mode: 'login',
      });
    });
  });

  it('calls onStart callback when OAuth flow starts', async () => {
    const onStart = jest.fn();
    render(<OAuthButtons mode="login" onStart={onStart} />);

    const googleButton = screen.getByText('Continue with Google');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith('google');
    });
  });

  it('calls onError callback when OAuth start fails', async () => {
    const error = new Error('OAuth failed');
    mockOAuthStart.mutateAsync.mockRejectedValue(error);
    const onError = jest.fn();

    render(<OAuthButtons mode="login" onError={onError} />);

    const googleButton = screen.getByText('Continue with Google');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('disables buttons while OAuth is pending', () => {
    (useOAuthStart as jest.Mock).mockReturnValue({
      ...mockOAuthStart,
      isPending: true,
    });

    render(<OAuthButtons mode="login" />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('applies custom className', () => {
    render(<OAuthButtons mode="login" className="custom-class" />);

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('renders provider icons', () => {
    render(<OAuthButtons mode="login" />);

    // Icons are SVG elements
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});
