'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Check, ShieldCheck, Truck, Building2, CreditCard, 
  QrCode, Landmark, Banknote, AlertCircle, AlertTriangle, ArrowRight, Lock, Sparkles, Receipt,
  KeyRound, RefreshCw, Volume2, Clock, CheckCircle2, MapPin, Edit3, Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../store/useStore';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../../services/logisticsService';
import { msg91OtpService } from '../../services/msg91OtpService';
import { razorpayService } from '../../services/razorpayService';
import { orderApi, paymentApi, quoteApi } from '../../services/api';
import { Order, DeliveryAddress } from '../../types';

const maskPhone = (phone?: string): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '******';
  return '******' + trimmed.slice(-4);
};

export const CheckoutModal: React.FC = () => {
  const { 
    isCheckoutOpen, setIsCheckoutOpen, cart, activeAddress, billingAddress, shippingAddress,
    addresses, isShippingSameAsBilling, setIsShippingSameAsBilling,
    setActiveAddress, setIsAddressModalOpen, getSplitShipments, decrementInventory,
    appMode, currentOrg, setActiveTab, setSelectedOrderForDetail, showToast, currentUser,
    clearCart, apiCatalogError, authStatus, setIsAuthModalOpen, setAuthDestination,
    currentQuote, quoteStatus, setIsCartDrawerOpen,
    destinationPincode, setDestinationPincode,
    quotePaymentMethod, setQuotePaymentMethod,
    fetchAuthoritativeQuote, createOrder,
    b2cCodLimit
  } = useStore();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [claimGst, setClaimGst] = useState<boolean>(appMode === 'B2B');
  const [enteredGstin, setEnteredGstin] = useState<string>(currentOrg.gstin || billingAddress?.gstin || '');
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentDetail']['method']>('RAZORPAY');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAddressListExpanded, setIsAddressListExpanded] = useState<boolean>(false);

  // MSG91 COD Anti-Fraud OTP State
  const [isCodOtpOpen, setIsCodOtpOpen] = useState<boolean>(false);
  const [codEnteredOtp, setCodEnteredOtp] = useState<string>('');
  const [isCodVerifying, setIsCodVerifying] = useState<boolean>(false);
  const [codDevOtp, setCodDevOtp] = useState<string | null>(null);

  // Auth gate: If guest tries to access checkout, redirect to login
  const isUserLoggedIn = authStatus === 'AUTHENTICATED' || Boolean(currentUser && currentUser.id && currentUser.id !== 'usr_guest');

  useEffect(() => {
    if (isCheckoutOpen && !isUserLoggedIn) {
      setIsCheckoutOpen(false);
      setAuthDestination('CHECKOUT');
      setIsAuthModalOpen(true);
      showToast('Please sign in to complete your checkout.', 'info');
    }
  }, [isCheckoutOpen, isUserLoggedIn, setIsCheckoutOpen, setAuthDestination, setIsAuthModalOpen, showToast]);

  // Cart empty gate: If cart is empty, redirect to cart drawer
  useEffect(() => {
    if (isCheckoutOpen && isUserLoggedIn && cart.length === 0) {
      setIsCheckoutOpen(false);
      setIsCartDrawerOpen(true);
      showToast('Your cart is empty. Please add items to checkout.', 'warning');
    }
  }, [isCheckoutOpen, isUserLoggedIn, cart.length, setIsCheckoutOpen, setIsCartDrawerOpen, showToast]);

  // Keep store's destinationPincode and quote payment method in sync with active checkout state
  useEffect(() => {
    if (!isCheckoutOpen || !activeAddress?.pincode) return;
    const targetPin = activeAddress.pincode.trim();
    const targetQuoteMethod = paymentMethod === 'COD' ? 'COD' : 'PREPAID';

    const isPinMismatch = destinationPincode !== targetPin || currentQuote?.destination_pincode !== targetPin;
    const isMethodMismatch = quotePaymentMethod !== targetQuoteMethod;

    if (isPinMismatch || isMethodMismatch || !currentQuote) {
      setDestinationPincode(targetPin);
      setQuotePaymentMethod(targetQuoteMethod);
      fetchAuthoritativeQuote();
    }
  }, [isCheckoutOpen, activeAddress?.pincode, paymentMethod, destinationPincode, quotePaymentMethod, currentQuote, setDestinationPincode, setQuotePaymentMethod, fetchAuthoritativeQuote]);

  if (!isCheckoutOpen || !isUserLoggedIn || cart.length === 0) {
    return null;
  }

  // Combine unique addresses from profile
  const availableAddresses: DeliveryAddress[] = [];
  const seenIds = new Set<string>();
  
  if (billingAddress?.id) {
    availableAddresses.push(billingAddress);
    seenIds.add(billingAddress.id);
  }
  if (shippingAddress?.id && !seenIds.has(shippingAddress.id)) {
    availableAddresses.push(shippingAddress);
    seenIds.add(shippingAddress.id);
  }
  (addresses || []).forEach((addr) => {
    if (addr?.id && !seenIds.has(addr.id)) {
      availableAddresses.push(addr);
      seenIds.add(addr.id);
    }
  });

  // Authoritative figures from current validated quote
  const itemsGross = Number(currentQuote?.total_product_gross || 0);
  const taxableValue = Number(currentQuote?.subtotal_taxable || 0);
  const taxAmount = Number(currentQuote?.total_product_gst || 0);
  const totalShipping = Number(currentQuote?.shipping_total || 0);
  const codFee = paymentMethod === 'COD' ? Number(currentQuote?.cod_charge_raw || currentQuote?.cod_surcharge || 0) : 0;
  const codAdjustment = paymentMethod === 'COD' ? Number(currentQuote?.cod_rounding_adjustment || 0) : 0;
  const grandTotal = paymentMethod === 'COD' 
    ? Number(currentQuote?.cod_payable_total || currentQuote?.cod_total || 0) 
    : Number(currentQuote?.prepaid_total || 0);

  const estimatedPrepaid = Number(currentQuote?.prepaid_total || itemsGross);
  const isCodLimitExceeded = appMode === 'B2C' && estimatedPrepaid > b2cCodLimit;

  // Auto-switch COD to PREPAID if B2B mode or if B2C order exceeds COD limit
  useEffect(() => {
    if (appMode === 'B2B' && paymentMethod === 'COD') {
      setPaymentMethod('RAZORPAY');
      setQuotePaymentMethod('PREPAID');
    } else if (appMode === 'B2C' && paymentMethod === 'COD' && isCodLimitExceeded) {
      setPaymentMethod('RAZORPAY');
      setQuotePaymentMethod('PREPAID');
    }
  }, [appMode, paymentMethod, isCodLimitExceeded, setQuotePaymentMethod]);

  const handleSelectAddress = (addr: DeliveryAddress) => {
    useStore.setState({
      activeAddress: addr,
      shippingAddress: addr,
      destinationPincode: addr.pincode,
    });
    setActiveAddress(addr.id);
    setIsAddressListExpanded(false);
    setActiveStep(2);
    showToast(`✓ Delivery address set to ${addr.postOffice?.name || addr.city} (${addr.pincode})`, 'success');
  };

  const handleSelectPaymentMethod = (method: Order['paymentDetail']['method']) => {
    if (appMode === 'B2B' && method === 'COD') {
      showToast('Cash on Delivery is not available for B2B orders.', 'warning');
      setPaymentMethod('RAZORPAY');
      setQuotePaymentMethod('PREPAID');
      return;
    }
    if (appMode === 'B2C' && method === 'COD' && isCodLimitExceeded) {
      showToast(`Cash on Delivery is limited to orders up to ₹${b2cCodLimit.toLocaleString('en-IN')}. Please pay online.`, 'warning');
      return;
    }
    setPaymentMethod(method);
    const quoteMethod = method === 'COD' ? 'COD' : 'PREPAID';
    setQuotePaymentMethod(quoteMethod);
  };

  const submitBackendOrder = async (
    paymentMethodType: 'PREPAID' | 'COD' | 'B2B_CREDIT',
    idempotencyKey: string
  ) => {
    if (!activeAddress) {
      throw new Error('Please select or add a delivery address to complete your order.');
    }

    const shippingPin = activeAddress.pincode?.trim() || '382430';
    let targetQuote = currentQuote;

    // Strict invariant: Ensure quote destination PIN matches shipping address PIN
    if (!targetQuote || targetQuote.destination_pincode !== shippingPin) {
      try {
        const items = cart.map((i) => ({
          ...(i.variantId ? { variant_id: i.variantId } : {}),
          ...(i.sku ? { sku: i.sku } : {}),
          quantity: i.quantity,
        }));
        targetQuote = await quoteApi.requestQuote({
          items,
          destination_pincode: shippingPin,
          payment_method: paymentMethodType === 'COD' ? 'COD' : 'PREPAID',
        });
        useStore.setState({
          currentQuote: targetQuote,
          quoteStatus: 'QUOTE_VALID',
          destinationPincode: shippingPin,
        });
      } catch (err) {
        console.warn('Could not pre-fetch quote for PIN; omitting quote_id so backend generates quote atomically:', err);
        targetQuote = null;
      }
    }

    const rawLine1 = `${activeAddress.flatBuilding || ''} ${activeAddress.streetArea || ''}`.trim() || activeAddress.postOffice?.name || 'Factory Premises';
    const safeLine1 = rawLine1.length >= 3 ? rawLine1 : `${rawLine1} Hub`;

    const rawPhone = activeAddress.phone || currentUser?.phone || '9825012345';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    const validPhone = cleanPhone.length === 10 ? cleanPhone : '9825012345';

    const safeName = (activeAddress.fullName || currentUser?.name || 'Customer').trim();
    const validName = safeName.length >= 2 ? safeName : 'Customer';

    // Automatically sync real customer name to profile and store if currently generic
    if (validName !== 'Customer' && (!currentUser?.name || currentUser.name.startsWith('Customer ') || currentUser.name === 'Valued Customer')) {
      useStore.getState().updateUserProfile({
        name: validName,
        phone: validPhone || currentUser?.phone
      });
    }

    // Automatically persist B2B details if claimGst is active
    if (claimGst && (enteredGstin || activeAddress.gstin)) {
      const gstinToSave = (enteredGstin || activeAddress.gstin || '').trim().toUpperCase();
      if (gstinToSave) {
        useStore.getState().updateOrgDetails({
          gstin: gstinToSave,
          companyName: currentOrg.companyName || validName
        });
        useStore.getState().setAppMode('B2B');
      }
    }

    const payload: any = {
      quote_id: targetQuote?.quote_id || undefined,
      idempotency_key: idempotencyKey,
      payment_method: paymentMethodType === 'B2B_CREDIT' ? 'B2B_CREDIT' : (paymentMethodType === 'COD' ? 'COD' : 'RAZORPAY'),
      destination_pincode: shippingPin,
      customer: {
        name: validName,
        phone: validPhone,
        email: currentUser?.email || undefined,
      },
      shipping_address: {
        address_line1: safeLine1,
        address_line2: activeAddress.landmark || undefined,
        city: activeAddress.city || 'Ahmedabad',
        state: activeAddress.state || 'Gujarat',
        pincode: shippingPin,
        state_code: '24',
      },
      items: cart.map((i) => ({
        sku: i.sku,
        quantity: i.quantity,
        variant_id: i.variantId || undefined,
      })),
      claim_gst: claimGst,
      gstin: claimGst ? (enteredGstin || activeAddress.gstin || currentOrg.gstin) : undefined,
      company_name: claimGst ? (currentOrg.companyName || undefined) : undefined,
    };

    return await orderApi.createOrder(payload);
  };

  const handleInitiateOrder = async () => {
    if (!activeAddress) {
      showToast('Please select or add a delivery address to continue.', 'warning');
      return;
    }

    if (apiCatalogError) {
      showToast('Live price and availability are temporarily unavailable. Please try again shortly.', 'warning');
      return;
    }

    // Enforce B2B mixed-batch MOQ validation at checkout (pooled wholesale batch minimum)
    if (appMode === 'B2B') {
      const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
      if (totalUnits < 20) {
        showToast(`B2B Wholesale requires a minimum pooled batch of 20 units across your items (current: ${totalUnits}). Please add more units to cart.`, 'warning');
        return;
      }
    }

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 1) Razorpay Flow
    if (paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD' || paymentMethod === 'NET_BANKING') {
      setIsProcessing(true);
      try {
        const backendOrder = await submitBackendOrder('PREPAID', idempotencyKey);
        const rzpOrderData = await paymentApi.createRazorpayOrder(backendOrder.id);

        await razorpayService.openCheckout({
          amount: Number(backendOrder.total_payable || grandTotal),
          orderNumber: backendOrder.order_number,
          razorpayOrderId: rzpOrderData.razorpay_order_id,
          customerName: activeAddress.fullName || currentUser?.name || 'Customer',
          customerEmail: currentUser?.email || '',
          customerPhone: activeAddress.phone || currentUser?.phone || '',
          deliveryAddress: activeAddress,
          onSuccess: async (rzpRes) => {
            try {
              const verifyRes = await paymentApi.verifyRazorpayPayment({
                order_id: backendOrder.id,
                razorpay_order_id: rzpRes.razorpay_order_id || '',
                razorpay_payment_id: rzpRes.razorpay_payment_id,
                razorpay_signature: rzpRes.razorpay_signature || ''
              });

              if (!verifyRes.verified) {
                throw new Error(verifyRes.message || 'Server payment verification failed');
              }

              // Server verified payment and marked order CONFIRMED in PostgreSQL
              createOrder('RAZORPAY', claimGst, {
                id: backendOrder.id,
                order_number: backendOrder.order_number,
                total_payable: Number(backendOrder.total_payable || grandTotal),
                razorpayPaymentId: rzpRes.razorpay_payment_id,
                razorpayOrderId: rzpRes.razorpay_order_id,
                razorpaySignature: rzpRes.razorpay_signature,
              });

              setIsProcessing(false);
              setIsCheckoutOpen(false);
              showToast(`✅ Payment ₹${Number(backendOrder.total_payable || grandTotal).toLocaleString('en-IN')} Received & Verified (Order: ${backendOrder.order_number})`, 'success');

              msg91OtpService.sendWhatsAppOrderAlert(
                activeAddress.phone || currentUser?.phone || '',
                backendOrder.order_number,
                Number(backendOrder.total_payable || grandTotal),
                false
              );

              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });

              setActiveTab('orders');
            } catch (err: any) {
              setIsProcessing(false);
              const msg = err?.message || 'We couldn’t confirm your order right now. Your cart is safe. Please try again.';
              showToast(msg, 'error');
            }
          },
          onError: (error) => {
            setIsProcessing(false);
            showToast(error.description || 'We couldn’t confirm your order right now. Your cart is safe. Please try again.', 'error');
          },
          onDismiss: () => {
            setIsProcessing(false);
            showToast('Razorpay checkout window closed. Your cart is safe.', 'info');
          }
        });
      } catch (err: any) {
        setIsProcessing(false);
        const msg = err?.message || 'We couldn’t confirm your order right now. Your cart is safe. Please try again.';
        showToast(msg, 'error');
      }
      return;
    }

    // 2) COD MSG91 Anti-Fraud Mobile Verification Flow
    if (paymentMethod === 'COD') {
      const phone = activeAddress.phone || currentUser?.phone || '';
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        showToast('Please provide a valid 10-digit mobile number for COD verification.', 'error');
        return;
      }
      setIsProcessing(true);
      try {
        const otpRes = await msg91OtpService.sendOtp(phone, {
          company: 'Apollo Engineering',
          type: 'COD Verification'
        });
        setIsProcessing(false);
        if (otpRes.type === 'error') {
          showToast(otpRes.message || 'Failed to dispatch verification OTP. Please try again.', 'error');
          return;
        }
        setIsCodOtpOpen(true);
        setCodDevOtp(otpRes.dev_code || null);
        showToast(`COD Verification OTP dispatched to ${maskPhone(phone)}`, 'info');
      } catch (err: any) {
        setIsProcessing(false);
        showToast(err?.message || 'Error connecting to OTP verification gateway.', 'error');
      }
      return;
    }

    // 3) B2B Net 30 Corporate Credit Flow
    setIsProcessing(true);
    try {
      const backendOrder = await submitBackendOrder('B2B_CREDIT', idempotencyKey);
      createOrder('NET_30_PO', claimGst, {
        id: backendOrder.id,
        order_number: backendOrder.order_number,
        total_payable: Number(backendOrder.total_payable || grandTotal),
        transactionId: `PO-${backendOrder.order_number}`,
      });
      setIsProcessing(false);
      setIsCheckoutOpen(false);
      showToast(`✅ B2B Net 30 PO Order ${backendOrder.order_number} confirmed!`, 'success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setActiveTab('orders');
    } catch (err: any) {
      setIsProcessing(false);
      const msg = err?.message || 'We couldn’t confirm your order right now. Your cart is safe. Please try again.';
      showToast(msg, 'error');
    }
  };

  const handleVerifyCodAndPlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAddress) return;
    const phone = activeAddress.phone || currentUser?.phone || '';
    setIsCodVerifying(true);
    let verifyRes: any = null;
    try {
      verifyRes = await msg91OtpService.verifyOtp(phone, codEnteredOtp);
    } catch (err: any) {
      setIsCodVerifying(false);
      showToast(err?.message || 'Verification service error. Please try again.', 'error');
      return;
    }
    setIsCodVerifying(false);

    if (!verifyRes || !verifyRes.isVerified) {
      showToast(verifyRes?.message || 'Invalid COD OTP entered. Please check your SMS and try again.', 'error');
      return;
    }

    setIsCodOtpOpen(false);
    setIsProcessing(true);
    try {
      const idempotencyKey = `idemp_cod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const backendOrder = await submitBackendOrder('COD', idempotencyKey);

      createOrder('COD', claimGst, {
        id: backendOrder.id,
        order_number: backendOrder.order_number,
        total_payable: Number(backendOrder.total_payable || grandTotal),
        transactionId: `COD-AUTH-${backendOrder.order_number}`,
      });
      setIsProcessing(false);
      setIsCheckoutOpen(false);
      showToast(`✅ COD order ${backendOrder.order_number} verified & confirmed in database!`, 'success');

      msg91OtpService.sendWhatsAppOrderAlert(
        phone,
        backendOrder.order_number,
        Number(backendOrder.total_payable || grandTotal),
        true
      );

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setActiveTab('orders');
    } catch (err: any) {
      setIsProcessing(false);
      const msg = err?.message || 'We couldn’t confirm your order right now. Your cart is safe. Please try again.';
      showToast(msg, 'error');
    }
  };

  const handleRetryCodOtp = async (retryType: 'TEXT' | 'VOICE' = 'TEXT') => {
    if (!activeAddress) return;
    const phone = activeAddress.phone || currentUser?.phone || '';
    await msg91OtpService.retryOtp(phone, retryType);
    showToast(`COD OTP resent via ${retryType === 'VOICE' ? 'Voice Call' : 'SMS & WhatsApp'}`, 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl w-full max-w-6xl lg:max-w-[1550px] overflow-hidden shadow-2xl flex flex-col h-[94vh] max-h-[94vh]">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${
              appMode === 'B2B' ? 'bg-blue-100 border border-blue-200 text-[#0054A6]' : 'bg-amber-100 border border-amber-200 text-amber-800'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                {appMode === 'B2B' ? '🏢 Apollo Enterprise B2B Commercial Checkout' : '🛒 Apollo Retail Express Checkout'}
                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  Encrypted Payment Gateway
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {appMode === 'B2B' ? (
                  <span>🚚 Heavy Cargo Freight: <strong className="text-[#0054A6] font-mono font-bold">Dispatched from Kathwada GIDC Central Hub</strong></span>
                ) : (
                  <span>⚡ APE Standard Dispatch: <strong className="text-emerald-700 font-mono font-bold">Ships within 24-48 business hours via Priority Express Delivery</strong></span>
                )}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsCheckoutOpen(false)}
            aria-label="Close checkout modal"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Checkout Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 text-sm bg-slate-50/40">
          {/* Left Column: Accordion Steps */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* ───────────────────────────────────────────────────────────── */}
            {/* Step 1: Delivery Address */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all">
              <div 
                onClick={() => setActiveStep(1)}
                className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/90 hover:bg-slate-100/90 transition-colors border-b border-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0054A6] text-white font-black text-xs flex items-center justify-center shadow-sm">
                    1
                  </span>
                  <span className="font-bold text-slate-900 text-sm">Delivery Address & Delivery Hub</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#0054A6] font-bold">
                    {activeAddress ? '✓ Selected' : 'Select Address'}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4 bg-white">
                {!activeAddress && availableAddresses.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
                    <div className="text-amber-800 font-bold text-sm">No Delivery Address Found</div>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Please add your delivery address to calculate verified Priority Express delivery to your doorstep.
                    </p>
                    <button
                      type="button"
                      aria-label="Add Delivery Address"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="px-4 py-2.5 bg-[#0054A6] text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Delivery Address
                    </button>
                  </div>
                ) : !isAddressListExpanded && activeAddress ? (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-[#0054A6]/30 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active Delivery Address
                        </span>
                        <strong className="text-slate-900 text-sm font-black">{activeAddress.fullName}</strong>
                        <span className="text-slate-500 font-mono">({maskPhone(activeAddress.phone)})</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {activeAddress.flatBuilding}, {activeAddress.streetArea}, {activeAddress.city}, {activeAddress.state}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="bg-white border border-slate-200 text-[#0054A6] px-2.5 py-1 rounded-lg font-bold">
                          📍 Delivery Hub: {activeAddress.postOffice?.name || 'KATHWADA GIDC S.O.'}
                        </span>
                        <span className="bg-white border border-slate-200 text-slate-900 px-2.5 py-1 rounded-lg font-bold">
                          PIN: {activeAddress.pincode}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <button
                        type="button"
                        aria-label="Change delivery address"
                        onClick={() => setIsAddressListExpanded(true)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-[#0054A6] hover:border-[#0054A6] text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Change Address
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Expanded List: Choose from available addresses */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider block font-mono">
                        Select Destination Address:
                      </span>
                      {activeAddress && (
                        <button
                          type="button"
                          aria-label="Cancel address selection"
                          onClick={() => setIsAddressListExpanded(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {availableAddresses.map((addr, idx) => {
                        const isThisActive = activeAddress?.id === addr.id;
                        return (
                          <div
                            key={addr.id || idx}
                            onClick={() => handleSelectAddress(addr)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 flex flex-col justify-between ${
                              isThisActive
                                ? 'bg-blue-50 border-[#0054A6] ring-2 ring-[#0054A6]/20 shadow-md'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-[#0054A6]" />
                                  {addr.fullName}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {addr.addressType || 'ADDRESS'}
                                </span>
                              </div>
                              <div className="text-slate-500 font-mono text-[11px]">{maskPhone(addr.phone)}</div>
                              <p className="text-slate-600 leading-tight line-clamp-2">
                                {addr.flatBuilding}, {addr.streetArea}, {addr.city}
                              </p>
                              <div className="text-[11px] text-[#0054A6] font-mono font-bold bg-blue-50 px-2 py-0.5 rounded inline-block">
                                📍 {addr.postOffice?.name || 'KATHWADA GIDC S.O.'} ({addr.pincode})
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className={`text-[11px] font-bold ${isThisActive ? 'text-[#0054A6]' : 'text-slate-500'}`}>
                                {isThisActive ? '✓ Currently Selected' : '👉 Click to Select'}
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isThisActive ? 'border-[#0054A6] bg-[#0054A6]' : 'border-slate-300'
                              }`}>
                                {isThisActive && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        aria-label="Add New Address"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="text-xs text-[#0054A6] hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add New Address
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* Step 2: Payment Gateway & Method Selection */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all">
              <div 
                onClick={() => setActiveStep(2)}
                className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/90 hover:bg-slate-100/90 transition-colors border-b border-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0054A6] text-white font-black text-xs flex items-center justify-center shadow-sm">
                    2
                  </span>
                  <span className="font-bold text-slate-900 text-sm">Select Payment Method (Online vs COD)</span>
                </div>
                <span className="text-xs text-[#0054A6] font-bold">
                  {paymentMethod === 'RAZORPAY' ? '💳 Online Payment' : paymentMethod === 'COD' ? '💵 Cash on Delivery' : '🏢 Net 30 PO'}
                </span>
              </div>

              <div className="p-5 space-y-4 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: Razorpay Online Payment Gateway */}
                  <div
                    onClick={() => handleSelectPaymentMethod('RAZORPAY')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD'
                        ? 'bg-blue-50/90 border-[#0054A6] text-slate-900 shadow-md ring-2 ring-[#0054A6]/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0054A6] text-white flex items-center justify-center font-black text-sm shadow-sm">
                          ₹
                        </div>
                        <div>
                          <strong className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                            Online Payment (Razorpay)
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-black border border-emerald-300">
                              Secure Gateway
                            </span>
                          </strong>
                          <span className="text-[11px] text-slate-500">Instant UPI, Cards & NetBanking</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 ${
                        paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD' ? 'border-[#0054A6] bg-[#0054A6]' : 'border-slate-300'
                      }`}>
                        {(paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD') && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Supported Method Badges */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">UPI (GPay / PhonePe / Paytm)</span>
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Cards (Visa / MC / RuPay)</span>
                        <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">NetBanking 50+</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Encrypted Gateway • Priority Dispatch</span>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Cash on Delivery (COD) - strictly B2C only with admin limit check */}
                  {appMode === 'B2C' ? (
                    <div
                      onClick={() => !isCodLimitExceeded && handleSelectPaymentMethod('COD')}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isCodLimitExceeded
                          ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : paymentMethod === 'COD'
                          ? 'bg-amber-50/90 border-amber-500 text-slate-900 shadow-md ring-2 ring-amber-500/30 cursor-pointer'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                            isCodLimitExceeded ? 'bg-slate-300 text-slate-600' : 'bg-amber-500 text-slate-950'
                          }`}>
                            <Banknote className="w-5 h-5" />
                          </div>
                          <div>
                            <strong className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                              Cash on Delivery (COD)
                              {!isCodLimitExceeded ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-mono font-bold border border-amber-300">
                                  +2.5% Fee
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-mono font-bold border border-rose-300">
                                  Limit Exceeded
                                </span>
                              )}
                            </strong>
                            <span className="text-[11px] text-slate-500">
                              {isCodLimitExceeded 
                                ? `Order exceeds max COD limit of ₹${b2cCodLimit.toLocaleString('en-IN')}` 
                                : 'Pay cash upon factory doorstep delivery'}
                            </span>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 ${
                          paymentMethod === 'COD' && !isCodLimitExceeded ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                        }`}>
                          {paymentMethod === 'COD' && !isCodLimitExceeded && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-slate-200/60 text-[10px] text-slate-600">
                        <div className="flex items-center gap-1 text-amber-800 font-bold">
                          <Lock className="w-3 h-3 text-amber-700" />
                          <span>{isCodLimitExceeded ? `Maximum COD order value is ₹${b2cCodLimit.toLocaleString('en-IN')}` : 'Requires Mobile OTP Verification'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* B2B Statutory Information Notice in place of COD */
                    <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 flex flex-col justify-between space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0054A6]">
                        <ShieldCheck className="w-4 h-4" />
                        <span>B2B Statutory Invoicing Notice</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Cash on Delivery (COD) is strictly removed for B2B wholesale transactions. Please use Online Payment (UPI, NetBanking, Cards) or approved Corporate Credit (Net 30 PO) for official GSTR-1 and ITC compliance.
                      </p>
                    </div>
                  )}

                  {/* Option 3: B2B Net 30 Credit Line (Only in B2B Mode) */}
                  {appMode === 'B2B' && (
                    <div
                      onClick={() => handleSelectPaymentMethod('NET_30_PO')}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 sm:col-span-2 ${
                        paymentMethod === 'NET_30_PO'
                          ? 'bg-blue-50/90 border-[#0054A6] text-slate-900 shadow-md ring-2 ring-[#0054A6]/30'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-sm shadow-sm">
                            <Landmark className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <strong className="text-xs font-black text-slate-900 block">
                              B2B Corporate Net 30 Credit Line & Commercial PO
                            </strong>
                            <span className="text-[11px] text-emerald-700 font-mono font-bold">
                              Available Approved Corporate Credit: ₹{(currentOrg.creditLimit - currentOrg.creditUsed).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 ${
                          paymentMethod === 'NET_30_PO' ? 'border-[#0054A6] bg-[#0054A6]' : 'border-slate-300'
                        }`}>
                          {paymentMethod === 'NET_30_PO' && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional GSTIN Claim Box */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
                    <input
                      type="checkbox"
                      id="claimGstBox"
                      checked={claimGst}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setClaimGst(checked);
                        if (checked) {
                          useStore.getState().setAppMode('B2B');
                        }
                      }}
                      className="w-4 h-4 text-[#0054A6] rounded bg-white border-slate-300 focus:ring-[#0054A6]"
                    />
                    <label htmlFor="claimGstBox" className="text-xs text-slate-800 cursor-pointer">
                      <strong className="text-[#0054A6]">Add Business GSTIN</strong> for 18% Input Tax Credit (ITC)
                    </label>
                  </div>

                  {claimGst && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">15-Character Business GSTIN *</label>
                      <input
                        type="text"
                        value={enteredGstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setEnteredGstin(val);
                          if (val.length === 15) {
                            useStore.getState().updateOrgDetails({ gstin: val });
                            useStore.getState().setAppMode('B2B');
                          }
                        }}
                        placeholder="e.g. 24AAACP1234F1Z8"
                        className="w-full h-9 px-3 bg-slate-50 border border-blue-400 rounded-lg text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#0054A6] focus:outline-none uppercase font-bold"
                      />
                      <span className="text-[11px] text-slate-500 block">
                        Verified Business Entity: <strong className="text-slate-900">{currentOrg.companyName}</strong> (State Code: 24)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* Right Column: Order Summary & Place Order */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-lg">
              <h4 className="font-black text-slate-900 text-sm border-b border-slate-200 pb-2">Order Price Summary</h4>

              <div className="space-y-3 text-xs">
                {/* Cart Items List */}
                <div className="max-h-48 overflow-y-auto space-y-2.5 border-b border-slate-100 pb-3">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.variantId || item.sku}`} className="flex items-start justify-between text-xs py-1">
                      <div className="space-y-0.5 pr-2">
                        <div className="font-bold text-slate-900 line-clamp-1">{item.title || item.productTitle}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.variantTitle ? `${item.variantTitle} • ` : ''}
                          Qty: {item.quantity} {item.quantity === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-800 shrink-0">
                        ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Items Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'}):</span>
                  <span className="font-mono text-slate-900 font-bold">₹{itemsGross.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Taxable Base Value:</span>
                  <span className="font-mono">₹{taxableValue.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>GST 18% (CGST 9% + SGST 9%):</span>
                  <span className="font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Priority Express Shipping:</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    ₹{totalShipping.toLocaleString('en-IN')}
                  </span>
                </div>

                {paymentMethod === 'COD' && (
                  <div className="space-y-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                    <div className="flex justify-between text-amber-900 font-bold">
                      <span>COD Handling Fee (2.5%):</span>
                      <span className="font-mono">₹{codFee.toLocaleString('en-IN')}</span>
                    </div>
                    {codAdjustment !== 0 && (
                      <div className="flex justify-between text-amber-700 text-[11px] font-mono">
                        <span>COD Rounding (Multiple of 5):</span>
                        <span>{codAdjustment > 0 ? `+₹${codAdjustment}` : `-₹${Math.abs(codAdjustment)}`}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                  <span>Total Payable:</span>
                  <span className="font-mono text-[#0054A6]">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Catalog Safety Alert */}
              {apiCatalogError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Live price and availability are temporarily unavailable. Please try again shortly.</span>
                </div>
              )}

              {/* Complete Order Action Button */}
              <button
                type="button"
                aria-label="Confirm and place order"
                disabled={isProcessing || Boolean(apiCatalogError) || !activeAddress}
                onClick={handleInitiateOrder}
                className={`w-full py-4 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD'
                    ? 'bg-gradient-to-r from-[#0054A6] via-blue-600 to-[#003d7a] hover:opacity-95 text-white shadow-blue-600/30'
                    : paymentMethod === 'COD'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:opacity-90 text-slate-950 shadow-orange-500/20'
                    : 'bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 hover:opacity-95 text-white shadow-blue-700/30'
                } disabled:opacity-50`}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {paymentMethod === 'COD' ? 'Sending Verification...' : 'Connecting to Gateway...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD' ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay ₹{grandTotal.toLocaleString('en-IN')} Securely</span>
                      </>
                    ) : paymentMethod === 'COD' ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify Mobile (OTP) & Confirm COD Order</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm Corporate B2B PO Order</span>
                      </>
                    )}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 🔒 COD ORDER OTP VERIFICATION MODAL */}
        {/* ───────────────────────────────────────────────────────────── */}
        {isCodOtpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-white border-2 border-amber-500 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6 text-center text-xs">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center text-amber-600 mx-auto">
                <KeyRound className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">Verify COD Mobile Number</h4>
                <p className="text-xs text-slate-600">
                  Enter 4-digit verification code sent to{' '}
                  <strong className="text-[#0054A6] font-mono">{maskPhone(activeAddress?.phone)}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyCodAndPlaceOrder} className="space-y-4">
                <div>
                  <input
                    type="text"
                    maxLength={4}
                    value={codEnteredOtp}
                    onChange={(e) => setCodEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • •"
                    autoFocus
                    className="w-44 text-center tracking-[0.6em] text-2xl font-black font-mono py-2.5 border-2 border-slate-300 focus:border-amber-500 rounded-2xl focus:outline-none bg-slate-50 text-slate-900 shadow-inner"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Cancel COD OTP verification"
                    onClick={() => setIsCodOtpOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    aria-label="Verify COD OTP and confirm order"
                    disabled={isCodVerifying || codEnteredOtp.length !== 4}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isCodVerifying ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      <span>Verify & Dispatch →</span>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Didn't receive code?</span>
                <div className="flex gap-2 font-bold text-[#0054A6]">
                  <button 
                    type="button"
                    aria-label="Resend verification OTP via SMS"
                    onClick={() => handleRetryCodOtp('TEXT')}
                    className="hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend SMS
                  </button>
                  <span>•</span>
                  <button 
                    type="button"
                    aria-label="Resend verification OTP via Voice Call"
                    onClick={() => handleRetryCodOtp('VOICE')}
                    className="hover:underline flex items-center gap-1 text-amber-700"
                  >
                    <Volume2 className="w-3 h-3" /> Voice Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
