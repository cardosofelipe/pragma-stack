/**
 * Tests for AuthInitializer
 * Verifies authentication state is loaded from storage on mount
 */

import { render, waitFor } from '@testing-library/react';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { useAuthStore } from '@/stores/authStore';

// Mock the auth store
jest.mock('@/stores/authStore', () => ({
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
      const { container } = render(<AuthInitializer />);

      expect(container.firstChild).toBeNull();
    });

    it('calls loadAuthFromStorage on mount', async () => {
      render(<AuthInitializer />);

      await waitFor(() => {
        expect(mockLoadAuthFromStorage).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call loadAuthFromStorage again on re-render', async () => {
      const { rerender } = render(<AuthInitializer />);

      await waitFor(() => {
        expect(mockLoadAuthFromStorage).toHaveBeenCalledTimes(1);
      });

      // Force re-render
      rerender(<AuthInitializer />);

      // Should still only be called once (useEffect dependencies prevent re-call)
      expect(mockLoadAuthFromStorage).toHaveBeenCalledTimes(1);
    });
  });
});
