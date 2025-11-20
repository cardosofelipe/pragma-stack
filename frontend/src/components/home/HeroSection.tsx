/**
 * Hero Section
 * Main hero section with headline, subheadline, CTAs, and gradient background
 */

'use client';

import { Link } from '@/lib/i18n/routing';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
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
                className="inline-block h-2 w-2 rounded-full bg-success animate-pulse"
                aria-hidden="true"
              />
              <span className="font-medium">MIT Licensed</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">Comprehensive Tests</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">Pragmatic by Design</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="block">The Pragmatic</span>
            <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Full-Stack Template
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Opinionated, secure, and production-ready. PragmaStack gives you the solid foundation
            you need to stop configuring and start shipping.{' '}
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
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 fill-current"
                  aria-hidden="true"
                >
                  <title>GitHub</title>
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.834 2.807 1.304 3.495.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.566 22.091 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
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


        </div>
      </div>
    </section>
  );
}
