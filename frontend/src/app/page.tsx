/* istanbul ignore file - Framework-only root redirect covered by E2E */
/**
 * Root page - redirects to default locale
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to default locale (en)
  redirect('/en');
}
