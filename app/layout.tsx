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
  const publicRuntimeConfig = JSON.stringify({
    useSupabase: process.env.NEXT_PUBLIC_USE_SUPABASE === 'true',
    allowDemoFallback:
      process.env.NEXT_PUBLIC_ALLOW_DEMO_FALLBACK !== 'false',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '',
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
  }).replace(/</g, '\\u003c');

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BEHIRA_PUBLIC_CONFIG__=${publicRuntimeConfig};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
