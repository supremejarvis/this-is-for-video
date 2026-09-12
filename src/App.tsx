import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from './components/storefront/Header';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Background } from './components/Background';
import { CartDrawer } from './components/checkout/CartDrawer';
import { CheckoutModal } from './components/checkout/CheckoutModal';
import { AddressModal } from './components/auth/AddressModal';
import { AuthModal } from './components/auth/AuthModal';
import { CustomerAccountModal } from './components/auth/CustomerAccountModal';
import { useStore } from './store/useStore';
import { runStorageMigration } from './utils/storageMigration';
import { StorePage } from './components/pages/StorePage';
import { CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';

// Code-Split Lazy Loaded Secondary Pages
const AboutPage = lazy(() => import('./components/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const InstallationPage = lazy(() => import('./components/pages/InstallationPage').then(m => ({ default: m.InstallationPage })));
const ContactPage = lazy(() => import('./components/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const CustomerAccountPage = lazy(() => import('./components/pages/CustomerAccountPage').then(m => ({ default: m.CustomerAccountPage })));
const SuperAdminDashboard = lazy(() => import('./components/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const LiveOrderTracker = lazy(() => import('./components/logistics/LiveOrderTracker').then(m => ({ default: m.LiveOrderTracker })));
const B2BPortal = lazy(() => import('./components/b2b/B2BPortal').then(m => ({ default: m.B2BPortal })));
const WishlistPage = lazy(() => import('./components/pages/WishlistPage').then(m => ({ default: m.WishlistPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
    <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
    <span className="text-xs text-slate-400 font-mono">Loading Apollo Engineering Portal...</span>
  </div>
);

// SEO Meta component for each route
const SEOHead: React.FC<{ title: string; description: string; path: string }> = ({ title, description, path }) => {
  const fullTitle = `${title} | Apollo Engineering`;
  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`https://www.apolloengineering.co.in${path}`} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`https://www.apolloengineering.co.in${path}`} />
    </Helmet>
  );
};

export const App: React.FC = () => {
  const { 
    setActiveTab, selectedProduct, 
    setSelectedProduct, toastMessage, setAppMode,
    isCheckoutOpen, isCartDrawerOpen
  } = useStore();

  const navigate = useNavigate();
  const location = useLocation();

  // Startup: Run storage migration & verify backend session
  useEffect(() => {
    runStorageMigration();
    useStore.getState().checkAuthSession();
  }, []);

  // Sync React Router with tab state
  useEffect(() => {
    const path = location.pathname.replace(/^\//, '').toLowerCase();

    if (path === 'admin' || path.startsWith('admin/')) {
      setActiveTab('admin');
      setAppMode('ADMIN');
    } else if (path === 'account') {
      setActiveTab('account');
    } else if (path === 'orders') {
      setActiveTab('orders');
    } else if (path === 'b2b' || path === 'b2b-portal') {
      setActiveTab('b2b');
      setAppMode('B2B');
    } else if (path === 'wishlist') {
      setActiveTab('wishlist');
    } else if (path === 'about') {
      setActiveTab('about');
    } else if (path === 'installation') {
      setActiveTab('installation');
    } else if (path === 'contact') {
      setActiveTab('contact');
    } else {
      setActiveTab('store');
    }
  }, [location.pathname, setActiveTab, setAppMode]);

  const isAdminRoute = location.pathname.toLowerCase() === '/admin' || location.pathname.toLowerCase().startsWith('/admin/');

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

      {/* Multi-Page React Router Routes */}
      <main className="relative">
        {selectedProduct ? (
          <div className="pt-8 pb-16 max-w-7xl mx-auto px-4">
            <SEOHead 
              title={selectedProduct.title} 
              description={selectedProduct.description || `Buy ${selectedProduct.title} from Apollo Engineering - SS304 Solar Cleaning Hardware`}
              path={`/product/${selectedProduct.asin}`}
            />
            <button
              onClick={() => setSelectedProduct(null)}
              className="px-4 py-2 mb-6 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 border border-slate-300 shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              ← Back to Product Catalog
            </button>
            <Suspense fallback={<PageLoadingFallback />}>
              {React.createElement(
                lazy(() => import('./components/storefront/ProductDetail').then(m => ({ default: m.ProductDetail }))),
                {}
              )}
            </Suspense>
          </div>
        ) : (
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={
                <>
                  <SEOHead 
                    title="SS304 Solar Panel Cleaning Hardware" 
                    description="Apollo Engineering - India's leading manufacturer of SS304 stainless steel solar panel cleaning sprinklers, drain clips, and accessories. Direct factory dispatch from Kathwada GIDC, Ahmedabad."
                    path="/"
                  />
                  <StorePage />
                </>
              } />
              <Route path="/store" element={
                <>
                  <SEOHead 
                    title="SS304 Solar Panel Cleaning Hardware Store" 
                    description="Apollo Engineering - India's leading manufacturer of SS304 stainless steel solar panel cleaning sprinklers, drain clips, and accessories. Direct factory dispatch from Kathwada GIDC, Ahmedabad."
                    path="/store"
                  />
                  <StorePage />
                </>
              } />
              <Route path="/about" element={
                <>
                  <SEOHead title="About Us" description="Learn about Apollo Engineering - SS304 solar cleaning hardware manufacturer at Kathwada GIDC, Ahmedabad." path="/about" />
                  <AboutPage />
                </>
              } />
              <Route path="/installation" element={
                <>
                  <SEOHead title="Installation Guide" description="Step-by-step installation guide for Apollo Engineering solar panel cleaning sprinklers and drain clips." path="/installation" />
                  <InstallationPage />
                </>
              } />
              <Route path="/contact" element={
                <>
                  <SEOHead title="Contact Us" description="Contact Apollo Engineering for bulk orders, B2B inquiries, and support. Factory: Kathwada GIDC, Ahmedabad 382430." path="/contact" />
                  <ContactPage />
                </>
              } />
              <Route path="/admin/*" element={
                <>
                  <SEOHead title="Admin Dashboard" description="Apollo Engineering Admin Portal - Product management, orders, shipping, and analytics." path="/admin" />
                  <SuperAdminDashboard />
                </>
              } />
              <Route path="/orders" element={
                <>
                  <SEOHead title="Track Orders" description="Track your Apollo Engineering orders with real-time Priority Express tracking." path="/orders" />
                  <LiveOrderTracker />
                </>
              } />
              <Route path="/account" element={
                <>
                  <SEOHead title="My Account" description="Manage your Apollo Engineering account, orders, addresses, and preferences." path="/account" />
                  <CustomerAccountPage />
                </>
              } />
              <Route path="/b2b" element={
                <>
                  <SEOHead title="B2B Wholesale Portal" description="Apollo Engineering B2B portal for bulk orders, GSTIN verification, and wholesale pricing on SS304 hardware." path="/b2b" />
                  <B2BPortal />
                </>
              } />
              <Route path="/wishlist" element={
                <>
                  <SEOHead title="My Wishlist" description="Your saved products from Apollo Engineering. Move items to cart when ready to purchase." path="/wishlist" />
                  <WishlistPage />
                </>
              } />
              {/* Fallback to store for any unknown route */}
              <Route path="*" element={
                <>
                  <SEOHead 
                    title="SS304 Solar Panel Cleaning Hardware" 
                    description="Apollo Engineering - India's leading SS304 solar panel cleaning hardware manufacturer."
                    path="/"
                  />
                  <StorePage />
                </>
              } />
            </Routes>
          </Suspense>
        )}
      </main>

      {/* Global Modals & Drawers */}
      {!isAdminRoute && <CartDrawer />}
      <CheckoutModal />
      <AddressModal />
      <AuthModal />
      <CustomerAccountModal />

      {/* Floating WhatsApp Assistance (Customer Storefront only) */}
      {!isAdminRoute && <WhatsAppButton />}

      {/* Footer (Customer Storefront only) */}
      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default App;
