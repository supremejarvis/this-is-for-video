'use client';

import React from 'react';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  products: any[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading = false,
  emptyMessage = 'No products found matching your criteria.',
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-96 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/50"
          />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
        <p className="text-slate-500 dark:text-slate-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {products.map((p, idx) => (
        <ProductCard key={p.asin || p.sku || idx} {...p} />
      ))}
    </div>
  );
};
