/**
 * Hero Section
 * Main hero section with headline, subheadline, CTAs, and gradient background
 */

'use client';

import { Link } from '@/lib/i18n/routing';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onOpenDemoModal: () => void;
}

export function HeroSection({ onOpenDemoModal }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient Background */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary-rgb,120,119,198),0.1),transparent_50%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary-rgb,120,119,198),0.05),transparent_50%)]"
        aria-hidden="true"
      />

      <div className="container mx-auto px-6 py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-1.5 text-sm backdrop-blur">
              <span
                className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"
                aria-hidden="true"
              />
              <span className="font-medium">MIT Licensed</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">97% Test Coverage</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">Production Ready</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="block">Everything You Need to Build</span>
            <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Modern Web Applications
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Production-ready FastAPI + Next.js template with authentication, multi-tenancy, and
            comprehensive admin panel. Built by developers, for developers.{' '}
            <span className="text-foreground font-medium">Start building features on day one.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button size="lg" onClick={onOpenDemoModal} className="gap-2 text-base group">
              <Play
                className="h-5 w-5 group-hover:scale-110 transition-transform"
                aria-hidden="true"
              />
              Try Live Demo
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 text-base group">
              <a
                href="https://github.com/your-org/fast-next-template"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" aria-hidden="true" />
                View on GitHub
                <ArrowRight
                  className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="gap-2 text-base group">
              <Link href="/dev">
                Explore Components
                <ArrowRight
                  className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">97%</span>
              <span>Test Coverage</span>
            </div>
            <div className="h-4 w-px bg-border" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">743</span>
              <span>Passing Tests</span>
            </div>
            <div className="h-4 w-px bg-border" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">0</span>
              <span>Flaky Tests</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
