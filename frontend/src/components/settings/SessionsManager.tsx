/**
 * SessionsManager Component
 * Manages and displays all active user sessions
 * Allows individual and bulk session revocation
 */

'use client';

import { toast } from 'sonner';
import { Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SessionCard } from './SessionCard';
import {
  useListSessions,
  useRevokeSession,
  useRevokeAllOtherSessions,
} from '@/lib/api/hooks/useSession';
import { useState } from 'react';

// ============================================================================
// Component
// ============================================================================

interface SessionsManagerProps {
  /** Custom className for container */
  className?: string;
}

/**
 * SessionsManager - Session list and management interface
 *
 * Features:
 * - Lists all active sessions
 * - Shows current session prominently
 * - Individual session revocation
 * - Bulk "Revoke All Others" action
 * - Loading skeletons
 * - Empty state
 * - Error handling
 *
 * @example
 * ```tsx
 * <SessionsManager />
 * ```
 */
export function SessionsManager({ className }: SessionsManagerProps) {
  const [showBulkRevokeDialog, setShowBulkRevokeDialog] = useState(false);
  const { data: sessions, isLoading, error } = useListSessions();

  const revokeMutation = useRevokeSession((message) => {
    toast.success(message);
  });

  const revokeAllMutation = useRevokeAllOtherSessions((message) => {
    toast.success(message);
    setShowBulkRevokeDialog(false);
  });

  const handleRevoke = (sessionId: string) => {
    revokeMutation.mutate(sessionId);
  };

  const handleBulkRevoke = () => {
    revokeAllMutation.mutate();
  };

  // Separate current session from others
  const currentSession = sessions?.find((s) => s.is_current);
  const otherSessions = sessions?.filter((s) => !s.is_current) || [];

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Loading your active sessions...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Failed to load sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm ml-2">
              Unable to load your sessions. Please try refreshing the page.
            </p>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Empty state (should never happen, but handle gracefully)
  if (!sessions || sessions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>No active sessions found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No active sessions to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage devices that are currently signed in to your account
              </CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkRevokeDialog(true)}
                disabled={revokeAllMutation.isPending}
              >
                Revoke All Others
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Session */}
          {currentSession && (
            <div>
              <SessionCard
                session={currentSession}
                onRevoke={handleRevoke}
                isRevoking={revokeMutation.isPending}
              />
            </div>
          )}

          {/* Other Sessions */}
          {otherSessions.length > 0 && (
            <div className="space-y-4">
              {otherSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onRevoke={handleRevoke}
                  isRevoking={revokeMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Info Alert */}
          {sessions.length === 1 && (
            <Alert>
              <Shield className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm font-medium">You&apos;re viewing your only active session</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in from another device to see it listed here.
                </p>
              </div>
            </Alert>
          )}

          {/* Security Tip */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Security tip:</strong> If you see a session you
              don&apos;t recognize, revoke it immediately and change your password.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Revoke Confirmation Dialog */}
      <Dialog open={showBulkRevokeDialog} onOpenChange={setShowBulkRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke All Other Sessions?</DialogTitle>
            <DialogDescription>
              This will sign out all devices except the one you&apos;re currently using. You&apos;ll
              need to sign in again on those devices.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm">
                  <strong>{otherSessions.length}</strong> session
                  {otherSessions.length > 1 ? 's' : ''} will be revoked
                </p>
              </div>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRevokeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkRevoke}
              disabled={revokeAllMutation.isPending}
            >
              {revokeAllMutation.isPending ? 'Revoking...' : 'Revoke All Others'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
