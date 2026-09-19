'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, RefreshCw, ShoppingBag } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ProductDetail } from '@/components/storefront/ProductDetail';
import { productService } from '@/services/product.service';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const { products, selectedProduct, setSelectedProduct, fetchApiCatalog } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    async function loadProduct() {
      setLoading(true);
      // Ensure products are in store
      if (products.length === 0) {
        await fetchApiCatalog();
      }

      const currentProducts = useStore.getState().products;
      const cleanSlug = slug.toLowerCase().trim();

      // Find by ASIN, SKU, or slugified title
      const found = currentProducts.find((p) => {
        const titleSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const asinSlug = p.asin.toLowerCase();
        const skuPrefixSlug = p.variants?.[0]?.sku?.toLowerCase() || '';

        return (
          titleSlug === cleanSlug ||
          asinSlug === cleanSlug ||
          skuPrefixSlug.includes(cleanSlug)
        );
      });

      if (isSubscribed) {
        if (found) {
          setSelectedProduct(found);
        }
        setLoading(false);
      }
    }

    loadProduct();

    return () => {
      isSubscribed = false;
    };
  }, [slug, products.length, fetchApiCatalog, setSelectedProduct]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#0054A6] animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading Product Specifications...</p>
      </div>
    );
  }

  if (!selectedProduct) {
    return (
      <div className="min-h-[60vh] max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Product Not Found
        </h2>
        <p className="text-slate-500 max-w-md mx-auto text-sm">
          We could not find a product matching &quot;{slug}&quot;. It may have been archived or the URL might be mistyped.
        </p>
        <div>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0054A6] text-white font-bold hover:bg-[#003d7a] transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/store"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#0054A6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
        <span className="text-xs font-mono text-slate-400">
          ASIN: {selectedProduct.asin}
        </span>
      </div>

      <ProductDetail />
    </div>
  );
}
