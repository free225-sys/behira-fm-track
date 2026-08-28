import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'BEHIRA FM / GB TRACK',
  description: 'Pilotage technique et maintenance immobilière.',
  openGraph: {
    title: 'BEHIRA FM / GB TRACK',
    description: 'Pilotage technique & maintenance immobilière',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BEHIRA FM / GB TRACK',
    description: 'Pilotage technique & maintenance immobilière',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
