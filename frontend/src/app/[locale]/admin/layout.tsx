/**
 * Admin Route Group Layout
 * Wraps all admin routes with AuthGuard requiring superuser privileges
 * Includes sidebar navigation and breadcrumbs
 */

import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdminSidebar, Breadcrumbs } from '@/components/admin';

export const metadata: Metadata = {
  title: {
    template: '%s | Admin | FastNext Template',
    default: 'Admin Dashboard',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
          <div className="flex flex-1 flex-col">
            <Breadcrumbs />
            <main id="main-content" className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </AuthGuard>
  );
}
