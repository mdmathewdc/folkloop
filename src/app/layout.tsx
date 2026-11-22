import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Folkloop — Little lives. Endless stories.',
  description:
    'A persistent pixel-art life simulation powered by Temporal.io durable workflows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-display antialiased selection:bg-honey/30">
        {children}
      </body>
    </html>
  );
}
