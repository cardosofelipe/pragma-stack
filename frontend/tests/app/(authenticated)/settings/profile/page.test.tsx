/**
 * Tests for Profile Settings Page
 * Smoke tests for placeholder page
 */

import { render, screen } from '@testing-library/react';
import ProfileSettingsPage from '@/app/(authenticated)/settings/profile/page';

describe('ProfileSettingsPage', () => {
  it('renders without crashing', () => {
    render(<ProfileSettingsPage />);
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<ProfileSettingsPage />);

    expect(screen.getByRole('heading', { name: /profile settings/i })).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(<ProfileSettingsPage />);

    expect(screen.getByText(/manage your profile information/i)).toBeInTheDocument();
  });
});
