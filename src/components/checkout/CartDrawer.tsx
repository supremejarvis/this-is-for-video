'use client';

import React, { useEffect, useState, useId } from 'react';
import { 
  X, Trash2, Plus, Minus, ShoppingCart, 
  Truck, ShieldCheck, ArrowRight, RefreshCw,
  Clock, AlertTriangle, CheckCircle2, Lock, FileText, Info, Layers, AlertCircle
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getTranslation } from '../../utils/i18n';
import { calculateSpeedPostTariff } from '../../services/logisticsService';

export const CartDrawer: React.FC = () => {
  const { 
    cart, isCartDrawerOpen, setIsCartDrawerOpen, 
    updateCartQuantity, removeFromCart, clearCart,
    currentQuote, quoteStatus, quoteError,
    quotePaymentMethod, setQuotePaymentMethod,
    destinationPincode, setDestinationPincode,
    fetchAuthoritativeQuote, selectedLanguage,
    setIsCheckoutOpen, apiCatalogError,
    authStatus, setAuthDestination, setIsAuthModalOpen,
    appMode, b2cCodLimit
  } = useStore();

  const [pincodeInput, setPincodeInput] = useState(destinationPincode || '382430');
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);
  const [hasEverCalculated, setHasEverCalculated] = useState(false);
  const pincodeInputId = useId();

  const t = getTranslation(selectedLanguage);

  // Sync internal pincode state with store
  useEffect(() => {
    if (destinationPincode) {
      setPincodeInput(destinationPincode);
    }
  }, [destinationPincode]);

  // Quote Expiry Countdown Timer (Server-time synchronized)
  useEffect(() => {
    if (!currentQuote || quoteStatus !== 'QUOTE_VALID') {
      setTimeLeftSec(null);
      return;
    }

    const serverMs = currentQuote.server_time ? new Date(currentQuote.server_time).getTime() : Date.now();
    const expiryMs = new Date(currentQuote.expires_at).getTime();
    const totalDurationSec = Math.max(0, Math.floor((expiryMs - serverMs) / 1000));
    const startClientMs = Date.now();
    setTimeLeftSec(totalDurationSec);

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startClientMs) / 1000);
      const remaining = Math.max(0, totalDurationSec - elapsedSec);
      setTimeLeftSec(remaining);
      if (remaining <= 0) {
        useStore.setState({ quoteStatus: 'QUOTE_EXPIRED', currentQuote: null });
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuote, quoteStatus]);

  // Auto-calculate authoritative quote whenever cart, valid pincode, or payment method changes
  useEffect(() => {
    if (!isCartDrawerOpen || cart.length === 0) return;

    const currentPin = (destinationPincode || pincodeInput || '').trim();
    if (!/^[1-9][0-9]{5}$/.test(currentPin)) return;

    if (quoteStatus === 'QUOTE_REQUIRED' || quoteStatus === 'EMPTY_CART' || quoteStatus === 'QUOTE_EXPIRED') {
      const timer = setTimeout(() => {
        setHasEverCalculated(true);
        if (destinationPincode !== currentPin) {
          setDestinationPincode(currentPin);
        }
        fetchAuthoritativeQuote();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [
    isCartDrawerOpen,
    cart,
    destinationPincode,
    quotePaymentMethod,
    quoteStatus,
    pincodeInput,
    fetchAuthoritativeQuote,
    setDestinationPincode
  ]);

  const { currentUser } = useStore();
  const isAuthed = authStatus === 'AUTHENTICATED' || Boolean(currentUser && currentUser.id && currentUser.id !== 'usr_guest');

  const totalCartUnits = cart.reduce((sum, i) => sum + i.quantity, 0);
  const estimatedPrepaid = currentQuote ? Number(currentQuote.prepaid_total) : cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const isCodLimitExceeded = appMode === 'B2C' && estimatedPrepaid > b2cCodLimit;

  // Auto-switch COD to PREPAID if B2B mode or if B2C order exceeds COD limit
  useEffect(() => {
    if (appMode === 'B2B' && quotePaymentMethod === 'COD') {
      setQuotePaymentMethod('PREPAID');
    } else if (appMode === 'B2C' && quotePaymentMethod === 'COD') {
      if (estimatedPrepaid > b2cCodLimit) {
        setQuotePaymentMethod('PREPAID');
      }
    }
  }, [appMode, quotePaymentMethod, estimatedPrepaid, b2cCodLimit, setQuotePaymentMethod]);

  if (!isCartDrawerOpen) return null;

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincodeInput(val);
    if (val.length === 6) {
      if (/^[1-9][0-9]{5}$/.test(val)) {
        setPincodeError(null);
        setDestinationPincode(val);
      } else {
        setPincodeError(t.invalidPincode);
      }
    } else {
      setPincodeError(null);
    }
  };

  const handleCalculateQuote = async () => {
    if (!/^[1-9][0-9]{5}$/.test(pincodeInput.trim())) {
      setPincodeError(t.invalidPincode);
      return;
    }
    setHasEverCalculated(true);
    setDestinationPincode(pincodeInput.trim());
    await fetchAuthoritativeQuote();
  };

  const formatTimer = (sec: number | null) => {
    if (sec === null) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        onClick={() => setIsCartDrawerOpen(false)}
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white border-l border-slate-200 text-slate-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6] shadow-sm">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <span>{t.cartTitle}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0054A6] text-xs font-mono font-bold">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} {cart.reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'item' : 'items'}
                  </span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500 block">
                  {t.cartSubtitle}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/40">
            {cart.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-[#0054A6] shadow-sm">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-base">{t.emptyCartTitle}</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {t.emptyCartDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(false)}
                  aria-label="Close cart drawer and browse catalog"
                  className="px-4 py-2 bg-[#0054A6] text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* B2B Mixed Wholesale Batch Pooling Banner */}
                {appMode === 'B2B' && (
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0054A6] flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#0054A6]" /> B2B Wholesale Batch Pooling
                      </span>
                      <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                        {totalCartUnits} / 50 units
                      </span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#0054A6] to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (totalCartUnits / 50) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono flex items-center justify-between">
                      {totalCartUnits >= 50 ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Wholesale batch unlocked! Mixed sizes qualify for factory B2B pricing.
                        </span>
                      ) : (
                        <span>Add <strong>{50 - totalCartUnits}</strong> more units (any mix of sizes/items) to qualify for wholesale batch.</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Items Container */}
                <div className="space-y-3">
                  {cart.map((item) => {
                    const quoteLine = currentQuote?.items?.find((qi) => qi.sku === item.sku);
                    const displayUnitPrice = quoteLine ? Number(quoteLine.unit_price) : item.unitPrice;
                    const displayLineGross = quoteLine ? Number(quoteLine.line_gross) : (item.unitPrice * item.quantity);

                    return (
                    <div 
                      key={item.sku} 
                      className="flex gap-3.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm"
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={item.productTitle} 
                        className="w-14 h-14 object-cover rounded-xl bg-slate-50 border border-slate-200 flex-shrink-0" 
                        loading="lazy"
                        decoding="async"
                        width={56}
                        height={56}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h5 className="text-xs font-bold text-slate-900 line-clamp-1">{item.productTitle}</h5>
                          <button
                            onClick={() => removeFromCart(item.sku)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                            aria-label={`Remove ${item.sku} from cart`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono font-bold text-[#0054A6] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {item.variantTitle}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-900">
                            ₹{displayUnitPrice.toFixed(2)}
                          </span>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => updateCartQuantity(item.sku, item.quantity - (appMode === 'B2B' ? 5 : 1))}
                              className="p-1 rounded-lg bg-white text-slate-600 hover:text-slate-900 shadow-xs active:scale-95 transition-transform"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-bold px-2 text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(item.sku, item.quantity + (appMode === 'B2B' ? 5 : 1))}
                              className="p-1 rounded-lg bg-white text-slate-600 hover:text-slate-900 shadow-xs active:scale-95 transition-transform"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-mono font-bold text-slate-900">
                            ₹{displayLineGross.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>

                {/* Logistics & Payment Configuration */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  {/* Destination PIN Code Input */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor={pincodeInputId} 
                      className="text-xs font-bold text-slate-700 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#0054A6]" />
                        {t.destinationPincode}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Origin Hub: 382430
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={pincodeInputId}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pincodeInput}
                        onChange={handlePincodeChange}
                        placeholder={t.pincodePlaceholder}
                        className={`flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border ${
                          pincodeError 
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/50 text-rose-900' 
                            : 'border-slate-300 focus:border-[#0054A6] focus:ring-[#0054A6] bg-slate-50/50'
                        } focus:outline-none focus:ring-1`}
                      />
                    </div>
                    {pincodeError && (
                      <p className="text-[11px] text-rose-600 font-medium">{pincodeError}</p>
                    )}
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 block">
                      {t.paymentMethod}
                    </span>
                    {appMode === 'B2B' ? (
                      <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-bold text-[#0054A6] flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-[#0054A6]" />
                            {t.prepaidUpi} / GST Direct Settlement
                          </strong>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#0054A6] text-white">
                            B2B Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Cash on Delivery (COD) is removed for B2B wholesale orders. Online payment (UPI, NetBanking, NEFT, Cards) or approved terms are required for GST tax invoices and ITC reconciliation.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          aria-label="Select Prepaid UPI payment method"
                          aria-pressed={quotePaymentMethod === 'PREPAID'}
                          onClick={() => setQuotePaymentMethod('PREPAID')}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            quotePaymentMethod === 'PREPAID'
                              ? 'bg-blue-50/80 border-[#0054A6] ring-1 ring-[#0054A6] shadow-sm'
                              : 'bg-slate-50 border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-xs font-bold text-slate-900">{t.prepaidUpi}</strong>
                            {quotePaymentMethod === 'PREPAID' && (
                              <span className="w-2 h-2 rounded-full bg-[#0054A6]" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{t.prepaidDesc}</p>
                        </button>

                        <button
                          type="button"
                          aria-label="Select Cash on Delivery payment method"
                          aria-pressed={quotePaymentMethod === 'COD'}
                          disabled={isCodLimitExceeded}
                          onClick={() => !isCodLimitExceeded && setQuotePaymentMethod('COD')}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isCodLimitExceeded
                              ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                              : quotePaymentMethod === 'COD'
                              ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500 shadow-sm'
                              : 'bg-slate-50 border-slate-200 hover:border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-xs font-bold text-slate-900">{t.cod}</strong>
                            {quotePaymentMethod === 'COD' && !isCodLimitExceeded && (
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                            )}
                            {isCodLimitExceeded && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                Over Limit
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {isCodLimitExceeded ? `Exceeds max COD limit of ₹${b2cCodLimit.toLocaleString('en-IN')}` : t.codDesc}
                          </p>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quote State Banners */}
                {quoteStatus === 'QUOTE_REQUIRED' && !currentQuote && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 shadow-sm animate-pulse">
                    <RefreshCw className="w-4 h-4 text-[#0054A6] shrink-0 mt-0.5 animate-spin" />
                    <div className="flex-1">
                      <strong className="block font-bold">Auto-Calculating Live Rates • Quote Out of Date</strong>
                      <span>Updating authoritative GST & Speed Post shipping totals automatically...</span>
                    </div>
                  </div>
                )}

                {quoteStatus === 'QUOTE_EXPIRED' && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 shadow-sm">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-bold">{t.quoteExpired}</strong>
                      <span>The 15-minute quote window has elapsed. Auto-refreshing...</span>
                    </div>
                  </div>
                )}

                {quoteStatus === 'QUOTE_ERROR' && quoteError && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 shadow-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-bold">Calculation Error</strong>
                      <span>{quoteError}</span>
                    </div>
                  </div>
                )}

                {/* Loading State Spinner - only show when no quote is currently cached */}
                {quoteStatus === 'QUOTE_LOADING' && !currentQuote && (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-[#0054A6] animate-spin mx-auto" />
                    <p className="text-xs text-blue-900 font-bold">{t.calculatingQuote}</p>
                  </div>
                )}

                {/* Retry Calculation Button on Error */}
                {quoteStatus === 'QUOTE_ERROR' && (
                  <button
                    type="button"
                    id="cart-calculate-total-btn"
                    aria-label="Retry quote calculation"
                    onClick={handleCalculateQuote}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0054A6] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Calculation</span>
                  </button>
                )}

                {/* Authoritative Calculation Breakdown */}
                {(quoteStatus === 'QUOTE_VALID' || Boolean(currentQuote)) && currentQuote && (() => {
                  const itemsGrossTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
                  const totalWeightGrams = cart.reduce((sum, item) => sum + (item.weightGrams || 100) * item.quantity, 0);

                  // Line-item accurate statutory preview
                  let calculatedTaxable = 0;
                  let calculatedTax = 0;
                  cart.forEach((item) => {
                    const lineGross = item.unitPrice * item.quantity;
                    const r = (item.gstRate || 18) / 100;
                    const taxable = Math.round((lineGross / (1 + r)) * 100) / 100;
                    calculatedTaxable += taxable;
                    calculatedTax += Math.round((lineGross - taxable) * 100) / 100;
                  });

                  const previewTariff = calculateSpeedPostTariff(
                    destinationPincode || '382430',
                    Math.max(1, totalWeightGrams)
                  );
                  
                  // Product Values
                  const totalGross = currentQuote ? Number(currentQuote.total_product_gross) : itemsGrossTotal;
                  const subtotalTaxable = currentQuote 
                    ? Number(currentQuote.subtotal_taxable) 
                    : calculatedTaxable;
                  const totalGst = currentQuote 
                    ? Number(currentQuote.total_product_gst) 
                    : calculatedTax;
                  
                  // Shipping Values
                  const baseShipping = currentQuote ? Number(currentQuote.base_shipping) : previewTariff.tariffBase;
                  const shippingGst = currentQuote ? Number(currentQuote.shipping_gst) : previewTariff.gstAmount;
                  const shippingTotal = currentQuote ? Number(currentQuote.shipping_total) : previewTariff.totalPostage;
                  
                  // Base Prepaid Total: Product + Shipping
                  const prepaidTotal = currentQuote ? Number(currentQuote.prepaid_total) : (totalGross + shippingTotal);

                  // COD Calculations: 2.5% Surcharge and Rounding (Nearest ₹5 Multiple)
                  const codSurcharge = currentQuote && Number(currentQuote.cod_surcharge) > 0
                    ? Number(currentQuote.cod_surcharge)
                    : Math.round((prepaidTotal * 0.025) * 100) / 100;
                  const codRawTotal = prepaidTotal + codSurcharge;
                  const roundingMultiple = (currentQuote && currentQuote.rounding_multiple) || 5;
                  const codTotal = currentQuote && Number(currentQuote.cod_total) > prepaidTotal
                    ? Number(currentQuote.cod_total)
                    : Math.ceil(codRawTotal / roundingMultiple) * roundingMultiple;
                  const codRounding = currentQuote && currentQuote.cod_rounding_adjustment !== undefined
                    ? Number(currentQuote.cod_rounding_adjustment)
                    : Math.round((codTotal - codRawTotal) * 100) / 100;

                  return (
                    <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-4 space-y-3">
                      {/* Quote Header & Live Status Badge */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            Order Valuation Summary
                          </span>
                          <strong className="text-xs font-mono text-[#0054A6]">
                            {currentQuote?.quote_number || 'Live Calculation'}
                          </strong>
                        </div>

                        {currentQuote && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{formatTimer(timeLeftSec)}</span>
                          </div>
                        )}
                      </div>

                      {/* Breakdown Lines */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Taxable Value (Subtotal):</span>
                          <span className="font-mono text-slate-900 font-bold">
                            ₹{subtotalTaxable.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Product GST (18%):</span>
                          <span className="font-mono text-slate-900 font-bold">
                            ₹{totalGst.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-semibold pt-1 border-t border-slate-100">
                          <span>Product Total:</span>
                          <span className="font-mono text-slate-900 font-bold">
                            ₹{totalGross.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600 pt-1">
                          <span>Speed Post Express Freight:</span>
                          <span className="font-mono text-slate-900 font-bold">
                            ₹{baseShipping.toFixed(2)}
                          </span>
                        </div>
                        {shippingGst > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Shipping GST (18%):</span>
                            <span className="font-mono text-slate-900 font-bold">
                              ₹{shippingGst.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-900 font-semibold">
                          <span>Shipping Total:</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            ₹{shippingTotal.toFixed(2)}
                          </span>
                        </div>

                        {/* Shipping Provenance Indicator */}
                        <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200 mt-1">
                          <span className="text-slate-600 font-mono flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-[#0054A6]" />
                            {currentQuote?.shipping_provider || 'INDIA_POST'} ({currentQuote?.service_code || 'SPEED_POST'})
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified Live Rate
                          </span>
                        </div>

                        {/* Method-Specific Payment Breakdown */}
                        {quotePaymentMethod === 'COD' ? (
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <div className="flex justify-between text-slate-600 text-xs">
                              <span>Order Amount (Product + Shipping):</span>
                              <span className="font-mono font-bold text-slate-900">
                                ₹{prepaidTotal.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-semibold">
                              <span>COD Handling Fee (2.5%):</span>
                              <span className="font-mono font-bold text-amber-800">
                                +₹{codSurcharge.toFixed(2)}
                              </span>
                            </div>
                            {codRounding !== 0 && (
                              <div className="flex justify-between text-[11px] text-slate-500 font-mono px-0.5">
                                <span>Rounding Adjustment:</span>
                                <span>{codRounding > 0 ? `+₹${codRounding.toFixed(2)}` : `-₹${Math.abs(codRounding).toFixed(2)}`}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                              <span>Cash on Delivery Payable:</span>
                              <span className="font-mono text-amber-600">
                                ₹{codTotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                            <span>Total Payable:</span>
                            <span className="font-mono text-[#0054A6]">
                              ₹{prepaidTotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Verified Guarantee */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Direct Factory Sourced • Kathwada GIDC (382430)</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Footer Checkout CTA & Legal Notice */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3">
            {apiCatalogError && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Live price and availability are temporarily unavailable. Please try again shortly.</span>
              </div>
            )}
            {cart.length > 0 && (() => {
              const isQuoteValid = quoteStatus === 'QUOTE_VALID' && Boolean(currentQuote);
              const isCheckoutAllowed = cart.length > 0 && !apiCatalogError && isQuoteValid;
              return (
                <button
                  type="button"
                  id="cart-proceed-checkout-btn"
                  aria-label="Proceed to Secure Checkout"
                  disabled={!isCheckoutAllowed}
                  onClick={() => {
                    if (!isCheckoutAllowed) return;
                    if (isAuthed) {
                      setIsCartDrawerOpen(false);
                      setIsCheckoutOpen(true);
                    } else {
                      setAuthDestination('CHECKOUT');
                      setIsCartDrawerOpen(false);
                      setIsAuthModalOpen(true);
                    }
                  }}
                  className={`w-full py-3.5 px-4 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isCheckoutAllowed
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-orange-500/25 hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Lock className="w-4 h-4 text-slate-950" />
                  <span>Proceed to Secure Checkout</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              );
            })()}
            <div className="text-center text-[10px] text-slate-500 font-mono font-medium">
              <span>Direct Factory Dispatch from Kathwada GIDC, Ahmedabad (382430)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
