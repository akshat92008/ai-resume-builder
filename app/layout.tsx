import type { Metadata } from 'next';
import './globals.css';
import { ClientErrorReporter } from '@/components/observability/ClientErrorReporter';

const productionUrl = 'https://ai-resume-builder-ivory-nine.vercel.app';

// The production CSP uses a fresh per-request nonce for Next.js bootstrap and
// hydration scripts. Static prerendering cannot know that nonce at build time,
// so public/auth pages must render dynamically to receive the request nonce.
// Keeping this at the root preserves the strict nonce-based CSP without falling
// back to unsafe-inline scripts.
export const dynamic = 'force-dynamic';

const marketingDescription =
  'Tailor every application with truthful AI resumes, verified PDFs, reusable Career Memory, and evidence-backed job matching.';

const socialDescription =
  'Turn real career evidence into role-specific resumes and verified application assets—without inventing experience.';

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: {
    default: 'CareerOS by Amaura Labs',
    template: '%s · CareerOS',
  },
  description: marketingDescription,
  applicationName: 'CareerOS',
  category: 'career',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'CareerOS',
    title: 'CareerOS by Amaura Labs',
    description: socialDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareerOS by Amaura Labs',
    description: socialDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
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
