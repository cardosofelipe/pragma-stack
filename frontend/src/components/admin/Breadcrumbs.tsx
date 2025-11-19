/**
 * Admin Breadcrumbs
 * Displays navigation breadcrumb trail for admin pages
 */

'use client';

import { Link } from '@/lib/i18n/routing';
import { usePathname } from '@/lib/i18n/routing';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

const pathLabels: Record<string, string> = {
  admin: 'Admin',
  users: 'Users',
  organizations: 'Organizations',
  settings: 'Settings',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname
  // Note: usePathname() from next-intl returns path WITHOUT locale prefix
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    let currentPath = '';
    segments.forEach((segment: string) => {
      currentPath += `/${segment}`;
      const label = pathLabels[segment] || segment;
      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b bg-background px-6 py-3"
      data-testid="breadcrumbs"
    >
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={breadcrumb.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                  data-testid={`breadcrumb-${breadcrumb.label.toLowerCase()}`}
                >
                  {breadcrumb.label}
                </span>
              ) : (
                <Link
                  href={breadcrumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`breadcrumb-${breadcrumb.label.toLowerCase()}`}
                >
                  {breadcrumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
