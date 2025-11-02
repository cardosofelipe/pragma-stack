/**
 * Tests for Settings Index Page
 * Verifies redirect behavior
 */

import { redirect } from 'next/navigation';
import SettingsPage from '@/app/(authenticated)/settings/page';

// Mock Next.js navigation - redirect throws to interrupt execution
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /settings/profile', () => {
    expect(() => SettingsPage()).toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/settings/profile');
  });
});
