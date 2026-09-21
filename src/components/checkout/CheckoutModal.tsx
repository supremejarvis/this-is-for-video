'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Check, ShieldCheck, Truck, Building2, CreditCard, 
  QrCode, Landmark, Banknote, AlertCircle, AlertTriangle, ArrowRight, Lock, Sparkles, Receipt,
  KeyRound, RefreshCw, Volume2, Clock, CheckCircle2, MapPin, Edit3, Plus,
  FileText, Home, Briefcase, Factory, ExternalLink, ChevronDown, User, Phone, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../store/useStore';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME, lookupPincode, getGstStateCode } from '../../services/logisticsService';
import { msg91OtpService } from '../../services/msg91OtpService';
import { razorpayService } from '../../services/razorpayService';
import { apiService } from '../../services/apiService';
import { orderApi, paymentApi, quoteApi, authApi } from '../../services/api';
import { Order, DeliveryAddress, PostOfficeInfo } from '../../types';
import { useNavigate } from '../../lib/navigation';

const maskPhone = (phone?: string): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '******';
  return '******' + trimmed.slice(-4);
};

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

export const CheckoutModal: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isCheckoutOpen, setIsCheckoutOpen, cart, activeAddress, billingAddress, shippingAddress,
    addresses, isShippingSameAsBilling, setIsShippingSameAsBilling,
    setActiveAddress, setBillingAddress, setShippingAddress, addAddress, updateAddress, deleteAddress,
    getSplitShipments, decrementInventory,
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

  // Dual Address Management State (Connected with Customer Profile & Tax Addresses)
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressTarget, setAddressTarget] = useState<'SHIPPING' | 'BILLING'>('SHIPPING');

  const [formFullName, setFormFullName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formClassification, setFormClassification] = useState<'HOME' | 'OFFICE' | 'WAREHOUSE'>(appMode === 'B2B' ? 'OFFICE' : 'HOME');
  const [formFlat, setFormFlat] = useState<string>('');
  const [formStreet, setFormStreet] = useState<string>('');
  const [formPincode, setFormPincode] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('Ahmedabad');
  const [formState, setFormState] = useState<string>('Gujarat');
  const [formStateCode, setFormStateCode] = useState<string>('24');
  const [formPostOffices, setFormPostOffices] = useState<PostOfficeInfo[]>([]);
  const [formSelectedPO, setFormSelectedPO] = useState<PostOfficeInfo | null>(null);
  const [formGstin, setFormGstin] = useState<string>('');
  const [formApplyToBoth, setFormApplyToBoth] = useState<boolean>(true);
  const [isLoadingPin, setIsLoadingPin] = useState<boolean>(false);
  const [pinLookupError, setPinLookupError] = useState<string | null>(null);
  const [isGstinLocked, setIsGstinLocked] = useState<boolean>(false);

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

  // Synchronize Phone & Ensure Empty Name/Address for First-Time Logged-In User
  useEffect(() => {
    if (isCheckoutOpen) {
      const userPhone = (currentUser?.phone || '').replace(/\D/g, '').slice(-10);
      if (userPhone && !formPhone) {
        setFormPhone(userPhone);
      }

      const hasRealAddress = Boolean(
        activeAddress &&
        activeAddress.fullName?.trim() &&
        !activeAddress.fullName.startsWith('Customer ') &&
        activeAddress.fullName !== 'Valued Customer' &&
        activeAddress.flatBuilding?.trim() &&
        activeAddress.pincode?.trim()
      );

      if (!hasRealAddress) {
        setIsEditingAddress(true);
        setEditingAddressId(null);
        const cleanName = currentUser?.name && !currentUser.name.startsWith('Customer ') && currentUser.name !== 'Valued Customer'
          ? currentUser.name
          : (appMode === 'B2B' && currentOrg.companyName ? currentOrg.companyName : '');
        setFormFullName(cleanName);
        setFormClassification(appMode === 'B2B' ? 'OFFICE' : 'HOME');
        setFormFlat('');
        setFormStreet('');
        setFormPincode('');
        setFormCity('');
        setFormState('');
        setFormStateCode('');
        setFormPostOffices([]);
        setFormSelectedPO(null);
        setIsGstinLocked(false);
      }
    }
  }, [isCheckoutOpen, currentUser?.phone, currentUser?.name, activeAddress, appMode, currentOrg.companyName]);

  // Handle B2B GSTIN Auto-Fill & Field Lock
  const handleFormGstinChange = async (val: string) => {
    const clean = val.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    setFormGstin(clean);
    if (clean.length === 15) {
      try {
        const res = await apiService.verifyGstin(clean);
        if (res.success && res.data) {
          const legalName = res.data.legalName || res.data.tradeName || `ENTERPRISE (${clean.substring(2, 12)})`;
          setFormFullName(legalName);
          // Only override State and StateCode if this is a BILLING address form or if no pincode has been entered yet!
          // If the user already entered a shipping destination pincode (e.g. 440001 Nagpur, Maharashtra),
          // the shipping delivery destination state MUST remain governed by the delivery pincode!
          if (addressTarget === 'BILLING' || !formPincode.trim()) {
            setFormState(res.data.stateName || 'Gujarat');
            setFormStateCode(res.data.stateCode || '24');
          }
          setIsGstinLocked(true);
          showToast(`GSTIN Verified: ${legalName}. Name & Registered State auto-filled and locked.`, 'info');
        }
      } catch {
        // Fallback silently if verification network drops
      }
    } else {
      if (isGstinLocked) {
        setIsGstinLocked(false);
      }
    }
  };

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

    if (isPinMismatch || !currentQuote || quoteStatus === 'QUOTE_EXPIRED') {
      if (destinationPincode !== targetPin) setDestinationPincode(targetPin);
      if (quotePaymentMethod !== targetQuoteMethod) setQuotePaymentMethod(targetQuoteMethod);
      fetchAuthoritativeQuote();
    } else if (isMethodMismatch) {
      setQuotePaymentMethod(targetQuoteMethod);
    }
  }, [isCheckoutOpen, activeAddress?.pincode, paymentMethod, destinationPincode, quotePaymentMethod, currentQuote, quoteStatus, setDestinationPincode, setQuotePaymentMethod, fetchAuthoritativeQuote]);

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

  const effectiveShipping: DeliveryAddress | null = shippingAddress || activeAddress || availableAddresses[0] || null;
  const effectiveBilling: DeliveryAddress | null = billingAddress || activeAddress || availableAddresses[0] || null;

  // Real-time cart calculations to guarantee non-zero fallback while authoritative quote is loading
  const cartItemsGross = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const cartTaxable = Math.round((cartItemsGross / 1.18) * 100) / 100;
  const cartGst = Math.round((cartItemsGross - cartTaxable) * 100) / 100;
  const cartShipping = 29.50; // India Post Speed Post Base ₹25 + 18% GST (₹4.50)
  const cartPrepaidTotal = cartItemsGross + cartShipping;
  const cartCodFee = Math.round((cartPrepaidTotal * 0.025) * 100) / 100;
  const cartCodTotal = Math.ceil((cartPrepaidTotal + cartCodFee) / 5) * 5;

  // Authoritative figures from current validated quote with immediate cart fallback
  const itemsGross = currentQuote ? Number(currentQuote.total_product_gross) : cartItemsGross;
  const taxableValue = currentQuote ? Number(currentQuote.subtotal_taxable) : cartTaxable;
  const taxAmount = currentQuote ? Number(currentQuote.total_product_gst) : cartGst;
  const totalShipping = currentQuote ? Number(currentQuote.shipping_total) : cartShipping;
  const codFee = paymentMethod === 'COD' 
    ? (currentQuote ? Number(currentQuote.cod_charge_raw || currentQuote.cod_surcharge || 0) : cartCodFee) 
    : 0;

  // Round Off calculations for BOTH Online Payment and Cash on Delivery (COD)
  const rawPrepaidTotal = currentQuote ? Number(currentQuote.prepaid_total) : (itemsGross + totalShipping);
  const roundedPrepaidTotal = Math.round(rawPrepaidTotal);
  const onlineRoundOff = Number((roundedPrepaidTotal - rawPrepaidTotal).toFixed(2));

  const rawCodTotal = rawPrepaidTotal + codFee;
  const roundedCodTotal = currentQuote?.cod_payable_total 
    ? Number(currentQuote.cod_payable_total) 
    : Math.ceil(rawCodTotal / 5) * 5;
  const codAdjustment = paymentMethod === 'COD' 
    ? (currentQuote?.cod_rounding_adjustment !== undefined 
        ? Number(currentQuote.cod_rounding_adjustment) 
        : Number((roundedCodTotal - rawCodTotal).toFixed(2))) 
    : 0;

  const grandTotal = paymentMethod === 'COD' ? roundedCodTotal : roundedPrepaidTotal;

  const estimatedPrepaid = Number(currentQuote?.prepaid_total || cartPrepaidTotal);
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

  // Auto-lookup PIN code for inline address form
  useEffect(() => {
    const cleanPin = formPincode.trim();
    if (cleanPin.length === 6 && /^[1-9][0-9]{5}$/.test(cleanPin)) {
      setIsLoadingPin(true);
      setPinLookupError(null);
      lookupPincode(cleanPin)
        .then((res) => {
          setIsLoadingPin(false);
          if (res && res.postOffices && res.postOffices.length > 0) {
            setFormPostOffices(res.postOffices);
            setFormSelectedPO((prev: PostOfficeInfo | null) => {
              const matched = res.postOffices.find((p) => p.name === prev?.name || p.facilityId === prev?.facilityId);
              return matched || res.postOffices[0];
            });
            setFormCity(res.district || 'Ahmedabad');
            setFormState(res.state || 'Gujarat');
            setFormStateCode(res.stateCode || '24');
          } else {
            setPinLookupError('No postal sub-hub facility found for this PIN code');
          }
        })
        .catch(() => {
          setIsLoadingPin(false);
        });
    }
  }, [formPincode]);

  const handleOpenAddAddress = (target: 'SHIPPING' | 'BILLING' = 'SHIPPING') => {
    setEditingAddressId(null);
    setAddressTarget(target);
    const cleanName = currentUser.name && !currentUser.name.startsWith('Customer ') && currentUser.name !== 'Valued Customer'
      ? currentUser.name
      : (appMode === 'B2B' && currentOrg.companyName ? currentOrg.companyName : '');
    setFormFullName(cleanName);
    setFormPhone(currentUser.phone ? currentUser.phone.replace(/\D/g, '').slice(-10) : '');
    setFormClassification(appMode === 'B2B' ? 'OFFICE' : 'HOME');
    setFormFlat('');
    setFormStreet('');
    setFormPincode('');
    setFormCity('');
    setFormState('');
    setFormStateCode('');
    setFormPostOffices([]);
    setFormSelectedPO(null);
    setFormGstin(target === 'BILLING' ? (billingAddress?.gstin || currentOrg.gstin || '') : (appMode === 'B2B' ? currentOrg.gstin || '' : ''));
    setFormApplyToBoth(isShippingSameAsBilling);
    setIsEditingAddress(true);
    setIsAddressListExpanded(false);
    setIsGstinLocked(false);
  };

  const handleOpenEditAddress = (target: 'SHIPPING' | 'BILLING', specificAddr?: DeliveryAddress) => {
    setAddressTarget(target);
    const targetAddr = specificAddr || (target === 'BILLING' ? (billingAddress || activeAddress) : (shippingAddress || activeAddress));
    if (targetAddr) {
      setEditingAddressId(targetAddr.id);
      setFormFullName(targetAddr.fullName);
      setFormPhone(targetAddr.phone);
      setFormClassification((targetAddr.addressType as any) || (appMode === 'B2B' ? 'OFFICE' : 'HOME'));
      setFormFlat(targetAddr.flatBuilding);
      setFormStreet(targetAddr.streetArea);
      setFormPincode(targetAddr.pincode);
      setFormCity(targetAddr.city);
      setFormState(targetAddr.state);
      setFormStateCode(targetAddr.stateCode);
      setFormPostOffices(targetAddr.postOffice ? [targetAddr.postOffice] : []);
      setFormSelectedPO(targetAddr.postOffice || null);
      setFormGstin(targetAddr.gstin || (target === 'BILLING' ? currentOrg.gstin : ''));
      setFormApplyToBoth(isShippingSameAsBilling);
      setIsGstinLocked(Boolean(targetAddr.gstin));
    } else {
      handleOpenAddAddress(target);
      return;
    }
    setIsEditingAddress(true);
    setIsAddressListExpanded(false);
  };

  const handleDeleteAddress = (addrId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteAddress(addrId);
    showToast('Address removed successfully', 'info');
    const remaining = useStore.getState().addresses;
    if (remaining.length === 0) {
      handleOpenAddAddress('SHIPPING');
    } else {
      fetchAuthoritativeQuote();
    }
  };

  const handleToggleSameAsBilling = (same: boolean) => {
    setIsShippingSameAsBilling(same);
    if (same) {
      const source = billingAddress || activeAddress;
      if (source) {
        setShippingAddress(source);
        useStore.setState({ activeAddress: source, destinationPincode: source.pincode });
        showToast('✓ Delivery address synchronized with Billing Tax Address', 'success');
        fetchAuthoritativeQuote();
      }
    }
  };

  const handleSaveAddressForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      showToast('Please enter full name or business entity name', 'warning');
      return;
    }
    const cleanPhone = formPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }
    if (!formFlat.trim() || !formStreet.trim()) {
      showToast('Please enter complete flat/building and street address', 'warning');
      return;
    }
    const cleanPin = formPincode.trim();
    if (cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      showToast('Please enter a valid 6-digit PIN code', 'warning');
      return;
    }

    const defaultFacility: PostOfficeInfo = {
      name: formCity ? `${formCity} Facility Hub` : 'Delivery Hub',
      branchType: 'Sub Hub Facility',
      deliveryStatus: 'Delivery',
      circle: `${formState || 'Gujarat'} Circle`,
      district: formCity || 'Ahmedabad',
      state: formState || 'Gujarat',
      facilityId: `${(formCity || 'AHM').slice(0, 3).toUpperCase()}-${cleanPin}`,
    };

    const effectivePO: PostOfficeInfo = formSelectedPO || defaultFacility;
    const existingTargetId = editingAddressId || (addressTarget === 'BILLING' 
      ? billingAddress?.id 
      : (shippingAddress?.id || activeAddress?.id)) || `addr_${Date.now()}`;

    const newAddr: DeliveryAddress = {
      id: existingTargetId,
      userId: currentUser.id || 'usr_direct',
      fullName: formFullName.trim(),
      phone: cleanPhone,
      addressType: formClassification,
      flatBuilding: formFlat.trim(),
      streetArea: formStreet.trim(),
      pincode: cleanPin,
      postOffice: effectivePO,
      city: formCity || 'Ahmedabad',
      state: formState || 'Gujarat',
      stateCode: formStateCode || '24',
      isDefault: true,
      gstin: formGstin.trim() ? formGstin.trim().toUpperCase() : undefined,
    };

    if (editingAddressId) {
      updateAddress(editingAddressId, newAddr);
    } else {
      addAddress(newAddr);
    }

    if (formApplyToBoth || isShippingSameAsBilling) {
      setIsShippingSameAsBilling(true);
      setBillingAddress(newAddr);
      setShippingAddress(newAddr);
      useStore.setState({ activeAddress: newAddr, destinationPincode: newAddr.pincode });
    } else if (addressTarget === 'BILLING') {
      setBillingAddress(newAddr);
    } else {
      setShippingAddress(newAddr);
      useStore.setState({ activeAddress: newAddr, destinationPincode: newAddr.pincode });
    }

    if (!currentUser.phone || currentUser.phone.length < 10) {
      useStore.getState().updateUserProfile({ phone: cleanPhone, name: formFullName.trim() });
    }

    if (currentUser.id && currentUser.id !== 'usr_guest') {
      authApi.addCustomerAddress({
        address_type: formClassification === 'OFFICE' ? 'OFFICE' : (formClassification === 'WAREHOUSE' ? 'WAREHOUSE' : (addressTarget === 'BILLING' ? 'BILLING' : 'SHIPPING')),
        full_name: formFullName.trim(),
        phone: cleanPhone,
        flat_building: formFlat.trim(),
        street_area: formStreet.trim(),
        city: formCity || 'Ahmedabad',
        state: formState || 'Gujarat',
        state_code: formStateCode || '24',
        pincode: cleanPin,
        is_default: true,
        is_verified: true,
        gstin: formGstin.trim() || undefined
      }).catch(err => console.warn('Could not sync address to backend:', err));
    }

    setIsEditingAddress(false);
    setEditingAddressId(null);
    showToast(`✓ Address saved for ${effectivePO.name} (${newAddr.pincode})`, 'success');
    fetchAuthoritativeQuote();
  };

  const handleSelectAddress = (addr: DeliveryAddress, asTarget?: 'SHIPPING' | 'BILLING') => {
    if (asTarget === 'BILLING') {
      setBillingAddress(addr);
      showToast(`✓ Billing address set to ${addr.fullName} (${addr.pincode})`, 'success');
    } else {
      useStore.setState({
        activeAddress: addr,
        shippingAddress: addr,
        destinationPincode: addr.pincode,
      });
      setActiveAddress(addr.id);
      if (isShippingSameAsBilling) {
        setBillingAddress(addr);
      }
      setIsAddressListExpanded(false);
      setActiveStep(2);
      showToast(`✓ Delivery address set to ${addr.postOffice?.name || addr.city} (${addr.pincode})`, 'success');
    }
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
          ...(isUuid(i.variantId) ? { variant_id: i.variantId } : {}),
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

    const rawLine1 = `${activeAddress.flatBuilding || ''} ${activeAddress.streetArea || ''}`.trim() || activeAddress.postOffice?.name || activeAddress.city;
    if (!rawLine1 || rawLine1.length < 3) {
      throw new Error('Please enter complete street/building delivery address details.');
    }
    const safeLine1 = rawLine1;

    const rawPhone = activeAddress.phone || currentUser?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit mobile number for order delivery.');
    }
    const validPhone = cleanPhone;

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
        state_code: activeAddress.stateCode || '24',
      },
      items: cart.map((i) => ({
        sku: i.sku,
        quantity: i.quantity,
        ...(isUuid(i.variantId) ? { variant_id: i.variantId } : {}),
      })),
      claim_gst: claimGst,
      gstin: claimGst ? (enteredGstin || activeAddress.gstin || currentOrg.gstin) : undefined,
      company_name: claimGst ? (currentOrg.companyName || undefined) : undefined,
    };

    return await orderApi.createOrder(payload);
  };

  const handleInitiateOrder = async () => {
    if (
      !activeAddress ||
      !activeAddress.fullName?.trim() ||
      activeAddress.fullName.startsWith('Customer ') ||
      activeAddress.fullName === 'Valued Customer' ||
      !activeAddress.flatBuilding?.trim() ||
      !activeAddress.pincode?.trim()
    ) {
      showToast('Customer name and complete delivery address are compulsory. Please enter and save your details to place the order.', 'warning');
      setIsEditingAddress(true);
      return;
    }

    const recipientPhone = (activeAddress.phone || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (!recipientPhone || recipientPhone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number for order delivery.', 'warning');
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

        const orderPayable = Number(backendOrder.total_payable || grandTotal);
        if (orderPayable < 1) {
          throw new Error('Order amount must be at least ₹1 to initiate payment.');
        }

        await razorpayService.openCheckout({
          keyId: rzpOrderData.key_id,
          amount: orderPayable,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/25 backdrop-blur-xs animate-fadeIn">
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
            {/* Step 1: Personal & Dual Address Management */}
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
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      Personal & Dual Address Management
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {appMode === 'B2B' ? 'B2B Enterprise & Tax Billing Profile' : 'Customer Profile & Tax Addresses'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#0054A6] font-bold">
                    {effectiveShipping ? '✓ Addresses Configured' : 'Select / Add Address'}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-5 bg-white">
                {/* Header with Title and In-Modal Direct Address Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0054A6] uppercase tracking-wider block">
                      Personal & Dual Address Management
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      {appMode === 'B2B' ? '🏢 B2B Enterprise & Tax Billing Profile' : '👤 Customer Profile & Delivery Addresses'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Speed Post Consignee Delivery (Origin Hub: Kathwada 382430) • Verified GST Tax Invoice
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {availableAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddressListExpanded(!isAddressListExpanded);
                          if (isEditingAddress) setIsEditingAddress(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                          isAddressListExpanded
                            ? 'bg-[#0054A6] text-white border-[#0054A6]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                        title="Manage Saved Addresses directly in checkout"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Saved Addresses ({availableAddresses.length})</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddressListExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenAddAddress(appMode === 'B2B' && !effectiveBilling ? 'BILLING' : 'SHIPPING')}
                      className="px-3 py-1.5 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{appMode === 'B2B' ? '+ Add Business Address' : '+ Add New Address'}</span>
                    </button>
                  </div>
                </div>

                {/* Case A: Inline Address Form (Adding or Editing) */}
                {isEditingAddress || (!effectiveShipping && !effectiveBilling && availableAddresses.length === 0) ? (
                  <form onSubmit={handleSaveAddressForm} className="p-5 rounded-2xl bg-blue-50/50 border-2 border-[#0054A6]/30 space-y-4 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#0054A6] text-white flex items-center justify-center font-bold">
                          <Edit3 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">
                            {addressTarget === 'BILLING' 
                              ? 'Edit Billing Tax Address' 
                              : (effectiveShipping ? 'Edit Delivery Consignee Address' : 'Add New Delivery & Tax Address')}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Verified against India Post PIN directory & saved to your Customer Profile
                          </span>
                        </div>
                      </div>

                      {availableAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(false)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-slate-900 font-bold text-xs"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                          <span>Full Name / Business Entity *</span>
                          {isGstinLocked && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 font-mono">
                              <Lock className="w-3 h-3 text-emerald-600" /> Locked to GSTIN
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          required
                          readOnly={isGstinLocked}
                          value={formFullName}
                          onChange={(e) => setFormFullName(e.target.value)}
                          placeholder="Enter your real full name"
                          className={`w-full h-9 px-3 border rounded-xl font-medium focus:outline-none transition-all ${
                            isGstinLocked
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold cursor-not-allowed'
                              : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-[#0054A6]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                          <span>Contact Phone Number *</span>
                          <span className="text-[10px] text-[#0054A6] font-mono font-bold">Auto-filled</span>
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit mobile number"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Address Classification */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">
                        Address Classification
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormClassification('HOME')}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            formClassification === 'HOME'
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Home className="w-3.5 h-3.5" />
                          <span>Residential (Home)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormClassification('OFFICE')}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            formClassification === 'OFFICE'
                              ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Commercial (Office)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormClassification('WAREHOUSE')}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            formClassification === 'WAREHOUSE'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Factory className="w-3.5 h-3.5" />
                          <span>Factory / Warehouse</span>
                        </button>
                      </div>
                    </div>

                    {/* Flat, Building, Street */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Flat, House No., Building, Complex *
                        </label>
                        <input
                          type="text"
                          required
                          value={formFlat}
                          onChange={(e) => setFormFlat(e.target.value)}
                          placeholder="Plot 42, APE Industrial Complex"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Street, Road, Area, Landmark *
                        </label>
                        <input
                          type="text"
                          required
                          value={formStreet}
                          onChange={(e) => setFormStreet(e.target.value)}
                          placeholder="Kathwada GIDC Phase 2, Near Ring Road"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* PIN code & Postal Delivery Hub */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-700 font-bold">
                            6-Digit Pincode *
                          </label>
                          {isLoadingPin && (
                            <span className="text-[10px] text-[#0054A6] font-mono flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Verifying PIN...
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={formPincode}
                          onChange={(e) => setFormPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="e.g. 382430"
                          className="w-full h-9 px-3 bg-white border-2 border-[#0054A6] rounded-xl text-[#0054A6] font-mono font-black focus:outline-none"
                        />
                        {pinLookupError && (
                          <p className="text-[11px] text-amber-600 mt-1">{pinLookupError}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Select Delivery Sub-Hub *
                        </label>
                        <select
                          value={formSelectedPO?.facilityId || formSelectedPO?.name || ''}
                          onChange={(e) => {
                            const found = formPostOffices.find((po) => po.facilityId === e.target.value || po.name === e.target.value);
                            if (found) {
                              setFormSelectedPO(found);
                              if (found.state) {
                                setFormState(found.state);
                                setFormStateCode(getGstStateCode(found.state, formPincode));
                              }
                              if (found.district) {
                                setFormCity(found.district);
                              }
                            }
                          }}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none"
                        >
                          {formPostOffices.length > 0 ? (
                            formPostOffices.map((po) => (
                              <option key={po.facilityId || po.name} value={po.facilityId || po.name}>
                                {po.name} ({po.branchType})
                              </option>
                            ))
                          ) : (
                            <option value="">
                              {formCity ? `${formCity} Delivery Hub` : 'Delivery Facility Hub'}
                            </option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 text-[11px] text-slate-600 font-mono flex items-center justify-between">
                      <span>City: <strong className="text-slate-900">{formCity}</strong></span>
                      <span>State: <strong className="text-slate-900">{formState}</strong> (Code: {formStateCode})</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Origin Hub: Kathwada 382430
                      </span>
                    </div>

                    {/* Optional GSTIN for B2B or tax invoice */}
                    {(appMode === 'B2B' || claimGst) && (
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Company GSTIN (18% ITC Input Tax Credit)
                        </label>
                        <input
                          type="text"
                          maxLength={15}
                          value={formGstin}
                          onChange={(e) => handleFormGstinChange(e.target.value)}
                          placeholder="e.g. 24ABCDE1234F1Z5"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                        />
                        {isGstinLocked && (
                          <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Legal Entity Name & Registered State auto-filled and locked to statutory GSTIN.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sync Checkbox */}
                    <div className="pt-2 border-t border-blue-200/50">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formApplyToBoth}
                          onChange={(e) => setFormApplyToBoth(e.target.checked)}
                          className="w-4 h-4 rounded text-[#0054A6] focus:ring-[#0054A6] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Use this address for both Shipping Delivery & Billing Tax Address
                        </span>
                      </label>
                    </div>

                    {/* Form Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      {availableAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(false)}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Save Address & Apply to Order
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Case B: Dual Address Management Console (Display Mode) */
                  <div className="space-y-4">
                    {/* 🔄 Global Same as Billing Address Checkbox Box */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-emerald-50/90 border-2 border-blue-200/80 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="checkout-shipping-same-as-billing"
                          name="checkoutShippingSameAsBilling"
                          checked={isShippingSameAsBilling}
                          onChange={(e) => handleToggleSameAsBilling(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-[#0054A6] focus:ring-[#0054A6] cursor-pointer"
                        />
                        <div>
                          <span className="text-xs md:text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>Shipping Delivery Address is same as Billing Tax Address</span>
                            {isShippingSameAsBilling ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono border border-emerald-300">
                                ✓ Synchronized
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono border border-amber-300">
                                ⚡ Separate Destination
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-600 font-mono block">
                            {isShippingSameAsBilling
                              ? 'APE parcels will be dispatched to the Billing Tax Address. Both are automatically synchronized.'
                              : 'Separate delivery destination consignee is active below.'}
                          </span>
                        </div>
                      </label>

                      {!isShippingSameAsBilling && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress('SHIPPING')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Shipping Destination
                        </button>
                      )}
                    </div>

                    {/* 2-Column Grid: 1) Billing Tax Address + 2) Shipping Delivery Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 🧾 1. BILLING TAX INVOICE ADDRESS */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between shadow-sm">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0054A6] flex items-center justify-center font-bold">
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs">1) Billing Tax Address</h4>
                                <span className="text-[10px] text-slate-500 font-mono">For GST Tax Invoice & ITC</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenEditAddress('BILLING')}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[#0054A6] border border-blue-200 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                          </div>

                          {effectiveBilling ? (
                            <div className="space-y-1.5 text-xs">
                              <div className="font-bold text-slate-900 flex items-center justify-between">
                                <span>{effectiveBilling.fullName}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0054A6] font-bold border border-blue-100">
                                  {effectiveBilling.addressType || 'TAX BILLING'}
                                </span>
                              </div>
                              <div className="text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-400" /> {maskPhone(effectiveBilling.phone)}
                              </div>
                              <p className="text-slate-700 leading-snug">
                                {effectiveBilling.flatBuilding}, {effectiveBilling.streetArea}
                              </p>
                              <div className="text-[#0054A6] font-mono font-bold text-[11px] bg-blue-50/70 p-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>{effectiveBilling.postOffice?.name || effectiveBilling.city} ({effectiveBilling.pincode})</span>
                              </div>
                              <div className="text-slate-500 text-[11px]">
                                {effectiveBilling.city}, {effectiveBilling.state} (State Code: {effectiveBilling.stateCode || '24'})
                              </div>
                              {(effectiveBilling.gstin || currentOrg.gstin) && (
                                <div className="text-emerald-700 font-mono font-bold text-[11px] pt-1 flex items-center gap-1 border-t border-slate-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>GSTIN: {effectiveBilling.gstin || currentOrg.gstin}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2 text-xs">
                              <p className="text-slate-500">No billing tax address saved.</p>
                              <button
                                type="button"
                                onClick={() => handleOpenAddAddress('BILLING')}
                                className="px-3 py-1 bg-[#0054A6] text-white font-bold rounded-lg text-xs"
                              >
                                + Add Billing Address
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 🚚 2. SHIPPING DELIVERY ADDRESS */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between shadow-sm">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                <Truck className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs">2) Shipping Delivery Address</h4>
                                <span className="text-[10px] text-slate-500 font-mono">For APE Priority Speed Post Dispatch</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenEditAddress('SHIPPING')}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Edit3 className="w-3 h-3" /> {isShippingSameAsBilling ? 'Edit / Separate' : 'Edit'}
                            </button>
                          </div>

                          {effectiveShipping ? (
                            <div className="space-y-1.5 text-xs">
                              <div className="font-bold text-slate-900 flex items-center justify-between">
                                <span>{effectiveShipping.fullName}</span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                                  isShippingSameAsBilling 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                  {isShippingSameAsBilling ? '✓ Synced with Billing' : '⚡ Separate Delivery'}
                                </span>
                              </div>
                              <div className="text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-emerald-600" /> {maskPhone(effectiveShipping.phone)}
                              </div>
                              <p className="text-slate-700 leading-snug">
                                {effectiveShipping.flatBuilding}, {effectiveShipping.streetArea}
                              </p>
                              <div className="text-emerald-800 font-mono font-bold text-[11px] bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{effectiveShipping.postOffice?.name || effectiveShipping.city} ({effectiveShipping.pincode})</span>
                              </div>
                              <div className="text-slate-500 text-[11px]">
                                {effectiveShipping.city}, {effectiveShipping.state} (State Code: {effectiveShipping.stateCode || '24'})
                              </div>
                              <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-mono">Speed Post (Origin 382430)</span>
                                {isShippingSameAsBilling ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsShippingSameAsBilling(false);
                                      handleOpenAddAddress('SHIPPING');
                                    }}
                                    className="text-[#0054A6] hover:underline font-bold"
                                  >
                                    + Add Separate Address
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSameAsBilling(true)}
                                    className="text-emerald-700 hover:underline font-bold"
                                  >
                                    ✓ Reset to Same as Billing
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2 text-xs">
                              <p className="text-slate-500">No shipping delivery address saved.</p>
                              <button
                                type="button"
                                onClick={() => handleOpenAddAddress('SHIPPING')}
                                className="px-3 py-1 bg-[#0054A6] text-white font-bold rounded-lg text-xs"
                              >
                                + Add Shipping Address
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Saved Addresses Selector & Complete In-Modal Management */}
                    {availableAddresses.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setIsAddressListExpanded(!isAddressListExpanded)}
                            className="text-xs text-[#0054A6] hover:text-[#003d7a] font-bold flex items-center gap-1.5"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>
                              {isAddressListExpanded ? 'Hide Saved Addresses' : `Manage Saved Addresses (${availableAddresses.length})`}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddressListExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAddAddress(appMode === 'B2B' && !effectiveBilling ? 'BILLING' : 'SHIPPING')}
                            className="text-xs text-[#0054A6] hover:underline font-bold inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> {appMode === 'B2B' ? 'Add Business Address' : 'Add New Address'}
                          </button>
                        </div>

                        {isAddressListExpanded && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {availableAddresses.map((addr, idx) => {
                              const isDeliveryActive = (activeAddress?.id === addr.id) || (shippingAddress?.id === addr.id);
                              const isBillingActive = billingAddress?.id === addr.id;

                              return (
                                <div
                                  key={addr.id || idx}
                                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 flex flex-col justify-between ${
                                    isDeliveryActive
                                      ? 'bg-blue-50/90 border-[#0054A6] ring-2 ring-[#0054A6]/20 shadow-md'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                        <MapPin className="w-3.5 h-3.5 text-[#0054A6] shrink-0" />
                                        <span className="truncate">{addr.fullName}</span>
                                      </span>
                                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                                        addr.addressType === 'OFFICE' ? 'bg-blue-100 text-[#0054A6]' :
                                        addr.addressType === 'WAREHOUSE' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-amber-100 text-amber-800'
                                      }`}>
                                        {addr.addressType || 'ADDRESS'}
                                      </span>
                                    </div>

                                    <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                                      <Phone className="w-3 h-3 text-slate-400" /> {maskPhone(addr.phone)}
                                    </div>

                                    <p className="text-slate-600 line-clamp-2 leading-tight text-[11px]">
                                      {addr.flatBuilding}, {addr.streetArea}
                                    </p>

                                    <div className="text-[11px] text-[#0054A6] font-mono font-bold bg-blue-50/60 p-1.5 rounded-lg border border-blue-100">
                                      📍 {addr.postOffice?.name || addr.city} ({addr.pincode}), {addr.state}
                                    </div>

                                    {addr.gstin && (
                                      <div className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> GSTIN: {addr.gstin}
                                      </div>
                                    )}

                                    {/* Active Badges */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                      {isDeliveryActive && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono border border-emerald-300 flex items-center gap-1">
                                          <Check className="w-3 h-3 text-emerald-700" /> Delivery Destination
                                        </span>
                                      )}
                                      {isBillingActive && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0054A6] text-[10px] font-bold font-mono border border-blue-300 flex items-center gap-1">
                                          <FileText className="w-3 h-3 text-[#0054A6]" /> Tax Billing
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Direct Card Action Buttons */}
                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      {!isDeliveryActive ? (
                                        <button
                                          type="button"
                                          onClick={() => handleSelectAddress(addr, 'SHIPPING')}
                                          className="px-2.5 py-1 rounded-lg bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-[11px] shadow-sm transition-all"
                                        >
                                          Deliver Here
                                        </button>
                                      ) : (
                                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                          <Check className="w-3 h-3" /> Selected
                                        </span>
                                      )}

                                      {!isBillingActive && (
                                        <button
                                          type="button"
                                          onClick={() => handleSelectAddress(addr, 'BILLING')}
                                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] transition-all"
                                        >
                                          Bill Here
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditAddress('SHIPPING', addr)}
                                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                                        title="Edit address"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteAddress(addr.id, e)}
                                        className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200"
                                        title="Delete address"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 1 Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenAddAddress(appMode === 'B2B' && !effectiveBilling ? 'BILLING' : 'SHIPPING')}
                        className="text-xs text-[#0054A6] hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> {appMode === 'B2B' ? '+ Add Business Address' : '+ Add New Address'}
                      </button>

                      {effectiveShipping && (
                        <button
                          type="button"
                          onClick={() => setActiveStep(2)}
                          className="px-5 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                        >
                          <span>Continue to Payment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
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

                      {enteredGstin.length >= 2 && (
                        <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                          enteredGstin.startsWith('24')
                            ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                            : 'bg-purple-50/90 border-purple-200 text-purple-900'
                        }`}>
                          <div className="font-bold flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${enteredGstin.startsWith('24') ? 'bg-[#0054A6]' : 'bg-purple-600'} animate-pulse`} />
                            {enteredGstin.startsWith('24') ? (
                              <span>Gujarat Intra-State Supply (Code 24)</span>
                            ) : (
                              <span>Inter-State Supply (State Code {enteredGstin.substring(0, 2)})</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-600">
                            {enteredGstin.startsWith('24')
                              ? 'Statutory Split: 9% CGST + 9% SGST. Input Tax Credit (ITC) will be credited to your Gujarat GSTR-2B.'
                              : `Statutory Split: 18% Integrated GST (IGST). Input Tax Credit (ITC) will be credited to State ${enteredGstin.substring(0, 2)} GSTR-2B.`}
                          </p>
                        </div>
                      )}
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

                {paymentMethod === 'COD' ? (
                  <div className="space-y-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                    <div className="flex justify-between text-amber-900 font-bold">
                      <span>COD Handling Fee (2.5%):</span>
                      <span className="font-mono">₹{codFee.toLocaleString('en-IN')}</span>
                    </div>
                    {codAdjustment !== 0 && (
                      <div className="flex justify-between text-amber-700 text-[11px] font-mono">
                        <span>Round Off (COD multiple of ₹5):</span>
                        <span>{codAdjustment > 0 ? `+₹${codAdjustment.toFixed(2)}` : `-₹${Math.abs(codAdjustment).toFixed(2)}`}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  onlineRoundOff !== 0 && (
                    <div className="flex justify-between text-slate-600 text-xs font-medium bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-700 font-bold">Round Off (Online Payment):</span>
                      <span className={`font-mono font-bold ${onlineRoundOff > 0 ? 'text-slate-800' : 'text-emerald-700'}`}>
                        {onlineRoundOff > 0 ? `+₹${onlineRoundOff.toFixed(2)}` : `-₹${Math.abs(onlineRoundOff).toFixed(2)}`}
                      </span>
                    </div>
                  )
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

              {/* Mandatory Delivery Address Alert */}
              {(!activeAddress || !activeAddress.fullName?.trim() || activeAddress.fullName.startsWith('Customer ') || !activeAddress.flatBuilding?.trim() || !activeAddress.pincode?.trim()) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-800 text-xs font-semibold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Customer name & delivery address are compulsory to place order.</span>
                  </div>
                  {!isEditingAddress && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(true)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0"
                    >
                      Fill Address
                    </button>
                  )}
                </div>
              )}

              {/* Complete Order Action Button */}
              <button
                type="button"
                aria-label="Confirm and place order"
                disabled={
                  isProcessing ||
                  Boolean(apiCatalogError) ||
                  !activeAddress ||
                  !activeAddress.fullName?.trim() ||
                  activeAddress.fullName.startsWith('Customer ') ||
                  !activeAddress.flatBuilding?.trim() ||
                  !activeAddress.pincode?.trim() ||
                  grandTotal <= 0 ||
                  quoteStatus === 'QUOTE_LOADING'
                }
                onClick={handleInitiateOrder}
                className={`w-full py-4 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD'
                    ? 'bg-gradient-to-r from-[#0054A6] via-blue-600 to-[#003d7a] hover:opacity-95 text-white shadow-blue-600/30'
                    : paymentMethod === 'COD'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:opacity-90 text-slate-950 shadow-orange-500/20'
                    : 'bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 hover:opacity-95 text-white shadow-blue-700/30'
                } disabled:opacity-50`}
              >
                {isProcessing || quoteStatus === 'QUOTE_LOADING' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {isProcessing 
                      ? (paymentMethod === 'COD' ? 'Sending Verification...' : 'Connecting to Gateway...')
                      : 'Calculating Live Tariff...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {!activeAddress || !activeAddress.fullName?.trim() || activeAddress.fullName.startsWith('Customer ') || !activeAddress.flatBuilding?.trim() || !activeAddress.pincode?.trim() ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Enter Customer Name & Address to Order</span>
                      </>
                    ) : paymentMethod === 'RAZORPAY' || paymentMethod === 'UPI' || paymentMethod === 'CREDIT_DEBIT_CARD' ? (
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-xs animate-fadeIn">
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
                {codDevOtp && (
                  <div className="mt-2 inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-mono font-bold">
                    Test OTP: {codDevOtp}
                  </div>
                )}
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
