/**
 * Component Showcase Page
 * Development-only page to preview all shadcn/ui components
 * Access: /dev/components
 */

import type { Metadata } from 'next';
import { ComponentShowcase } from '@/components/dev/ComponentShowcase';

export const metadata: Metadata = {
  title: 'Component Showcase | Dev',
  description: 'Preview all design system components',
};

export default function ComponentShowcasePage() {
  return <ComponentShowcase />;
}
