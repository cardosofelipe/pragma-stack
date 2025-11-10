/**
 * Tests for SessionCard Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionCard } from '@/components/settings/SessionCard';
import type { Session } from '@/lib/api/hooks/useSession';

describe('SessionCard', () => {
  const mockOnRevoke = jest.fn();

  const currentSession: Session = {
    id: '1',
    device_name: 'Chrome on Mac',
    ip_address: '192.168.1.1',
    location_city: 'San Francisco',
    location_country: 'USA',
    last_used_at: '2024-01-01T12:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    expires_at: '2024-01-08T00:00:00Z',
    is_current: true,
  };

  const otherSession: Session = {
    ...currentSession,
    id: '2',
    device_name: 'Firefox on Windows',
    location_city: 'New York',
    is_current: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders session information', () => {
    render(<SessionCard session={currentSession} onRevoke={mockOnRevoke} />);

    expect(screen.getByText('Chrome on Mac')).toBeInTheDocument();
    expect(screen.getByText(/San Francisco.*USA/)).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });

  it('shows current session badge', () => {
    render(<SessionCard session={currentSession} onRevoke={mockOnRevoke} />);
    expect(screen.getByText('Current Session')).toBeInTheDocument();
  });

  it('does not show revoke button for current session', () => {
    render(<SessionCard session={currentSession} onRevoke={mockOnRevoke} />);
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
  });

  it('shows revoke button for other sessions', () => {
    render(<SessionCard session={otherSession} onRevoke={mockOnRevoke} />);
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('opens confirmation dialog on revoke click', async () => {
    render(<SessionCard session={otherSession} onRevoke={mockOnRevoke} />);

    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));

    await waitFor(() => {
      expect(screen.getByText('Revoke Session?')).toBeInTheDocument();
    });
  });

  it('calls onRevoke when confirmed', async () => {
    render(<SessionCard session={otherSession} onRevoke={mockOnRevoke} />);

    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));

    await waitFor(() => {
      expect(screen.getByText('Revoke Session?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /revoke session/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnRevoke).toHaveBeenCalledWith('2');
    });
  });

  it('closes dialog on cancel', async () => {
    render(<SessionCard session={otherSession} onRevoke={mockOnRevoke} />);

    fireEvent.click(screen.getByRole('button', { name: /revoke/i }));

    await waitFor(() => {
      expect(screen.getByText('Revoke Session?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Revoke Session?')).not.toBeInTheDocument();
    });

    expect(mockOnRevoke).not.toHaveBeenCalled();
  });

  it('handles missing location gracefully', () => {
    const sessionWithoutLocation: Session = {
      ...otherSession,
      location_city: null,
      location_country: null,
    };

    render(<SessionCard session={sessionWithoutLocation} onRevoke={mockOnRevoke} />);

    expect(screen.queryByText(/San Francisco/)).not.toBeInTheDocument();
    // Component hides location when unknown, so it should not be displayed
    expect(screen.queryByText(/location/i)).not.toBeInTheDocument();
  });

  it('handles missing device name gracefully', () => {
    const sessionWithoutDevice: Session = {
      ...otherSession,
      device_name: null,
    };

    render(<SessionCard session={sessionWithoutDevice} onRevoke={mockOnRevoke} />);

    expect(screen.getByText('Unknown device')).toBeInTheDocument();
  });

  it('disables revoke button while revoking', () => {
    render(<SessionCard session={otherSession} onRevoke={mockOnRevoke} isRevoking />);

    const revokeButton = screen.getByRole('button', { name: /revoke/i });
    expect(revokeButton).toBeDisabled();
  });

  it('highlights current session with border', () => {
    const { container } = render(<SessionCard session={currentSession} onRevoke={mockOnRevoke} />);

    const card = container.querySelector('.border-primary');
    expect(card).toBeInTheDocument();
  });
});
