import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingCart, MapPin, ChevronDown, ShieldCheck, 
  Building2, User, LayoutDashboard, Truck, Bell, Flame, CheckCircle2, Phone, Mail, Sparkles, Wrench, Info, Heart 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AppMode } from '../../types';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../../services/logisticsService';

export const Header: React.FC = () => {
  const { 
    appMode, setAppMode, activeTab, setActiveTab, 
    currentUser, activeAddress, cart, setIsCartDrawerOpen, 
    setIsAddressModalOpen, setIsAuthModalOpen, searchQuery, setSearchQuery, 
    selectedCategory, setSelectedCategory, setSelectedProduct, wishlist
  } = useStore();

  const navigate = useNavigate();
  const isB2B = Boolean(appMode === 'B2B' || (currentUser?.role && currentUser.role.includes('B2B')));

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = [
    'ALL',
    'SS304 GRADE',
    'GI SERIES',
    'FITTING SERIES',
    'COMPLETE KIT',
    'POWER SERIES',
    'CONTROL SERIES'
  ];

  const navigateTo = (tabName: string, path: string) => {
    setActiveTab(tabName);
    setSelectedProduct(null);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-[100] bg-white/85 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/60 shadow-lg shadow-black/5 text-slate-900 transition-all duration-300">
      {/* Main Frosted Glass Navigation Bar (Issues 14, 16: Centered & Balanced Max-W Container) */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4 sm:gap-6">
        {/* Brand Logo (Single-click: Store, Double-click: Admin Portal Login) */}
        <div 
          onClick={() => navigateTo('store', '/store')}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('admin', '/admin');
            useStore.getState().showToast('Opening Admin Portal Login...', 'info');
          }}
          title="Apollo Engineering"
          className="flex items-center cursor-pointer group flex-shrink-0 select-none"
        >
          <img 
            src="/logo.webp" 
            alt="Apollo Engineering Logo" 
            className="h-10 md:h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
          />
        </div>

        {/* Mega Search Engine with Category Dropdown - Desktop (Issues 12, 14, 16) */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-auto items-center">
          <div className="relative flex w-full rounded-2xl overflow-hidden shadow-inner border border-slate-300 bg-white/90 focus-within:ring-2 focus-within:ring-[#0054A6] transition-all">
            {/* Category selector (Issue 12: Clear category label & ARIA affordance) */}
            <div className="relative">
              <button
                type="button"
                id="header-category-dropdown"
                aria-label="Filter products by category"
                aria-haspopup="listbox"
                aria-expanded={isCategoryOpen}
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="h-10 px-3 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 border-r border-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <span className="text-slate-500 font-normal text-[11px]">Category:</span>
                <span className="truncate max-w-[85px] font-bold text-slate-900">{selectedCategory}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsCategoryOpen(false);
                        if (activeTab !== 'store') navigateTo('store', '/store');
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-[#0054A6] transition-colors ${
                        selectedCategory === cat ? 'bg-blue-50 text-[#0054A6] font-bold' : 'text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'store') setActiveTab('store');
              }}
              placeholder="Search SS304 Sprinklers, Drain Clips, Clamps, Tees, Pumps..."
              className="w-full h-10 px-3 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />

            {/* Search Icon Button */}
            <button 
              onClick={() => {
                if (activeTab !== 'store') navigateTo('store', '/store');
              }}
              aria-label="Submit search query"
              className="h-10 px-4 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold flex items-center justify-center transition-colors focus-visible:ring-2"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* User Account / KYC Profile & Dual Addresses (Full Screen) */}
          {currentUser.id === 'usr_guest' ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              aria-label="Sign In or Register for Apollo Engineering Account"
              className="h-10 flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0"
            >
              <User className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sign In / Register</span>
            </button>
          ) : (
            <button
              onClick={() => navigateTo('account', '/account')}
              aria-label={`View account profile for ${currentUser.name}`}
              className={`h-10 flex items-center gap-1.5 text-left px-2.5 sm:px-3 rounded-xl transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue shrink-0 ${
                activeTab === 'account'
                  ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm'
                  : 'bg-white hover:bg-slate-100/80 border-slate-200 text-slate-900 shadow-sm'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                activeTab === 'account' ? 'bg-white text-[#0054A6]' : 'bg-[#0054A6]/10 text-[#0054A6]'
              }`}>
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden lg:block leading-tight">
                <span className={`text-xs font-semibold block ${activeTab === 'account' ? 'text-blue-200' : 'text-slate-500'}`}>
                  Hello, {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-xs font-bold flex items-center gap-1">
                  Account & KYC <ChevronDown className="w-3 h-3 opacity-60" />
                </span>
              </div>
            </button>
          )}

          {/* Wishlist Button */}
          <button
            onClick={() => navigateTo('wishlist', '/wishlist')}
            aria-label={`View wishlist with ${wishlist.length} items`}
            className={`h-10 relative flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl font-bold text-xs transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 shrink-0 ${
              activeTab === 'wishlist'
                ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm'
                : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-700 shadow-sm'
            }`}
          >
            <Heart className={`w-4 h-4 shrink-0 ${wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="hidden md:inline">Wishlist</span>
            {wishlist.length > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-rose-500 text-white text-xs font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Cart Button with Counter */}
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            aria-label={`Cart (${totalCartCount} items)`}
            className="h-10 relative flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-sm hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0"
          >
            <div className="relative shrink-0">
              <ShoppingCart className="w-4 h-4 text-slate-950" />
              {totalCartCount > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-slate-950 text-white text-[11px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">Cart</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Engine Bar */}
      <div className="px-4 pb-2.5 md:hidden">
        <div className="relative flex w-full rounded-2xl overflow-hidden shadow-inner border border-slate-300 bg-white/90 focus-within:ring-2 focus-within:ring-[#0054A6] transition-all">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab !== 'store') setActiveTab('store');
            }}
            placeholder="Search SS304 Sprinklers, Drain Clips..."
            className="w-full h-9 px-3 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button 
            onClick={() => {
              if (activeTab !== 'store') navigateTo('store', '/store');
            }}
            aria-label="Submit search query"
            className="h-9 px-3.5 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold flex items-center justify-center transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Header Navigation Strips with Dedicated Multi-Page Routing (Issue 15: Balanced Max-W Container) */}
      {activeTab !== 'account' && (
        <div className="bg-slate-100/90 border-t border-slate-200/80 py-1.5">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-3">
            {/* Left: Isolated Store Mode Banner (Zero B2B in B2C, Zero B2C in B2B) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isB2B ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0054A6]/10 border border-[#0054A6]/30 text-[#0054A6] font-bold text-xs shadow-sm">
                  <Building2 className="w-3.5 h-3.5 text-[#0054A6]" />
                  <span>🏢 Apollo Commercial Wholesale Portal</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded ml-1">Verified GSTIN • 18% ITC</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-950 font-bold text-xs shadow-sm">
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                  <span>🛒 Apollo Retail Direct Store</span>
                  <span className="text-xs text-slate-600 font-medium whitespace-nowrap">• Priority Express Dispatch (382430)</span>
                </div>
              )}
            </div>

            {/* Right: Multi-Page Navigation (Balanced & Distributed) */}
            <nav aria-label="Quick Store Navigation" className="flex justify-start items-center gap-1.5 sm:gap-2 shrink-0">
              {/* APE Store (Products) */}
              <button
                onClick={() => navigateTo('store', '/store')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'store' ? 'bg-[#0054A6] text-white shadow-sm' : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                APE Store (Products)
              </button>

              {/* About Company */}
              <button
                onClick={() => navigateTo('about', '/about')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'about' ? 'bg-[#0054A6] text-white shadow-sm' : 'text-slate-700 hover:text-[#0054A6] hover:bg-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                About Company
              </button>

              {/* Installation & Why Us */}
              <button
                onClick={() => navigateTo('installation', '/installation')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'installation' ? 'bg-[#0054A6] text-white shadow-sm' : 'text-slate-700 hover:text-[#0054A6] hover:bg-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Installation & Why Us
              </button>

              {/* Contact & Map */}
              <button
                onClick={() => navigateTo('contact', '/contact')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'contact' ? 'bg-[#0054A6] text-white shadow-sm' : 'text-slate-700 hover:text-[#0054A6] hover:bg-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                Contact & Location
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
