/**
 * Apollo Engineering — Enterprise SEO & Structured Data Schema Validator
 * Validates Schema.org JSON-LD definitions against Google Rich Results & Merchant Center specs.
 */

export interface ProductJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Product' | 'ProductGroup';
  name: string;
  image: string[];
  description: string;
  sku: string;
  mpn?: string;
  brand: {
    '@type': 'Brand' | 'Organization';
    name: string;
  };
  offers: {
    '@type': 'Offer';
    priceCurrency: 'INR';
    price: number;
    availability: string;
    itemCondition: string;
    shippingDetails?: {
      '@type': 'OfferShippingDetails';
      shippingRate: {
        '@type': 'MonetaryAmount';
        value: number;
        currency: 'INR';
      };
      deliveryTime?: {
        '@type': 'ShippingDeliveryTime';
        transitTime: {
          '@type': 'QuantitativeValue';
          minValue: number;
          maxValue: number;
          unitCode: 'DAY';
        };
      };
    };
    hasMerchantReturnPolicy?: {
      '@type': 'MerchantReturnPolicy';
      applicableCountry: 'IN';
      returnPolicyCategory: string;
    };
  };
}

export class SeoSchemaValidator {
  public static validateProductJsonLd(schema: ProductJsonLd): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
      errors.push("Missing or invalid @context: must be 'https://schema.org'");
    }

    if (!['Product', 'ProductGroup'].includes(schema['@type'])) {
      errors.push("Invalid @type: must be 'Product' or 'ProductGroup'");
    }

    if (!schema.name || schema.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!schema.image || !Array.isArray(schema.image) || schema.image.length === 0) {
      errors.push('At least one product image URL is required');
    }

    if (!schema.description || schema.description.length < 20) {
      errors.push('Product description must be at least 20 characters long');
    }

    if (!schema.sku || schema.sku.trim().length === 0) {
      errors.push('SKU identifier is required');
    }

    if (!schema.brand || !schema.brand.name) {
      errors.push('Brand name is required');
    }

    // Offers & Statutory Details validation
    if (!schema.offers) {
      errors.push('Offer specification is required');
    } else {
      if (schema.offers.priceCurrency !== 'INR') {
        errors.push("Currency must strictly be 'INR'");
      }
      if (typeof schema.offers.price !== 'number' || schema.offers.price <= 0) {
        errors.push('Price must be a positive number');
      }
      if (!schema.offers.availability || !schema.offers.availability.includes('schema.org')) {
        errors.push('Availability must be a valid Schema.org URI (e.g. InStock)');
      }
      if (!schema.offers.shippingDetails) {
        errors.push('Shipping details must be specified for Indian Speed Post dispatch');
      }
      if (!schema.offers.hasMerchantReturnPolicy) {
        errors.push('Merchant return and replacement policy is mandatory for sizing compliance');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public static validateSitemapXml(sitemapContent: string): boolean {
    return sitemapContent.includes('<?xml version="1.0" encoding="UTF-8"?>') &&
           sitemapContent.includes('<urlset') &&
           sitemapContent.includes('https://www.apolloengineering.co.in');
  }

  public static validateRobotsTxt(robotsContent: string): boolean {
    return robotsContent.includes('User-agent:') &&
           robotsContent.includes('Sitemap:');
  }
}
