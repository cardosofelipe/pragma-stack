/**
 * Footer Component
 * Simple footer for authenticated pages
 */

'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50 dark:bg-gray-900/50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 md:text-left">
            © {currentYear} FastNext Template. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link
              href="/settings/profile"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Settings
            </Link>
            <a
              href="https://github.com/yourusername/fastnext-stack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
