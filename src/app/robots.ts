import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/profile/', '/notes/'],
    },
    sitemap: 'https://yumiso.fr/sitemap.xml',
  };
}
