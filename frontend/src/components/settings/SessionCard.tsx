/**
 * SessionCard Component
 * Displays individual session information with device details and revoke action
 */

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Monitor, Smartphone, Tablet, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Session } from '@/lib/api/hooks/useSession';

// ============================================================================
// Component
// ============================================================================

interface SessionCardProps {
  /** Session data */
  session: Session;
  /** Callback when session is revoked */
  onRevoke: (sessionId: string) => void;
  /** Loading state during revocation */
  isRevoking?: boolean;
}

/**
 * SessionCard - Display session with device info and revoke action
 *
 * Features:
 * - Device type icon (desktop, mobile, tablet)
 * - Device and browser information
 * - Location display (city, country)
 * - Last activity timestamp
 * - Current session badge
 * - Revoke confirmation dialog
 *
 * @example
 * ```tsx
 * <SessionCard
 *   session={sessionData}
 *   onRevoke={(id) => revokeSession(id)}
 *   isRevoking={isPending}
 * />
 * ```
 */
export function SessionCard({ session, onRevoke, isRevoking = false }: SessionCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Determine device icon (default to Monitor as device_type is not in API response)
  const DeviceIcon = Monitor;

  // Format location string
  const location = [session.location_city, session.location_country].filter(Boolean).join(', ') || 'Unknown location';

  // Format device string
  const deviceInfo = session.device_name || 'Unknown device';

  // Format last used time
  const lastUsedTime = session.last_used_at
    ? formatDistanceToNow(new Date(session.last_used_at), { addSuffix: true })
    : 'Unknown';

  const handleRevoke = () => {
    onRevoke(session.id);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Card className={session.is_current ? 'border-primary' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Device Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <DeviceIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {/* Session Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-sm truncate">{deviceInfo}</h3>
                  {session.is_current && (
                    <Badge variant="default" className="mt-1">
                      Current Session
                    </Badge>
                  )}
                </div>
                {!session.is_current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={isRevoking}
                  >
                    Revoke
                  </Button>
                )}
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                {/* Location */}
                {location !== 'Unknown location' && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}

                {/* IP Address */}
                {session.ip_address && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{session.ip_address}</span>
                  </div>
                )}

                {/* Last Used */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Last active {lastUsedTime}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Session?</DialogTitle>
            <DialogDescription>
              This will sign out this device and you&apos;ll need to sign in again to access your account
              from it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-sm space-y-1">
              <p>
                <strong>Device:</strong> {deviceInfo}
              </p>
              {location !== 'Unknown location' && (
                <p>
                  <strong>Location:</strong> {location}
                </p>
              )}
              {session.ip_address && (
                <p>
                  <strong>IP:</strong> {session.ip_address}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking}>
              {isRevoking ? 'Revoking...' : 'Revoke Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
