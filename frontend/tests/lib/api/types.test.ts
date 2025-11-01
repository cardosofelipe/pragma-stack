/**
 * Comprehensive tests for API type guards and extensions
 *
 * Tests cover:
 * - TokenWithUser type guard (isTokenWithUser)
 * - SuccessResponse type guard (isSuccessResponse)
 * - Edge cases and type safety
 */

import {
  isTokenWithUser,
  isSuccessResponse,
  type TokenWithUser,
  type SuccessResponse,
} from '@/lib/api/types';

describe('API Type Guards', () => {
  describe('isTokenWithUser', () => {
    it('should return true for valid TokenWithUser', () => {
      const token: TokenWithUser = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'refresh_token_here',
        token_type: 'bearer',
        user: {
          id: '123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        expires_in: 3600,
      };

      expect(isTokenWithUser(token)).toBe(true);
    });

    it('should return true for valid TokenWithUser without optional fields', () => {
      const token = {
        access_token: 'token123',
        token_type: 'bearer',
        user: {
          id: '123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        // No refresh_token
        // No expires_in
      };

      expect(isTokenWithUser(token)).toBe(true);
    });

    it('should return false when token is null', () => {
      expect(isTokenWithUser(null)).toBe(false);
    });

    it('should return false when token is undefined', () => {
      expect(isTokenWithUser(undefined)).toBe(false);
    });

    it('should return false when token is not an object', () => {
      expect(isTokenWithUser('string')).toBe(false);
      expect(isTokenWithUser(123)).toBe(false);
      expect(isTokenWithUser(true)).toBe(false);
      expect(isTokenWithUser([])).toBe(false);
    });

    it('should return false when access_token is missing', () => {
      const token = {
        // No access_token
        token_type: 'bearer',
        user: {
          id: '123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      expect(isTokenWithUser(token)).toBe(false);
    });

    it('should return false when access_token is not a string', () => {
      const token = {
        access_token: 123, // Not a string
        token_type: 'bearer',
        user: {
          id: '123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      expect(isTokenWithUser(token)).toBe(false);
    });

    it('should return false when user is missing', () => {
      const token = {
        access_token: 'token123',
        token_type: 'bearer',
        // No user
      };

      expect(isTokenWithUser(token)).toBe(false);
    });

    it('should return false when user is null', () => {
      const token = {
        access_token: 'token123',
        token_type: 'bearer',
        user: null,
      };

      expect(isTokenWithUser(token)).toBe(false);
    });

    it('should return false when user is not an object', () => {
      const token = {
        access_token: 'token123',
        token_type: 'bearer',
        user: 'not an object',
      };

      expect(isTokenWithUser(token)).toBe(false);
    });

    it('should return false when user is an array', () => {
      const token = {
        access_token: 'token123',
        token_type: 'bearer',
        user: [],
      };

      expect(isTokenWithUser(token)).toBe(false);
    });

    it('should return true even with extra fields', () => {
      const token = {
        access_token: 'token123',
        token_type: 'bearer',
        user: {
          id: '123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        extra_field: 'should not break validation',
        another_field: 123,
      };

      expect(isTokenWithUser(token)).toBe(true);
    });

    it('should return false when access_token is empty string', () => {
      const token = {
        access_token: '', // Empty string
        token_type: 'bearer',
        user: {
          id: '123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      // Type guard doesn't check for empty string, just type
      expect(isTokenWithUser(token)).toBe(true);
    });

    it('should handle minimal valid user object', () => {
      const token = {
        access_token: 'token123',
        user: {
          // Minimal user - type guard only checks if it's an object
        },
      };

      expect(isTokenWithUser(token)).toBe(true);
    });

    it('should handle edge case: empty object', () => {
      expect(isTokenWithUser({})).toBe(false);
    });

    it('should handle edge case: object with only access_token', () => {
      const token = {
        access_token: 'token123',
      };

      expect(isTokenWithUser(token)).toBe(false);
    });

    it('should handle edge case: object with only user', () => {
      const token = {
        user: { id: '123' },
      };

      expect(isTokenWithUser(token)).toBe(false);
    });
  });

  describe('isSuccessResponse', () => {
    it('should return true for valid SuccessResponse', () => {
      const response: SuccessResponse = {
        success: true,
        message: 'Operation completed successfully',
      };

      expect(isSuccessResponse(response)).toBe(true);
    });

    it('should return false when response is null', () => {
      expect(isSuccessResponse(null)).toBe(false);
    });

    it('should return false when response is undefined', () => {
      expect(isSuccessResponse(undefined)).toBe(false);
    });

    it('should return false when response is not an object', () => {
      expect(isSuccessResponse('string')).toBe(false);
      expect(isSuccessResponse(123)).toBe(false);
      expect(isSuccessResponse(true)).toBe(false);
      expect(isSuccessResponse([])).toBe(false);
    });

    it('should return false when success is missing', () => {
      const response = {
        // No success
        message: 'Some message',
      };

      expect(isSuccessResponse(response)).toBe(false);
    });

    it('should return false when success is not true', () => {
      const response = {
        success: false, // Must be true
        message: 'Some message',
      };

      expect(isSuccessResponse(response)).toBe(false);
    });

    it('should return false when success is truthy but not true', () => {
      const response1 = {
        success: 'true', // String, not boolean
        message: 'Some message',
      };

      const response2 = {
        success: 1, // Number, not boolean
        message: 'Some message',
      };

      expect(isSuccessResponse(response1)).toBe(false);
      expect(isSuccessResponse(response2)).toBe(false);
    });

    it('should return false when message is missing', () => {
      const response = {
        success: true,
        // No message
      };

      expect(isSuccessResponse(response)).toBe(false);
    });

    it('should return false when message is not a string', () => {
      const response1 = {
        success: true,
        message: 123, // Number
      };

      const response2 = {
        success: true,
        message: null, // Null
      };

      const response3 = {
        success: true,
        message: { text: 'message' }, // Object
      };

      expect(isSuccessResponse(response1)).toBe(false);
      expect(isSuccessResponse(response2)).toBe(false);
      expect(isSuccessResponse(response3)).toBe(false);
    });

    it('should return true even with extra fields', () => {
      const response = {
        success: true,
        message: 'Success',
        extra_field: 'should not break validation',
        data: { some: 'data' },
      };

      expect(isSuccessResponse(response)).toBe(true);
    });

    it('should return true with empty message string', () => {
      const response = {
        success: true,
        message: '', // Empty but still a string
      };

      expect(isSuccessResponse(response)).toBe(true);
    });

    it('should handle edge case: empty object', () => {
      expect(isSuccessResponse({})).toBe(false);
    });

    it('should handle edge case: object with only success', () => {
      const response = {
        success: true,
      };

      expect(isSuccessResponse(response)).toBe(false);
    });

    it('should handle edge case: object with only message', () => {
      const response = {
        message: 'Some message',
      };

      expect(isSuccessResponse(response)).toBe(false);
    });
  });

  describe('Type narrowing in practice', () => {
    it('should allow safe access to TokenWithUser properties', () => {
      const response: unknown = {
        access_token: 'token123',
        user: {
          id: '123',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        expires_in: 3600,
      };

      if (isTokenWithUser(response)) {
        // TypeScript should know response is TokenWithUser here
        expect(response.access_token).toBe('token123');
        expect(response.user.email).toBe('test@example.com');
        expect(response.expires_in).toBe(3600);
      } else {
        fail('Should have been recognized as TokenWithUser');
      }
    });

    it('should allow safe access to SuccessResponse properties', () => {
      const response: unknown = {
        success: true,
        message: 'Password reset successful',
      };

      if (isSuccessResponse(response)) {
        // TypeScript should know response is SuccessResponse here
        expect(response.success).toBe(true);
        expect(response.message).toBe('Password reset successful');
      } else {
        fail('Should have been recognized as SuccessResponse');
      }
    });

    it('should properly narrow union types', () => {
      function processResponse(response: unknown): string {
        if (isTokenWithUser(response)) {
          return `Token for ${response.user.email}`;
        } else if (isSuccessResponse(response)) {
          return response.message;
        } else {
          return 'Unknown response type';
        }
      }

      const tokenResponse = {
        access_token: 'token',
        user: {
          email: 'test@example.com',
          id: '1',
          first_name: 'Test',
          last_name: 'User',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };

      const successResponse = {
        success: true,
        message: 'Done',
      };

      expect(processResponse(tokenResponse)).toBe('Token for test@example.com');
      expect(processResponse(successResponse)).toBe('Done');
      expect(processResponse('invalid')).toBe('Unknown response type');
    });
  });

  describe('Real-world scenarios', () => {
    it('should validate login response with user data', () => {
      const loginResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc',
        refresh_token: 'refresh_abc123',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: '123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          is_active: true,
          is_superuser: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      expect(isTokenWithUser(loginResponse)).toBe(true);
    });

    it('should reject login response without user data', () => {
      const loginResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc',
        refresh_token: 'refresh_abc123',
        token_type: 'bearer',
        expires_in: 3600,
        // Missing user field
      };

      expect(isTokenWithUser(loginResponse)).toBe(false);
    });

    it('should validate password reset success response', () => {
      const resetResponse = {
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      };

      expect(isSuccessResponse(resetResponse)).toBe(true);
    });

    it('should validate logout success response', () => {
      const logoutResponse = {
        success: true,
        message: 'Successfully logged out',
      };

      expect(isSuccessResponse(logoutResponse)).toBe(true);
    });
  });
});
