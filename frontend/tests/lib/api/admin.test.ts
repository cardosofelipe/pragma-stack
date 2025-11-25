/**
 * Tests for lib/api/admin.ts
 */

import { getAdminStats } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('getAdminStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiClient.get with correct parameters', async () => {
    const mockResponse = {
      user_growth: [],
      organization_distribution: [],
      registration_activity: [],
      user_status: [],
    };

    (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

    await getAdminStats();

    expect(apiClient.get).toHaveBeenCalledWith({
      responseType: 'json',
      security: [
        {
          scheme: 'bearer',
          type: 'http',
        },
      ],
      url: '/api/v1/admin/stats',
    });
  });

  it('uses custom client when provided', async () => {
    const customClient = {
      get: jest.fn().mockResolvedValue({}),
    };

    await getAdminStats({ client: customClient as any });

    expect(customClient.get).toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('passes through additional options', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({});

    await getAdminStats({ throwOnError: true } as any);

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/admin/stats',
        throwOnError: true,
      })
    );
  });
});
