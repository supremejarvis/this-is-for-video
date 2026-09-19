'use client';

import React from 'react';

export interface PriceTagProps {
  amount: number | string;
  isB2B?: boolean;
  gstRate?: number;
  originalPrice?: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const PriceTag: React.FC<PriceTagProps> = ({
  amount,
  isB2B = false,
  gstRate = 18,
  originalPrice,
  size = 'md',
  showBadge = true,
}) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const numericOriginal = originalPrice ? (typeof originalPrice === 'string' ? parseFloat(originalPrice) || 0 : originalPrice) : null;

  const sizeClasses = {
    sm: 'text-base font-bold',
    md: 'text-xl font-extrabold',
    lg: 'text-2xl font-black',
    xl: 'text-3xl font-black',
  }[size];

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2">
        <span className={`text-slate-900 dark:text-white ${sizeClasses}`}>
          ₹{numericAmount.toLocaleString('en-IN')}
        </span>
        {numericOriginal && numericOriginal > numericAmount && (
          <span className="text-xs text-slate-400 line-through">
            ₹{numericOriginal.toLocaleString('en-IN')}
          </span>
        )}
      </div>
      {showBadge && (
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
          {isB2B ? `+ ${gstRate}% GST (B2B EXCL.)` : `INCL. ${gstRate}% GST (B2C)`}
        </span>
      )}
    </div>
  );
};
