'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Phone, MapPin, 
  Package, Award, CheckCircle2, ShieldCheck, 
  ExternalLink, FileText, Truck, Clock, LogOut, Edit3 
} from 'lucide-react';
import { useStore, saveStored } from '../../store/useStore';
import { DeliveryAddress, PostOfficeInfo, Order } from '../../types';
import { lookupPincode, ORIGIN_HUB_PINCODE } from '../../services/logisticsService';
import { GstInvoice } from '../logistics/GstInvoice';

export const CustomerAccountModal: React.FC = () => {
  const { 
    currentUser, isAccountModalOpen, setIsAccountModalOpen, 
    logout, addresses, addAddress, activeAddress, 
    billingAddress, isShippingSameAsBilling, setBillingAddress,
    orders, showToast 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'ORDERS' | 'WARRANTY'>('PROFILE');
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Editable Shipping Form State
  const [formLine1, setFormLine1] = useState(activeAddress?.flatBuilding || '');
  const [formLine2, setFormLine2] = useState(activeAddress?.streetArea || '');
  const [formPincode, setFormPincode] = useState(activeAddress?.pincode || '382430');
  const [availablePostOffices, setAvailablePostOffices] = useState<PostOfficeInfo[]>([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState<PostOfficeInfo | null>(activeAddress?.postOffice || null);
  const [isBillingSame, setIsBillingSame] = useState(isShippingSameAsBilling);

  useEffect(() => {
    let cancelled = false;
    if (formPincode.length === 6) {
      lookupPincode(formPincode).then(res => {
        if (cancelled) return;
        const pos = res?.postOffices || [];
        setAvailablePostOffices(pos);
        if (pos.length > 0 && !selectedPostOffice) {
          setSelectedPostOffice(pos[0]);
        }
      }).catch(() => {
        if (!cancelled) setAvailablePostOffices([]);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [formPincode, selectedPostOffice]);

  if (!isAccountModalOpen) return null;

  // Filter orders placed by current user or fallback to store orders
  const userOrders = orders.filter(o => o.deliveryAddress?.phone === currentUser.phone || o.userId === currentUser.id);

  const handleSaveShippingAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLine1 || !formLine2 || formPincode.length !== 6) {
      showToast('Please fill all required address fields', 'warning');
      return;
    }

    const po = selectedPostOffice || availablePostOffices[0] || {
      name: 'Delivery Hub Facility',
      branchType: 'Sub Office',
      deliveryStatus: 'Delivery',
      circle: 'Gujarat',
      district: 'Ahmedabad',
      state: 'Gujarat',
      facilityId: `PO${formPincode}`
    };

    const newAddr: DeliveryAddress = {
      id: activeAddress?.id || `addr_${Date.now()}`,
      userId: currentUser.id,
      fullName: currentUser.name,
      phone: currentUser.phone,
      addressType: 'HOME',
      flatBuilding: formLine1,
      streetArea: formLine2,
      pincode: formPincode,
      postOffice: po,
      city: po.district || 'Ahmedabad',
      state: po.state || 'Gujarat',
      stateCode: '24',
      isDefault: true
    };

    addAddress(newAddr);
    useStore.setState({ 
      activeAddress: newAddr,
      shippingAddress: newAddr,
      billingAddress: isBillingSame ? newAddr : billingAddress,
      isShippingSameAsBilling: isBillingSame
    });
    saveStored('apollo_shipping_address', newAddr);
    if (isBillingSame) {
      saveStored('apollo_billing_address', newAddr);
    }
    setIsEditingShipping(false);
    showToast('Shipping address updated with verified Delivery Facility Hub', 'success');
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-slate-900/25 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6] font-bold">
              {currentUser.name.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">{currentUser.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> OTP Verified
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-mono font-bold">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Session Active (24-Hour Dual-Token Authentication)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
            <button 
              onClick={() => setIsAccountModalOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close Account Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-center p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <User className="w-4 h-4 text-[#0054A6]" /> 1) Profile & Dual Addresses
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'ORDERS'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Package className="w-4 h-4 text-[#0054A6]" /> 2) Live Orders & Invoices ({userOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('WARRANTY')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'WARRANTY'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Award className="w-4 h-4 text-amber-600" /> 3) 10-Yr Rust Warranty
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700 bg-slate-50/40">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: PROFILE & DUAL ADDRESSES (SHIPPING + BILLING) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              {/* Personal Details Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0054A6]" /> Customer Account Profile
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {currentUser.id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
                    <div className="text-slate-900 font-bold text-sm">{currentUser.name || 'Not provided'}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Mobile Number</span>
                    <div className="text-slate-900 font-mono font-bold text-sm flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> {currentUser.phone || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                    <div className="text-slate-900 font-mono text-xs flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" /> {currentUser.email || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* DUAL ADDRESSES (SHIPPING & BILLING) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. SHIPPING DELIVERY ADDRESS */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600" /> 🚚 Shipping Delivery Address
                      </h4>
                      <button
                        onClick={() => setIsEditingShipping(!isEditingShipping)}
                        className="text-[#0054A6] hover:underline font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> {isEditingShipping ? 'Close' : 'Edit / Add'}
                      </button>
                    </div>

                    {!isEditingShipping ? (
                      activeAddress ? (
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="font-bold text-slate-900">{activeAddress.fullName}</div>
                          <div className="text-slate-600">{activeAddress.flatBuilding}, {activeAddress.streetArea}</div>
                          <div className="text-[#0054A6] font-bold flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#0054A6]" />
                            {activeAddress.postOffice?.name || 'Delivery Hub'} ({activeAddress.pincode})
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {activeAddress.city}, {activeAddress.state} (State Code: {activeAddress.stateCode || '24'})
                          </div>
                          <div className="pt-1 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                              APE Shipping Active
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                          No delivery address saved yet.
                        </div>
                      )
                    ) : (
                      /* Shipping Address Edit Form */
                      <form onSubmit={handleSaveShippingAddress} className="space-y-3 pt-2">
                        <div>
                          <label className="block text-slate-700 font-semibold mb-0.5">Address Line 1 *</label>
                          <input
                            type="text"
                            required
                            value={formLine1}
                            onChange={(e) => setFormLine1(e.target.value)}
                            placeholder="Flat, House no., Building"
                            className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-semibold mb-0.5">Address Line 2 *</label>
                          <input
                            type="text"
                            required
                            value={formLine2}
                            onChange={(e) => setFormLine2(e.target.value)}
                            placeholder="Street, Area, Landmark"
                            className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-0.5">Pincode *</label>
                            <input
                              type="text"
                              maxLength={6}
                              required
                              value={formPincode}
                              onChange={(e) => setFormPincode(e.target.value)}
                              className="w-full h-8 px-2.5 bg-white border border-amber-500 rounded-lg text-amber-700 font-mono font-bold text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-0.5">Delivery Facility Hub *</label>
                            <select
                              value={selectedPostOffice?.facilityId || ''}
                              onChange={(e) => {
                                const found = availablePostOffices.find((po) => po.facilityId === e.target.value);
                                if (found) setSelectedPostOffice(found);
                              }}
                              className="w-full h-8 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            >
                              {availablePostOffices.map((po) => (
                                <option key={po.facilityId} value={po.facilityId}>
                                  {po.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-[#0054A6] hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                        >
                          Save Shipping Address
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* 2. BILLING TAX INVOICE ADDRESS */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" /> 🧾 Billing Tax Address
                      </h4>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 select-none">
                        <input
                          type="checkbox"
                          id="billing-same-as-shipping"
                          name="billingSameAsShipping"
                          checked={isBillingSame}
                          onChange={(e) => setIsBillingSame(e.target.checked)}
                          className="rounded text-[#0054A6] focus:ring-blue-500"
                        />
                        <span>Same as Shipping</span>
                      </label>
                    </div>

                    {isBillingSame ? (
                      activeAddress ? (
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-xs text-[#0054A6] font-bold">✓ Mirroring Shipping Address for GST Billing</div>
                          <div className="font-bold text-slate-900">{activeAddress.fullName}</div>
                          <div className="text-slate-600">{activeAddress.flatBuilding}, {activeAddress.streetArea}</div>
                          <div className="text-slate-500">{activeAddress.city}, {activeAddress.state} - {activeAddress.pincode}</div>
                          {activeAddress.gstin && (
                            <div className="text-amber-700 font-mono font-bold">GSTIN: {activeAddress.gstin} (18% ITC)</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 py-3">No delivery address to mirror.</div>
                      )
                    ) : (
                      billingAddress ? (
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="font-bold text-slate-900">{billingAddress.fullName}</div>
                          <div className="text-slate-600">{billingAddress.flatBuilding}, {billingAddress.streetArea}</div>
                          <div className="text-slate-500">{billingAddress.city}, {billingAddress.state} - {billingAddress.pincode}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 py-3">No billing address saved.</div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: LIVE ORDERS, APE TRACKING & TAX INVOICES */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Real-Time Order Log & Dispatch Milestones</span>
                <span className="text-[11px] font-mono text-slate-500">Kathwada Hub Origin ({ORIGIN_HUB_PINCODE})</span>
              </div>

              {userOrders.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <Package className="w-12 h-12 mx-auto text-slate-400" />
                  <h4 className="font-bold text-slate-800 text-sm">No Orders Found</h4>
                  <p className="text-xs text-slate-500">Browse the catalog to place your first order.</p>
                </div>
              ) : (
                userOrders.map((ord) => (
                  <div key={ord.id} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                    {/* Order Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{ord.orderNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.shipments[0]?.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : ord.shipments[0]?.status === 'IN_TRANSIT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {ord.shipments[0]?.status || 'PROCESSING / UNSHIPPED'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Date: {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'Active'} • Article: <strong className="text-slate-800 font-bold">{ord.shipments[0]?.shippingDetail.articleNumber}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedInvoiceOrder(ord)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0054A6] border border-blue-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View GST Invoice
                        </button>
                      </div>
                    </div>

                    {/* Order Items & Approx Delivery Date */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Items List (8 cols) */}
                      <div className="md:col-span-8 space-y-2">
                        {ord.shipments[0]?.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2.5">
                              <img src={item.imageUrl} alt={item.productTitle} className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200 p-1" />
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{item.productTitle}</div>
                                <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku} • Qty: {item.quantity}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900 font-mono">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-emerald-600 font-mono font-bold">18% GST Incl.</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Logistics ETA & Total (4 cols) */}
                      <div className="md:col-span-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-slate-600 text-xs">
                          <span>Estimated Arrival:</span>
                          <strong className="text-slate-900 font-bold">2–4 Business Days</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 text-xs">
                          <span>APE Shipping Freight:</span>
                          <span className="text-emerald-700 font-mono font-bold">
                            ₹{(ord.pricingSummary?.shippingTotal || ord.shipments?.[0]?.shippingDetail?.totalPostage || 218).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {Boolean(ord.pricingSummary?.codFee) && (
                          <div className="flex items-center justify-between text-amber-800 text-xs bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                            <span className="font-bold">⚡ APE COD Fee (2.5%):</span>
                            <span className="font-mono font-black">₹{ord.pricingSummary?.codFee?.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm text-slate-900">
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

                    {/* Real-Time APE Milestone Stepper */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider block">
                        Live APE Dispatch Journey:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: "1. Factory Manifested", loc: "Kathwada Hub (382430)", done: true },
                          { label: "2. APE Dispatch Booked", loc: "Kathwada Logistics Hub", done: true },
                          { label: "3. In Transit (Sorting)", loc: "NSH Ahmedabad", done: ord.shipments[0]?.status === 'IN_TRANSIT' || ord.shipments[0]?.status === 'DELIVERED' },
                          { label: "4. Delivered", loc: ord.deliveryAddress.postOffice.name, done: ord.shipments[0]?.status === 'DELIVERED' }
                        ].map((step, sIdx) => (
                          <div key={sIdx} className={`p-2.5 rounded-xl border text-[10px] space-y-0.5 ${
                            step.done ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            <div className="font-bold flex items-center gap-1">
                              {step.done ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                              <span>{step.label}</span>
                            </div>
                            <div className="truncate text-slate-500 font-mono text-[9px]">{step.loc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: 10-YEAR SS304 DIGITAL RUST-PROOF WARRANTY CERTIFICATE */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'WARRANTY' && (
            <div className="p-8 rounded-3xl bg-gradient-to-br from-white via-amber-50/20 to-blue-50/20 border-2 border-solar-gold/40 space-y-6 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center text-amber-600 mx-auto">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-mono font-extrabold uppercase tracking-[0.25em] text-amber-600">
                  Official Digital Certificate of Authenticity
                </span>
                <h3 className="text-2xl font-black text-slate-900 font-display">
                  10-Year AISI SS304 Rust-Proof Warranty
                </h3>
                <p className="text-xs text-slate-600 max-w-xl mx-auto font-light">
                  10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only. Issued to <strong>{currentUser.name}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Coverage Scope</div>
                  <div className="text-slate-900 font-bold text-xs">Rust/Corrosion Only</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Warranty Period</div>
                  <div className="text-amber-600 font-bold text-xs font-mono">10 Years</div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Factory Pincode</div>
                  <div className="text-emerald-600 font-bold text-xs font-mono">Kathwada ({ORIGIN_HUB_PINCODE})</div>
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
    </div>
  );
};
