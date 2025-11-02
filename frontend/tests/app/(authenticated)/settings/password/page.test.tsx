/**
 * Tests for Password Settings Page
 * Smoke tests for page rendering
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PasswordSettingsPage from '@/app/(authenticated)/settings/password/page';

describe('PasswordSettingsPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders without crashing', () => {
    renderWithProvider(<PasswordSettingsPage />);
    expect(screen.getByText('Password Settings')).toBeInTheDocument();
  });

  it('renders heading', () => {
    renderWithProvider(<PasswordSettingsPage />);
    expect(screen.getByRole('heading', { name: /password settings/i })).toBeInTheDocument();
  });

  it('shows description text', () => {
    renderWithProvider(<PasswordSettingsPage />);
    expect(screen.getByText(/change your password/i)).toBeInTheDocument();
  });
});
