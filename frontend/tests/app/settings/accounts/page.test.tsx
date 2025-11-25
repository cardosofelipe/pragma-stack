/**
 * Tests for Linked Accounts Settings Page
 */

import { render, screen } from '@testing-library/react';
import LinkedAccountsPage from '@/app/[locale]/(authenticated)/settings/accounts/page';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      pageTitle: 'Linked Accounts',
      pageSubtitle: 'Manage your linked social accounts for quick sign-in',
    };
    return translations[key] || key;
  },
}));

// Mock the LinkedAccountsSettings component
jest.mock('@/components/settings', () => ({
  LinkedAccountsSettings: () => (
    <div data-testid="linked-accounts-settings">Mocked LinkedAccountsSettings</div>
  ),
}));

describe('LinkedAccountsPage', () => {
  it('renders page title and subtitle', () => {
    render(<LinkedAccountsPage />);

    expect(screen.getByText('Linked Accounts')).toBeInTheDocument();
    expect(
      screen.getByText('Manage your linked social accounts for quick sign-in')
    ).toBeInTheDocument();
  });

  it('renders LinkedAccountsSettings component', () => {
    render(<LinkedAccountsPage />);

    expect(screen.getByTestId('linked-accounts-settings')).toBeInTheDocument();
  });
});
