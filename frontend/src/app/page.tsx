/**
 * Homepage / Landing Page
 * Main landing page for the FastNext Template project
 * Showcases features, tech stack, and provides demos for developers
 */

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

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header Navigation */}
      <Header />

      {/* Main Content */}
      <main>
        {/* Hero Section with CTAs */}
        <HeroSection />

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
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} FastNext Template. MIT Licensed.
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/your-org/fast-next-template"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://github.com/your-org/fast-next-template#documentation"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://github.com/your-org/fast-next-template/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Report Issue
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
