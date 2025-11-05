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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requireAdmin>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
          <div className="flex flex-1 flex-col">
            <Breadcrumbs />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <Footer />
      </div>
    </AuthGuard>
  );
}
