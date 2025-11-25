/**
 * LinkedAccountsSettings Component
 * Manage linked OAuth provider accounts
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link as LinkIcon, Unlink, AlertTriangle } from 'lucide-react';
import {
  useOAuthProviders,
  useOAuthAccounts,
  useOAuthLink,
  useOAuthUnlink,
} from '@/lib/api/hooks/useOAuth';
import config from '@/config/app.config';
import { cn } from '@/lib/utils';

// ============================================================================
// Provider Icons
// ============================================================================

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  google: GoogleIcon,
  github: GitHubIcon,
};

// ============================================================================
// Component
// ============================================================================

interface LinkedAccountsSettingsProps {
  className?: string;
}

export function LinkedAccountsSettings({ className }: LinkedAccountsSettingsProps) {
  const t = useTranslations('settings.linkedAccounts');
  const [error, setError] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  const { data: providersData, isLoading: providersLoading } = useOAuthProviders();
  const { data: accountsData, isLoading: accountsLoading } = useOAuthAccounts();
  const linkMutation = useOAuthLink();
  const unlinkMutation = useOAuthUnlink();

  const isLoading = providersLoading || accountsLoading;

  // Don't render if OAuth is not enabled
  if (!isLoading && (!providersData?.enabled || !providersData?.providers?.length)) {
    return null;
  }

  const linkedProviders = new Set(accountsData?.accounts?.map((a) => a.provider) || []);
  const availableProviders = providersData?.providers || [];

  const handleLink = async (provider: string) => {
    try {
      setError(null);
      await linkMutation.mutateAsync({ provider });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('linkError'));
    }
  };

  const handleUnlink = async (provider: string) => {
    try {
      setError(null);
      setUnlinkingProvider(provider);
      await unlinkMutation.mutateAsync({ provider });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unlinkError'));
    } finally {
      setUnlinkingProvider(null);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm ml-2">{error}</p>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {availableProviders.map((provider) => {
              const providerConfig = config.oauth.providers[provider.provider];
              const Icon = providerIcons[provider.provider];
              const isLinked = linkedProviders.has(provider.provider);
              const linkedAccount = accountsData?.accounts?.find(
                (a) => a.provider === provider.provider
              );
              const isUnlinking = unlinkingProvider === provider.provider;

              return (
                <div
                  key={provider.provider}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-6 w-6" />}
                    <div>
                      <p className="font-medium">{providerConfig?.name || provider.name}</p>
                      {isLinked && linkedAccount?.provider_email && (
                        <p className="text-sm text-muted-foreground">
                          {linkedAccount.provider_email}
                        </p>
                      )}
                    </div>
                    {isLinked && (
                      <Badge variant="secondary" className="ml-2">
                        {t('linked')}
                      </Badge>
                    )}
                  </div>

                  {isLinked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlink(provider.provider)}
                      disabled={isUnlinking || unlinkMutation.isPending}
                    >
                      {isUnlinking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Unlink className="h-4 w-4 mr-2" />
                          {t('unlink')}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLink(provider.provider)}
                      disabled={linkMutation.isPending}
                    >
                      {linkMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          {t('link')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LinkedAccountsSettings;
