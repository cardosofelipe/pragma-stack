/**
 * Demo Mode Indicator
 *
 * Subtle floating badge to indicate demo mode is active
 * Non-intrusive, doesn't cause layout shift
 */

'use client';

import { useState } from 'react';
import config from '@/config/app.config';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function DemoModeBanner() {
  // Only show in demo mode
  if (!config.demo.enabled) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Demo mode active"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Demo Mode</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">Demo Mode Active</h4>
            <p className="text-sm text-muted-foreground">
              All API calls are mocked. No backend required.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Demo Credentials (any password ≥12 chars works):
            </p>
            <div className="space-y-1.5">
              <code className="block rounded bg-muted px-2 py-1.5 text-xs font-mono">
                <span className="text-muted-foreground">user:</span>{' '}
                <span className="font-semibold">{config.demo.credentials.user.email}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="font-semibold">{config.demo.credentials.user.password}</span>
              </code>
              <code className="block rounded bg-muted px-2 py-1.5 text-xs font-mono">
                <span className="text-muted-foreground">admin:</span>{' '}
                <span className="font-semibold">{config.demo.credentials.admin.email}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="font-semibold">{config.demo.credentials.admin.password}</span>
              </code>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
