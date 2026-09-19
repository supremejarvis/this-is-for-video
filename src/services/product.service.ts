import { catalogApi } from './api/catalogApi';
import { ApiProduct, ApiProductVariant, CatalogService } from './catalogService';

export type { ApiProduct, ApiProductVariant };

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export class ProductService {
  /**
   * Fetches all products from FastAPI backend
   */
  public static async getProducts(category?: string): Promise<ApiProduct[]> {
    const products = await CatalogService.getCatalog(false);
    if (!category || category.toUpperCase() === 'ALL') {
      return products;
    }
    return products.filter((p) => {
      const cat = p.category || '';
      const name = p.name || '';
      return (
        cat.toUpperCase().includes(category.toUpperCase()) ||
        name.toUpperCase().includes(category.toUpperCase())
      );
    });
  }

  /**
   * Fetches single product by ID
   */
  public static async getProductById(id: string): Promise<ApiProduct> {
    return CatalogService.getProduct(id);
  }

  /**
   * Finds a product by slug, SKU prefix, or ID
   */
  public static async getProductBySlug(slug: string): Promise<ApiProduct | undefined> {
    const products = await this.getProducts();
    const cleanSlug = slug.toLowerCase().trim();

    return products.find((p) => {
      const matchId = p.id.toLowerCase() === cleanSlug;
      const matchSku = p.sku_prefix.toLowerCase() === cleanSlug;
      const matchNameSlug = slugify(p.name) === cleanSlug;
      const matchSkuClean = p.sku_prefix.toLowerCase().replace(/[^a-z0-9]/g, '-') === cleanSlug;
      return matchId || matchSku || matchNameSlug || matchSkuClean;
    });
  }
}

export const productService = ProductService;
