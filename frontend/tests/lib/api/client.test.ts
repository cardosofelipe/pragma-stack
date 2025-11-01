/**
 * Tests for API client configuration
 *
 * Tests ensure the client module loads and is configured correctly.
 * Note: Interceptor behavior testing requires actual HTTP calls, which is
 * better suited for integration/E2E tests. These unit tests verify setup.
 */

import { apiClient } from '@/lib/api/client';
import config from '@/config/app.config';

describe('API Client Configuration', () => {
  it('should export apiClient instance', () => {
    expect(apiClient).toBeDefined();
    expect(apiClient.instance).toBeDefined();
  });

  it('should have correct baseURL', () => {
    // Generated client already has /api/v1 in baseURL
    expect(apiClient.instance.defaults.baseURL).toContain(config.api.url);
    expect(apiClient.instance.defaults.baseURL).toContain('/api/v1');
  });

  it('should have correct timeout', () => {
    expect(apiClient.instance.defaults.timeout).toBe(config.api.timeout);
  });

  it('should have correct default headers', () => {
    expect(apiClient.instance.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should have request interceptors registered', () => {
    expect(apiClient.instance.interceptors.request.handlers.length).toBeGreaterThan(0);
  });

  it('should have response interceptors registered', () => {
    expect(apiClient.instance.interceptors.response.handlers.length).toBeGreaterThan(0);
  });

  it('should have setConfig method', () => {
    expect(typeof apiClient.setConfig).toBe('function');
  });
});
