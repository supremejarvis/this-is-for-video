'use client';

import React, { useEffect, Suspense, lazy } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '../storefront/Header';
import { Footer } from '../Footer';
import { WhatsAppButton } from '../WhatsAppButton';
import { Background } from '../Background';
import { useStore, rehydrateStoreFromStorage } from '../../store/useStore';
import { runStorageMigration } from '../../utils/storageMigration';
import { CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';

// Code-Split Lazy Loaded Global Modals & Drawers
const CartDrawer = lazy(() => import('../checkout/CartDrawer').then(m => ({ default: m.CartDrawer })));
const CheckoutModal = lazy(() => import('../checkout/CheckoutModal').then(m => ({ default: m.CheckoutModal })));
const AddressModal = lazy(() => import('../auth/AddressModal').then(m => ({ default: m.AddressModal })));
const AuthModal = lazy(() => import('../auth/AuthModal').then(m => ({ default: m.AuthModal })));
const CustomerAccountModal = lazy(() => import('../auth/CustomerAccountModal').then(m => ({ default: m.CustomerAccountModal })));
const ProductDetail = lazy(() => import('../storefront/ProductDetail').then(m => ({ default: m.ProductDetail })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
    <span className="text-xs text-slate-400 font-mono">Loading Apollo Engineering Portal...</span>
  </div>
);

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    setActiveTab, selectedProduct, 
    setSelectedProduct, toastMessage, setAppMode,
    isCheckoutOpen, isCartDrawerOpen,
    isAddressModalOpen, isAuthModalOpen, isAccountModalOpen
  } = useStore();

  const pathname = usePathname() || '/';

  // Startup: Safely rehydrate client storage, run migrations & verify backend session
  useEffect(() => {
    rehydrateStoreFromStorage();
    runStorageMigration();
    useStore.getState().checkAuthSession();
  }, []);

  // Sync navigation state with current URL
  useEffect(() => {
    const cleanPath = pathname.replace(/^\//, '').toLowerCase();

    if (cleanPath === 'admin' || cleanPath.startsWith('admin/')) {
      setActiveTab('admin');
      setAppMode('ADMIN');
    } else if (cleanPath === 'account') {
      setActiveTab('account');
    } else if (cleanPath === 'orders') {
      setActiveTab('orders');
    } else if (cleanPath === 'b2b' || cleanPath === 'b2b-portal') {
      setActiveTab('b2b');
      setAppMode('B2B');
    } else if (cleanPath === 'wishlist') {
      setActiveTab('wishlist');
    } else if (cleanPath === 'about') {
      setActiveTab('about');
    } else if (cleanPath === 'installation') {
      setActiveTab('installation');
    } else if (cleanPath === 'contact') {
      setActiveTab('contact');
    } else {
      setActiveTab('store');
    }
  }, [pathname, setActiveTab, setAppMode]);

  const isAdminRoute = pathname.toLowerCase() === '/admin' || pathname.toLowerCase().startsWith('/admin/');

  return (
    <div className="min-h-screen bg-bg-deep text-text-main font-sans selection:bg-accent selection:text-white relative flex flex-col justify-between">
      <Background />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[120] animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 backdrop-blur-md ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-500 text-rose-300'
              : toastMessage.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500 text-amber-300'
              : 'bg-blue-950/90 border-blue-500 text-blue-300'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header (Hidden during Add to Cart & Checkout process or when on Admin Portal) */}
      {!isCheckoutOpen && !isCartDrawerOpen && !isAdminRoute && (
        <Header />
      )}

      {/* Main Page Content or Product Detail Overlay */}
      <main className="relative">
        {selectedProduct ? (
          <div className="pt-8 pb-16 max-w-7xl mx-auto px-4">
            <button
              onClick={() => setSelectedProduct(null)}
              className="px-4 py-2 mb-6 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 border border-slate-300 shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              ← Back to Product Catalog
            </button>
            <Suspense fallback={<PageLoadingFallback />}>
              <ProductDetail />
            </Suspense>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Global Modals & Drawers */}
      {!isAdminRoute && isCartDrawerOpen && (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      )}
      {isCheckoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal />
        </Suspense>
      )}
      {isAddressModalOpen && (
        <Suspense fallback={null}>
          <AddressModal />
        </Suspense>
      )}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      )}
      {isAccountModalOpen && (
        <Suspense fallback={null}>
          <CustomerAccountModal />
        </Suspense>
      )}

      {/* Floating WhatsApp Assistance (Customer Storefront only) */}
      {!isAdminRoute && <WhatsAppButton />}

      {/* Footer (Customer Storefront only) */}
      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default AppLayout;
