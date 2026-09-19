'use client';

import React from 'react';
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '../../types';

export interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  isB2B?: boolean;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  isB2B = false,
}) => {
  const price = item.unitPrice ?? item.b2cPrice ?? 0;
  const lineTotal = price * item.quantity;
  const title = item.productTitle || item.title || 'Solar Hardware';
  const variant = item.variantTitle || item.attributes?.thickness || item.attributes?.frameThickness || '';

  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-200 dark:border-slate-800 last:border-0">
      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
        <Image
          src={item.imageUrl || '/solar_sprinkler.webp'}
          alt={title}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
          {title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
          <span>SKU: {item.sku}</span>
          {variant && (
            <>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {variant}
              </span>
            </>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-extrabold text-[#0054A6]">
            ₹{price.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">
            {isB2B ? '+ GST' : 'incl. GST'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
          className="p-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Decrease quantity"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-semibold w-8 text-center text-slate-900 dark:text-slate-100">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(item.quantity + 1)}
          className="p-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          aria-label="Increase quantity"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="text-right min-w-[70px]">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
          ₹{lineTotal.toLocaleString('en-IN')}
        </div>
        <button
          onClick={onRemove}
          className="mt-1 text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
};
