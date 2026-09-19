'use client';

import React, { useState } from 'react';
import { 
  Star, Truck, Building2, Check, 
  ChevronRight, ShoppingCart, Eye, ShieldCheck, ArrowRight,
  Box, Sparkles, BadgeCheck, Scale, Layers, Info, Lock, Settings2,
  X, Package, Ruler, Calculator, AlertTriangle, Droplets, ShieldAlert, Sun, ArrowDown, CheckCircle2, RotateCw
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { calculateSpeedPostTariff } from '../../services/logisticsService';
import { ProductVariant, SellerListing } from '../../types';

export const ProductDetail: React.FC = () => {
  const { 
    selectedProduct, selectProductVariant, activeAddress, 
    appMode, addToCart, currentOrg, setIsCartDrawerOpen, cart,
    currentUser, setIsAuthModalOpen, apiCatalogError, showToast
  } = useStore();

  if (!selectedProduct) return null;

  const [selectedThickness, setSelectedThickness] = useState<number>(35);
  const [panelMountOrientation, setPanelMountOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [isKitBreakdownModalOpen, setIsKitBreakdownModalOpen] = useState(false);
  const [isFrameGuideModalOpen, setIsFrameGuideModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcPanelCount, setCalcPanelCount] = useState<number>(14);
  const [calcClipsPerPanel, setCalcClipsPerPanel] = useState<number>(2);
  const [isFrameConfirmModalOpen, setIsFrameConfirmModalOpen] = useState(false);
  const [frameConfirmedCheckbox, setFrameConfirmedCheckbox] = useState(false);

  const currentVariant: ProductVariant = 
    selectedProduct.variants.find((v) => v.sku === selectedProduct.selectedVariantSku) || 
    selectedProduct.variants[0];

  const sellerListings: SellerListing[] = 
    (selectedProduct.sellerListings && currentVariant && selectedProduct.sellerListings[currentVariant.sku]) || [
      {
        sellerId: 'seller_apollo_mfg',
        sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
        rating: 4.9,
        ratingCount: 1850,
        fulfillmentType: 'FBF',
        price: currentVariant?.b2cPrice || 20,
        shippingFee: 0,
        deliveryDays: 1,
        stock: currentVariant?.inventory || 50000,
        isWinningBuyBox: true,
        buyBoxScore: 98.5
      }
    ];

  const winningSeller = sellerListings.find((s) => s.isWinningBuyBox) || sellerListings[0];
  const otherSellers = sellerListings.filter((s) => s.sellerId !== winningSeller.sellerId);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedQty, setSelectedQty] = useState(1);
  const [is360Mode, setIs360Mode] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);

  const isDrainClip = Boolean(
    selectedProduct.title?.toLowerCase().includes('drain clip') ||
    selectedProduct.category?.toLowerCase().includes('drain') ||
    selectedProduct.asin.includes('CLIP') ||
    selectedProduct.asin === 'AP-DRAIN-02' ||
    currentVariant.attributes?.size ||
    currentVariant.sku?.startsWith('APE-SC')
  );

  const isDrainClipCartSku = (sku?: string) => Boolean(sku && (sku.startsWith('APE-SC') || sku.includes('CLIP') || sku.includes('DRAIN')));
  const cartDrainClipQty = cart.filter(i => isDrainClipCartSku(i.sku)).reduce((acc, i) => acc + i.quantity, 0);
  const combinedDrainClipQty = isDrainClip ? (cartDrainClipQty + selectedQty) : selectedQty;

  // Speed Post Tariff & Delivery calculation (Item Weight x Qty = Total Weight, dynamically live calculated)
  const totalWeightGrams = (currentVariant.weightGrams || 25) * selectedQty;
  const speedPostInfo = calculateSpeedPostTariff(activeAddress?.pincode || '382430', totalWeightGrams);
  const estDate = new Date();
  estDate.setDate(estDate.getDate() + speedPostInfo.deliveryDaysEstimate);
  const deliveryFormatted = estDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });

  // Strict Login Gate: B2B wholesale rate is ONLY active if customer has a logged-in B2B account
  const isB2BUser = Boolean(appMode === 'B2B' || (currentUser?.role && currentUser.role.includes('B2B')));
  let currentUnitPrice = currentVariant.b2cPrice || 20;
  let activeTierDiscount = 0;

  if (isDrainClip) {
    if (isB2BUser) {
      if (combinedDrainClipQty >= 2500 || selectedQty >= 2500) {
        currentUnitPrice = 10.00;
        activeTierDiscount = 50.0;
      } else if (combinedDrainClipQty >= 1000 || selectedQty >= 1000) {
        currentUnitPrice = 15.00;
        activeTierDiscount = 25.0;
      } else {
        currentUnitPrice = 17.00;
        activeTierDiscount = 15.0;
      }
    } else {
      currentUnitPrice = currentVariant.b2cPrice || 20.00;
      activeTierDiscount = 0;
    }
  } else if (isB2BUser && currentVariant.b2bTierPricing.length > 0) {
    const applicableTier = [...currentVariant.b2bTierPricing]
      .reverse()
      .find((tier) => selectedQty >= tier.minQty);
    if (applicableTier) {
      currentUnitPrice = applicableTier.pricePerUnit;
      activeTierDiscount = applicableTier.discountPercent;
    } else {
      currentUnitPrice = currentVariant.b2bTierPricing[0].pricePerUnit;
      activeTierDiscount = currentVariant.b2bTierPricing[0].discountPercent;
    }
  }

  const taxableValue = Math.round((currentUnitPrice / 1.18) * 100) / 100;
  const itcSavingsPerUnit = Math.round((currentUnitPrice - taxableValue) * 100) / 100;

  const isCombo = Boolean(selectedProduct.isComboBundle || currentVariant.isComboVariant || selectedProduct.asin === 'AP-FULLKIT-05');

  const handleSelectVariant = (sku: string) => {
    selectProductVariant(selectedProduct.asin, sku);
    setActiveImageIndex(0);
    if (isCombo) {
      setIsKitBreakdownModalOpen(true);
    }
  };

  const executeAddToCart = () => {
    addToCart({
      sku: currentVariant.sku,
      parentAsin: selectedProduct.asin,
      productTitle: selectedProduct.title,
      variantTitle: currentVariant.title,
      attributes: currentVariant.attributes as Record<string, string>,
      imageUrl: currentVariant.images[0] || 'https://images.unsplash.com/photo-1580481077197-76c79a42f65a?w=800&auto=format&fit=crop&q=80',
      unitPrice: currentUnitPrice,
      mrp: currentVariant.mrp,
      gstRate: currentVariant.gstRatePercent,
      hsnCode: currentVariant.hsnCode,
      sellerId: winningSeller.sellerId,
      sellerName: winningSeller.sellerName,
      fulfillmentType: winningSeller.fulfillmentType,
      weightGrams: currentVariant.weightGrams,
      isB2BPricingApplied: isB2BUser
    }, selectedQty);
    // Note: Do not auto-open cart drawer; product is silently added to cart
  };

  const handleAddToCart = () => {
    if (apiCatalogError) {
      showToast('Live price and availability are temporarily unavailable. Please try again shortly.', 'warning');
      return;
    }
    if (isDrainClip) {
      setFrameConfirmedCheckbox(false);
      setIsFrameConfirmModalOpen(true);
      return;
    }
    executeAddToCart();
  };

  // Google SEO Schema.org Structured Data for Rich Snippets
  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `https://www.apolloengineering.co.in/#product-${selectedProduct.asin}`,
        "name": selectedProduct.title,
        "image": currentVariant.images[0] ? `https://www.apolloengineering.co.in${currentVariant.images[0]}` : undefined,
        "description": selectedProduct.description,
        "sku": currentVariant.sku,
        "mpn": currentVariant.sku,
        "brand": {
          "@type": "Brand",
          "name": selectedProduct.brand
        },
        "manufacturer": {
          "@type": "Organization",
          "name": "Apollo Engineering",
          "url": "https://www.apolloengineering.co.in"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": selectedProduct.rating.toString(),
          "reviewCount": selectedProduct.reviewCount.toString(),
          "bestRating": "5",
          "worstRating": "1"
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "INR",
          "lowPrice": currentVariant.b2bTierPricing.length > 0 
            ? currentVariant.b2bTierPricing[currentVariant.b2bTierPricing.length - 1].pricePerUnit 
            : currentVariant.b2cPrice,
          "highPrice": currentVariant.mrp,
          "offerCount": selectedProduct.variants.length,
          "availability": currentVariant.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": "Apollo Engineering"
          },
          "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "IN",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": 7,
            "returnMethod": "https://schema.org/ReturnByMail",
            "returnFees": "https://schema.org/FreeReturn"
          },
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "IN" },
            "shippingRate": { "@type": "MonetaryAmount", "value": 0, "currency": "INR" }
          }
        },
        "hasVariant": selectedProduct.variants.map((v) => ({
          "@type": "Product",
          "name": v.title,
          "sku": v.sku,
          "gtin13": v.barcode,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "INR",
            "price": v.b2cPrice,
            "availability": v.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        }))
      },
      {
        "@type": "FAQPage",
        "@id": `https://www.apolloengineering.co.in/#faq-${selectedProduct.asin}`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do I measure my solar panel frame thickness before ordering?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Use a simple ruler or vernier caliper to measure the outer aluminum frame lip of your solar panel from front glass edge to back. Most Indian rooftop solar modules (Tata Power, Vikram Solar, Waaree, Adani) are either 30mm or 35mm. Apollo SS304 clips are available in precision sizes: 28mm, 30mm, 33mm, 35mm, and 40mm for an exact snap-on fit."
            }
          },
          {
            "@type": "Question",
            "name": "How does the Apollo SS304 auto drain clip siphon water without electricity?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The Apollo Drain Clip uses natural capillary action and surface tension siphon physics. When rainwater or dew pools along the lower edge of tilted solar panels, the stainless steel channel creates a negative pressure capillary draw, continuously siphoning water and suspended dust over the frame edge in under 60 seconds."
            }
          },
          {
            "@type": "Question",
            "name": "Why are Apollo SS304 drain clips better than plastic drain clips?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Plastic clips degrade rapidly under UV exposure, becoming brittle and snapping within 4 to 6 months in Indian summer temperatures (65°C+ on PV surfaces). Apollo drain clips are made of 100% austenitic AISI SS304 stainless steel with a 25+ year lifespan, zero UV degradation, and permanent spring-tension grip."
            }
          },
          {
            "@type": "Question",
            "name": "How many drain clips do I need per solar panel?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "For standard portrait installation, 2 drain clips per solar panel placed at the bottom frame corners are recommended. For landscape installation or heavy dust and industrial zones, 4 drain clips per panel ensure complete edge clearance."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-8 animate-fadeIn">
      {/* Google SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium" aria-label="Breadcrumb">
        <span className="hover:text-[#0054A6] cursor-pointer transition-colors">Store</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="hover:text-[#0054A6] cursor-pointer transition-colors">{selectedProduct.category}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="hover:text-[#0054A6] cursor-pointer transition-colors">{selectedProduct.subCategory}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold truncate max-w-xs sm:max-w-md">{selectedProduct.title}</span>
      </nav>

      {/* Main 3-Column Product Showcase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* Left Column: Media Gallery & 360 View */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
          <div className="relative bg-white border border-slate-200/90 rounded-3xl overflow-hidden aspect-square flex items-center justify-center p-6 shadow-md hover:shadow-xl transition-all duration-300 group">
            {!is360Mode ? (
              <img
                src={currentVariant.images[activeImageIndex] || currentVariant.images[0]}
                alt={selectedProduct.title}
                className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none bg-slate-50/80 rounded-2xl"
                onMouseMove={(e) => {
                  if (e.buttons === 1) {
                    setRotationAngle((prev) => (prev + e.movementX) % 360);
                  }
                }}
              >
                <div 
                  className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-dashed border-[#0054A6]/30 flex items-center justify-center transition-transform"
                  style={{ transform: `rotate(${rotationAngle}deg)` }}
                >
                  <img
                    src={currentVariant.images[0]}
                    alt="360 View"
                    className="max-h-52 object-contain"
                  />
                </div>
                <span className="text-xs text-[#0054A6] font-mono font-bold mt-4 flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  <RotateCw className="w-4 h-4 text-[#0054A6]" /> Drag left/right to spin 360° ({Math.abs(rotationAngle)}°)
                </span>
              </div>
            )}

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
              {selectedProduct.badges.map((b) => (
                <span key={b} className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm border border-amber-400">
                  {b.replace(/_/g, ' ')}
                </span>
              ))}
            </div>

            {/* 360 Toggle Button */}
            <button
              onClick={() => setIs360Mode(!is360Mode)}
              className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-slate-800 hover:text-[#0054A6] text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:border-[#0054A6]"
            >
              <Eye className="w-4 h-4 text-[#0054A6]" />
              {is360Mode ? 'Standard View' : '360° Interactive'}
            </button>
          </div>

          {/* Thumbnails */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {currentVariant.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveImageIndex(idx);
                  setIs360Mode(false);
                }}
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border-2 overflow-hidden bg-white p-1.5 flex-shrink-0 transition-all ${
                  activeImageIndex === idx && !is360Mode 
                    ? 'border-[#0054A6] ring-2 ring-[#0054A6]/20 shadow-md scale-105' 
                    : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300 shadow-sm'
                }`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Middle Column: Product Details, Variant Matrix & B2B Tiers */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0054A6] text-xs font-mono font-bold tracking-wider uppercase inline-block">
              Brand: {selectedProduct.brand}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display leading-tight tracking-tight">
              {selectedProduct.title}
            </h1>
            
            {/* Rating */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-900">{selectedProduct.rating}</span>
              <span className="text-xs text-slate-500">({selectedProduct.reviewCount.toLocaleString()} ratings)</span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                1000+ bought in past month
              </span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isB2BUser
                  ? 'bg-blue-100 text-[#0054A6] border border-blue-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {isB2BUser ? '🏢 B2B Commercial Wholesale Price' : '🛒 B2C Retail Direct Price'}
              </span>
              {isB2BUser && currentVariant.b2bTierPricing.length > 0 && (
                <span className="text-[10px] font-mono text-slate-500">
                  MOQ: {currentVariant.b2bTierPricing[0].minQty} Units
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                ₹{currentUnitPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-sm font-semibold text-slate-500 font-mono">
                /{currentVariant.unitOfMeasure || selectedProduct.unitOfMeasure || 'unit'}
              </span>
              <span className="text-base line-through text-slate-400 font-mono">
                ₹{currentVariant.mrp.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                {Math.round(((currentVariant.mrp - currentUnitPrice) / currentVariant.mrp) * 100)}% OFF
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Inclusive of all taxes (GST <strong className="text-slate-900 font-bold">{currentVariant.gstRatePercent !== undefined ? currentVariant.gstRatePercent : 18}%</strong> • HSN: <strong className="text-slate-900 font-mono font-bold">{currentVariant.hsnCode}</strong>)
            </p>


            {/* B2B Wholesale Tier Pricing Slabs (Only for verified B2B users) */}
            {isB2BUser && currentVariant.b2bTierPricing.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">Wholesale Bulk Slab Pricing:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentVariant.b2bTierPricing.map((tier, idx) => {
                    const isCurrentTier = selectedQty >= tier.minQty && (!tier.maxQty || selectedQty <= tier.maxQty);
                    return (
                      <div 
                        key={idx}
                        className={`p-2 rounded-xl border text-center text-xs ${
                          isCurrentTier
                            ? 'bg-blue-50 border-[#0054A6] font-bold text-[#0054A6] ring-1 ring-[#0054A6]'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <div className="text-[10px] text-slate-500 font-mono">
                          {tier.minQty}+ Units
                        </div>
                        <div className="font-mono font-black text-slate-900">
                          ₹{tier.pricePerUnit}
                        </div>
                        <div className="text-[9px] text-emerald-600 font-bold">
                          {tier.discountPercent}% Off
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* B2B Input Tax Credit (ITC) Badge */}
            {isB2BUser && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs bg-blue-50/70 p-3 rounded-2xl border border-blue-200/80">
                <div>
                  <span className="text-[#0054A6] font-bold block">Input Tax Credit (ITC) Savings:</span>
                  <span className="text-[11px] text-slate-600">Claim 18% GST with your business GSTIN</span>
                </div>
                <div className="text-right font-mono font-black text-emerald-700 text-sm">
                  -₹{itcSavingsPerUnit.toLocaleString('en-IN')}/unit
                </div>
              </div>
            )}
          </div>

          {/* Multi-Dimensional Variant Selector (Parent-Child ASIN) */}
          <div className="space-y-3">
            {/* Solar Plant Capacity (kW) Quick Selector (3kW / 5kW / 10kW) */}
            {isCombo && (
              <div className="space-y-2.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 rounded-3xl border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black font-display text-blue-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Select Solar Plant Capacity (Click to Open Popup):
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsKitBreakdownModalOpen(true)}
                    className="text-[11px] font-bold text-[#0054A6] hover:underline flex items-center gap-1 font-mono bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" /> Open Popup
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {selectedProduct.variants.map((v) => {
                    const isSelected = v.sku === currentVariant.sku;
                    const kwText = v.title.includes('3 kW') ? '3 kW Kit' : v.title.includes('5 kW') ? '5 kW Kit' : v.title.includes('10 kW') ? '10 kW Kit' : v.title.slice(0, 10);
                    const panelCount = v.solarKitConfig?.panelCount || (v.title.includes('3 kW') ? 6 : v.title.includes('5 kW') ? 10 : 20);
                    return (
                      <button
                        key={v.sku}
                        type="button"
                        onClick={() => handleSelectVariant(v.sku)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 shadow-sm hover:scale-[1.03] ${
                          isSelected
                            ? 'bg-white border-[#0054A6] ring-2 ring-[#0054A6] text-slate-900 shadow-md font-bold'
                            : 'bg-white/80 border-slate-200 hover:border-blue-300 text-slate-700'
                        }`}
                      >
                        <span className="font-display font-black text-sm text-[#0054A6]">{kwText}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">{panelCount} Panels</span>
                        <span className="font-mono font-black text-xs text-amber-700">₹{v.b2cPrice.toLocaleString('en-IN')}</span>
                        <span className="text-[9px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-bold font-mono">
                          🔍 View Items
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catalog Variation Matrix (Only for non-combo products since combo kits use the kW capacity selector above) */}
            {!isCombo && (
              <>
                {selectedProduct.variants.some(v => v.attributes.size) ? (
                  /* ─── SMART SOLAR FRAME THICKNESS SELECTOR (EASY, SMART & INTUITIVE) ─── */
                  <div className="space-y-4 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 sm:p-5 rounded-3xl border border-blue-100 shadow-sm">
                    {/* Header with Title and Measure Guide Trigger */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-[#0054A6]" /> Select Solar Frame Thickness (mm):
                          </span>
                          <span className="text-[11px] font-mono font-black text-[#0054A6] bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {currentVariant.attributes.size || '35mm'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Measure outer aluminum frame lip before ordering for precision snap-on grip
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsFrameGuideModalOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-blue-200 text-[#0054A6] text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 shrink-0 hover:border-blue-400"
                      >
                        <Ruler className="w-3.5 h-3.5 text-blue-600" /> Sizing Guide
                      </button>
                    </div>

                    {/* Horizontal Frame Size Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {selectedProduct.variants.map((v) => {
                        const isSelected = v.sku === currentVariant.sku;
                        const size = v.attributes.size || '35mm';
                        const popularLabel = size.includes('35') 
                          ? '⭐ Popular Rooftop' 
                          : size.includes('30') 
                          ? 'Bifacial / TOPCon' 
                          : size.includes('28') 
                          ? 'Thin Profile' 
                          : size.includes('40') 
                          ? 'Utility 72-Cell' 
                          : '330W Poly/Mono';

                        return (
                          <button
                            key={v.sku}
                            type="button"
                            onClick={() => handleSelectVariant(v.sku)}
                            className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1 shadow-sm hover:scale-[1.02] ${
                              isSelected
                                ? 'bg-white border-[#0054A6] ring-2 ring-[#0054A6] text-slate-900 shadow-md font-bold'
                                : 'bg-white/80 border-slate-200 hover:border-blue-300 text-slate-700'
                            }`}
                          >
                            <span className="text-base font-black font-mono text-slate-900">{size}</span>
                            <span className="text-[9px] font-bold text-[#0054A6] bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 truncate w-full">
                              {popularLabel}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              SKU: {v.sku.length > 9 ? v.sku.slice(0, 9) + '…' : v.sku}
                            </span>
                            <span className="text-xs font-black font-mono text-amber-700">
                              ₹{v.b2cPrice.toLocaleString('en-IN')}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* ⚠️ Warning Notice about Frame Measurement */}
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>⚠️ Measure Before Ordering:</strong> SS304 clips use precision spring tension for exact millimeters (28mm / 30mm / 33mm / 35mm / 40mm). Ordering an incorrect size may delay installation.
                      </div>
                    </div>

                    {/* ⚡ Solar Panel Array Clip Requirement Calculator */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-emerald-600" />
                          Solar Array Clip Calculator:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newClips = calcClipsPerPanel === 2 ? 3 : 2;
                              setCalcClipsPerPanel(newClips);
                              setSelectedQty(calcPanelCount * newClips);
                            }}
                            className="text-[10px] font-mono text-[#0054A6] hover:underline font-bold"
                          >
                            Mounting Mode: {calcClipsPerPanel} Clips/Panel ({calcClipsPerPanel === 2 ? 'Portrait (2 Clips)' : 'Landscape (3 Clips)'})
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { kw: '3 kW', panels: 8 },
                          { kw: '5 kW', panels: 14 },
                          { kw: '10 kW', panels: 28 },
                          { kw: '20 kW', panels: 56 }
                        ].map(item => (
                          <button
                            key={item.kw}
                            type="button"
                            onClick={() => {
                              setCalcPanelCount(item.panels);
                              setSelectedQty(item.panels * calcClipsPerPanel);
                            }}
                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                              calcPanelCount === item.panels
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div>{item.kw}</div>
                            <div className="text-[9px] font-mono text-slate-500 font-normal">{item.panels} Panels</div>
                          </button>
                        ))}
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-slate-700">
                          <span>{calcPanelCount} Panels × {calcClipsPerPanel} Clips = </span>
                          <strong className="text-emerald-700 font-mono text-sm">{calcPanelCount * calcClipsPerPanel} Clips Required</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedQty(calcPanelCount * calcClipsPerPanel)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all"
                        >
                          Apply ({calcPanelCount * calcClipsPerPanel} pcs) to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                        Catalog Variation Matrix:
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Click to switch & view details
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {selectedProduct.variants.map((v) => {
                        const isSelected = v.sku === currentVariant.sku;
                        return (
                          <button
                            key={v.sku}
                            onClick={() => handleSelectVariant(v.sku)}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between shadow-sm ${
                              isSelected
                                ? 'bg-blue-50/90 border-[#0054A6] ring-2 ring-[#0054A6]/20 text-slate-900 shadow-md'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/60'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-900">{v.title}</div>
                              <span className="text-[11px] text-slate-500 font-mono">SKU: {v.sku} | Stock: {v.inventory} units</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-sm text-[#0054A6] font-mono block">₹{v.b2cPrice.toLocaleString('en-IN')}</span>
                              {isSelected && <span className="block text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 rounded">Selected & Open</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* B2B Tier Pricing Matrix (Only for verified B2B users) */}
          {isB2BUser && currentVariant.b2bTierPricing.length > 0 && (
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 p-5 rounded-3xl border border-blue-900/50 space-y-3 text-white shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" /> B2B Wholesale Quantity Tier Discounts
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  MOQ Applied
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {currentVariant.b2bTierPricing.map((tier, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-xl border transition-all ${
                      selectedQty >= tier.minQty && (!tier.maxQty || selectedQty <= tier.maxQty)
                        ? 'bg-amber-500/20 border-amber-400 text-white font-bold shadow-md ring-1 ring-amber-400'
                        : 'bg-white/10 border-white/15 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] block text-slate-300 mb-0.5">
                      {tier.maxQty ? `${tier.minQty}-${tier.maxQty} pcs` : `${tier.minQty}+ pcs`}
                    </span>
                    <span className="font-bold font-mono text-amber-300 text-xs">₹{tier.pricePerUnit}</span>
                    {tier.discountPercent > 0 && (
                      <span className="text-[10px] block text-emerald-400 font-bold">-{tier.discountPercent}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 📦 INCLUDED COMBO COMPONENTS BANNER (ONLY OPENS IN POPUP)     */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentVariant.isComboVariant && currentVariant.comboComponents && currentVariant.comboComponents.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 rounded-3xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0054A6] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs text-slate-900 font-display">
                      Complete {currentVariant.solarKitConfig?.plantCapacityKw || 3} kW Installation Kit ({currentVariant.comboComponents.length} Included Products)
                    </strong>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Fixed Bundle
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Sprinklers, Drain Clips, GI Clamps, Automation Timer, Booster Motor & UPVC Tees
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKitBreakdownModalOpen(true)}
                className="px-4 py-2 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105 shrink-0"
              >
                <Eye className="w-4 h-4" />
                <span>View Breakdown Popup</span>
              </button>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Key Specifications</span>
            <ul className="space-y-2 text-xs text-slate-700">
              {selectedProduct.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span className="leading-snug">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Right Column: Buy Box & India Post SLA */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 xl:col-span-3 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-5 shadow-lg">
            {/* Price Header */}
            <div>
              <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{(currentUnitPrice * selectedQty).toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-slate-500">
                ({selectedQty} {selectedQty > 1 ? 'units' : 'unit'} @ ₹{currentUnitPrice}/unit)
              </span>
            </div>

            {/* APE Express Priority Shipping Widget */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>APE Express Priority Shipping</span>
              </div>

              <p className="text-slate-700">
                Guaranteed Delivery: <strong className="text-slate-900 font-bold">{deliveryFormatted}</strong>
              </p>

              <div className="text-[11px] text-slate-600 border-t border-slate-200/80 pt-2 space-y-1">
                <div>
                  Deliver to: <strong className="text-[#0054A6] font-bold">{activeAddress ? `${activeAddress.postOffice.name} (${activeAddress.pincode})` : 'Kathwada Hub (382430)'}</strong>
                </div>
                <div className="text-emerald-700 font-bold">
                  APE Shipping Freight: ₹{speedPostInfo.totalPostage}
                </div>
              </div>
            </div>

            {/* Stock Status */}
            <div>
              {currentVariant.inventory > 0 ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full w-fit">
                  <Check className="w-3.5 h-3.5" />
                  In Stock ({Math.max(50000, currentVariant.inventory).toLocaleString('en-IN')} units available)
                </div>
              ) : (
                <div className="text-rose-600 font-bold text-xs bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full w-fit">
                  Temporarily Out of Stock
                </div>
              )}
            </div>

            {/* Drain Clip Tier Pricing Information Banner */}
            {isDrainClip && (
              isB2BUser ? (
                <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-200 rounded-2xl space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0054A6] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#0054A6]" />
                      B2B Volume Tier Rates (Mix &amp; Match Any Sizes):
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">28 / 30 / 33 / 35 / 40 mm</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className={`p-2.5 rounded-xl border transition-all ${combinedDrainClipQty < 1000 ? 'bg-white border-blue-400 shadow-xs ring-1 ring-blue-400/30' : 'bg-slate-50/80 border-slate-200 text-slate-500'}`}>
                      <div className="text-[9px] uppercase font-bold text-slate-500">1 - 999 pcs</div>
                      <div className="text-sm font-black font-mono text-slate-900 mt-0.5">₹17.00 <span className="text-[9px] font-normal text-slate-500">/ pc</span></div>
                    </div>
                    <div className={`p-2.5 rounded-xl border transition-all ${combinedDrainClipQty >= 1000 && combinedDrainClipQty < 2500 ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-400/20' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <div className="text-[9px] uppercase font-bold flex items-center justify-between text-[#0054A6]">
                        <span>1,000+ pcs</span>
                        <span className="bg-[#0054A6] text-white text-[8px] px-1 py-0.2 rounded font-black">SAVE 25%</span>
                      </div>
                      <div className="text-sm font-black font-mono text-blue-950 mt-0.5">₹15.00 <span className="text-[9px] font-normal text-blue-700">/ pc</span></div>
                    </div>
                    <div className={`p-2.5 rounded-xl border transition-all ${combinedDrainClipQty >= 2500 ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-400/20' : 'bg-white border-dashed border-emerald-300 text-emerald-800'}`}>
                      <div className="text-[9px] uppercase font-bold flex items-center justify-between text-emerald-700">
                        <span>2,500+ pcs</span>
                        <span className="bg-emerald-600 text-white text-[8px] px-1 py-0.2 rounded font-black">SAVE 50%</span>
                      </div>
                      <div className="text-sm font-black font-mono text-emerald-900 mt-0.5">₹10.00 <span className="text-[9px] font-normal text-emerald-700">/ pc</span></div>
                    </div>
                  </div>
                  {cartDrainClipQty > 0 ? (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-blue-100">
                      <span>In Cart: <strong className="font-mono text-slate-900">{cartDrainClipQty} pcs</strong></span>
                      <span>Combined Total: <strong className="font-mono text-[#0054A6]">{combinedDrainClipQty} pcs</strong></span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic">
                      Tip: Order 1,000+ pcs for ₹15/pc or 2,500+ pcs for ₹10/pc wholesale rate across any combination of sizes.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 font-medium">Standard Retail: <strong className="font-mono text-slate-900 font-bold">₹20.00 / pc</strong> (Incl. 18% GST)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">Kathwada Factory Stock</span>
                </div>
              )
            )}

            {/* Smart Quantity Selector */}
            <div className="space-y-2.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0054A6]" />
                  {isB2BUser ? 'Wholesale Quantity (pcs):' : 'Order Quantity (units):'}
                </label>
                {isDrainClip && isB2BUser && (
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                    selectedQty >= 2500 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : selectedQty >= 1000 
                      ? 'bg-blue-100 text-blue-800 border-blue-300' 
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {selectedQty >= 2500 ? '✓ Mega Bulk ₹10/pc' : selectedQty >= 1000 ? '✓ Bulk ₹15/pc' : 'Standard ₹17/pc'}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* Stepper Buttons & Numeric Input */}
                <div className="flex items-center bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-[#0054A6]/20 focus-within:border-[#0054A6]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setSelectedQty(Math.max(1, selectedQty - (isB2BUser ? (selectedQty > 500 ? 100 : (selectedQty > 50 ? 50 : 10)) : 1)))}
                    className="h-10 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center text-base select-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    aria-label="Order quantity in units"
                    min={1}
                    max={Math.max(50000, currentVariant.inventory || 50000)}
                    value={selectedQty}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSelectedQty(isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    className="w-24 h-10 text-center text-sm font-mono font-black text-slate-900 focus:outline-none bg-transparent"
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setSelectedQty(selectedQty + (isB2BUser ? (selectedQty >= 500 ? 100 : (selectedQty >= 50 ? 50 : 10)) : 1))}
                    className="h-10 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center text-base select-none"
                  >
                    +
                  </button>
                </div>

                {/* Live Estimated Line Total */}
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-500 block">Est. Subtotal</span>
                  <strong className="text-lg font-black text-slate-900">
                    ₹{(selectedQty * currentUnitPrice).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Buy Box Winning Seller Information */}
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 space-y-1">
              <div className="flex justify-between">
                <span>Sold by:</span>
                <strong className="text-slate-900 font-bold">{winningSeller?.sellerName || 'Apollo Engineering (Direct Factory Hub 382430)'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Fulfillment:</span>
                <strong className="text-[#0054A6] font-bold">{winningSeller?.fulfillmentType === 'FBF' ? 'Fulfilled by Platform (FBF)' : 'Merchant Direct'}</strong>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2 space-y-2">
              {apiCatalogError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Live price and availability are temporarily unavailable. Please try again shortly.</span>
                </div>
              )}
              <button
                onClick={handleAddToCart}
                disabled={Boolean(apiCatalogError)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {apiCatalogError ? 'Unavailable' : 'Add to Cart'}
              </button>
            </div>
          </div>

          {/* Comparative Other Sellers on Platform */}
          {otherSellers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 text-xs shadow-sm">
              <span className="font-bold text-slate-900 block">Other Sellers on Platform ({otherSellers.length}):</span>
              {otherSellers.map((seller) => (
                <div key={seller.sellerId} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{seller.sellerName}</span>
                    <span className="text-[10px] text-slate-500">Rating: {seller.rating}★ | {seller.deliveryDays} Day Delivery</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-slate-900 block">₹{seller.price.toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => {
                        addToCart({
                          sku: currentVariant.sku,
                          parentAsin: selectedProduct.asin,
                          productTitle: selectedProduct.title,
                          variantTitle: currentVariant.title,
                          attributes: currentVariant.attributes as Record<string, string>,
                          imageUrl: currentVariant.images[0],
                          unitPrice: seller.price,
                          mrp: currentVariant.mrp,
                          gstRate: currentVariant.gstRatePercent,
                          hsnCode: currentVariant.hsnCode,
                          sellerId: seller.sellerId,
                          sellerName: seller.sellerName,
                          fulfillmentType: seller.fulfillmentType,
                          weightGrams: currentVariant.weightGrams,
                          isB2BPricingApplied: false
                        }, 1);
                      }}
                      className="px-3 py-1 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-[10px] rounded-lg mt-1 shadow-sm transition-all"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ☀️ MUD BELT ELIMINATION & HOTSPOT FIRE RISK PREVENTION CARD     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mt-8 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 border border-blue-900/60 shadow-xl overflow-hidden relative">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-800/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-bold">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">Physics of Auto Siphon Drainage</span>
              <h3 className="text-xl font-black font-display text-white">How Apollo SS304 Clips Eliminate Mud Belts & Fire Hazards</h3>
            </div>
          </div>
          <span className="px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> 100% Zero Electricity & Zero Moving Parts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Without Clip (The Critical Hazard) */}
          <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-800/50 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Without Drain Clip (The Mud Belt Hazard)</span>
            </div>
            <ul className="space-y-2 text-xs text-rose-100/90">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span><strong>Mud Belt Accumulation:</strong> Rainwater and dew pool against the lower frame edge. As water evaporates, dust and grime bake into a permanent dirty band.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span><strong>Hotspot & Fire Hazard:</strong> Shaded bottom cells act as electrical resistors, heating up to 130°C+ and triggering bypass diode burnout and solar module fire risk.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">✕</span>
                <span><strong>15%–20% Power Loss:</strong> Dirty lower border strings cut total inverter string generation day after day.</span>
              </li>
            </ul>
          </div>

          {/* With Apollo SS304 Drain Clip (The Solution) */}
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-700/50 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>With Apollo SS304 Auto Drain Clip (The Solution)</span>
            </div>
            <ul className="space-y-2 text-xs text-emerald-100/90">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Instant Capillary Siphon:</strong> Stainless steel tension contour creates a natural capillary siphon that drains water over the frame lip within 60 seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Zero Mud, Zero Hotspots:</strong> Bottom cells stay spotless and clean. Bypass diodes run cool, preventing PID cell breakdown and eliminating fire hazards.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>25+ Year SS304 Lifespan:</strong> Marine-grade austenitic SS304 spring steel never breaks under intense rooftop UV, unlike cheap plastic clips that snap in 4 months.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* A+ ENHANCED BRAND CONTENT: SS304 COMPARISON TABLE            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mt-8 space-y-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider">A+ Enhanced Engineering Benchmark</span>
                <h3 className="text-lg font-black text-slate-900 font-display">Apollo AISI SS304 vs Standard Generic Clamps</h3>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-600" /> 10-Year Rust-Proof Warranty
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
                  <th className="py-3 px-4 w-1/3">Engineering Metric</th>
                  <th className="py-3 px-4 w-1/3 bg-blue-50/70 text-[#0054A6] font-bold rounded-t-xl">
                    Apollo Engineering (AISI SS304)
                  </th>
                  <th className="py-3 px-4 w-1/3 text-slate-400">
                    Standard Generic / Plastic Clamps
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-3 px-4 text-slate-700 font-bold">Material Grade</td>
                  <td className="py-3 px-4 bg-blue-50/40 text-[#0054A6] font-bold">100% Austenitic AISI SS304 Stainless Steel</td>
                  <td className="py-3 px-4 text-slate-400">Recycled Polycarbonate or Plastic</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700 font-bold">UV & Weather Exposure</td>
                  <td className="py-3 px-4 bg-blue-50/40 text-emerald-800 font-bold">10-Year Corrosion & Rust-Proof Guarantee (Rust/Corrosion Only)</td>
                  <td className="py-3 px-4 text-slate-400">Brittle & cracks after 12-18 months</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700 font-bold">Capillary Drainage Efficiency</td>
                  <td className="py-3 px-4 bg-blue-50/40 text-[#0054A6] font-bold">99.4% Siphon Mud & Sludge Clearance</td>
                  <td className="py-3 px-4 text-slate-400">Incomplete drainage with dust borders</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700 font-bold">Operating Temperature Range</td>
                  <td className="py-3 px-4 bg-blue-50/40 text-slate-900 font-bold">-40°C to +300°C High-Heat Resistance</td>
                  <td className="py-3 px-4 text-slate-400">Softens/deforms at 65°C under PV sun</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700 font-bold">Manufacturing SLA & Quality</td>
                  <td className="py-3 px-4 bg-blue-50/40 text-slate-900 font-bold">Direct Kathwada GIDC Hub Dispatch (382430)</td>
                  <td className="py-3 px-4 text-slate-400">Unbranded Import without test certs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* COMPREHENSIVE TECHNICAL SPECS & LEGAL METROLOGY              */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6] font-bold">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#0054A6] font-bold uppercase tracking-wider">Logistics & Compliance</span>
              <h3 className="text-lg font-black text-slate-900 font-display">Technical Dimensions & Product Details</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Frame Compatibility</span>
              <strong className="text-slate-900 block font-display text-sm">Fits {currentVariant.attributes.size || '30mm-40mm'} Anodized Solar Frames</strong>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Package Dimensions (L×W×H)</span>
              <strong className="text-slate-900 block font-mono text-sm">
                {currentVariant.dimensionsCm?.length || 15} × {currentVariant.dimensionsCm?.width || 10} × {currentVariant.dimensionsCm?.height || 8} cm
              </strong>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Unit Weight / Net Weight</span>
              <strong className="text-slate-900 block font-mono text-sm">{currentVariant.weightGrams || 48} Grams per unit</strong>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Country of Origin</span>
              <strong className="text-slate-900 block text-sm">India (Made in Kathwada GIDC, Ahmedabad)</strong>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">HSN Code & GST</span>
              <strong className="text-slate-900 block font-mono text-sm">HSN: {currentVariant.hsnCode || '73269099'} (18% ITC Eligible)</strong>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Included Components</span>
              <strong className="text-slate-900 block text-sm truncate" title={selectedProduct.includedComponents || 'Included components'}>
                {selectedProduct.includedComponents || 'Pack of 50 SS304 Clips, Inspection Card'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 📦 SOLAR KIT BREAKDOWN POPUP MODAL (3 kW / 5 kW / 10 kW POPUP)     */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isKitBreakdownModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden text-slate-900">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#002d5a] to-[#0054A6] text-white flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                      {currentVariant.solarKitConfig?.plantCapacityKw || (currentVariant.title.includes('5 kW') ? 5 : currentVariant.title.includes('10 kW') ? 10 : 3)} kW Complete Solar Cleaning Kit Breakdown
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 text-[10px] font-mono border border-blue-400/30">
                      Fixed Non-Editable Bundle
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black font-display text-white">
                    Included Products, Quantities & Itemized Price Math
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsKitBreakdownModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* kW Kit Switcher Tabs inside the popup */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <span>Select Kit Variant:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedProduct.variants.map((v) => {
                    const isSelected = v.sku === currentVariant.sku;
                    const kwText = v.title.includes('3 kW') ? '3 kW' : v.title.includes('5 kW') ? '5 kW' : v.title.includes('10 kW') ? '10 kW' : v.sku;
                    return (
                      <button
                        key={v.sku}
                        type="button"
                        onClick={() => selectProductVariant(selectedProduct.asin, v.sku)}
                        className={`px-4 py-2 rounded-xl font-bold font-mono text-xs transition-all flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-md ring-2 ring-[#0054A6]/20'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>⚡ {kwText} Kit</span>
                        <span className="font-mono text-amber-300 font-black">₹{v.b2cPrice.toLocaleString('en-IN')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Official Listing Price Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-amber-800 uppercase font-bold tracking-wider block">
                    Official Catalog Listing Price (Je Listing Price Chhe Te)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      ₹{currentVariant.b2cPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 line-through font-mono">
                      MRP ₹{currentVariant.mrp.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {Math.round(((currentVariant.mrp - currentVariant.b2cPrice) / currentVariant.mrp) * 100)}% Instant Discount
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Includes all 6 components listed below. Ready-to-install bundle.
                  </p>
                </div>

                {/* Frame Thickness Selector */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-slate-600 block">
                    Solar Panel Frame Thickness:
                  </span>
                  <div className="flex items-center gap-1">
                    {[30, 35, 40].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setSelectedThickness(th)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          selectedThickness === th
                            ? 'bg-[#0054A6] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {th}mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sizing Pills & Panel Number Details (Horizontal & Vertical Panels) */}
              {(() => {
                const totalKitPanels = currentVariant.solarKitConfig?.panelCount || 
                  (currentVariant.title.includes('5 kW') ? 10 : currentVariant.title.includes('10 kW') ? 20 : 6);
                
                // Calculate horizontal rows and vertical columns
                const rowsHorizontal = panelMountOrientation === 'PORTRAIT'
                  ? (totalKitPanels <= 6 ? 2 : totalKitPanels <= 12 ? 2 : 4)
                  : (totalKitPanels <= 6 ? 3 : totalKitPanels <= 12 ? 5 : 5);
                const colsVertical = Math.ceil(totalKitPanels / rowsHorizontal);

                return (
                  <div className="space-y-3">
                    {/* Panel Count & Orientation Layout Matrix */}
                    <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white rounded-2xl border border-blue-200/90 space-y-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#0054A6]" />
                          <span className="font-bold text-slate-900 text-xs">
                            Panel Numbers & Mounting Array Layout:
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-600 font-semibold">Mounting Style:</span>
                          <div className="inline-flex rounded-lg border border-blue-300 p-0.5 bg-white shadow-xs">
                            <button
                              type="button"
                              onClick={() => setPanelMountOrientation('PORTRAIT')}
                              className={`px-2.5 py-0.5 rounded-md font-bold transition-all text-xs ${
                                panelMountOrientation === 'PORTRAIT'
                                  ? 'bg-[#0054A6] text-white shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              Portrait
                            </button>
                            <button
                              type="button"
                              onClick={() => setPanelMountOrientation('LANDSCAPE')}
                              className={`px-2.5 py-0.5 rounded-md font-bold transition-all text-xs ${
                                panelMountOrientation === 'LANDSCAPE'
                                  ? 'bg-[#0054A6] text-white shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              Landscape
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Clean Breakdown: Total Panels, Required Sprinklers, Required Drain Clips */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-slate-500 text-[10px] block font-bold uppercase tracking-wider">
                              Total Solar Panels:
                            </span>
                            <span className="text-lg font-black text-slate-950">
                              {totalKitPanels} <span className="text-xs font-normal text-slate-500">Nos.</span>
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-blue-50 text-[#0054A6] font-bold text-xs">
                            ~550W Mono
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-slate-500 text-[10px] block font-bold uppercase tracking-wider">
                              Required Sprinklers ({panelMountOrientation === 'PORTRAIT' ? '1/Panel' : '2/Panel'}):
                            </span>
                            <span className="text-lg font-black text-blue-900">
                              {panelMountOrientation === 'PORTRAIT' ? totalKitPanels * 1 : totalKitPanels * 2} <span className="text-xs font-normal text-slate-500">Pcs</span>
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                            180° SS304
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-slate-500 text-[10px] block font-bold uppercase tracking-wider">
                              Required Drain Clips ({panelMountOrientation === 'PORTRAIT' ? '2/Panel' : '3/Panel'}):
                            </span>
                            <span className="text-lg font-black text-amber-900">
                              {panelMountOrientation === 'PORTRAIT' ? totalKitPanels * 2 : totalKitPanels * 3} <span className="text-xs font-normal text-slate-500">Pcs</span>
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs">
                            SS304 Siphon
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Technical Sizing Pills */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] font-mono">
                      <span className="font-bold text-slate-700">Auto Plant Equipment:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-emerald-700">
                        ⚡ Motor: {currentVariant.solarKitConfig?.motorLpm || (totalKitPanels * 7)} LPM Flow
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-blue-700">
                        ⚙️ {currentVariant.solarKitConfig?.motorHp || (totalKitPanels <= 8 ? '0.5 HP' : totalKitPanels <= 15 ? '1.0 HP' : '2.0 HP')}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-amber-800">
                        🔌 {currentVariant.solarKitConfig?.electricalPhase || 'Single Phase 220V AC'}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-purple-700">
                        📎 {totalKitPanels * 2} Drain Clips ({selectedThickness}mm Frame · 2 per panel)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 6 Included Products Grid (Product Su Avse, Qty, and Price) */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#0054A6]" />
                  What Products Are Included (Product Su Avse & Qty × Price):
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentVariant.comboComponents?.map((comp, idx) => {
                    let itemImg = comp.imageUrl || '/logo.webp';
                    if (comp.asin === 'AP-SPRINKLER-01' || comp.asin === 'AP-SPRINKLER-180') itemImg = '/solar_sprinkler.webp';
                    if (comp.asin === 'AP-DRAINCLIPS-02' || comp.asin === 'AP-CLIP-35MM') itemImg = '/Drain_clips.webp';
                    if (comp.asin === 'AP-GICLAMP-03' || comp.asin === 'AP-CLAMP-GI') itemImg = '/gi_pipe_clamp.webp';
                    if (comp.asin === 'AP-TIMER-07') itemImg = '/auto_timer.webp';
                    if (comp.asin === 'AP-PUMP-06') itemImg = '/pump.webp';
                    if (comp.asin === 'AP-FITTINGTEE-04' || comp.asin === 'AP-TEE-UPVC') itemImg = '/cpvc_upvc.webp';

                    const unitPrice = comp.unitPrice || (
                      (comp.asin === 'AP-SPRINKLER-01' || comp.asin === 'AP-SPRINKLER-180') ? 60 :
                      (comp.asin === 'AP-DRAINCLIPS-02' || comp.asin === 'AP-CLIP-35MM') ? 20 :
                      (comp.asin === 'AP-GICLAMP-03' || comp.asin === 'AP-CLAMP-GI') ? 25 :
                      comp.asin === 'AP-TIMER-07' ? 850 :
                      comp.asin === 'AP-PUMP-06' ? (currentVariant.solarKitConfig?.panelCount && currentVariant.solarKitConfig.panelCount > 15 ? 4200 : currentVariant.solarKitConfig?.panelCount && currentVariant.solarKitConfig.panelCount > 8 ? 2400 : 1700) : 33
                    );
                    const lineTotal = unitPrice * comp.quantity;
                    const isMotor = comp.asin === 'AP-PUMP-06';
                    const motorLpm = comp.technicalDetails?.flowRateLpm || (currentVariant.solarKitConfig?.panelCount ? currentVariant.solarKitConfig.panelCount * 7 : 42);
                    const motorHp = comp.technicalDetails?.motorHp || (currentVariant.solarKitConfig?.panelCount && currentVariant.solarKitConfig.panelCount > 15 ? '2.0 HP' : currentVariant.solarKitConfig?.panelCount && currentVariant.solarKitConfig.panelCount > 8 ? '1.0 HP' : '0.5 HP');
                    const electricalPhase = comp.technicalDetails?.electricalPhase || 'Single Phase 220V/230V AC (50Hz)';

                    return (
                      <div key={idx} className="p-3.5 bg-slate-50 hover:bg-blue-50/40 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 transition-colors shadow-sm">
                        <div className="flex items-center gap-3">
                          <img
                            src={itemImg}
                            alt={comp.productTitle}
                            className="w-14 h-14 object-contain rounded-xl bg-white border border-slate-200 p-1.5 shrink-0 shadow-sm"
                          />
                          <div className="space-y-0.5">
                            <strong className="block text-slate-900 text-xs">
                              {comp.asin === 'AP-CLIP-35MM'
                                ? comp.productTitle.replace('35mm', `${selectedThickness}mm`)
                                : isMotor
                                ? `High-Pressure Booster Motor (${motorLpm} LPM · ${motorHp} · Single Phase)`
                                : comp.productTitle}
                            </strong>
                            <span className="font-mono text-[10px] text-amber-700 block">ASIN: {comp.asin}</span>
                            {isMotor ? (
                              <div className="flex flex-wrap items-center gap-1 text-[9px] font-mono">
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                  {motorLpm} LPM
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                                  {motorHp}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                                  {electricalPhase}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {comp.technicalDetails?.material || comp.technicalDetails?.size}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-sm text-slate-900">
                            ₹{lineTotal.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 mt-0.5 inline-block">
                            {comp.quantity} {comp.unitOfMeasure || 'pcs'} × ₹{unitPrice} = ₹{lineTotal}
                          </div>
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">🔒 Fixed In Bundle</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Suggestion notice */}
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {currentVariant.solarKitConfig?.localPipeNotice || 'Pipes (UPVC/CPVC) and common plumbing fittings are recommended to be purchased from your local hardware market for on-site cut-to-fit sizing.'}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-600 font-mono">
                Official Listing Price: <strong className="text-lg text-slate-900 font-black">₹{currentVariant.b2cPrice.toLocaleString('en-IN')}</strong> (Save ₹{(currentVariant.mrp - currentVariant.b2cPrice).toLocaleString('en-IN')})
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsKitBreakdownModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-colors"
                >
                  Close Breakdown
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart();
                    setIsKitBreakdownModalOpen(false);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 hover:scale-105 transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add This {currentVariant.solarKitConfig?.plantCapacityKw || 3} kW Kit to Cart (₹{currentVariant.b2cPrice.toLocaleString('en-IN')})</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 📐 SOLAR FRAME THICKNESS MEASURING GUIDE MODAL                    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isFrameGuideModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col text-slate-900 max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-[#0054A6] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Solar Panel Frame Thickness Measuring Guide</h3>
                  <p className="text-xs text-blue-200">
                    Ensure exact millimeter measurement (28mm, 30mm, 33mm, 35mm, or 40mm) before ordering
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFrameGuideModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-slate-700 space-y-2">
                <div className="font-bold text-[#0054A6] flex items-center gap-1.5 text-sm">
                  <Info className="w-4 h-4" /> How to Measure with a Standard Ruler:
                </div>
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>Place a ruler perpendicular against the outer aluminum frame lip of your solar panel.</li>
                  <li>Measure the frame depth from the front glass edge to the back lip of the aluminum extrusion.</li>
                  <li>Round to the closest standard Indian solar frame thickness: <strong>28mm, 30mm, 33mm, 35mm, or 40mm</strong>.</li>
                </ol>
              </div>

              {/* Standard Thickness Chart */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2.5">
                  Standard Indian Solar Module Compatibility Chart:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-mono text-sm">35 mm (Most Popular)</strong>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">90% of Rooftops</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Tata Power Solar, Vikram Solar, Loom Solar, RenewSys, Goldi Solar 400W–550W mono modules.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-mono text-sm">30 mm (High-Efficiency)</strong>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">New Bifacial/TOPCon</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Waaree Bifacial, Adani Solar TOPCon, Canadian Solar, Longi, JA Solar 550W–600W+ modules.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-mono text-sm">40 mm (Utility Commercial)</strong>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Heavy Frames</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Heavy-duty 72-cell older modules, ground-mounted MW utility plants, legacy commercial rooftop arrays.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-mono text-sm">28 mm & 33 mm</strong>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">Specialized</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Thin-profile BIPV architectural solar glass, 330W-370W older poly panels, and select imported modules.
                    </p>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Why precise fit is critical:</strong> Apollo SS304 clips are engineered with spring tension. If you order 30mm for a 35mm frame, it will not snap on. If you order 35mm for a 30mm frame, it will be loose. Always double-check before ordering!
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFrameGuideModalOpen(false)}
                className="px-6 py-2 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                I Understand, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ⚠️ MANDATORY SOLAR DRAIN CLIP FRAME THICKNESS CONFIRMATION MODAL */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isFrameConfirmModalOpen && (
        <div className="fixed inset-0 z-[220] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-slate-900 max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#071226] to-[#0054A6] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-950" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Check Frame Thickness Before Ordering</h3>
                  <p className="text-[11px] text-blue-200">
                    SS304 Precision Spring Fit — Mandatory Sizing Verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFrameConfirmModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Close confirmation dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Selected Size Card */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
                    Selected Variant
                  </span>
                  <span className="font-mono text-xs font-black bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {currentVariant.attributes?.size || '35mm'} Frame Clip
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Adding <strong>{selectedQty} {selectedQty > 1 ? 'units' : 'unit'}</strong> of{' '}
                  <strong>{currentVariant.title}</strong> to your cart.
                </p>
              </div>

              {/* Technical Specifications & Policies */}
              <div className="space-y-2.5 text-slate-700 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Material:</strong> 100% Genuine AISI SS304 Stainless Steel (Rust-Free).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Warranty:</strong> 10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Spring Fit Precision:</strong> SS304 clips are engineered for specific frame profiles (28mm, 30mm, 33mm, 35mm, 40mm). Ordering an incorrect size will not snap onto your solar panel frame.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sizing Policy:</strong> Wrong-size orders are not eligible for return or replacement.
                  </span>
                </div>
              </div>

              {/* Sizing Guide Link Button */}
              <button
                type="button"
                onClick={() => {
                  setIsFrameConfirmModalOpen(false);
                  setIsFrameGuideModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-[#0054A6] font-bold rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ruler className="w-4 h-4 text-[#0054A6]" />
                <span>Need help measuring? Open Frame Sizing Guide</span>
              </button>

              {/* Mandatory Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors">
                <input
                  type="checkbox"
                  id="frame-verify-checkbox"
                  checked={frameConfirmedCheckbox}
                  onChange={(e) => setFrameConfirmedCheckbox(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-[#0054A6] rounded border-slate-300 focus:ring-[#0054A6] focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-slate-800 leading-snug">
                  I confirm that I measured my solar panel frame thickness and selected <strong>{currentVariant.attributes?.size?.replace(/[^0-9.]/g, '') || '35'}</strong> mm. Wrong-size orders are not eligible for return or replacement.
                </span>
              </label>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsFrameConfirmModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Change Size
              </button>
              <button
                type="button"
                id="confirm-add-to-cart-btn"
                disabled={!frameConfirmedCheckbox}
                onClick={() => {
                  setIsFrameConfirmModalOpen(false);
                  executeAddToCart();
                }}
                className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 ${
                  frameConfirmedCheckbox
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-orange-500/20 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Confirm & Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

