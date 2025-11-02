/* istanbul ignore file */

/**
 * DevLayout Component
 * Shared layout for all /dev routes with navigation and theme toggle
 * This file is excluded from coverage as it's a development tool
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, Palette, LayoutDashboard, Box, FileText, BookOpen, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme';
import { cn } from '@/lib/utils';

interface DevLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    title: 'Hub',
    href: '/dev',
    icon: Home,
    exact: true,
  },
  {
    title: 'Components',
    href: '/dev/components',
    icon: Box,
  },
  {
    title: 'Forms',
    href: '/dev/forms',
    icon: FileText,
  },
  {
    title: 'Layouts',
    href: '/dev/layouts',
    icon: LayoutDashboard,
  },
  {
    title: 'Spacing',
    href: '/dev/spacing',
    icon: Palette,
  },
  {
    title: 'Docs',
    href: '/dev/docs',
    icon: BookOpen,
  },
];

export function DevLayout({ children }: DevLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          {/* Single Row: Logo + Badge + Navigation + Theme Toggle */}
          <div className="flex h-14 items-center justify-between gap-6">
            {/* Left: Logo + Badge */}
            <div className="flex items-center gap-3 shrink-0">
              <Code2 className="h-5 w-5 text-primary" />
              <h1 className="text-base font-semibold">FastNext</h1>
              <Badge variant="secondary" className="text-xs">
                Dev
              </Badge>
            </div>

            {/* Center: Navigation */}
            <nav className="flex gap-1 overflow-x-auto flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={active ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'gap-2 whitespace-nowrap',
                        !active && 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Theme Toggle */}
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
