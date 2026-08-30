import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

const geistSans = GeistSans;
const geistMono = GeistMono;

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
