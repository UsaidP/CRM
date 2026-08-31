import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zamzam-crm.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/p/', '/favicon.ico', '/icon.svg'],
        disallow: [
          '/admin',
          '/leads',
          '/deals',
          '/inventory',
          '/analytics',
          '/calendar',
          '/calculator',
          '/attribution',
          '/matching',
          '/api/',
          '/login',
          '/forgot-password',
          '/reset-password',
          '/set-password',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
