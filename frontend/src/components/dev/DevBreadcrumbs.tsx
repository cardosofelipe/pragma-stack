/* istanbul ignore file */

/**
 * DevBreadcrumbs Component
 * Breadcrumb navigation for dev pages
 * This file is excluded from coverage as it's a development tool
 */

'use client';

import { Link } from '@/lib/i18n/routing';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface DevBreadcrumbsProps {
  items: Breadcrumb[];
  className?: string;
}

export function DevBreadcrumbs({ items, className }: DevBreadcrumbsProps) {
  return (
    <nav className={cn('bg-muted/30 border-b', className)} aria-label="Breadcrumb">
      <div className="container mx-auto px-4 py-3">
        <ol className="flex items-center gap-2 text-sm">
          {/* Home link */}
          <li>
            <Link
              href="/dev"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Hub</span>
            </Link>
          </li>

          {/* Breadcrumb items */}
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
