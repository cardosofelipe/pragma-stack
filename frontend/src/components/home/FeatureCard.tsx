/**
 * Feature Card
 * Reusable feature card component with icon, title, description, and CTA link
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight: string;
  ctaText: string;
  ctaHref: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  highlight,
  ctaText,
  ctaHref,
}: FeatureCardProps) {
  return (
    <motion.div
      className="group relative h-full flex flex-col rounded-lg border bg-card p-6 hover:shadow-lg transition-all"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Icon with Gradient Background */}
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
        <Icon className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>

      {/* Highlight Badge */}
      <div className="mb-3">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {highlight}
        </span>
      </div>

      {/* Description */}
      <p className="text-muted-foreground mb-4 leading-relaxed flex-1">{description}</p>

      {/* CTA Link */}
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline group-hover:gap-2 transition-all"
      >
        {ctaText}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
