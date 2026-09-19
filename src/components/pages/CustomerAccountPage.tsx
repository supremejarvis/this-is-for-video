'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Phone, Mail, ShieldCheck, 
  FileText, Truck, Clock, CheckCircle2, AlertCircle, 
  Download, Printer, LogOut, ChevronRight, Edit3, 
  Plus, Check, Award, Lock, Building2, Package, RefreshCw, 
  Sparkles, ArrowLeft, ArrowRight, X, ShoppingCart,
  Home, Briefcase, Factory
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DeliveryAddress, PostOfficeInfo, Order } from '../../types';
import { lookupPincode } from '../../services/logisticsService';
import { ORIGIN_HUB_PINCODE } from '../../constants';
import { GstInvoice } from '../logistics/GstInvoice';
import { useNavigate } from '../../lib/navigation';

export const CustomerAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, updateUserProfile, currentOrg, updateOrgDetails,
    activeAddress, billingAddress, setBillingAddress, 
    shippingAddress, setShippingAddress, isShippingSameAsBilling, setIsShippingSameAsBilling,
    orders, logout, showToast, setActiveTab, 
    cart, addToCart, setIsCheckoutOpen, setIsCartDrawerOpen, appMode 
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'PROFILE' | 'ORDERS' | 'WARRANTY'>('PROFILE');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'IN_TRANSIT' | 'DELIVERED' | 'CONFIRMED'>('ALL');
  const [visibleOrderCount, setVisibleOrderCount] = useState<number>(4);

  // ─────────────────────────────────────────────────────────────
  // 0) PROFILE EDITING STATE & FORM
  // ─────────────────────────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentUser.name || '');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profileCompanyName, setProfileCompanyName] = useState(currentOrg.companyName || '');
  const [profileGstin, setProfileGstin] = useState(currentOrg.gstin || '');
  const [profilePan, setProfilePan] = useState(currentOrg.pan || '');

  useEffect(() => {
    setProfileName(currentUser.name || '');
    setProfilePhone(currentUser.phone || '');
    setProfileEmail(currentUser.email || '');
    setProfileCompanyName(currentOrg.companyName || '');
    setProfileGstin(currentOrg.gstin || '');
    setProfilePan(currentOrg.pan || '');
  }, [currentUser, currentOrg]);

  // ─────────────────────────────────────────────────────────────
  const defaultHubPO: PostOfficeInfo = {
    name: 'Kathwada GIDC S.O.',
    branchType: 'Sub Hub Facility',
    deliveryStatus: 'Delivery',
    circle: 'Gujarat Circle',
    district: 'Ahmedabad',
    state: 'Gujarat',
    facilityId: 'AHM-KATH-382430',
  };

  // ─────────────────────────────────────────────────────────────
  // 1) BILLING ADDRESS STATE & FORM
  // ─────────────────────────────────────────────────────────────
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [billingName, setBillingName] = useState(billingAddress?.fullName || currentUser.name || '');
  const [billingPhone, setBillingPhone] = useState(billingAddress?.phone || currentUser.phone || '');
  const [billingFlat, setBillingFlat] = useState(billingAddress?.flatBuilding || '');
  const [billingStreet, setBillingStreet] = useState(billingAddress?.streetArea || '');
  const [billingPincode, setBillingPincode] = useState(billingAddress?.pincode || '382430');
  const [billingPostOffices, setBillingPostOffices] = useState<PostOfficeInfo[]>(billingAddress?.postOffice ? [billingAddress.postOffice] : [defaultHubPO]);
  const [billingSelectedPO, setBillingSelectedPO] = useState<PostOfficeInfo>(billingAddress?.postOffice || defaultHubPO);
  const [billingCity, setBillingCity] = useState(billingAddress?.city || 'Ahmedabad');
  const [billingState, setBillingState] = useState(billingAddress?.state || 'Gujarat');
  const [billingStateCode, setBillingStateCode] = useState(billingAddress?.stateCode || '24');
  const [billingGstin, setBillingGstin] = useState(billingAddress?.gstin || '');
  const [isLoadingBillingPin, setIsLoadingBillingPin] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 2) SHIPPING ADDRESS STATE & FORM
  // ─────────────────────────────────────────────────────────────
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [shippingName, setShippingName] = useState(shippingAddress?.fullName || activeAddress?.fullName || currentUser.name || '');
  const [shippingPhone, setShippingPhone] = useState(shippingAddress?.phone || activeAddress?.phone || currentUser.phone || '');
  const [shippingFlat, setShippingFlat] = useState(shippingAddress?.flatBuilding || activeAddress?.flatBuilding || '');
  const [shippingStreet, setShippingStreet] = useState(shippingAddress?.streetArea || activeAddress?.streetArea || '');
  const [shippingPincode, setShippingPincode] = useState(shippingAddress?.pincode || activeAddress?.pincode || '382430');
  const [shippingPostOffices, setShippingPostOffices] = useState<PostOfficeInfo[]>(
    shippingAddress?.postOffice ? [shippingAddress.postOffice] : (activeAddress?.postOffice ? [activeAddress.postOffice] : [defaultHubPO])
  );
  const [shippingSelectedPO, setShippingSelectedPO] = useState<PostOfficeInfo>(
    shippingAddress?.postOffice || activeAddress?.postOffice || defaultHubPO
  );
  const [shippingCity, setShippingCity] = useState(shippingAddress?.city || activeAddress?.city || 'Ahmedabad');
  const [shippingState, setShippingState] = useState(shippingAddress?.state || activeAddress?.state || 'Gujarat');
  const [shippingStateCode, setShippingStateCode] = useState(shippingAddress?.stateCode || activeAddress?.stateCode || '24');
  const [isLoadingShippingPin, setIsLoadingShippingPin] = useState(false);

  // Sync addresses when billingAddress / shippingAddress changes in store
  useEffect(() => {
    if (billingAddress) {
      setBillingName(billingAddress.fullName);
      setBillingPhone(billingAddress.phone);
      setBillingFlat(billingAddress.flatBuilding);
      setBillingStreet(billingAddress.streetArea);
      setBillingPincode(billingAddress.pincode);
      setBillingPostOffices([billingAddress.postOffice]);
      setBillingSelectedPO(billingAddress.postOffice);
      setBillingCity(billingAddress.city);
      setBillingState(billingAddress.state);
      setBillingStateCode(billingAddress.stateCode);
      if (billingAddress.gstin) setBillingGstin(billingAddress.gstin);
    }
  }, [billingAddress]);

  useEffect(() => {
    if (shippingAddress) {
      setShippingName(shippingAddress.fullName);
      setShippingPhone(shippingAddress.phone);
      setShippingFlat(shippingAddress.flatBuilding);
      setShippingStreet(shippingAddress.streetArea);
      setShippingPincode(shippingAddress.pincode);
      setShippingPostOffices([shippingAddress.postOffice]);
      setShippingSelectedPO(shippingAddress.postOffice);
      setShippingCity(shippingAddress.city);
      setShippingState(shippingAddress.state);
      setShippingStateCode(shippingAddress.stateCode);
    }
  }, [shippingAddress]);

  // Pincode lookup for Billing Address
  useEffect(() => {
    if (billingPincode.trim().length === 6) {
      setIsLoadingBillingPin(true);
      lookupPincode(billingPincode.trim()).then((res) => {
        setIsLoadingBillingPin(false);
        if (res && res.postOffices.length > 0) {
          setBillingPostOffices(res.postOffices);
          setBillingSelectedPO(res.postOffices[0]);
          setBillingCity(res.district);
          setBillingState(res.state);
          setBillingStateCode(res.stateCode);
        }
      });
    }
  }, [billingPincode]);

  // Pincode lookup for Shipping Address
  useEffect(() => {
    if (shippingPincode.trim().length === 6) {
      setIsLoadingShippingPin(true);
      lookupPincode(shippingPincode.trim()).then((res) => {
        setIsLoadingShippingPin(false);
        if (res && res.postOffices.length > 0) {
          setShippingPostOffices(res.postOffices);
          setShippingSelectedPO(res.postOffices[0]);
          setShippingCity(res.district);
          setShippingState(res.state);
          setShippingStateCode(res.stateCode);
        }
      });
    }
  }, [shippingPincode]);

  const handleToggleSameAsBilling = (checked: boolean) => {
    setIsShippingSameAsBilling(checked);
    if (checked) {
      setIsEditingShipping(false);
      setShippingName(billingName);
      setShippingPhone(billingPhone);
      setShippingFlat(billingFlat);
      setShippingStreet(billingStreet);
      setShippingPincode(billingPincode);
      setShippingPostOffices(billingPostOffices);
      setShippingSelectedPO(billingSelectedPO);
      setShippingCity(billingCity);
      setShippingState(billingState);
      setShippingStateCode(billingStateCode);
    }
  };

  const handleSaveBilling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingSelectedPO) {
      showToast('Please select a valid Delivery Facility Hub', 'error');
      return;
    }
    const updated: DeliveryAddress = {
      id: billingAddress?.id || `addr_billing_${Date.now()}`,
      userId: currentUser.id,
      fullName: billingName,
      phone: billingPhone,
      addressType: currentUser.role.includes('B2B') ? 'OFFICE' : 'HOME',
      flatBuilding: billingFlat,
      streetArea: billingStreet,
      pincode: billingPincode,
      postOffice: billingSelectedPO,
      city: billingCity,
      state: billingState,
      stateCode: billingStateCode,
      isDefault: true,
      gstin: currentUser.role.includes('B2B') ? billingGstin : undefined
    };
    setBillingAddress(updated);
    setIsEditingBilling(false);
  };

  const handleSaveShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingSelectedPO) {
      showToast('Please select a valid Delivery Facility Hub', 'error');
      return;
    }
    const updated: DeliveryAddress = {
      id: shippingAddress?.id || `addr_shipping_${Date.now()}`,
      userId: currentUser.id,
      fullName: shippingName,
      phone: shippingPhone,
      addressType: currentUser.role.includes('B2B') ? 'WAREHOUSE' : 'HOME',
      flatBuilding: shippingFlat,
      streetArea: shippingStreet,
      pincode: shippingPincode,
      postOffice: shippingSelectedPO,
      city: shippingCity,
      state: shippingState,
      stateCode: shippingStateCode,
      isDefault: true,
      gstin: currentUser.role.includes('B2B') ? billingGstin : undefined
    };
    setShippingAddress(updated);
    setIsEditingShipping(false);
  };

  // ─────────────────────────────────────────────────────────────
  // 3) PROFILE ACTIONS & HELPERS
  // ─────────────────────────────────────────────────────────────
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    const trimmedName = profileName.trim();
    const trimmedPhone = profilePhone.trim();
    const trimmedEmail = profileEmail.trim();

    updateUserProfile({
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
    });

    const trimmedCompanyName = profileCompanyName.trim();
    const trimmedGstin = profileGstin.trim().toUpperCase();
    const trimmedPan = profilePan.trim().toUpperCase();
    const hasB2bData = Boolean(trimmedGstin || trimmedCompanyName);

    if (hasB2bData) {
      updateOrgDetails({
        companyName: trimmedCompanyName,
        gstin: trimmedGstin,
        pan: trimmedPan,
      });
      useStore.getState().setAppMode('B2B');
      showToast('Profile and B2B credentials saved successfully', 'success');
    } else {
      // User cleared B2B credentials -> Reset organization and return to Retail B2C
      updateOrgDetails({
        companyName: '',
        gstin: '',
        pan: '',
      });
      useStore.getState().setAppMode('B2C');
      if (currentUser.role === 'B2B_BUYER') {
        updateUserProfile({
          role: 'B2C_CUSTOMER',
        });
      }
      showToast('Profile saved. Switched to Retail (B2C) customer.', 'success');
    }

    setIsEditingProfile(false);
  };

  const handleReorder = (ord: Order) => {
    const items = ord.shipments?.[0]?.items || [];
    if (items.length === 0) {
      showToast('No items found in this order to re-order', 'warning');
      return;
    }
    items.forEach((item) => {
      addToCart(item, item.quantity);
    });
    setIsCheckoutOpen(true);
    showToast(`Added ${items.length} item(s) from ${ord.orderNumber} to cart! Opening checkout...`, 'success');
  };

  if (currentUser.id === 'usr_guest') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 max-w-lg mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-2xl w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-[#0054A6]/30 flex items-center justify-center text-[#0054A6] mx-auto shadow-md">
            <User className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Customer & B2B Portal</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please sign in with your verified mobile number (OTP) or register a new B2C / B2B account to view your profile, dual addresses, live APE Shipping orders, tax invoices, and 10-Year Rust-Proof Warranty (covers rust/corrosion only).
            </p>
          </div>
          <button
            onClick={() => useStore.getState().setIsAuthModalOpen(true)}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            Sign In / Register Now
          </button>
        </div>
      </div>
    );
  }

  const isB2B = Boolean(
    (appMode === 'B2B' || currentUser.role.includes('B2B')) &&
    Boolean(currentOrg?.gstin?.trim() || currentOrg?.companyName?.trim())
  );
  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 space-y-8 max-w-7xl mx-auto animate-fadeIn text-slate-900">
      {/* Top Banner Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveTab('store');
              navigate('/store');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 shadow-sm text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-mono font-bold text-[#0054A6]">
            {isB2B ? 'B2B WHOLESALE EPC PORTAL & ACCOUNT DESK' : 'B2C CUSTOMER PORTAL & ACCOUNT DESK'}
          </span>
        </div>
      </div>

      {/* 🚀 Active Cart Quick Checkout Banner (if items in cart) */}
      {cart.length > 0 && (
        <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                You have {cart.length} item(s) in your cart ready for checkout!
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  {appMode === 'B2B' ? '🏢 B2B Wholesale' : '⚡ APE Shipping Ready'}
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                Subtotal: <strong className="text-slate-900 font-bold">₹{cartSubtotal.toLocaleString('en-IN')}</strong> • Default Shipping Hub: <strong className="text-[#0054A6]">{activeAddress?.postOffice?.name ? `${activeAddress.postOffice.name} (${activeAddress.pincode})` : 'Kathwada GIDC Central Hub (382430)'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-sm transition-all"
            >
              View Cart Drawer
            </button>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 flex items-center gap-1.5 transition-all"
            >
              <span>⚡ Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PROFESSIONAL ENTERPRISE TAB NAVIGATION BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 md:p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Customer Account Context & Identity */}
        <div className="flex items-center gap-3 pl-2 py-0.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0054A6] to-blue-800 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-max">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>{currentUser.name || 'Account Holder'}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                {isB2B ? '🏢 B2B Verified' : '✓ Verified'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {currentUser.phone || '+91 85116 26267'}
            </div>
          </div>
        </div>

        {/* Right Side: Professional Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar ml-auto">
          <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60">
            {/* Tab 1: Profile & Addresses */}
            <button
              onClick={() => setActiveSubTab('PROFILE')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'PROFILE'
                  ? 'bg-[#0054A6] text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <User className={`w-4 h-4 ${activeSubTab === 'PROFILE' ? 'text-amber-300' : 'text-slate-500'}`} />
              <span>Profile & Addresses</span>
            </button>

            {/* Tab 2: Orders & Tracking */}
            <button
              onClick={() => setActiveSubTab('ORDERS')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'ORDERS'
                  ? 'bg-[#0054A6] text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Package className={`w-4 h-4 ${activeSubTab === 'ORDERS' ? 'text-amber-300' : 'text-slate-500'}`} />
              <span>Orders & Tracking</span>
              {orders.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeSubTab === 'ORDERS' ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#0054A6]'
                }`}>
                  {orders.length}
                </span>
              )}
            </button>

            {/* Tab 3: Warranty */}
            <button
              onClick={() => setActiveSubTab('WARRANTY')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'WARRANTY'
                  ? 'bg-[#0054A6] text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Award className={`w-4 h-4 ${activeSubTab === 'WARRANTY' ? 'text-amber-300' : 'text-slate-500'}`} />
              <span>Warranty</span>
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Tab 4: Logout */}
          <button
            onClick={() => {
              logout();
              setActiveTab('store');
              navigate('/store');
            }}
            className="px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all flex items-center gap-1.5 whitespace-nowrap border border-rose-200/60 shadow-sm"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Full-Width Content Area */}
      <div className="w-full space-y-8">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 1: PROFILE & DUAL ADDRESSES (SHIPPING + BILLING) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'PROFILE' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl space-y-8 animate-fadeIn">
              {/* Header & Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-[#0054A6] uppercase tracking-wider">
                    Personal & Dual Address Management
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    {isB2B ? 'B2B Enterprise & Tax Billing Profile' : 'Customer Profile & Tax Addresses'}
                  </h3>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      isEditingProfile 
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300' 
                        : 'bg-[#0054A6] hover:bg-[#003d7a] text-white shadow-md'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingProfile ? 'Cancel Edit' : 'Change / Edit Profile'}</span>
                  </button>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* CUSTOMER PROFILE CARD (VIEW OR EDIT MODE) */}
              {/* ───────────────────────────────────────────────────────────── */}
              {!isEditingProfile ? (
                <div className="space-y-4">
                  {/* B2B Organization Card (If B2B and has active organization data) */}
                  {isB2B && Boolean(currentOrg.companyName?.trim() || currentOrg.gstin?.trim()) && (
                    <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-black text-[#0054A6] flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" /> B2B Registered Organization
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> GSTIN Verified (18% ITC)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateOrgDetails({ companyName: '', gstin: '', pan: '' });
                              useStore.getState().setAppMode('B2C');
                              if (currentUser.role === 'B2B_BUYER') {
                                updateUserProfile({ role: 'B2C_CUSTOMER' });
                              }
                              showToast('Removed B2B Organization. Switched to Retail (B2C).', 'success');
                            }}
                            className="px-2.5 py-0.5 rounded-full bg-white border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-slate-600 text-[10px] font-bold transition-all flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Remove B2B
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Company Name</span>
                          <strong className="text-slate-900">{currentOrg.companyName || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">GSTIN (18% Input Tax)</span>
                          <strong className="text-[#0054A6] font-mono">{currentOrg.gstin || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Company PAN</span>
                          <strong className="text-slate-800 font-mono">{currentOrg.pan || 'N/A'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Personal Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                        {isB2B ? 'Authorized Officer' : 'Full Name'}
                      </span>
                      <div className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-500" />
                        <span>{currentUser.name}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Mobile (OTP Verified)</span>
                      <div className="text-slate-900 font-mono font-bold text-sm flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{currentUser.phone || '+91 85116 26267'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Email Address</span>
                      <div className="text-slate-900 font-mono text-xs flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#0054A6]" />
                        <span>{currentUser.email || 'client@apolloengineering.co.in'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Inline Profile Editor */
                <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-blue-50/50 border-2 border-[#0054A6]/30 space-y-4 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#0054A6]" /> Edit Customer Profile Details
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">Changes apply to future invoices & orders</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        {isB2B ? 'Authorized Officer Name *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Mobile Phone (OTP Active) *</label>
                      <input
                        type="text"
                        required
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="+91 85116 26267"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* B2B Commercial & Tax GST Details (Optional - Unlocks Wholesale Rates & 18% ITC) */}
                  <div className="pt-3 border-t border-blue-200/50 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#0054A6]" /> B2B Commercial & Tax GST Details (Optional)
                      </span>
                      <div className="flex items-center gap-2">
                        {Boolean(profileCompanyName || profileGstin || profilePan) && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileCompanyName('');
                              setProfileGstin('');
                              setProfilePan('');
                              showToast('Cleared B2B fields. Click "Save Profile Details" to save as Retail B2C.', 'info');
                            }}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 transition-all flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Clear B2B (Switch to Retail)
                          </button>
                        )}
                        <span className="text-[10px] text-[#0054A6] font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          ⚡ Unlocks B2B Wholesale Pricing & 18% ITC
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Company / Legal Entity Name</label>
                        <input
                          type="text"
                          value={profileCompanyName}
                          onChange={(e) => setProfileCompanyName(e.target.value)}
                          placeholder="e.g. Apollo Solar Infra Pvt Ltd"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Company GSTIN (18% ITC)</label>
                        <input
                          type="text"
                          value={profileGstin}
                          onChange={(e) => setProfileGstin(e.target.value.toUpperCase())}
                          placeholder="e.g. 24ABCDE1234F1Z5"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Company PAN</label>
                        <input
                          type="text"
                          value={profilePan}
                          onChange={(e) => setProfilePan(e.target.value.toUpperCase())}
                          placeholder="e.g. ABCDE1234F"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Profile Details
                    </button>
                  </div>
                </form>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* DUAL ADDRESS CONSOLE: 1) BILLING + 2) SHIPPING */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="space-y-4">
                {/* 🔄 Global Same as Billing Address Checkbox Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-emerald-50/90 border-2 border-blue-200/80 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="shipping-same-as-billing"
                      name="shippingSameAsBilling"
                      checked={isShippingSameAsBilling}
                      onChange={(e) => handleToggleSameAsBilling(e.target.checked)}
                      className="w-5 h-5 rounded-lg text-[#0054A6] focus:ring-[#0054A6] cursor-pointer"
                    />
                    <div>
                      <span className="text-xs md:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Shipping Delivery Address is same as Billing Tax Address</span>
                        {isShippingSameAsBilling ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono border border-emerald-300">
                            ✓ Same Address Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono border border-amber-300">
                            ⚡ Separate Shipping Address
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-600 font-mono block">
                        {isShippingSameAsBilling
                          ? 'APE parcels will be dispatched to the Billing Tax Address. Both are automatically synchronized.'
                          : 'Separate address active: You can add or edit distinct delivery consignee details below.'}
                      </span>
                    </div>
                  </label>

                  {!isShippingSameAsBilling && !isEditingShipping && (
                    <button
                      onClick={() => setIsEditingShipping(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Shipping Address
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 🧾 1. BILLING TAX INVOICE ADDRESS */}
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0054A6] flex items-center justify-center font-bold">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">1) Billing Tax Address</h4>
                            <span className="text-[10px] text-slate-500 font-mono">For GST Tax Invoice & B2B ITC</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsEditingBilling(!isEditingBilling)}
                            className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                              isEditingBilling
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                                : 'bg-white hover:bg-blue-50 text-[#0054A6] border-blue-200'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isEditingBilling ? 'Cancel Edit' : 'Change / Edit Address'}</span>
                          </button>
                        </div>
                      </div>

                      {!isEditingBilling ? (
                        billingAddress ? (
                          <div className="space-y-2.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs">
                            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                              <span>{billingAddress.fullName}</span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0054A6] text-[10px] font-bold font-mono border border-blue-200">
                                Billing Default
                              </span>
                            </div>
                            <div className="text-slate-600 font-mono flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> {billingAddress.phone}
                            </div>
                            <div className="text-slate-700 leading-relaxed">
                              {billingAddress.flatBuilding}, {billingAddress.streetArea}
                            </div>
                            <div className="text-[#0054A6] font-bold flex items-center gap-1.5 font-mono bg-blue-50/60 p-2 rounded-xl border border-blue-100">
                              <MapPin className="w-4 h-4 text-[#0054A6] shrink-0" />
                              <span>{billingAddress.postOffice?.name || 'Delivery Hub'} ({billingAddress.pincode})</span>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {billingAddress.city}, {billingAddress.state} (State Code: {billingAddress.stateCode || '24'})
                            </div>
                            {billingAddress.gstin && (
                              <div className="text-emerald-700 font-mono font-bold pt-1 flex items-center gap-1 border-t border-slate-100">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>GSTIN: {billingAddress.gstin} (18% ITC Active)</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2 text-xs">
                            <p className="text-slate-500">No billing address saved.</p>
                            <button
                              type="button"
                              onClick={() => setIsEditingBilling(true)}
                              className="px-3 py-1.5 bg-[#0054A6] text-white font-bold rounded-lg text-xs"
                            >
                              + Add Billing Address
                            </button>
                          </div>
                        )
                      ) : (
                        /* Inline Billing Address Editor */
                        <form onSubmit={handleSaveBilling} className="space-y-3 text-xs bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">
                              {isB2B ? 'Company / Legal Name *' : 'Full Name *'}
                            </label>
                            <input
                              type="text"
                              required
                              value={billingName}
                              onChange={(e) => setBillingName(e.target.value)}
                              placeholder="Full Name / Company Name"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Mobile Phone (for Invoicing) *</label>
                            <input
                              type="text"
                              required
                              value={billingPhone}
                              onChange={(e) => setBillingPhone(e.target.value)}
                              placeholder="+91 98250 12345"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium focus:bg-white focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Flat, House No., Building / Plot *</label>
                            <input
                              type="text"
                              required
                              value={billingFlat}
                              onChange={(e) => setBillingFlat(e.target.value)}
                              placeholder="Plot 100, Landmark Building"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Street, Area, Landmark *</label>
                            <input
                              type="text"
                              required
                              value={billingStreet}
                              onChange={(e) => setBillingStreet(e.target.value)}
                              placeholder="Kathwada GIDC Phase 2, Near Ring Road"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">
                                Pincode (6-Digit) * {isLoadingBillingPin && <span className="text-[10px] text-[#0054A6]">Searching...</span>}
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                required
                                value={billingPincode}
                                onChange={(e) => setBillingPincode(e.target.value)}
                                placeholder="382430"
                                className="w-full h-9 px-3 bg-slate-50 border-2 border-[#0054A6] rounded-xl text-[#0054A6] font-mono font-black"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-bold mb-1">Select Delivery Hub *</label>
                              <select
                                value={billingSelectedPO?.facilityId || billingSelectedPO?.name || ''}
                                onChange={(e) => {
                                  const found = billingPostOffices.find((po) => po.facilityId === e.target.value || po.name === e.target.value);
                                  if (found) setBillingSelectedPO(found);
                                }}
                                className="w-full h-9 px-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:bg-white focus:outline-none"
                              >
                                {billingPostOffices.map((po) => (
                                  <option key={po.facilityId || po.name} value={po.facilityId || po.name}>
                                    {po.name} ({po.branchType})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-100 text-[11px] text-slate-600 font-mono">
                            City / State: <strong>{billingCity}</strong>, <strong>{billingState}</strong> (State Code: <strong>{billingStateCode}</strong>)
                          </div>

                          {isB2B && (
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">GSTIN (18% ITC Claim)</label>
                              <input
                                type="text"
                                value={billingGstin}
                                onChange={(e) => setBillingGstin(e.target.value.toUpperCase())}
                                placeholder="e.g. 24ABCDE1234F1Z5"
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold uppercase"
                              />
                            </div>
                          )}

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" /> Save Billing Address
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* 🚚 2. SHIPPING DELIVERY ADDRESS */}
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm">2) Shipping Delivery Address</h4>
                            <span className="text-[10px] text-slate-500 font-mono">For APE Priority Dispatch</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isShippingSameAsBilling ? (
                            <button
                              onClick={() => setIsEditingShipping(!isEditingShipping)}
                              className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                                isEditingShipping
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{isEditingShipping ? 'Cancel Edit' : 'Change / Edit Address'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setIsShippingSameAsBilling(false);
                                setIsEditingShipping(true);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0054A6] border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Change / Edit Address</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Display Mode when Shipping is Same as Billing */}
                      {isShippingSameAsBilling ? (
                        billingAddress ? (
                          <div className="space-y-2.5 p-4 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm text-xs">
                            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                              <span>{billingAddress.fullName}</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono border border-emerald-300">
                                ✓ Auto-Synced with Billing Default
                              </span>
                            </div>
                            <div className="text-slate-600 font-mono flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" /> {billingAddress.phone} (Delivery SMS/OTP)
                            </div>
                            <div className="text-slate-700 leading-relaxed">
                              {billingAddress.flatBuilding}, {billingAddress.streetArea}
                            </div>
                            <div className="text-emerald-800 font-bold flex items-center gap-1.5 font-mono bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{billingAddress.postOffice?.name || 'Delivery Hub'} ({billingAddress.pincode})</span>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {billingAddress.city}, {billingAddress.state} (State Code: {billingAddress.stateCode || '24'})
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-mono">APE Priority Direct Manifestation</span>
                              <button
                                onClick={() => {
                                  setIsShippingSameAsBilling(false);
                                  setIsEditingShipping(true);
                                }}
                                className="text-[#0054A6] hover:underline font-bold"
                              >
                                Add Separate Shipping Address →
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2 text-xs">
                            <p className="text-slate-500">No address saved to sync.</p>
                            <button
                              type="button"
                              onClick={() => setIsEditingShipping(true)}
                              className="px-3 py-1.5 bg-[#0054A6] text-white font-bold rounded-lg text-xs"
                            >
                              + Add Shipping Address
                            </button>
                          </div>
                        )
                      ) : !isEditingShipping ? (
                        /* Display Mode when Shipping is Separate */
                        shippingAddress ? (
                          <div className="space-y-2.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs">
                            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                              <span>{shippingAddress.fullName}</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono border border-amber-300">
                                ⚡ Separate Destination Active
                              </span>
                            </div>
                            <div className="text-slate-600 font-mono flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" /> {shippingAddress.phone} (Delivery SMS/OTP)
                            </div>
                            <div className="text-slate-700 leading-relaxed">
                              {shippingAddress.flatBuilding}, {shippingAddress.streetArea}
                            </div>
                            <div className="text-emerald-800 font-bold flex items-center gap-1.5 font-mono bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{shippingAddress.postOffice?.name || 'Delivery Hub'} ({shippingAddress.pincode})</span>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {shippingAddress.city}, {shippingAddress.state} (State Code: {shippingAddress.stateCode || '24'})
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <button
                                onClick={() => handleToggleSameAsBilling(true)}
                                className="text-emerald-700 hover:underline font-bold"
                              >
                                ✓ Reset to Same as Billing
                              </button>
                              <button
                                onClick={() => setIsEditingShipping(true)}
                                className="text-[#0054A6] hover:underline font-bold"
                              >
                                Edit Shipping Address →
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2 text-xs">
                            <p className="text-slate-500">No separate shipping address saved.</p>
                            <button
                              type="button"
                              onClick={() => setIsEditingShipping(true)}
                              className="px-3 py-1.5 bg-[#0054A6] text-white font-bold rounded-lg text-xs"
                            >
                              + Add Shipping Address
                            </button>
                          </div>
                        )
                      ) : (
                        /* Inline Shipping Address Editor (When Separate Address is being Edited) */
                        <form onSubmit={handleSaveShipping} className="space-y-3 text-xs bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0054A6] select-none">
                              <input
                                type="checkbox"
                                id="copy-from-billing"
                                name="copyFromBilling"
                                checked={isShippingSameAsBilling}
                                onChange={(e) => handleToggleSameAsBilling(e.target.checked)}
                                className="rounded text-[#0054A6] w-4 h-4"
                              />
                              <span>Copy from Billing Address</span>
                            </label>
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Consignee Full Name *</label>
                            <input
                              type="text"
                              required
                              value={shippingName}
                              onChange={(e) => setShippingName(e.target.value)}
                              placeholder="Consignee / Recipient Name"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Delivery Mobile Phone (OTP / APE Dispatch SMS) *</label>
                            <input
                              type="text"
                              required
                              value={shippingPhone}
                              onChange={(e) => setShippingPhone(e.target.value)}
                              placeholder="+91 98250 12345"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Flat, House No., Building / Site *</label>
                            <input
                              type="text"
                              required
                              value={shippingFlat}
                              onChange={(e) => setShippingFlat(e.target.value)}
                              placeholder="Flat, House no., Building, Factory Plot"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Street, Area, Landmark *</label>
                            <input
                              type="text"
                              required
                              value={shippingStreet}
                              onChange={(e) => setShippingStreet(e.target.value)}
                              placeholder="Street, Area, Landmark, Road"
                              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">
                                Pincode (6-Digit) * {isLoadingShippingPin && <span className="text-[10px] text-emerald-600">Searching...</span>}
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                required
                                value={shippingPincode}
                                onChange={(e) => setShippingPincode(e.target.value)}
                                placeholder="382430"
                                className="w-full h-9 px-3 bg-slate-50 border-2 border-emerald-600 rounded-xl text-emerald-700 font-mono font-black"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-bold mb-1">Select Delivery Hub *</label>
                              <select
                                value={shippingSelectedPO?.facilityId || shippingSelectedPO?.name || ''}
                                onChange={(e) => {
                                  const found = shippingPostOffices.find((po) => po.facilityId === e.target.value || po.name === e.target.value);
                                  if (found) setShippingSelectedPO(found);
                                }}
                                className="w-full h-9 px-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:bg-white focus:outline-none"
                              >
                                {shippingPostOffices.map((po) => (
                                  <option key={po.facilityId || po.name} value={po.facilityId || po.name}>
                                    {po.name} ({po.branchType})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-100 text-[11px] text-slate-600 font-mono">
                            Destination Hub: <strong>{shippingCity}</strong>, <strong>{shippingState}</strong> (State Code: <strong>{shippingStateCode}</strong>)
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4" /> Save Separate Shipping Address
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 2: LIVE EXPRESS ORDERS & INVOICES */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'ORDERS' && (() => {
            const inTransitCount = orders.filter(o => o.shipments?.[0]?.status === 'IN_TRANSIT').length;
            const deliveredCount = orders.filter(o => o.shipments?.[0]?.status === 'DELIVERED').length;
            const confirmedCount = orders.filter(o => o.shipments?.[0]?.status === 'CONFIRMED' || !o.shipments?.[0]?.status).length;
            const filteredOrders = orders.filter(o => {
              if (orderFilter === 'IN_TRANSIT') return o.shipments?.[0]?.status === 'IN_TRANSIT';
              if (orderFilter === 'DELIVERED') return o.shipments?.[0]?.status === 'DELIVERED';
              if (orderFilter === 'CONFIRMED') return o.shipments?.[0]?.status === 'CONFIRMED' || !o.shipments?.[0]?.status;
              return true;
            });
            const displayedOrders = filteredOrders.slice(0, visibleOrderCount);

            return (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                {/* Header Strip with Place New Order Action */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0054A6] uppercase tracking-wider">
                      Real-Time Order & Logistics Console
                    </span>
                    <h3 className="text-2xl font-black text-slate-900">
                      Live APE Shipping Order Log
                    </h3>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full hidden sm:inline">
                      Origin: Kathwada Hub ({ORIGIN_HUB_PINCODE})
                    </span>
                    <button
                      onClick={() => {
                        setActiveTab('store');
                        navigate('/store');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Place New Order
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: 'ALL', label: 'All Orders', count: orders.length },
                    { id: 'IN_TRANSIT', label: 'In Transit', count: inTransitCount },
                    { id: 'DELIVERED', label: 'Delivered', count: deliveredCount },
                    { id: 'CONFIRMED', label: 'Confirmed / Processing', count: confirmedCount },
                  ].map((filter) => {
                    const isSelected = orderFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setOrderFilter(filter.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {displayedOrders.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mx-auto">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No orders found matching "{orderFilter}" filter.</p>
                    <button
                      onClick={() => {
                        setActiveTab('store');
                        navigate('/store');
                      }}
                      className="px-4 py-2 bg-[#0054A6] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-[#003d7a]"
                    >
                      Browse Catalog to Place an Order
                    </button>
                  </div>
                ) : (
                  displayedOrders.map((ord) => (
                    <div key={ord.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-5 shadow-md">
                      {/* Order Top Strip */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-base text-slate-900">{ord.orderNumber}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              ord.shipments?.[0]?.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : ord.shipments?.[0]?.status === 'IN_TRANSIT'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              {ord.shipments?.[0]?.status || 'PROCESSING / UNSHIPPED'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Date: {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'Active'} • APE Tracking AWB: <strong className="text-[#0054A6] font-bold">{ord.shipments?.[0]?.shippingDetail?.articleNumber || 'Pending Dispatch'}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* 🔄 Re-order Button */}
                          <button
                            onClick={() => handleReorder(ord)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                            title="Re-order items from this past order"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Re-order
                          </button>

                          {/* View GST Invoice Button */}
                          <button
                            onClick={() => setSelectedInvoiceOrder(ord)}
                            className="px-3.5 py-2 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" /> GST Invoice
                          </button>
                        </div>
                      </div>

                      {/* Order Items & Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-8 space-y-3">
                          {(ord.shipments?.[0]?.items || []).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                              <div className="flex items-center gap-3">
                                <img src={it.imageUrl} alt={it.productTitle} className="w-12 h-12 object-contain rounded-xl bg-slate-50 p-1 border border-slate-100" />
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{it.productTitle}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">SKU: {it.sku} • Qty: {it.quantity}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-slate-900 font-mono text-sm">₹{(it.unitPrice * it.quantity).toLocaleString('en-IN')}</div>
                                <div className="text-[10px] text-emerald-600 font-bold">18% GST Included</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="md:col-span-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Approx Delivery ETA:</span>
                            <strong className="text-[#0054A6] font-bold">2–4 Business Days</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>APE Shipping Freight:</span>
                            <span className="text-emerald-700 font-mono font-bold">
                              ₹{(ord.pricingSummary?.shippingTotal || ord.shipments?.[0]?.shippingDetail?.totalPostage || 218).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {Boolean(ord.pricingSummary?.codFee) && (
                            <div className="flex items-center justify-between text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                              <span className="font-bold">APE COD Fee (2.5%):</span>
                              <span className="font-mono font-black">
                                ₹{ord.pricingSummary?.codFee?.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-black text-slate-900">
                            <span>Total Paid / Payable:</span>
                            <span className="text-[#0054A6] font-mono">
                              ₹{(
                                ord.pricingSummary?.grandTotal || 
                                ((ord.pricingSummary?.itemsTotal || 9250) + (ord.pricingSummary?.shippingTotal || 218))
                              ).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Live Journey */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                        <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block">
                          Live APE Dispatch Journey Milestones:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {[
                            { label: "1. Factory Manifested", loc: "Kathwada Hub (382430)", done: true },
                            { label: "2. APE Dispatch Booked", loc: "Kathwada Logistics Hub", done: true },
                            { label: "3. In Transit (Sorting)", loc: "NSH Ahmedabad", done: ord.shipments[0]?.status === 'IN_TRANSIT' || ord.shipments[0]?.status === 'DELIVERED' },
                            { label: "4. Delivered", loc: ord.deliveryAddress?.postOffice?.name || "Destination Hub", done: ord.shipments[0]?.status === 'DELIVERED' }
                          ].map((step, sIdx) => (
                            <div key={sIdx} className={`p-3 rounded-xl border space-y-0.5 ${
                              step.done ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              <div className="font-bold flex items-center gap-1.5 text-xs">
                                {step.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5" />}
                                <span>{step.label}</span>
                              </div>
                              <div className="truncate text-slate-500 font-mono text-[10px]">{step.loc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Pagination / Load More Button */}
                {filteredOrders.length > visibleOrderCount && (
                  <div className="text-center pt-3">
                    <button
                      onClick={() => setVisibleOrderCount(prev => prev + 4)}
                      className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Load More Orders ({filteredOrders.length - visibleOrderCount} Remaining) ↓
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 3: 10-YEAR SS304 RUST-PROOF WARRANTY */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeSubTab === 'WARRANTY' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center text-amber-600 mx-auto shadow-md">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-amber-600">
                  Official Registered Warranty
                </span>
                <h3 className="text-3xl font-black text-slate-900 font-display">
                  10-Year AISI SS304 Rust-Proof Warranty Certificate
                </h3>
                <p className="text-xs text-slate-600 max-w-xl mx-auto font-light leading-relaxed">
                  10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only. Issued to <strong>{currentUser.name}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Material Grade</div>
                  <div className="text-slate-900 font-black">AISI SS304 Certified</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Validity Coverage</div>
                  <div className="text-[#0054A6] font-black font-mono">10 Years (Rust/Corrosion Only)</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Manufacturing Hub</div>
                  <div className="text-emerald-700 font-black font-mono">Kathwada ({ORIGIN_HUB_PINCODE})</div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Tax Invoice Modal Overlay */}
      {selectedInvoiceOrder && (
        <GstInvoice
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}
    </div>
  );
};
