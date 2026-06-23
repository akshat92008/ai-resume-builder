import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareerProof AI - Proof-Backed Resumes',
  description: 'Build a resume recruiters can trust with proof-backed achievements.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-900 bg-slate-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
