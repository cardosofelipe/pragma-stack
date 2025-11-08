import { render, screen } from '@testing-library/react';
import { AuthLayoutClient } from '@/components/auth/AuthLayoutClient';
import { useTheme } from '@/components/theme/ThemeProvider';

// Mock ThemeProvider
jest.mock('@/components/theme/ThemeProvider', () => ({
  useTheme: jest.fn(),
}));

describe('AuthLayoutClient', () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      resolvedTheme: 'light',
    });
  });

  it('should render children', () => {
    render(
      <AuthLayoutClient>
        <div>Test Content</div>
      </AuthLayoutClient>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render theme toggle', () => {
    render(
      <AuthLayoutClient>
        <div>Test Content</div>
      </AuthLayoutClient>
    );

    // Theme toggle is rendered as a button with aria-label
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeToggle).toBeInTheDocument();
  });

  it('should have proper layout structure', () => {
    const { container } = render(
      <AuthLayoutClient>
        <div>Test Content</div>
      </AuthLayoutClient>
    );

    // Check for main container with proper classes
    const mainContainer = container.querySelector('.relative.flex.min-h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Check for card container
    const cardContainer = container.querySelector('.rounded-lg.border.bg-card');
    expect(cardContainer).toBeInTheDocument();
  });

  it('should position theme toggle in top-right corner', () => {
    const { container } = render(
      <AuthLayoutClient>
        <div>Test Content</div>
      </AuthLayoutClient>
    );

    // Check for theme toggle container with absolute positioning
    const toggleContainer = container.querySelector('.absolute.right-4.top-4');
    expect(toggleContainer).toBeInTheDocument();
  });

  it('should render card with proper padding and styling', () => {
    const { container } = render(
      <AuthLayoutClient>
        <div>Test Content</div>
      </AuthLayoutClient>
    );

    const card = container.querySelector('.p-8.shadow-sm');
    expect(card).toBeInTheDocument();
  });
});
