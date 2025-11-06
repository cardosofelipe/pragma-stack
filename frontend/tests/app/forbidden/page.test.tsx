/**
 * Tests for 403 Forbidden Page
 * Verifies rendering of access forbidden message and navigation
 */

import { render, screen } from '@testing-library/react';
import ForbiddenPage from '@/app/forbidden/page';

describe('ForbiddenPage', () => {
  it('renders page heading', () => {
    render(<ForbiddenPage />);

    expect(
      screen.getByRole('heading', { name: /403 - Access Forbidden/i })
    ).toBeInTheDocument();
  });

  it('renders permission denied message', () => {
    render(<ForbiddenPage />);

    expect(
      screen.getByText(/You don't have permission to access this resource/)
    ).toBeInTheDocument();
  });

  it('renders admin privileges message', () => {
    render(<ForbiddenPage />);

    expect(
      screen.getByText(/This page requires administrator privileges/)
    ).toBeInTheDocument();
  });

  it('renders link to dashboard', () => {
    render(<ForbiddenPage />);

    const dashboardLink = screen.getByRole('link', {
      name: /Go to Dashboard/i,
    });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('renders link to home', () => {
    render(<ForbiddenPage />);

    const homeLink = screen.getByRole('link', { name: /Go to Home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders shield alert icon with aria-hidden', () => {
    const { container } = render(<ForbiddenPage />);

    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('renders with proper container structure', () => {
    const { container } = render(<ForbiddenPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-16');
  });
});
