/**
 * Homepage / Landing Page
 * Main landing page for the PragmaStack project
 * Showcases features, tech stack, and provides demos for developers
 */

'use client';

import { useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import { Header } from '@/components/home/Header';
import { HeroSection } from '@/components/home/HeroSection';
import { ContextSection } from '@/components/home/ContextSection';
import { AnimatedTerminal } from '@/components/home/AnimatedTerminal';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { DemoSection } from '@/components/home/DemoSection';
import { StatsSection } from '@/components/home/StatsSection';
import { TechStackSection } from '@/components/home/TechStackSection';
import { PhilosophySection } from '@/components/home/PhilosophySection';
import { QuickStartCode } from '@/components/home/QuickStartCode';
import { CTASection } from '@/components/home/CTASection';
import { DemoCredentialsModal } from '@/components/home/DemoCredentialsModal';

export default function Home() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header Navigation */}
      <Header onOpenDemoModal={() => setDemoModalOpen(true)} />

      {/* Main Content */}
      <main>
        {/* Hero Section with CTAs */}
        <HeroSection onOpenDemoModal={() => setDemoModalOpen(true)} />

        {/* What is this template? */}
        <ContextSection />

        {/* Animated Terminal with Quick Start */}
        <AnimatedTerminal />

        {/* 6 Feature Cards Grid */}
        <FeatureGrid />

        {/* Interactive Demo Cards */}
        <DemoSection />

        {/* Statistics with Animated Counters */}
        <StatsSection />

        {/* Tech Stack Grid */}
        <TechStackSection />

        {/* For Developers, By Developers */}
        <PhilosophySection />

        {/* Quick Start Code Block */}
        <QuickStartCode />

        {/* Final CTA Section */}
        <CTASection onOpenDemoModal={() => setDemoModalOpen(true)} />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PragmaStack. MIT Licensed.
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/demos" className="hover:text-foreground transition-colors">
                Demo Tour
              </Link>
              <Link href="/dev" className="hover:text-foreground transition-colors">
                Design System
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <Link href="/dev/docs" className="hover:text-foreground transition-colors">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Shared Demo Credentials Modal */}
      <DemoCredentialsModal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
    </div>
  );
}
