import { describe, it, expect } from 'vitest';
import { SeoSchemaValidator, ProductJsonLd } from '../schemaValidator';

describe('Enterprise SEO, Rich Results & Schema.org Validator Suite', () => {
  const validProductSchema: ProductJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SS304 Solar Panel Sprinkler (AetherWash Tech)',
    image: ['https://www.apolloengineering.co.in/solar_sprinkler.webp'],
    description: 'India\'s first shadowless solar sprinkler manufactured with AISI SS304 medical grade stainless steel.',
    sku: 'AE-SPRINKLER-SS304',
    mpn: 'APE-SS-SPK-01',
    brand: {
      '@type': 'Organization',
      name: 'Apollo Engineering'
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: 220,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 47.20,
          currency: 'INR'
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY'
          }
        }
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow'
      }
    }
  };

  // 1. Valid Product JSON-LD
  it('validates a fully-compliant Google Rich Results Product schema', () => {
    const result = SeoSchemaValidator.validateProductJsonLd(validProductSchema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // 2. Reject Missing or Tampered Statutory Fields
  it('rejects product schema missing shipping details or return policy', () => {
    const invalidSchema = {
      ...validProductSchema,
      offers: {
        ...validProductSchema.offers,
        shippingDetails: undefined,
        hasMerchantReturnPolicy: undefined
      }
    };

    const result = SeoSchemaValidator.validateProductJsonLd(invalidSchema as unknown as ProductJsonLd);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some(e => e.includes('Shipping details'))).toBe(true);
    expect(result.errors.some(e => e.includes('return and replacement policy'))).toBe(true);
  });

  // 3. Sitemap.xml & Robots.txt Integrity
  it('validates sitemap and robots.txt formats and canonical domains', () => {
    const sampleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.apolloengineering.co.in/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    expect(SeoSchemaValidator.validateSitemapXml(sampleSitemap)).toBe(true);

    const sampleRobots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Sitemap: https://www.apolloengineering.co.in/sitemap.xml`;

    expect(SeoSchemaValidator.validateRobotsTxt(sampleRobots)).toBe(true);
  });
});
