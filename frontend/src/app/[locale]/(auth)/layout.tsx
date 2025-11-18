import type { Metadata } from 'next';
import { AuthLayoutClient } from '@/components/auth/AuthLayoutClient';

export const metadata: Metadata = {
  title: 'Authentication',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
