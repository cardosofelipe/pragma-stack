/**
 * Tests for AuthInitializer
 * Verifies authentication state is loaded from storage on mount
 */

import { render, waitFor } from '@testing-library/react';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { useAuthStore } from '@/lib/stores/authStore';

// Mock the auth store
jest.mock('@/lib/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

describe('AuthInitializer', () => {
  const mockLoadAuthFromStorage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) => {
      const state = {
        loadAuthFromStorage: mockLoadAuthFromStorage,
      };
      return selector(state);
    });
  });

  describe('Initialization', () => {
    it('renders nothing (null)', () => {
      const { container } = render(
        <AuthProvider>
          <AuthInitializer />
        </AuthProvider>
      );

      expect(container.firstChild).toBeNull();
    });

    it('calls loadAuthFromStorage on mount', async () => {
      render(
        <AuthProvider>
          <AuthInitializer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockLoadAuthFromStorage).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call loadAuthFromStorage again on re-render', async () => {
      const { rerender } = render(
        <AuthProvider>
          <AuthInitializer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockLoadAuthFromStorage).toHaveBeenCalledTimes(1);
      });

      // Force re-render
      rerender(
        <AuthProvider>
          <AuthInitializer />
        </AuthProvider>
      );

      // Should still only be called once (useEffect dependencies prevent re-call)
      expect(mockLoadAuthFromStorage).toHaveBeenCalledTimes(1);
    });
  });
});
