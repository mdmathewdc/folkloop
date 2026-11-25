import type { Metadata } from 'next';
import { Press_Start_2P, Silkscreen } from 'next/font/google';
import './globals.css';

const pixelDisplay = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel-display',
  display: 'swap',
});

const pixelBody = Silkscreen({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Folkloop',
  description:
    'A persistent pixel-art life simulation powered by Temporal.io durable workflows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelDisplay.variable} ${pixelBody.variable}`}>
      <body className="min-h-screen font-pixel-body text-gba-ink selection:bg-gba-teal/30">
        {children}
      </body>
    </html>
  );
}
