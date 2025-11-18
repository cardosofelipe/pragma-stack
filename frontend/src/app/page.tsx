/**
 * Root page - redirects to default locale
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to default locale (en)
  redirect('/en');
}
