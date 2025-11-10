/**
 * Component Showcase Page
 * Development-only page to preview all shadcn/ui components
 * Access: /dev/components
 */

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// Code-split heavy dev component (787 lines)
const ComponentShowcase = dynamic(
  () => import('@/components/dev/ComponentShowcase').then((mod) => mod.ComponentShowcase),
  {
    loading: () => (
      <div className="p-8 text-center text-muted-foreground">Loading components...</div>
    ),
  }
);

export const metadata: Metadata = {
  title: 'Component Showcase | Dev',
  description: 'Preview all design system components',
};

export default function ComponentShowcasePage() {
  return <ComponentShowcase />;
}
