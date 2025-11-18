/**
 * Settings Layout
 * Provides tabbed navigation for settings pages
 */

'use client';

import { usePathname } from '@/lib/i18n/routing';
import { Link } from '@/lib/i18n/routing';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Monitor, Settings as SettingsIcon } from 'lucide-react';

/**
 * Settings tabs configuration
 */
const settingsTabs = [
  {
    value: 'profile',
    label: 'Profile',
    href: '/settings/profile',
    icon: User,
  },
  {
    value: 'password',
    label: 'Password',
    href: '/settings/password',
    icon: Lock,
  },
  {
    value: 'sessions',
    label: 'Sessions',
    href: '/settings/sessions',
    icon: Monitor,
  },
  {
    value: 'preferences',
    label: 'Preferences',
    href: '/settings/preferences',
    icon: SettingsIcon,
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Determine active tab based on pathname
  const activeTab = settingsTabs.find((tab) => pathname.startsWith(tab.href))?.value || 'profile';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} asChild>
                <Link href={tab.href} className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Link>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content */}
        <div className="rounded-lg border bg-card text-card-foreground p-6">{children}</div>
      </Tabs>
    </div>
  );
}
