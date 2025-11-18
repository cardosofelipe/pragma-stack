/**
 * Tests for Sessions Page
 * Smoke tests for page rendering
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SessionsPage from '@/app/[locale]/(authenticated)/settings/sessions/page';

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  listMySessions: jest.fn(() =>
    Promise.resolve({
      data: {
        sessions: [],
        total: 0,
      },
    })
  ),
}));

describe('SessionsPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  it('renders without crashing', () => {
    renderWithProvider(<SessionsPage />);
    // Check for the main heading
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders heading', () => {
    renderWithProvider(<SessionsPage />);
    // The heading text
    expect(screen.getByRole('heading', { name: /active sessions/i })).toBeInTheDocument();
  });

  it('shows description text', () => {
    renderWithProvider(<SessionsPage />);
    // Description under the heading
    expect(screen.getByText(/view and manage devices/i)).toBeInTheDocument();
  });
});
