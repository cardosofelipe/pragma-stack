/**
 * Dev Layout
 * Shared layout for all development routes
 */

import { DevLayout } from '@/components/dev/DevLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DevLayout>{children}</DevLayout>;
}
