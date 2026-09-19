'use client';

import React from 'react';
import Link from 'next/navigation';
import { Home, ShoppingBag, ShoppingCart, User, Layers } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useRouter, usePathname } from 'next/navigation';

export const MobileNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { cart, setIsCartDrawerOpen } = useStore();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Store', icon: ShoppingBag, path: '/store' },
    {
      label: 'Cart',
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : undefined,
      onClick: () => setIsCartDrawerOpen(true),
    },
    { label: 'Account', icon: User, path: '/account' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.path && pathname === item.path;

        return (
          <button
            key={item.label}
            onClick={() => {
              if (item.onClick) {
                item.onClick();
              } else if (item.path) {
                router.push(item.path);
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors relative ${
              isActive
                ? 'text-[#0054A6] font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 bg-[#0054A6] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
