/**
 * Philosophy Section
 * "For Developers, By Developers" section explaining why this template exists
 */

'use client';

import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

const wontFind = [
  'Vendor lock-in to specific services',
  'Hidden costs or upgrade prompts',
  'Poorly documented "magic"',
  'Outdated dependencies',
];

const willFind = [
  'Production patterns that actually work',
  'Comprehensive test coverage (not aspirational)',
  'Clear, honest documentation',
  'Active development and improvements',
];

export function PhilosophySection() {
  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Why This Template Exists</h2>
          <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p>
              We built this template after rebuilding the same authentication, authorization, and
              admin infrastructure for the fifth time. Instead of yet another tutorial or
              boilerplate generator, we created a complete, tested, documented codebase that you can
              clone and customize.
            </p>
            <p className="text-foreground font-semibold text-xl">
              No vendor lock-in. No subscriptions. No license restrictions.
            </p>
            <p>Just clean, modern code with patterns that scale. MIT licensed forever.</p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* What You Won't Find */}
          <motion.div
            className="h-full rounded-lg border bg-card p-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" aria-hidden="true" />
              What You Won&apos;t Find Here
            </h3>
            <ul className="space-y-3">
              {wontFind.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* What You Will Find */}
          <motion.div
            className="h-full rounded-lg border bg-card p-6"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" aria-hidden="true" />
              What You Will Find
            </h3>
            <ul className="space-y-3">
              {willFind.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check
                    className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
