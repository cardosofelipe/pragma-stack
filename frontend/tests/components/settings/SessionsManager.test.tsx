/**
 * Tests for SessionsManager Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionsManager } from '@/components/settings/SessionsManager';
import * as useSessionModule from '@/lib/api/hooks/useSession';

jest.mock('@/lib/api/hooks/useSession');
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUseListSessions = useSessionModule.useListSessions as jest.Mock;
const mockUseRevokeSession = useSessionModule.useRevokeSession as jest.Mock;
const mockUseRevokeAllOtherSessions = useSessionModule.useRevokeAllOtherSessions as jest.Mock;

describe('SessionsManager', () => {
  let queryClient: QueryClient;
  const mockRevokeMutate = jest.fn();
  const mockRevokeAllMutate = jest.fn();

  const mockSessions = [
    {
      id: '1',
      device_name: 'Chrome on Mac',
      ip_address: '192.168.1.1',
      location_city: 'San Francisco',
      location_country: 'USA',
      last_used_at: '2024-01-01T12:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-01-08T00:00:00Z',
      is_current: true,
    },
    {
      id: '2',
      device_name: 'Firefox on Windows',
      ip_address: '192.168.1.2',
      location_city: 'New York',
      location_country: 'USA',
      last_used_at: '2024-01-01T11:00:00Z',
      created_at: '2023-12-31T00:00:00Z',
      expires_at: '2024-01-07T00:00:00Z',
      is_current: false,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    jest.clearAllMocks();

    mockUseRevokeSession.mockReturnValue({
      mutate: mockRevokeMutate,
      isPending: false,
    });

    mockUseRevokeAllOtherSessions.mockReturnValue({
      mutate: mockRevokeAllMutate,
      isPending: false,
    });
  });

  const renderWithProvider = (component: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);

  it('shows loading state', () => {
    mockUseListSessions.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.getByText(/loading your active sessions/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseListSessions.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.getByText(/unable to load your sessions/i)).toBeInTheDocument();
  });

  it('renders sessions list', () => {
    mockUseListSessions.mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.getByText('Chrome on Mac')).toBeInTheDocument();
    expect(screen.getByText('Firefox on Windows')).toBeInTheDocument();
  });

  it('shows "Revoke All Others" button when multiple sessions exist', () => {
    mockUseListSessions.mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.getByRole('button', { name: /revoke all others/i })).toBeInTheDocument();
  });

  it('does not show "Revoke All Others" when only current session', () => {
    mockUseListSessions.mockReturnValue({
      data: [mockSessions[0]], // Only current session
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.queryByRole('button', { name: /revoke all others/i })).not.toBeInTheDocument();
  });

  it('opens bulk revoke dialog', async () => {
    mockUseListSessions.mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    fireEvent.click(screen.getByRole('button', { name: /revoke all others/i }));

    await waitFor(() => {
      expect(screen.getByText('Revoke All Other Sessions?')).toBeInTheDocument();
    });
  });

  it('calls bulk revoke when confirmed', async () => {
    mockUseListSessions.mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    fireEvent.click(screen.getByRole('button', { name: /revoke all others/i }));

    await waitFor(() => {
      expect(screen.getByText('Revoke All Other Sessions?')).toBeInTheDocument();
    });

    // Find the destructive button in the dialog (not the "Cancel" button)
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find((btn) => btn.textContent === 'Revoke All Others');

    if (confirmButton) {
      fireEvent.click(confirmButton);
    }

    expect(mockRevokeAllMutate).toHaveBeenCalled();
  });

  it('calls revoke when individual session revoke clicked', async () => {
    mockUseListSessions.mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    // Click the individual "Revoke" button (not "Revoke All Others")
    const revokeButtons = screen.getAllByRole('button', { name: /^revoke$/i });
    fireEvent.click(revokeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Revoke Session?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /revoke session/i });
    fireEvent.click(confirmButton);

    expect(mockRevokeMutate).toHaveBeenCalledWith('2');
  });

  it('shows empty state when no sessions', () => {
    mockUseListSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.getByText('No active sessions to display')).toBeInTheDocument();
  });

  it('shows info message when only one session', () => {
    mockUseListSessions.mockReturnValue({
      data: [mockSessions[0]],
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.getByText(/you're viewing your only active session/i)).toBeInTheDocument();
  });

  it('shows security tip', () => {
    mockUseListSessions.mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    expect(screen.getByText(/security tip/i)).toBeInTheDocument();
    expect(screen.getByText(/if you see a session you don't recognize/i)).toBeInTheDocument();
  });

  it('closes bulk revoke dialog on cancel', async () => {
    mockUseListSessions.mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    renderWithProvider(<SessionsManager />);

    fireEvent.click(screen.getByRole('button', { name: /revoke all others/i }));

    await waitFor(() => {
      expect(screen.getByText('Revoke All Other Sessions?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Revoke All Other Sessions?')).not.toBeInTheDocument();
    });
  });
});
