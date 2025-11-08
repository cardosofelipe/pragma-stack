/**
 * Tests for QuickStartCode component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickStartCode } from '@/components/home/QuickStartCode';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, ...props }: any) => <pre {...props}>{children}</pre>,
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  vscDarkPlus: {},
}));

describe('QuickStartCode', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
      },
    });
  });

  it('renders the section heading', () => {
    render(<QuickStartCode />);

    expect(screen.getByText('5-Minute Setup')).toBeInTheDocument();
    expect(screen.getByText(/Clone, run, and start building/i)).toBeInTheDocument();
  });

  it('renders bash indicator', () => {
    render(<QuickStartCode />);

    expect(screen.getByText('bash')).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<QuickStartCode />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('displays the code snippet', () => {
    render(<QuickStartCode />);

    const codeBlock = screen.getByText(/git clone/i);
    expect(codeBlock).toBeInTheDocument();
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    render(<QuickStartCode />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    const clipboardContent = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
    expect(clipboardContent).toContain('git clone');
    expect(clipboardContent).toContain('docker-compose up');
    expect(clipboardContent).toContain('pip install -r requirements.txt');
  });

  it('shows "Copied!" message after copying', async () => {
    render(<QuickStartCode />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('resets copied state after 2 seconds', async () => {
    jest.useFakeTimers();
    render(<QuickStartCode />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
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

    render(<QuickStartCode />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });
});
