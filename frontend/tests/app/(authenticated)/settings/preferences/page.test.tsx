/**
 * Tests for Preferences Page
 * Verifies rendering of preferences placeholder
 */

import { render, screen } from '@testing-library/react';
import PreferencesPage from '@/app/[locale]/(authenticated)/settings/preferences/page';

describe('PreferencesPage', () => {
  it('renders page title', () => {
    render(<PreferencesPage />);

    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('renders placeholder message', () => {
    render(<PreferencesPage />);

    expect(screen.getByText(/Configure your preferences/)).toBeInTheDocument();
  });

  it('mentions Task 3.5', () => {
    render(<PreferencesPage />);

    expect(screen.getByText(/Task 3.5/)).toBeInTheDocument();
  });
});
