import type { Metadata } from 'next';
import './globals.css';
import { ClientErrorReporter } from '@/components/observability/ClientErrorReporter';

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
