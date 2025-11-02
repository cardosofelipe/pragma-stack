/**
 * Tests for Preferences Page
 * Smoke tests for placeholder page
 */

import { render, screen } from '@testing-library/react';
import PreferencesPage from '@/app/(authenticated)/settings/preferences/page';

describe('PreferencesPage', () => {
  it('renders without crashing', () => {
    render(<PreferencesPage />);
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<PreferencesPage />);

    expect(screen.getByRole('heading', { name: /^preferences$/i })).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(<PreferencesPage />);

    expect(screen.getByText(/configure your preferences/i)).toBeInTheDocument();
  });
});
