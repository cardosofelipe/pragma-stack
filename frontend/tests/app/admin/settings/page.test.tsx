/**
 * Tests for Admin Settings Page
 * Verifies rendering of system settings placeholder
 */

import { render, screen } from '@testing-library/react';
import AdminSettingsPage from '@/app/admin/settings/page';

describe('AdminSettingsPage', () => {
  it('renders page title', () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText('System Settings')).toBeInTheDocument();
  });

  it('renders page description', () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText('Configure system-wide settings and preferences')).toBeInTheDocument();
  });

  it('renders back button link', () => {
    render(<AdminSettingsPage />);

    const backLink = screen.getByRole('link', { name: '' });
    expect(backLink).toHaveAttribute('href', '/admin');
  });

  it('renders coming soon message', () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText('System Settings Coming Soon')).toBeInTheDocument();
  });

  it('renders feature list', () => {
    render(<AdminSettingsPage />);

    expect(screen.getByText(/General system configuration/)).toBeInTheDocument();
    expect(screen.getByText(/Email and notification settings/)).toBeInTheDocument();
    expect(screen.getByText(/Security and authentication options/)).toBeInTheDocument();
    expect(screen.getByText(/API and integration settings/)).toBeInTheDocument();
    expect(screen.getByText(/Maintenance and backup tools/)).toBeInTheDocument();
  });

  it('renders with proper container structure', () => {
    const { container } = render(<AdminSettingsPage />);

    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-6', 'py-8');
  });
});
