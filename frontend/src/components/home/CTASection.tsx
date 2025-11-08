/**
 * CTA Section
 * Final call-to-action footer section
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Github, Star, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CTASectionProps {
  onOpenDemoModal: () => void;
}

export function CTASection({ onOpenDemoModal }: CTASectionProps) {

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb,120,119,198),0.1),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="container mx-auto px-6 py-24 md:py-32">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          {/* Headline */}
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Start Building,{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Not Boilerplating
            </span>
          </h2>

          {/* Subtext */}
          <p className="text-xl text-muted-foreground leading-relaxed">
            Clone the repository, read the docs, and ship features on day one.{' '}
            <span className="text-foreground font-medium">Free forever, MIT licensed.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="gap-2 text-base group"
            >
              <a
                href="https://github.com/your-org/fast-next-template"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" aria-hidden="true" />
                Get Started on GitHub
                <div className="inline-flex items-center gap-1 ml-2 rounded-full bg-background/20 px-2 py-0.5 text-xs">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  Star
                </div>
              </a>
            </Button>
            <Button
              onClick={onOpenDemoModal}
              size="lg"
              variant="outline"
              className="gap-2 text-base group"
            >
              <Play className="h-5 w-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
              Try Live Demo
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="gap-2 text-base group"
            >
              <a
                href="https://github.com/your-org/fast-next-template#documentation"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read Documentation
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </a>
            </Button>
          </div>

          {/* Extra Info */}
          <motion.div
            className="pt-8 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <p>
              Need help getting started? Check out the{' '}
              <Link href="/dev" className="text-primary hover:underline">
                component showcase
              </Link>
              {' '}or explore the{' '}
              <Link href="/admin" className="text-primary hover:underline">
                admin dashboard demo
              </Link>
              .
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
