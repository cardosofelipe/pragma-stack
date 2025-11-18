/**
 * Authenticated Route Group Layout
 * Wraps all authenticated routes with AuthGuard and provides common layout structure
 */

import type { Metadata } from 'next';
import { AuthGuard } from '@/components/auth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: {
    template: '%s | FastNext Template',
    default: 'Dashboard',
  },
};

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
