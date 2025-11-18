/**
 * Footer Component
 * Simple footer for authenticated pages
 */

'use client';

import { Link } from '@/lib/i18n/routing';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="text-center text-sm text-muted-foreground md:text-left">
            © {currentYear} FastNext Template. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link
              href="/settings/profile"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Settings
            </Link>
            <a
              href="https://github.com/yourusername/fastnext-stack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
