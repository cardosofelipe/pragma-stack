/**
 * Demo Section
 * Interactive demo cards showing live features with demo credentials
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const demos = [
  {
    icon: Layers,
    title: 'Component Showcase',
    description:
      'Browse the complete design system, UI components, and interactive examples built with shadcn/ui and TailwindCSS',
    href: '/dev',
    cta: 'View Components',
    variant: 'outline' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Authentication Flow',
    description:
      'Test the complete auth flow: login, session management, password reset. Full security implementation with JWT and refresh tokens',
    href: '/login',
    credentials: 'demo@example.com / Demo123!',
    cta: 'Try Auth Demo',
    variant: 'default' as const,
  },
  {
    icon: Play,
    title: 'Admin Dashboard',
    description:
      'Experience the admin panel with user management, real-time analytics charts, bulk operations, and session monitoring',
    href: '/admin',
    credentials: 'admin@example.com / Admin123!',
    cta: 'Launch Admin',
    variant: 'outline' as const,
  },
];

export function DemoSection() {
  return (
    <section className="container mx-auto px-6 py-16 md:py-24 bg-muted/30">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">See It In Action</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore the template&apos;s capabilities with live demos. Login with demo credentials to
          test features.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {demos.map((demo, index) => (
          <motion.div
            key={demo.title}
            className="h-full flex flex-col rounded-lg border bg-card p-6 hover:shadow-lg transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            {/* Icon */}
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <demo.icon className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
            </div>

            <h3 className="text-xl font-semibold mb-2">{demo.title}</h3>
            <p className="text-muted-foreground mb-4 leading-relaxed flex-1">{demo.description}</p>

            {demo.credentials && (
              <div className="mb-4 p-3 rounded-md bg-muted font-mono text-xs border">
                <div className="text-muted-foreground mb-1">Demo Credentials:</div>
                <div className="text-foreground">{demo.credentials}</div>
              </div>
            )}

            <Button asChild className="w-full" variant={demo.variant}>
              <Link href={demo.href}>{demo.cta} →</Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
