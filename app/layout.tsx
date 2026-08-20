import type { Metadata } from 'next';
import './globals.css';
import { ClientErrorReporter } from '@/components/observability/ClientErrorReporter';

// The production CSP uses a fresh per-request nonce for Next.js bootstrap and
// hydration scripts. Static prerendering cannot know that nonce at build time,
// so public/auth pages must render dynamically to receive the request nonce.
// Keeping this at the root preserves the strict nonce-based CSP without falling
// back to unsafe-inline scripts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CareerOS by Amaura Labs',
  description: 'Decide where to apply, build truthful tailored applications, track outcomes, and learn what actually gets you interviews.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased bg-[hsl(var(--background))] text-[hsl(var(--foreground))]" suppressHydrationWarning>
        <ClientErrorReporter />
        {children}
      </body>
    </html>
  );
}
