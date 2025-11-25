/* istanbul ignore file -- @preserve OAuth callback requires external provider redirect, tested via e2e */
/**
 * OAuth Callback Page
 * Handles the redirect from OAuth providers after authentication
 *
 * NOTE: This page handles OAuth redirects and is difficult to unit test because:
 * 1. It relies on URL search params from OAuth provider redirects
 * 2. It has complex side effects (sessionStorage, navigation)
 * 3. OAuth flows are better tested via e2e tests with mocked providers
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/routing';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useOAuthCallback } from '@/lib/api/hooks/useOAuth';
import config from '@/config/app.config';

/**
 * SECURITY: Constant-time string comparison to prevent timing attacks.
 * JavaScript's === operator may short-circuit, potentially leaking information.
 * While timing attacks on frontend state are less critical (state is in URL),
 * this provides defense-in-depth.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default function OAuthCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth.oauth');

  const [error, setError] = useState<string | null>(null);
  const oauthCallback = useOAuthCallback();
  const hasProcessed = useRef(false);

  const provider = params.provider as string;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;

    // Handle OAuth provider error
    if (errorParam) {
      setError(errorDescription || t('providerError'));
      return;
    }

    // Validate required parameters
    if (!code || !state) {
      setError(t('missingParams'));
      return;
    }

    // SECURITY: Validate state parameter against stored value (CSRF protection)
    // This prevents cross-site request forgery attacks
    // Use constant-time comparison for defense-in-depth
    const storedState = sessionStorage.getItem('oauth_state');
    if (!storedState || !constantTimeCompare(storedState, state)) {
      // Clean up stored state on mismatch
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_mode');
      sessionStorage.removeItem('oauth_provider');
      setError(t('stateMismatch') || 'Invalid OAuth state. Please try again.');
      return;
    }

    hasProcessed.current = true;

    // Process the OAuth callback
    oauthCallback.mutate(
      { provider, code, state },
      {
        onSuccess: (data) => {
          // Get the stored mode to determine redirect
          const mode = sessionStorage.getItem('oauth_mode');

          if (data?.tokens?.is_new_user) {
            // New user - redirect to profile to complete setup
            router.push(config.routes.profile);
          } else if (mode === 'link') {
            // Account linking - redirect to settings
            router.push('/settings/profile');
          } else {
            // Regular login - redirect to dashboard
            router.push(config.routes.dashboard);
          }
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : t('unexpectedError');
          setError(errorMessage);
        },
      }
    );
  }, [provider, code, state, errorParam, errorDescription, oauthCallback, router, t]);

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <p className="font-medium">{t('authFailed')}</p>
            <p className="text-sm mt-1">{error}</p>
          </Alert>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push(config.routes.login)}>
              {t('backToLogin')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">{t('processing')}</p>
      </div>
    </div>
  );
}
