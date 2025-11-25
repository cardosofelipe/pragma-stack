/**
 * OAuth React Query Hooks
 * Provides hooks for OAuth authentication flows
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listOauthProviders,
  getOauthAuthorizationUrl,
  handleOauthCallback,
  listOauthAccounts,
  unlinkOauthAccount,
  startOauthLink,
  getCurrentUserProfile,
} from '@/lib/api/generated';
import type {
  OAuthProvidersResponse,
  OAuthAccountsListResponse,
  OAuthCallbackResponse,
  UserResponse,
} from '@/lib/api/generated';
import { useAuth } from '@/lib/auth/AuthContext';
import config from '@/config/app.config';

// ============================================================================
// Query Keys
// ============================================================================

export const oauthKeys = {
  all: ['oauth'] as const,
  providers: () => [...oauthKeys.all, 'providers'] as const,
  accounts: () => [...oauthKeys.all, 'accounts'] as const,
};

// ============================================================================
// Provider Queries
// ============================================================================

/**
 * Fetch available OAuth providers
 * Returns which providers are enabled for login/registration
 */
export function useOAuthProviders() {
  return useQuery({
    queryKey: oauthKeys.providers(),
    queryFn: async () => {
      const response = await listOauthProviders();
      return response.data as OAuthProvidersResponse;
    },
    staleTime: 5 * 60 * 1000, // Providers don't change often
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// OAuth Flow Mutations
// ============================================================================

/**
 * Start OAuth login/registration flow
 * Redirects user to the OAuth provider
 */
export function useOAuthStart() {
  return useMutation({
    mutationFn: async ({
      provider,
      mode,
    }: {
      provider: string;
      mode: 'login' | 'register' | 'link';
    }) => {
      const redirectUri = `${config.app.url}${config.oauth.callbackPath}/${provider}`;

      const response = await getOauthAuthorizationUrl({
        path: { provider },
        query: { redirect_uri: redirectUri },
      });

      if (response.data) {
        // Store mode in sessionStorage for callback handling
        sessionStorage.setItem('oauth_mode', mode);
        sessionStorage.setItem('oauth_provider', provider);

        // Response is { [key: string]: unknown }, so cast authorization_url
        const authUrl = (response.data as { authorization_url: string }).authorization_url;
        // Redirect to OAuth provider
        window.location.href = authUrl;
      }

      return response.data;
    },
  });
}

/**
 * Handle OAuth callback after provider redirect
 * Exchanges the code for tokens and logs the user in
 */
export function useOAuthCallback() {
  const { setAuth } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      code,
      state,
    }: {
      provider: string;
      code: string;
      state: string;
    }) => {
      const redirectUri = `${config.app.url}${config.oauth.callbackPath}/${provider}`;

      // Exchange code for tokens
      const response = await handleOauthCallback({
        path: { provider },
        query: { redirect_uri: redirectUri },
        body: {
          code,
          state,
        },
      });

      const tokenData = response.data as OAuthCallbackResponse;

      // Fetch user profile using the new access token
      // We need to make this request with the new token
      const userResponse = await getCurrentUserProfile({
        headers: {
          authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      return {
        tokens: tokenData,
        user: userResponse.data as UserResponse,
      };
    },
    onSuccess: (data) => {
      if (data?.tokens && data?.user) {
        // Set auth state with tokens and user from OAuth
        setAuth(
          data.user,
          data.tokens.access_token,
          data.tokens.refresh_token,
          data.tokens.expires_in
        );

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }

      // Clean up session storage
      sessionStorage.removeItem('oauth_mode');
      sessionStorage.removeItem('oauth_provider');
    },
    onError: () => {
      // Clean up session storage on error too
      sessionStorage.removeItem('oauth_mode');
      sessionStorage.removeItem('oauth_provider');
    },
  });
}

// ============================================================================
// Account Management
// ============================================================================

/**
 * Fetch linked OAuth accounts for the current user
 */
export function useOAuthAccounts() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: oauthKeys.accounts(),
    queryFn: async () => {
      const response = await listOauthAccounts();
      return response.data as OAuthAccountsListResponse;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Start OAuth account linking flow
 * For users who want to add another OAuth provider to their account
 */
export function useOAuthLink() {
  return useMutation({
    mutationFn: async ({ provider }: { provider: string }) => {
      const redirectUri = `${config.app.url}${config.oauth.callbackPath}/${provider}`;

      const response = await startOauthLink({
        path: { provider },
        query: { redirect_uri: redirectUri },
      });

      if (response.data) {
        // Store mode in sessionStorage for callback handling
        sessionStorage.setItem('oauth_mode', 'link');
        sessionStorage.setItem('oauth_provider', provider);

        // Response is { [key: string]: unknown }, so cast authorization_url
        const authUrl = (response.data as { authorization_url: string }).authorization_url;
        // Redirect to OAuth provider
        window.location.href = authUrl;
      }

      return response.data;
    },
  });
}

/**
 * Unlink an OAuth account from the current user
 */
export function useOAuthUnlink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ provider }: { provider: string }) => {
      const response = await unlinkOauthAccount({
        path: { provider },
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: oauthKeys.accounts() });
    },
  });
}
