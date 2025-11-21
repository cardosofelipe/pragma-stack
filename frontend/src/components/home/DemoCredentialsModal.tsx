/**
 * Demo Credentials Modal
 * Displays demo login credentials for testing the live application
 */

'use client';

import { useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import { Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DemoCredentialsModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoCredentialsModal({ open, onClose }: DemoCredentialsModalProps) {
  const [copiedRegular, setCopiedRegular] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  const regularCredentials = 'demo@example.com\nDemo123!';
  const adminCredentials = 'admin@example.com\nAdmin123!';

  const copyToClipboard = async (text: string, type: 'regular' | 'admin') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'regular') {
        setCopiedRegular(true);
        setTimeout(() => setCopiedRegular(false), 2000);
      } else {
        setCopiedAdmin(true);
        setTimeout(() => setCopiedAdmin(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="demo-modal">
        <DialogHeader>
          <DialogTitle>Try the Live Demo</DialogTitle>
          <DialogDescription>
            Use these credentials to explore the template&apos;s features. Both accounts are
            pre-configured with sample data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Regular User Credentials */}
          <div className="rounded-lg border p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Regular User</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(regularCredentials, 'regular')}
                className="h-8 gap-2"
              >
                {copiedRegular ? (
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">Copy regular user credentials</span>
                {copiedRegular ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="font-mono text-sm space-y-1 text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="text-xs font-sans text-muted-foreground/70">Email:</span>
                <span className="text-foreground">demo@example.com</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xs font-sans text-muted-foreground/70">Password:</span>
                <span className="text-foreground">Demo123!</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">What you can access:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>User settings & profile</li>
                <li>Password management</li>
                <li>Active sessions</li>
                <li>Personal preferences</li>
              </ul>
            </div>
          </div>

          {/* Admin User Credentials */}
          <div className="rounded-lg border p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Admin User (Superuser)</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(adminCredentials, 'admin')}
                className="h-8 gap-2"
              >
                {copiedAdmin ? (
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">Copy admin user credentials</span>
                {copiedAdmin ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="font-mono text-sm space-y-1 text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="text-xs font-sans text-muted-foreground/70">Email:</span>
                <span className="text-foreground">admin@example.com</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-xs font-sans text-muted-foreground/70">Password:</span>
                <span className="text-foreground">Admin123!</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">What you can access:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Full admin dashboard</li>
                <li>User management</li>
                <li>Analytics & charts</li>
                <li>Bulk operations</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            <Button asChild variant="default" className="w-full">
              <Link href="/login?email=demo@example.com&password=Demo123!" onClick={onClose}>
                Login as User
              </Link>
            </Button>
            <Button asChild variant="default" className="w-full">
              <Link href="/login?email=admin@example.com&password=Admin123!" onClick={onClose}>
                Login as Admin
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/demos" onClick={onClose}>
                View Demo Tour
              </Link>
            </Button>
            <Button variant="secondary" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
