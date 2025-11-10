/**
 * Feature Grid
 * Grid layout displaying 6 main features with stagger animation
 */

'use client';

import { motion } from 'framer-motion';
import { Shield, Users, BarChart3, BookOpen, Server, Code } from 'lucide-react';
import { FeatureCard } from './FeatureCard';

const features = [
  {
    icon: Shield,
    title: 'Authentication & Security',
    description:
      'JWT authentication with refresh tokens, session management, password reset flow, rate limiting, CSRF protection, and comprehensive security tests preventing common attacks (CVE-2015-9235, session hijacking)',
    highlight: 'Battle-tested security',
    ctaText: 'View Auth Flow',
    ctaHref: '/login',
  },
  {
    icon: Users,
    title: 'Multi-Tenant Organizations',
    description:
      'Complete organization system with 3-tier RBAC (Owner/Admin/Member). Invite members, manage permissions, and scope data access per organization—all batteries included',
    highlight: 'Multi-tenancy built-in',
    ctaText: 'See Organizations',
    ctaHref: '/admin/organizations',
  },
  {
    icon: BarChart3,
    title: 'Admin Dashboard',
    description:
      'Full-featured admin panel with user management, real-time analytics charts, bulk operations, session monitoring, and role-based access controls',
    highlight: 'Enterprise-ready admin',
    ctaText: 'Try Admin Panel',
    ctaHref: '/admin',
  },
  {
    icon: BookOpen,
    title: 'Complete Documentation',
    description:
      '12+ documentation guides covering architecture, design system, testing patterns, deployment, and AI code generation guidelines. Interactive API docs with Swagger and ReDoc',
    highlight: 'Developer-first docs',
    ctaText: 'Browse Docs',
    ctaHref: 'https://github.com/your-org/fast-next-template#documentation',
  },
  {
    icon: Server,
    title: 'Production Ready',
    description:
      'Docker deployment configs, database migrations with Alembic helpers, connection pooling, health checks, monitoring setup, and production security headers',
    highlight: 'Deploy with confidence',
    ctaText: 'Deployment Guide',
    ctaHref: 'https://github.com/your-org/fast-next-template#deployment',
  },
  {
    icon: Code,
    title: 'Developer Experience',
    description:
      'Auto-generated TypeScript API client from OpenAPI spec, hot reload in development, migration helpers (python migrate.py auto), VS Code settings, and comprehensive component library',
    highlight: 'Delightful DX',
    ctaText: 'Explore Components',
    ctaHref: '/dev',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function FeatureGrid() {
  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Comprehensive Features, No Assembly Required
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to build production-grade web applications. Clone, customize, and
          ship.
        </p>
      </motion.div>

      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
      >
        {features.map((feature) => (
          <motion.div key={feature.title} variants={itemVariants}>
            <FeatureCard {...feature} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
