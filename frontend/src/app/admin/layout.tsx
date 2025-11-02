/**
 * Admin Route Group Layout
 * Wraps all admin routes with AuthGuard requiring superuser privileges
 */

import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
