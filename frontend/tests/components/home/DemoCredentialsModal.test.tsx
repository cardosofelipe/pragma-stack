/**
 * Tests for DemoCredentialsModal component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DemoCredentialsModal } from '@/components/home/DemoCredentialsModal';

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

describe('DemoCredentialsModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
      },
    });
  });

  it('renders when open is true', () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Try the Live Demo')).toBeInTheDocument();
    expect(screen.getByText(/Use these credentials to explore/i)).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<DemoCredentialsModal open={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Try the Live Demo')).not.toBeInTheDocument();
  });

  it('displays regular user credentials', () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Regular User')).toBeInTheDocument();
    expect(screen.getByText('demo@example.com')).toBeInTheDocument();
    expect(screen.getByText('DemoPass1234!')).toBeInTheDocument();
    expect(screen.getByText(/User settings & profile/i)).toBeInTheDocument();
  });

  it('displays admin user credentials', () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Admin User (Superuser)')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('AdminPass1234!')).toBeInTheDocument();
    expect(screen.getByText(/Full admin dashboard/i)).toBeInTheDocument();
  });

  it('copies regular user credentials to clipboard', async () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    const copyButtons = screen.getAllByRole('button');
    const regularCopyButton = copyButtons.find((btn) => btn.textContent?.includes('Copy'));

    fireEvent.click(regularCopyButton!);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('demo@example.com\nDemoPass1234!');
      const copiedButtons = screen.getAllByRole('button');
      const copiedButton = copiedButtons.find((btn) => btn.textContent?.includes('Copied!'));
      expect(copiedButton).toBeInTheDocument();
    });
  });

  it('copies admin user credentials to clipboard', async () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    const copyButtons = screen.getAllByRole('button');
    const adminCopyButton = copyButtons.filter((btn) => btn.textContent?.includes('Copy'))[1];

    fireEvent.click(adminCopyButton!);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'admin@example.com\nAdminPass1234!'
      );
      const copiedButtons = screen.getAllByRole('button');
      const copiedButton = copiedButtons.find((btn) => btn.textContent?.includes('Copied!'));
      expect(copiedButton).toBeInTheDocument();
    });
  });

  it('resets copied state after 2 seconds', async () => {
    jest.useFakeTimers();
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    const copyButtons = screen.getAllByRole('button');
    const copyButton = copyButtons.find((btn) => btn.textContent?.includes('Copy'));
    fireEvent.click(copyButton!);

    await waitFor(() => {
      const copiedButtons = screen.getAllByRole('button');
      const copiedButton = copiedButtons.find((btn) => btn.textContent?.includes('Copied!'));
      expect(copiedButton).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const copiedButton = buttons.find((btn) => btn.textContent?.includes('Copied!'));
      expect(copiedButton).toBeUndefined();
    });

    jest.useRealTimers();
  });

  it('handles clipboard copy failure gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.reject(new Error('Clipboard error'))),
      },
    });

    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    const copyButtons = screen.getAllByRole('button');
    const copyButton = copyButtons.find((btn) => btn.textContent?.includes('Copy'));
    fireEvent.click(copyButton!);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('calls onClose when close button is clicked', () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    // Find the "Close" button (filter to get the one that's visible and is the footer button)
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    const footerCloseButton = closeButtons.find(
      (btn) => btn.textContent === 'Close' && !btn.querySelector('.sr-only')
    );
    fireEvent.click(footerCloseButton!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('has links to login page', () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    const loginAsUserLink = screen.getByRole('link', { name: /login as user/i });
    expect(loginAsUserLink).toHaveAttribute(
      'href',
      '/login?email=demo@example.com&password=DemoPass1234!'
    );

    const loginAsAdminLink = screen.getByRole('link', { name: /login as admin/i });
    expect(loginAsAdminLink).toHaveAttribute(
      'href',
      '/login?email=admin@example.com&password=AdminPass1234!'
    );
  });

  it('calls onClose when login link is clicked', () => {
    render(<DemoCredentialsModal open={true} onClose={mockOnClose} />);

    const loginLink = screen.getByRole('link', { name: /login as user/i });
    fireEvent.click(loginLink);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
