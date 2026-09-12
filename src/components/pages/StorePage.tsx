import React, { useMemo } from 'react';
import { ProductCard } from '../ProductCard';
import { PdfCatalog } from '../PdfCatalog';
import { TrustedBy } from '../TrustedBy';
import { SolarBOMCalculator } from '../storefront/SolarBOMCalculator';
import { BuyerCatalog } from '../storefront/BuyerCatalog';
import { useStore } from '../../store/useStore';
import { Flame, Building2, Truck, CheckCircle2, ArrowRight } from 'lucide-react';
import { ORIGIN_HUB_PINCODE } from '../../constants';

export const StorePage: React.FC = () => {
  const { products, searchQuery, selectedCategory, setSelectedCategory, appMode, setAppMode, currentUser, setIsAuthModalOpen } = useStore();
  const isB2B = Boolean(appMode === 'B2B' || (currentUser?.role && currentUser.role.includes('B2B')));

  const categories = [
    'ALL',
    'SS304 GRADE',
    'GI SERIES',
    'FITTING SERIES',
    'COMPLETE KIT',
    'POWER SERIES',
    'CONTROL SERIES'
  ];

  // Derive unified display products from central store products
  const displayProducts = useMemo(() => {
    return products.map((p, idx) => {
      const primaryVariant = p.variants?.[0];
      const number = String(idx + 1).padStart(2, '0');
      const material = primaryVariant?.attributes?.material || p.category || 'SS304 Grade';
      const image = primaryVariant?.images?.[0] || p.aPlusContent?.[0]?.imageUrl || '/solar_sprinkler.webp';
      const price = String(primaryVariant?.b2cPrice || '220');

      return {
        asin: p.asin,
        number,
        name: p.title,
        material,
        tag: p.badges?.[0]?.replace(/_/g, ' ') || (idx === 0 ? 'BEST SELLER' : 'ORIGINAL APEX'),
        image,
        images: primaryVariant?.images || [image],
        videoUrl: p.videoUrl,
        description: p.description,
        features: p.highlights && p.highlights.length > 0 ? p.highlights : [
          'Shadow-Less Design — Minimizes shading on solar cells',
          'Uniform 180° Water Curtain Spread',
          'Low Water Consumption (4–7 LPM)',
          '100% SS304 Guaranteed Durability',
          '10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.'
        ],
        specs: primaryVariant ? [
          `Material: ${material}`,
          `SKU: ${primaryVariant.sku}`,
          `HSN: ${primaryVariant.hsnCode || '84248990'}`,
          `Weight: ${primaryVariant.weightGrams || 200}g`,
          `GST: ${primaryVariant.gstRatePercent || 18}% Incl.`
        ] : [
          'Material: SS304 Stainless Steel',
          'HSN: 84248990',
          'GST: 18% Incl.'
        ],
        price,
        sku: primaryVariant?.sku,
        reverse: idx % 2 !== 0
      };
    });
  }, [products]);

  // Memoized filter calculation for instant 60fps search
  const filteredProducts = useMemo(() => {
    return displayProducts.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        p.material.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'ALL' || 
        p.material.toUpperCase().includes(selectedCategory.toUpperCase()) || 
        p.name.toUpperCase().includes(selectedCategory.toUpperCase()) ||
        (selectedCategory === 'COMPLETE KIT' && p.number === '05') ||
        (selectedCategory === 'POWER SERIES' && p.number === '06') ||
        (selectedCategory === 'CONTROL SERIES' && p.number === '07');

      return matchesSearch && matchesCategory;
    });
  }, [displayProducts, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 space-y-12 w-full max-w-7xl mx-auto animate-fadeIn">

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ☀️ SIGNATURE "SOLAR ENGINEERED" STOREFRONT HERO SHOWCASE */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center pt-6 pb-10 overflow-hidden">
        {/* Warm Solar Ambient Lighting Flares */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[5%] left-[20%] w-[32rem] h-[32rem] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,rgba(212,175,55,0.04)_45%,transparent_75%)]" />
          <div className="absolute bottom-[10%] right-[15%] w-[28rem] h-[28rem] bg-[radial-gradient(circle_at_center,rgba(245,130,32,0.12)_0%,rgba(245,130,32,0.03)_45%,transparent_75%)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-[radial-gradient(circle_at_center,rgba(0,84,166,0.08)_0%,rgba(0,84,166,0.02)_50%,transparent_75%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          {/* Pioneered By Badge */}
          <div className="inline-flex items-center gap-2.5 px-6 py-2 rounded-full border border-solar-gold/50 bg-gradient-to-r from-solar-gold/15 via-solar-gold/5 to-solar-gold/15 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(212,175,55,0.20)]">
            <span className="text-solar-gold font-mono text-xs">✨</span>
            <span className="text-xs md:text-sm font-mono font-bold tracking-wide bg-gradient-to-r from-solar-gold via-accent to-solar-gold bg-clip-text text-transparent">
              Pioneered by Apollo Engineering
            </span>
            <span className="text-solar-gold font-mono text-xs">✨</span>
          </div>

          {/* First Introduced Pill */}
          <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full border border-solar-gold/40 bg-solar-gold/[0.08] backdrop-blur-sm mb-5">
            <div className="h-[1px] w-5 bg-gradient-to-r from-transparent to-solar-gold" />
            <span className="text-xs font-mono tracking-wider text-solar-gold font-bold">
              First Introduced · February 2025
            </span>
            <div className="h-[1px] w-5 bg-gradient-to-l from-transparent to-solar-gold" />
          </div>

          {/* Massive SOLAR ENGINEERED Title */}
          <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-black leading-[0.92] tracking-tighter mb-4 text-deep-blue">
            SOLAR<br />
            <span className="bg-gradient-to-r from-brand-blue via-solar-gold to-accent bg-clip-text text-transparent">
              ENGINEERED
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-xl md:text-2xl font-bold text-text-dim max-w-3xl leading-snug mb-2 font-display">
            India's First <span className="text-solar-gold underline decoration-solar-gold/40 underline-offset-4 font-black">Shadowless Solar Sprinklers</span> & <span className="text-accent underline decoration-accent/40 underline-offset-4 font-black">Auto Drain Clips</span>.
          </p>
          <p className="text-xs sm:text-sm font-mono text-slate-500 mb-8 max-w-xl">
            Designed, Developed, and Manufactured <em>in-house</em> by Apollo Engineering at Kathwada Factory Hub.
          </p>

          {/* 3 Signature Glass Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl mb-6">
            <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/90 shadow-lg hover:shadow-xl hover:border-solar-gold/40 transition-all text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-bold text-lg">
                ☀️
              </div>
              <h2 className="font-display font-black text-sm text-slate-900">Shadowless Design</h2>
              <p className="text-xs text-slate-600 leading-relaxed">No performance loss due to panel shadows. 100% full sun exposure.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/90 shadow-lg hover:shadow-xl hover:border-solar-gold/40 transition-all text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#0054A6] font-bold text-lg">
                💧
              </div>
              <h2 className="font-display font-black text-sm text-slate-900">Water Efficient</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Maximum cleaning with minimal water consumption (4–7 LPM low-flow).</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/90 shadow-lg hover:shadow-xl hover:border-solar-gold/40 transition-all text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-lg">
                🛡️
              </div>
              <h2 className="font-display font-black text-sm text-slate-900">Anti-Blocking SS304</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Guaranteed AISI 304 stainless steel ensures zero clogging and 10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers (rust/corrosion only).</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 🏪 STOREFRONT SELECTOR (B2C RETAIL DIRECT vs B2B WHOLESALE TRADE)  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 🛒 PURE ISOLATED STORE BANNER (ZERO B2B IN B2C, ZERO B2C IN B2B)  */}
      {isB2B && (
        <div className="p-5 rounded-2xl border border-blue-300 bg-white/95 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4 ring-2 ring-blue-500/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm bg-[#0054A6] text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-base text-slate-900">
                  🏢 B2B Commercial Wholesale Portal Active ({currentUser.name})
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300">
                  Verified B2B • 18% ITC GST Claimable
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Commercial wholesale trade rates unlocked. Real-time GST E-Invoicing (GSTR-1 B2B), Net-30 Purchase Orders & Heavy Pallet Freight active.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono font-bold text-[#0054A6] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
            <Building2 className="w-4 h-4" />
            <span>Enterprise Wholesale Account</span>
          </div>
        </div>
      )}

      {/* Live PostgreSQL-backed Production Catalog & Sizing Matrix with Integrated Toolbar (Gate 2C) */}
      <BuyerCatalog />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ☀️ SOLAR PLANT HARDWARE BOM & SAVINGS CALCULATOR (SUPERPOWER)    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <SolarBOMCalculator />

      {/* Interactive PDF Catalog Generator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <h3 className="text-2xl font-black text-slate-900">
          Need Complete Technical Data Sheets for EPC Tenders?
        </h3>
        <p className="text-xs text-slate-600 max-w-xl mx-auto">
          Generate and download our official high-resolution 2024–2026 Apollo Engineering Product Catalog in PDF format.
        </p>
        <PdfCatalog />
      </div>

      {/* Trusted By EPC Contractors */}
      <TrustedBy />
    </div>
  );
};
