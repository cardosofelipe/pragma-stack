/**
 * Tests for Password Settings Page
 * Smoke tests for placeholder page
 */

import { render, screen } from '@testing-library/react';
import PasswordSettingsPage from '@/app/(authenticated)/settings/password/page';

describe('PasswordSettingsPage', () => {
  it('renders without crashing', () => {
    render(<PasswordSettingsPage />);
    expect(screen.getByText('Password Settings')).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<PasswordSettingsPage />);

    expect(screen.getByRole('heading', { name: /password settings/i })).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(<PasswordSettingsPage />);

    expect(screen.getByText(/change your password/i)).toBeInTheDocument();
  });
});
