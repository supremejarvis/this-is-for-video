import type { Metadata, Viewport } from 'next';
import '../index.css';
import { AppLayout } from '@/components/layout/AppLayout';

export const viewport: Viewport = {
  themeColor: '#0054A6',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.apolloengineering.co.in'),
  title: {
    default: 'Shadowless Solar Sprinkler & Auto Drain Clip Manufacturer India | Apollo Engineering',
    template: '%s | Apollo Engineering',
  },
  description:
    "Pioneering India's first Shadowless Solar Sprinklers and Auto Drain Clips. Engineered with 100% premium SS304 stainless steel for zero degradation and maximum energy yield. Bulk & OEM supply from 100 / Gopinath Industrial Landmark, Kathwada GIDC, Ahmedabad, Gujarat - 382430.",
  keywords: [
    'Solar Sprinkler',
    'Solar Sprinkler System',
    'SS304 Solar Sprinkler',
    'Solar Panel Sprinkler',
    'Solar Auto Drain Clips',
    'Apollo Engineering',
    'Solar Maintenance Hardware',
    'Ahmedabad Manufacturer',
    'EPC Supplier India',
    'Kathwada GIDC',
    'Gopinath Ind Landmark',
  ],
  authors: [{ name: 'Apollo Engineering' }],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },
  openGraph: {
    title: 'Shadowless Solar Sprinkler & Auto Drain Clip Manufacturer India | Apollo Engineering',
    description:
      "Pioneering India's first Shadowless Solar Sprinklers and Auto Drain Clips. Engineered with 100% premium SS304 stainless steel for zero degradation and maximum energy yield.",
    url: 'https://www.apolloengineering.co.in',
    siteName: 'Apollo Engineering',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/logo.webp',
        width: 1200,
        height: 630,
        alt: 'Apollo Engineering Logo',
      },
    ],
  },
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['Organization', 'Manufacturer', 'LocalBusiness'],
      '@id': 'https://www.apolloengineering.co.in/#organization',
      name: 'Apollo Engineering',
      legalName: 'Apollo Engineering',
      url: 'https://www.apolloengineering.co.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.apolloengineering.co.in/logo.webp',
        caption: 'Apollo Engineering Logo',
      },
      image: 'https://www.apolloengineering.co.in/logo.webp',
      description:
        "India's premier manufacturer of SS304 solar panel sprinklers, auto drain clips, GI pipe clamps, and solar maintenance hardware.",
      telephone: '+91-8511626267',
      email: 'admin@apolloengineering.co.in',
      priceRange: '₹₹',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '100 / Gopinath Industrial Landmark, Kathwada GIDC',
        addressLocality: 'Ahmedabad',
        addressRegion: 'Gujarat',
        postalCode: '382430',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: '23.0373',
        longitude: '72.6841',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.apolloengineering.co.in/#website',
      url: 'https://www.apolloengineering.co.in/',
      name: 'Apollo Engineering | Premium SS304 Solar Maintenance Solutions',
      publisher: { '@id': 'https://www.apolloengineering.co.in/#organization' },
      inLanguage: 'en-IN',
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
