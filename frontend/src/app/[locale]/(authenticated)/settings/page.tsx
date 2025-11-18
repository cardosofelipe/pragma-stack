/**
 * Settings Index Page
 * Redirects to /settings/profile
 */

import { redirect } from 'next/navigation';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/settings/profile`);
}
