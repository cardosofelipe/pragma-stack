/**
 * Tests for LinkedAccountsSettings Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LinkedAccountsSettings } from '@/components/settings/LinkedAccountsSettings';
import {
  useOAuthProviders,
  useOAuthAccounts,
  useOAuthLink,
  useOAuthUnlink,
} from '@/lib/api/hooks/useOAuth';

// Mock the OAuth hooks
jest.mock('@/lib/api/hooks/useOAuth', () => ({
  useOAuthProviders: jest.fn(),
  useOAuthAccounts: jest.fn(),
  useOAuthLink: jest.fn(),
  useOAuthUnlink: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Linked Accounts',
      description: 'Manage your linked social accounts',
      linked: 'Linked',
      link: 'Link',
      unlink: 'Unlink',
      linkError: 'Failed to link account',
      unlinkError: 'Failed to unlink account',
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

describe('LinkedAccountsSettings', () => {
  const mockProviders = {
    enabled: true,
    providers: [
      { provider: 'google', name: 'Google' },
      { provider: 'github', name: 'GitHub' },
    ],
  };

  const mockLinkedAccounts = {
    accounts: [{ provider: 'google', provider_email: 'user@gmail.com' }],
  };

  const mockLinkMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  const mockUnlinkMutation = {
    mutateAsync: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: mockProviders,
      isLoading: false,
    });
    (useOAuthAccounts as jest.Mock).mockReturnValue({
      data: mockLinkedAccounts,
      isLoading: false,
    });
    (useOAuthLink as jest.Mock).mockReturnValue(mockLinkMutation);
    (useOAuthUnlink as jest.Mock).mockReturnValue(mockUnlinkMutation);
  });

  it('renders nothing when OAuth is disabled', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: { enabled: false, providers: [] },
      isLoading: false,
    });

    const { container } = render(<LinkedAccountsSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no providers available', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: { enabled: true, providers: [] },
      isLoading: false,
    });

    const { container } = render(<LinkedAccountsSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows loading state', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });
    (useOAuthAccounts as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<LinkedAccountsSettings />);

    // Should show loading indicator (spinner is an SVG with animate-spin)
    const loadingElement = document.querySelector('.animate-spin');
    expect(loadingElement).toBeInTheDocument();
  });

  it('renders available providers', () => {
    render(<LinkedAccountsSettings />);

    expect(screen.getByText('Linked Accounts')).toBeInTheDocument();
    expect(screen.getByText('Manage your linked social accounts')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('shows linked badge for linked accounts', () => {
    render(<LinkedAccountsSettings />);

    // Google is linked
    expect(screen.getByText('user@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
  });

  it('shows Link button for unlinked accounts', () => {
    render(<LinkedAccountsSettings />);

    // GitHub is not linked, should show Link button
    const linkButtons = screen.getAllByRole('button', { name: /link/i });
    expect(linkButtons.length).toBeGreaterThan(0);
  });

  it('shows Unlink button for linked accounts', () => {
    render(<LinkedAccountsSettings />);

    // Google is linked, should show Unlink button
    expect(screen.getByRole('button', { name: /unlink/i })).toBeInTheDocument();
  });

  it('calls link mutation when clicking Link button', async () => {
    render(<LinkedAccountsSettings />);

    // Find all buttons - GitHub's Link button should exist (Google shows Unlink)
    const buttons = screen.getAllByRole('button');
    // Find the button that contains "Link" text (not "Unlink")
    const linkButton = buttons.find(
      (btn) => btn.textContent?.includes('Link') && !btn.textContent?.includes('Unlink')
    );

    expect(linkButton).toBeDefined();
    if (linkButton) {
      fireEvent.click(linkButton);

      await waitFor(() => {
        expect(mockLinkMutation.mutateAsync).toHaveBeenCalledWith({ provider: 'github' });
      });
    }
  });

  it('calls unlink mutation when clicking Unlink button', async () => {
    render(<LinkedAccountsSettings />);

    const unlinkButton = screen.getByRole('button', { name: /unlink/i });
    fireEvent.click(unlinkButton);

    await waitFor(() => {
      expect(mockUnlinkMutation.mutateAsync).toHaveBeenCalledWith({ provider: 'google' });
    });
  });

  it('shows error when unlink fails', async () => {
    mockUnlinkMutation.mutateAsync.mockRejectedValue(new Error('Unlink failed'));

    render(<LinkedAccountsSettings />);

    const unlinkButton = screen.getByRole('button', { name: /unlink/i });
    fireEvent.click(unlinkButton);

    await waitFor(() => {
      expect(screen.getByText('Unlink failed')).toBeInTheDocument();
    });
  });

  it('disables unlink button while unlink mutation is pending for that provider', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: mockProviders,
      isLoading: false,
    });
    (useOAuthAccounts as jest.Mock).mockReturnValue({
      data: mockLinkedAccounts,
      isLoading: false,
    });
    (useOAuthLink as jest.Mock).mockReturnValue(mockLinkMutation);
    (useOAuthUnlink as jest.Mock).mockReturnValue({
      ...mockUnlinkMutation,
      isPending: true,
    });

    render(<LinkedAccountsSettings />);

    // Google is linked, unlink button should be disabled when mutation is pending
    const unlinkButton = screen.getByRole('button', { name: /unlink/i });
    expect(unlinkButton).toBeDisabled();
  });

  it('applies custom className', () => {
    (useOAuthProviders as jest.Mock).mockReturnValue({
      data: mockProviders,
      isLoading: false,
    });
    (useOAuthAccounts as jest.Mock).mockReturnValue({
      data: mockLinkedAccounts,
      isLoading: false,
    });
    (useOAuthLink as jest.Mock).mockReturnValue(mockLinkMutation);
    (useOAuthUnlink as jest.Mock).mockReturnValue(mockUnlinkMutation);

    render(<LinkedAccountsSettings className="custom-class" />);

    // The Card component should have the custom class
    const card = document.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});
