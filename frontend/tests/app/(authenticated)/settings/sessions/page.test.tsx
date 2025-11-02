/**
 * Tests for Sessions Page
 * Smoke tests for placeholder page
 */

import { render, screen } from '@testing-library/react';
import SessionsPage from '@/app/(authenticated)/settings/sessions/page';

describe('SessionsPage', () => {
  it('renders without crashing', () => {
    render(<SessionsPage />);
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(<SessionsPage />);

    expect(screen.getByRole('heading', { name: /active sessions/i })).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(<SessionsPage />);

    expect(screen.getByText(/manage your active sessions/i)).toBeInTheDocument();
  });
});
