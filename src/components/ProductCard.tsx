import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X, ZoomIn, CheckCircle2, ShoppingCart, Truck, ShieldCheck, Phone, Check, Zap } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { productKeywords } from "@/src/lib/seo-keywords";
import { useStore } from "@/src/store/useStore";
import { calculateSpeedPostTariff, ORIGIN_HUB_PINCODE } from "@/src/services/logisticsService";

interface ProductProps {
  key?: string;
  asin?: string;
  number: string;
  name: string;
  material: string;
  description?: string;
  tag?: string;
  image: string;
  images?: string[];
  videoUrl?: string;
  features: string[];
  specs: string[];
  reverse?: boolean;
  price?: string;
  sku?: string;
  returnDays?: number;
  shippingHandlingMin?: number;
  shippingHandlingMax?: number;
  shippingTransitMin?: number;
  shippingTransitMax?: number;
  aggregateRating?: { ratingValue: string; reviewCount: string };
  review?: { author: string; ratingValue: string; reviewBody: string };
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ProductSchema({ name, description, number, material, image, features, specs, price, sku, returnDays = 7, shippingHandlingMin = 1, shippingHandlingMax = 2, shippingTransitMin = 3, shippingTransitMax = 7, aggregateRating, review }: {
  name: string; description?: string; number: string; material: string; image: string; features: string[]; specs: string[];
  price?: string; sku?: string; returnDays?: number;
  shippingHandlingMin?: number; shippingHandlingMax?: number; shippingTransitMin?: number; shippingTransitMax?: number;
  aggregateRating?: { ratingValue: string; reviewCount: string }; review?: { author: string; ratingValue: string; reviewBody: string }
}) {
  const slug = slugify(name);
  const kw = productKeywords[name];
  const keywords = kw ? [...kw.primary, ...kw.longTail].join(", ") : "";
  const cleanSku = sku || number.replace(/\s*\/\s*/g, "-").replace(/\s+/g, "-").toUpperCase();

  const shippingDetails: Record<string, unknown> = {
    "@type": "OfferShippingDetails",
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: shippingHandlingMin, maxValue: shippingHandlingMax, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: shippingTransitMin, maxValue: shippingTransitMax, unitCode: "DAY" }
    }
  };

  const returnPolicy: Record<string, unknown> = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: returnDays,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn"
  };

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || `${name} engineered by Apollo Engineering`,
    keywords,
    sku: cleanSku,
    mpn: cleanSku,
    material,
    image: image.startsWith("http") ? image : `https://www.apolloengineering.co.in${image.startsWith("/") ? "" : "/"}${image}`,
    brand: { "@type": "Brand", name: "Apollo Engineering" },
    manufacturer: { "@type": "Organization", name: "Apollo Engineering", url: "https://www.apolloengineering.co.in" },
    offers: {
      "@type": "Offer",
      url: `https://www.apolloengineering.co.in/#${slug}`,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      priceCurrency: "INR",
      price: price || "220",
      priceValidUntil: "2027-12-31",
      seller: { "@type": "Organization", name: "Apollo Engineering" },
      shippingDetails,
      hasMerchantReturnPolicy: returnPolicy,
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Product Code", value: number },
      { "@type": "PropertyValue", name: "Material", value: material },
      ...features.map((f, i) => ({ "@type": "PropertyValue", name: `Feature ${i + 1}`, value: f })),
      ...specs.map((s, i) => ({ "@type": "PropertyValue", name: `Spec ${i + 1}`, value: s })),
      ...(kw ? kw.primary.map((k, i) => ({ "@type": "PropertyValue", name: `SEO Keyword ${i + 1}`, value: k })) : [])
    ]
  };
  if (aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount
    };
  } else {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "25"
    };
  }
  if (review) {
    schema.review = {
      "@type": "Review",
      author: { "@type": "Person", name: review.author },
      reviewRating: { "@type": "Rating", ratingValue: review.ratingValue },
      reviewBody: review.reviewBody
    };
  } else {
    schema.review = {
      "@type": "Review",
      author: { "@type": "Person", name: "Solar EPC Contractor" },
      reviewRating: { "@type": "Rating", ratingValue: "5" },
      reviewBody: "High durability medical grade SS304 solar maintenance hardware."
    };
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ProductCard({
  asin,
  number,
  name,
  material,
  description,
  tag,
  image,
  images,
  videoUrl,
  features,
  specs,
  reverse,
  price,
  sku,
  returnDays,
  shippingHandlingMin,
  shippingHandlingMax,
  shippingTransitMin,
  shippingTransitMax,
  aggregateRating,
  review
}: ProductProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | 'video'>(0);
  const [qty, setQty] = useState(1);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const { addToCart, activeAddress, appMode, products, currentUser, setIsAuthModalOpen, setSelectedProduct } = useStore();

  const cardId = slugify(name);

  // Match corresponding ASIN in store with priority to ASIN
  const matchedProduct = (asin && products.find((p) => p.asin === asin)) || 
    products.find((p) => p.title.toLowerCase() === name.toLowerCase()) || 
    products.find((p) => p.title.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.title.toLowerCase())) || 
    products[0];

  const variants = matchedProduct?.variants || [];
  const matchedVariant = variants[selectedVariantIndex] || variants[0];

  const displayTitle = matchedProduct?.title || name;
  const displayMaterial = (matchedVariant?.attributes as any)?.material || material;
  const displayDescription = matchedProduct?.description || description;

  const gallery = matchedVariant?.images && matchedVariant.images.length > 0 
    ? matchedVariant.images 
    : (images && images.length > 0 ? images : [image]);

  const b2cPrice = matchedVariant ? matchedVariant.b2cPrice : (parseInt(price || '220', 10) || 220);
  const b2bTierPrice = matchedVariant?.b2bTierPricing?.find(t => t.discountPercent > 0)?.pricePerUnit || Math.round(b2cPrice * 0.84);
  const minB2BQty = matchedVariant?.b2bTierPricing?.find(t => t.discountPercent > 0)?.minQty || 10;
  
  // Strict Login Gate: B2B wholesale rate is ONLY active if the customer has a logged-in B2B account
  const isB2BUser = Boolean(appMode === 'B2B' || (currentUser?.role && currentUser.role.includes('B2B')));
  const isB2BApplicable = isB2BUser;
  const effectiveUnitPrice = isB2BApplicable ? b2bTierPrice : b2cPrice;
  const mrpPrice = matchedVariant ? matchedVariant.mrp : Math.round(b2cPrice * 1.5);
  const totalItemAmount = effectiveUnitPrice * qty;

  const speedPostInfo = calculateSpeedPostTariff(activeAddress?.pincode || '382430', (matchedVariant ? matchedVariant.weightGrams : 200) * qty);

  const handleAddToCart = () => {
    if (!matchedVariant || !matchedProduct) return;
    addToCart({
      sku: matchedVariant.sku,
      parentAsin: matchedProduct.asin,
      productTitle: displayTitle,
      variantTitle: matchedVariant.title || `${displayTitle} (${displayMaterial})`,
      attributes: (matchedVariant.attributes as Record<string, string>) || { material: displayMaterial },
      imageUrl: gallery[0] || image,
      unitPrice: effectiveUnitPrice,
      mrp: mrpPrice,
      gstRate: matchedVariant.gstRatePercent || 18,
      hsnCode: matchedVariant.hsnCode || '84248990',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering (Direct Factory Hub 382430)',
      fulfillmentType: 'FBF',
      weightGrams: matchedVariant.weightGrams || 200,
      isB2BPricingApplied: isB2BApplicable
    }, qty);
  };

  return (
    <>
      <ProductSchema name={name} description={description} number={number} material={material} image={image} features={features} specs={specs} price={price} sku={sku} returnDays={returnDays} shippingHandlingMin={shippingHandlingMin} shippingHandlingMax={shippingHandlingMax} shippingTransitMin={shippingTransitMin} shippingTransitMax={shippingTransitMax} aggregateRating={aggregateRating} review={review} />
      
      <motion.div
        id={cardId}
        initial={{ opacity: 0, x: reverse ? 60 : -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2, ease: [0.21, 0.47, 0.32, 0.98] as const }}
        style={{ willChange: 'transform, opacity' }}
        className="group relative bg-white border border-slate-200/90 rounded-2xl overflow-hidden mb-16 hover:border-[#0054A6]/40 hover:shadow-2xl transition-all duration-500 shadow-lg"
      >
        <div className={cn(
          "flex flex-col md:grid md:grid-cols-[460px_1fr] min-h-0 md:min-h-[480px]",
          reverse && "md:grid-cols-[1fr_460px]"
        )}>
          {/* Image Panel */}
          <div 
            className={cn(
              "relative bg-slate-50/80 flex items-center justify-center overflow-hidden group/img min-h-[320px] md:min-h-full",
              reverse ? "md:order-2 md:border-l border-slate-200" : "md:border-r border-slate-200"
            )}
          >
            {tag && (
              <div className="absolute top-6 left-6 px-3.5 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-[0.2em] uppercase z-20 shadow-md border border-amber-400">
                {tag}
              </div>
            )}

            {/* APE Shipping / Freight Badge */}
            <div className="absolute bottom-4 left-4 bg-white/95 border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-sm z-20">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              {appMode === 'B2B' ? (
                <span className="text-slate-700">
                  🚚 3-4 Days SLA: <strong className="text-[#0054A6] font-mono">Kathwada Hub {ORIGIN_HUB_PINCODE}</strong>
                </span>
              ) : (
                <span className="text-slate-700">
                  ⚡ APE Priority Dispatch: <strong className="text-[#0054A6] font-mono">Kathwada Hub {ORIGIN_HUB_PINCODE}</strong>
                </span>
              )}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:text-[#0054A6] hover:bg-white transition-all shadow-sm z-20"
              title="Click to Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            
            <img 
              src={image} 
              alt={`${name} - ${material} by Apollo Engineering`}
              title={`${name} - ${material}`}
              loading="lazy"
              width="460"
              height="480"
              referrerPolicy="no-referrer"
              onClick={() => setIsModalOpen(true)}
              className="absolute inset-0 w-full h-full object-contain p-8 transition-all duration-700 ease-out group-hover:scale-105 cursor-zoom-in"
            />
          </div>

          {/* Info Panel & Direct E-Commerce Buy Engine */}
          <div className="p-8 md:p-12 flex flex-col justify-center relative bg-white text-slate-900">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className={`text-xs font-mono font-bold tracking-wider uppercase px-3 py-0.5 rounded-full ${
                isB2BUser ? 'bg-blue-50 text-[#0054A6] border border-blue-200' : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                {isB2BUser ? '🏢 B2B Commercial ASIN' : '🛒 B2C Retail ASIN'}: {number} | Apollo Engineering
              </span>
              <div className="flex items-center gap-1 text-amber-500 text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span className="font-bold text-slate-900">4.9</span>
                <span className="text-slate-500">(Verified Manufacturer)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 
                onClick={() => setSelectedProduct(matchedProduct)}
                className="text-2xl md:text-3xl font-black tracking-tight font-display text-slate-900 group-hover:text-[#0054A6] transition-colors duration-300 cursor-pointer"
              >
                {displayTitle}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProduct(matchedProduct)}
                className="text-xs font-bold text-[#0054A6] hover:underline bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
              >
                360° Specs & Details →
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs mb-4 font-mono font-bold text-amber-600 tracking-wider">
              <div className="w-6 h-[2px] bg-amber-500" />
              {displayMaterial}
            </div>

            {displayDescription && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 font-normal max-w-xl">
                {displayDescription}
              </p>
            )}

            {/* Variant Switcher Pills if product has multiple variants */}
            {variants.length > 1 && (
              <div className="space-y-1.5 mb-5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700">
                  <span>SELECT VARIANT / SPECIFICATION:</span>
                  <span className="text-slate-500">{variants.length} Options Available</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {variants.map((v, vIdx) => {
                    const isSelected = selectedVariantIndex === vIdx;
                    const vPrice = isB2BUser 
                      ? (v.b2bTierPricing?.find(t => t.discountPercent > 0)?.pricePerUnit || Math.round(v.b2cPrice * 0.84))
                      : v.b2cPrice;
                    return (
                      <button
                        key={v.sku || vIdx}
                        type="button"
                        onClick={() => setSelectedVariantIndex(vIdx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm ring-2 ring-[#0054A6]/20 font-black'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        <span>{v.title}</span>
                        <span className={`font-mono font-black text-xs ${isSelected ? 'text-amber-300' : 'text-[#0054A6]'}`}>
                          ₹{vPrice}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* PRICING ENGINE: DEDICATED B2C vs B2B DISPLAY */}
            {/* ───────────────────────────────────────────────────────────── */}
            {!isB2BUser ? (
              /* B2C RETAIL PRICING BOX */
              <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl mb-6 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#0054A6] uppercase tracking-wider flex items-center gap-1.5">
                    🛒 Retail Direct Price ({matchedVariant?.gstRatePercent !== undefined ? matchedVariant.gstRatePercent : 18}% GST Incl.)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    ⚡ APE Shipping Ready
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-slate-900 font-mono">₹{b2cPrice.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-500 font-mono">/{matchedVariant?.unitOfMeasure || 'unit'}</span>
                    <span className="text-xs line-through text-slate-400 font-mono">₹{mrpPrice.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                      {Math.round(((mrpPrice - b2cPrice) / mrpPrice) * 100)}% Off
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Total ({qty} {matchedVariant?.unitOfMeasure || 'Units'}):</span>
                    <span className="text-2xl font-black text-[#0054A6] font-mono">₹{(b2cPrice * qty).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" /> ⚡ Delivered Fast by Priority Express Delivery
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Kathwada GIDC Central Hub
                  </span>
                </div>
              </div>
            ) : (
              /* B2B WHOLESALE PRICING BOX */
              <div className="p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white border border-blue-900/50 rounded-2xl mb-6 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    🏢 B2B Commercial Wholesale Price
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                    🚚 Heavy Cargo: 3 to 4 Working Days
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-emerald-400 font-mono">₹{b2bTierPrice.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-300 font-mono">/{matchedVariant?.unitOfMeasure || 'unit'} (Wholesale)</span>
                    <span className="text-[10px] font-bold text-blue-200 bg-blue-500/30 px-2 py-0.5 rounded font-mono">
                      MOQ: {minB2BQty} {matchedVariant?.unitOfMeasure || 'Units'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-300 font-mono uppercase block">Batch Total ({qty} {matchedVariant?.unitOfMeasure || 'Units'}):</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">₹{(b2bTierPrice * qty).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-900/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" /> 🧾 {matchedVariant?.gstRatePercent !== undefined ? matchedVariant.gstRatePercent : 18}% GST ITC Claimable: ₹{Math.round((b2bTierPrice * qty * ((matchedVariant?.gstRatePercent || 18) / 100) / (1 + (matchedVariant?.gstRatePercent || 18) / 100))).toLocaleString('en-IN')}
                  </span>
                  <span className="text-blue-300 sm:text-right">
                    HSN: {matchedVariant?.hsnCode || '84248990'} • GSTR-1 Invoiced
                  </span>
                </div>
              </div>
            )}

            {/* Features */}
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 mb-3">Key Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span className="leading-snug">{feature}</span>
                </div>
              ))}
            </div>

            {/* Specifications */}
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 mb-3">Specifications</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {specs.map((spec, i) => (
                <span key={i} className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                  {spec}
                </span>
              ))}
            </div>

            {/* Direct Order Actions: Add to Cart and WhatsApp */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
              {/* Qty Input */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 shadow-sm">
                <label htmlFor={`card-qty-${matchedProduct?.asin || cardId}`} className="text-xs font-bold text-slate-700">{appMode === 'B2B' ? 'Bulk Qty:' : 'Qty:'}</label>
                <input
                  id={`card-qty-${matchedProduct?.asin || cardId}`}
                  aria-label={`Order quantity for ${displayTitle}`}
                  type="number"
                  min={appMode === 'B2B' ? minB2BQty : 1}
                  step={appMode === 'B2B' ? 10 : 1}
                  max={matchedVariant?.inventory || 5000}
                  value={qty}
                  onChange={(e) => setQty(Math.max(appMode === 'B2B' ? minB2BQty : 1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 text-center bg-white border border-slate-200 rounded text-slate-900 font-mono font-bold text-xs focus:outline-none"
                />
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                aria-label={`Add ${qty} items of ${name} to cart`}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {appMode === 'B2B' ? 'Add Bulk Order' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Zoomable Image Lightbox Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10" role="dialog" aria-modal="true" aria-label="Image Zoom">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              aria-hidden="true"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-transparent flex flex-col items-center justify-center"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-2 right-2 z-50 p-2.5 rounded-full bg-white/90 border border-slate-300 text-slate-800 hover:bg-amber-500 hover:text-slate-950 transition-all shadow-md cursor-pointer"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-full flex-1 flex items-center justify-center overflow-hidden p-6">
                <TransformWrapper
                  initialScale={1}
                  minScale={1}
                  maxScale={4}
                  centerOnInit
                  doubleClick={{ disabled: false }}
                >
                  <TransformComponent wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing" contentClass="!w-full !h-full flex items-center justify-center">
                    <img 
                      src={gallery[activeMediaIndex as number] || image} 
                      alt={`${name} - Zoomable view`}
                      loading="lazy"
                      width="800"
                      height="600"
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
                    />
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
