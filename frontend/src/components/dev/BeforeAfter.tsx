/* istanbul ignore file */

/**
 * BeforeAfter Component
 * Side-by-side comparison component for demonstrating anti-patterns vs best practices
 * This file is excluded from coverage as it's a demo/showcase component
 */

'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BeforeAfterProps {
  title?: string;
  description?: string;
  before: {
    label?: string;
    content: React.ReactNode;
    caption?: string;
  };
  after: {
    label?: string;
    content: React.ReactNode;
    caption?: string;
  };
  vertical?: boolean;
  className?: string;
}

/**
 * BeforeAfter - Side-by-side comparison component
 *
 * @example
 * <BeforeAfter
 *   title="Spacing Anti-pattern"
 *   description="Parent should control spacing, not children"
 *   before={{
 *     content: <div className="mt-4">Child with margin</div>,
 *     caption: "Child controls its own spacing"
 *   }}
 *   after={{
 *     content: <div className="space-y-4"><div>Child</div></div>,
 *     caption: "Parent controls spacing with gap/space-y"
 *   }}
 * />
 */
export function BeforeAfter({
  title,
  description,
  before,
  after,
  vertical = false,
  className,
}: BeforeAfterProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && <h3 className="text-xl font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Comparison Grid */}
      <div className={cn('grid gap-4', vertical ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')}>
        {/* Before (Anti-pattern) */}
        <Card className="border-destructive/50">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {before.label || '❌ Before (Anti-pattern)'}
              </CardTitle>
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Avoid
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Demo content */}
            <div className="rounded-lg border border-destructive/50 bg-muted/50 p-4">
              {before.content}
            </div>
            {/* Caption */}
            {before.caption && (
              <p className="text-xs text-muted-foreground italic">{before.caption}</p>
            )}
          </CardContent>
        </Card>

        {/* After (Best practice) */}
        <Card className="border-green-500/50 dark:border-green-400/50">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {after.label || '✅ After (Best practice)'}
              </CardTitle>
              <Badge
                variant="outline"
                className="gap-1 border-green-500 text-green-600 dark:border-green-400 dark:text-green-400"
              >
                <CheckCircle2 className="h-3 w-3" />
                Correct
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Demo content */}
            <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-4 dark:border-green-400/50 dark:bg-green-400/5">
              {after.content}
            </div>
            {/* Caption */}
            {after.caption && (
              <p className="text-xs text-muted-foreground italic">{after.caption}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
