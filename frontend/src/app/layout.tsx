/**
 * Root Layout
 *
 * Minimal root layout that passes through to locale-specific layouts.
 * The actual HTML structure and providers are in [locale]/layout.tsx
 * to properly handle locale-specific rendering.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
