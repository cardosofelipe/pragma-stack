/**
 * Root page - redirects to default locale
 */

import { redirect } from 'next/navigation';

/* istanbul ignore next - Next.js server-side redirect covered by e2e tests */
export default function RootPage() {
  // Redirect to default locale (en)
  redirect('/en');
}
