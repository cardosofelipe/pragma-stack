/**
 * OAuth Consent Page
 * Displays authorization consent form for OAuth provider mode (MCP integration).
 *
 * Users are redirected here when an external application (MCP client) requests
 * access to their account. They can approve or deny the requested permissions.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/routing';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import config from '@/config/app.config';

// Scope descriptions for display
const SCOPE_INFO: Record<string, { name: string; description: string; icon: string }> = {
  openid: {
    name: 'OpenID Connect',
    description: 'Verify your identity',
    icon: 'user',
  },
  profile: {
    name: 'Profile',
    description: 'Access your name and basic profile information',
    icon: 'user-circle',
  },
  email: {
    name: 'Email',
    description: 'Access your email address',
    icon: 'mail',
  },
  'read:users': {
    name: 'Read Users',
    description: 'View user information',
    icon: 'users',
  },
  'write:users': {
    name: 'Write Users',
    description: 'Modify user information',
    icon: 'user-edit',
  },
  'read:organizations': {
    name: 'Read Organizations',
    description: 'View organization information',
    icon: 'building',
  },
  'write:organizations': {
    name: 'Write Organizations',
    description: 'Modify organization information',
    icon: 'building-edit',
  },
  admin: {
    name: 'Admin Access',
    description: 'Full administrative access',
    icon: 'shield',
  },
};

interface ConsentParams {
  clientId: string;
  clientName: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  nonce: string;
}

export default function OAuthConsentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Note: t is available for future i18n use
  const _t = useTranslations('auth.oauth');
  void _t; // Suppress unused warning - ready for i18n
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<ConsentParams | null>(null);

  // Parse URL parameters
  useEffect(() => {
    const clientId = searchParams.get('client_id') || '';
    const clientName = searchParams.get('client_name') || 'Application';
    const redirectUri = searchParams.get('redirect_uri') || '';
    const scope = searchParams.get('scope') || '';
    const state = searchParams.get('state') || '';
    const codeChallenge = searchParams.get('code_challenge') || '';
    const codeChallengeMethod = searchParams.get('code_challenge_method') || '';
    const nonce = searchParams.get('nonce') || '';

    if (!clientId || !redirectUri) {
      setError('Invalid authorization request. Missing required parameters.');
      return;
    }

    setParams({
      clientId,
      clientName,
      redirectUri,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
      nonce,
    });

    // Initialize selected scopes with all requested scopes
    if (scope) {
      setSelectedScopes(new Set(scope.split(' ')));
    }
  }, [searchParams]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = `/auth/consent?${searchParams.toString()}`;
      router.push(`${config.routes.login}?return_to=${encodeURIComponent(returnUrl)}`);
    }
  }, [authLoading, isAuthenticated, router, searchParams]);

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const handleSubmit = async (approved: boolean) => {
    if (!params) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create form data for consent submission
      const formData = new FormData();
      formData.append('approved', approved.toString());
      formData.append('client_id', params.clientId);
      formData.append('redirect_uri', params.redirectUri);
      formData.append('scope', Array.from(selectedScopes).join(' '));
      formData.append('state', params.state);
      if (params.codeChallenge) {
        formData.append('code_challenge', params.codeChallenge);
      }
      if (params.codeChallengeMethod) {
        formData.append('code_challenge_method', params.codeChallengeMethod);
      }
      if (params.nonce) {
        formData.append('nonce', params.nonce);
      }

      // Submit consent to backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/oauth/provider/authorize/consent`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      // The endpoint returns a redirect, so follow it
      if (response.redirected) {
        window.location.href = response.url;
      } else if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to process consent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !params) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push(config.routes.login)}>
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!params) {
    return null;
  }

  const requestedScopes = params.scope ? params.scope.split(' ') : [];

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl">Authorization Request</CardTitle>
          <CardDescription className="mt-2">
            <span className="font-semibold text-foreground">{params.clientName}</span> wants to
            access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">This application will be able to:</p>
            <div className="space-y-2 border rounded-lg p-3">
              {requestedScopes.map((scope) => {
                const info = SCOPE_INFO[scope] || {
                  name: scope,
                  description: `Access to ${scope}`,
                };
                const isSelected = selectedScopes.has(scope);

                return (
                  <div
                    key={scope}
                    className="flex items-start space-x-3 py-2 border-b last:border-0"
                  >
                    <Checkbox
                      id={`scope-${scope}`}
                      checked={isSelected}
                      onCheckedChange={() => handleScopeToggle(scope)}
                      disabled={isSubmitting}
                    />
                    <div className="flex-1 space-y-0.5">
                      <Label
                        htmlFor={`scope-${scope}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {info.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription className="text-xs">
              After authorization, you will be redirected to:
              <br />
              <code className="text-xs break-all bg-muted px-1 py-0.5 rounded">
                {params.redirectUri}
              </code>
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deny'}
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || selectedScopes.size === 0}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authorize'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
