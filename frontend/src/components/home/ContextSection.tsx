/**
 * Context Section
 * Explains what the template is and what you get out of the box
 */

'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export function ContextSection() {
  const features = [
    'Clone & Deploy in < 5 minutes',
    '97% Test Coverage (743 tests)',
    '12+ Documentation Guides',
    'Zero Commercial Dependencies',
  ];

  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold">What You Get Out of the Box</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            This isn&apos;t a boilerplate generator or a paid SaaS template. It&apos;s a complete,
            production-ready codebase you can clone and customize. Everything you need to build
            modern web applications without reinventing authentication, authorization, and admin
            infrastructure.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
