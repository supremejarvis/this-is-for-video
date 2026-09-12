import React, { useState, useEffect } from 'react';
import { 
  X, User, MapPin, Phone, Mail, ShieldCheck, 
  FileText, Truck, Clock, CheckCircle2, AlertCircle, 
  Download, Printer, LogOut, ChevronRight, Edit3, 
  Plus, Check, Award, Lock, Building2, Package, RefreshCw 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DeliveryAddress, PostOfficeInfo, Order } from '../../types';
import { ORIGIN_HUB_PINCODE, lookupPincode } from '../../services/logisticsService';

export const CustomerAccountModal: React.FC = () => {
  const { 
    isAccountModalOpen, setIsAccountModalOpen, currentUser, 
    activeAddress, addresses, addAddress, setActiveAddress, 
    billingAddress, setBillingAddress, orders, logout, showToast 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'ORDERS' | 'WARRANTY'>('PROFILE');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Address Editing Mode
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [isBillingSame, setIsBillingSame] = useState(true);

  // Form State for Adding / Updating Address
  const [formName, setFormName] = useState(currentUser.name);
  const [formPhone, setFormPhone] = useState(currentUser.phone);
  const [formLine1, setFormLine1] = useState('');
  const [formLine2, setFormLine2] = useState('');
  const [formPincode, setFormPincode] = useState('380001');
  const [availablePostOffices, setAvailablePostOffices] = useState<PostOfficeInfo[]>([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState<PostOfficeInfo | null>(null);
  const [formCity, setFormCity] = useState('Ahmedabad');
  const [formState, setFormState] = useState('Gujarat');
  const [formStateCode, setFormStateCode] = useState('24');
  const [formGstin, setFormGstin] = useState('');
  const [isLoadingPin, setIsLoadingPin] = useState(false);

  // Pincode lookup for address editor
  useEffect(() => {
    if (formPincode.trim().length === 6) {
      handlePincodeFetch(formPincode.trim());
    }
  }, [formPincode]);

  const handlePincodeFetch = async (pin: string) => {
    setIsLoadingPin(true);
    const res = await lookupPincode(pin);
    setIsLoadingPin(false);
    if (res && res.postOffices.length > 0) {
      setAvailablePostOffices(res.postOffices);
      setSelectedPostOffice(res.postOffices[0]);
      setFormCity(res.district);
      setFormState(res.state);
      setFormStateCode(res.stateCode);
    }
  };

  if (!isAccountModalOpen) return null;

  // Filter orders for current user or all mock orders
  const userOrders = orders;

  const handleSaveShippingAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostOffice) return;

    addAddress({
      userId: currentUser.id,
      fullName: formName,
      phone: formPhone,
      addressType: 'HOME',
      flatBuilding: formLine1,
      streetArea: formLine2,
      pincode: formPincode,
      postOffice: selectedPostOffice,
      city: formCity,
      state: formState,
      stateCode: formStateCode,
      isDefault: true,
      gstin: formGstin || undefined
    });

    setIsEditingShipping(false);
    showToast('Shipping address updated with verified India Post Sub Post Office', 'success');
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0054A6]/20 border border-[#0054A6]/40 flex items-center justify-center text-amber-400 font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">{currentUser.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> OTP Verified
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Session Active (24-Hour Dual-Token Authentication)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
            <button 
              onClick={() => setIsAccountModalOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 bg-slate-950/60 border-b border-slate-800 text-xs font-bold text-center p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'PROFILE'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-4 h-4" /> 1) Profile & Dual Addresses
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'ORDERS'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" /> 2) Live Orders & Invoices ({userOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('WARRANTY')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'WARRANTY'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" /> 3) 10-Yr Rust Warranty
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: PROFILE & DUAL ADDRESSES (SHIPPING + BILLING) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              {/* Personal Details Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" /> Customer Account Profile
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {currentUser.id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Full Name</span>
                    <div className="text-white font-bold text-sm">{currentUser.name}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Mobile Number</span>
                    <div className="text-white font-mono font-bold text-sm flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> {currentUser.phone}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Email Address</span>
                    <div className="text-white font-mono text-xs flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" /> {currentUser.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* DUAL ADDRESSES (SHIPPING & BILLING) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. SHIPPING DELIVERY ADDRESS */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-400" /> 🚚 Shipping Delivery Address
                      </h4>
                      <button
                        onClick={() => setIsEditingShipping(!isEditingShipping)}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Edit3 className="w-3 h-3" /> {isEditingShipping ? 'Close' : 'Edit / Add'}
                      </button>
                    </div>

                    {!isEditingShipping ? (
                      activeAddress ? (
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-white">{activeAddress.fullName}</div>
                          <div className="text-slate-300">{activeAddress.flatBuilding}, {activeAddress.streetArea}</div>
                          <div className="text-amber-400 font-bold flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            {activeAddress.postOffice?.name || 'Speed Post Hub'} ({activeAddress.pincode})
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {activeAddress.city}, {activeAddress.state} (State Code: {activeAddress.stateCode || '24'})
                          </div>
                          <div className="pt-1 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                              APE Shipping Active
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-slate-400 text-xs">
                          No delivery address saved yet.
                        </div>
                      )
                    ) : (
                      /* Shipping Address Edit Form */
                      <form onSubmit={handleSaveShippingAddress} className="space-y-3 pt-2">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-0.5">Address Line 1 *</label>
                          <input
                            type="text"
                            required
                            value={formLine1}
                            onChange={(e) => setFormLine1(e.target.value)}
                            placeholder="Flat, House no., Building"
                            className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-semibold mb-0.5">Address Line 2 *</label>
                          <input
                            type="text"
                            required
                            value={formLine2}
                            onChange={(e) => setFormLine2(e.target.value)}
                            placeholder="Street, Area, Landmark"
                            className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-300 font-semibold mb-0.5">Pincode *</label>
                            <input
                              type="text"
                              maxLength={6}
                              required
                              value={formPincode}
                              onChange={(e) => setFormPincode(e.target.value)}
                              className="w-full h-8 px-2.5 bg-slate-900 border border-amber-500 rounded-lg text-amber-400 font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-300 font-semibold mb-0.5">Near Post Office *</label>
                            <select
                              value={selectedPostOffice?.facilityId || ''}
                              onChange={(e) => {
                                const found = availablePostOffices.find((po) => po.facilityId === e.target.value);
                                if (found) setSelectedPostOffice(found);
                              }}
                              className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
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
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
                        >
                          Save Shipping Address
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* 2. BILLING TAX INVOICE ADDRESS */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" /> 🧾 Billing Tax Address
                      </h4>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={isBillingSame}
                          onChange={(e) => setIsBillingSame(e.target.checked)}
                          className="rounded text-amber-500"
                        />
                        <span>Same as Shipping</span>
                      </label>
                    </div>

                    {isBillingSame ? (
                      activeAddress ? (
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <div className="text-xs text-blue-300 font-bold">✓ Mirroring Shipping Address for GST Billing</div>
                          <div className="font-bold text-white">{activeAddress.fullName}</div>
                          <div className="text-slate-300">{activeAddress.flatBuilding}, {activeAddress.streetArea}</div>
                          <div className="text-slate-400">{activeAddress.city}, {activeAddress.state} - {activeAddress.pincode}</div>
                          {activeAddress.gstin && (
                            <div className="text-amber-400 font-mono font-bold">GSTIN: {activeAddress.gstin} (18% ITC)</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 py-3">No delivery address to mirror.</div>
                      )
                    ) : (
                      billingAddress ? (
                        <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <div className="font-bold text-white">{billingAddress.fullName}</div>
                          <div className="text-slate-300">{billingAddress.flatBuilding}, {billingAddress.streetArea}</div>
                          <div className="text-slate-400">{billingAddress.city}, {billingAddress.state} - {billingAddress.pincode}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 py-3">No billing address saved.</div>
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
                <span className="font-bold text-white text-sm">Real-Time Order Log & Dispatch Milestones</span>
                <span className="text-[11px] font-mono text-slate-400">Kathwada Hub Origin ({ORIGIN_HUB_PINCODE})</span>
              </div>

              {userOrders.map((ord) => (
                <div key={ord.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-lg">
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="space-y-0.5">
                      <div className="font-mono font-bold text-white text-sm flex items-center gap-2">
                        <span>{ord.orderNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.shipments[0]?.status === 'DELIVERED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : ord.shipments[0]?.status === 'IN_TRANSIT'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {ord.shipments[0]?.status || 'PROCESSING / UNSHIPPED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Date: {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'Active'} • Article: <strong className="text-amber-400 font-bold">{ord.shipments[0]?.shippingDetail.articleNumber}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoiceOrder(ord)}
                        className="px-3 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
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
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <img src={item.imageUrl} alt={item.productTitle} className="w-10 h-10 object-contain rounded-lg bg-white p-1" />
                            <div>
                              <div className="font-bold text-white text-xs">{item.productTitle}</div>
                              <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} • Qty: {item.quantity}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white font-mono">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</div>
                            <div className="text-[10px] text-emerald-400 font-mono font-bold">18% GST Incl.</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Logistics ETA & Total (4 cols) */}
                    <div className="md:col-span-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>Estimated Arrival:</span>
                        <strong className="text-amber-400 font-bold">2–4 Business Days</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span>APE Shipping Freight:</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          ₹{(ord.pricingSummary?.shippingTotal || ord.shipments?.[0]?.shippingDetail?.totalPostage || 218).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {Boolean(ord.pricingSummary?.codFee) && (
                        <div className="flex items-center justify-between text-amber-400 text-xs bg-amber-950/40 p-1.5 rounded-lg border border-amber-800/60">
                          <span className="font-bold">⚡ APE COD Fee (2.5%):</span>
                          <span className="font-mono font-black">₹{ord.pricingSummary?.codFee?.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-sm text-white">
                        <span>Total Paid / Payable:</span>
                        <span className="text-amber-400 font-mono">
                          ₹{(
                            ord.pricingSummary?.grandTotal ||
                            ((ord.pricingSummary?.itemsTotal || 9250) + (ord.pricingSummary?.shippingTotal || 218))
                          ).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real-Time APE Milestone Stepper */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                    <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider block">
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
                          step.done ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                          <div className="font-bold flex items-center gap-1">
                            {step.done ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3" />}
                            <span>{step.label}</span>
                          </div>
                          <div className="truncate text-slate-400 font-mono text-[9px]">{step.loc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: 10-YEAR SS304 DIGITAL RUST-PROOF WARRANTY CERTIFICATE */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'WARRANTY' && (
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 border-2 border-solar-gold/40 space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-solar-gold/15 border-2 border-solar-gold flex items-center justify-center text-solar-gold mx-auto">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-mono font-extrabold uppercase tracking-[0.25em] text-solar-gold">
                  Official Digital Certificate of Authenticity
                </span>
                <h3 className="text-2xl font-black text-white font-display">
                  10-Year AISI SS304 Rust-Proof Warranty
                </h3>
                <p className="text-xs text-slate-300 max-w-xl mx-auto font-light">
                  10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only. Issued to <strong>{currentUser.name}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Coverage Scope</div>
                  <div className="text-white font-bold text-xs">Rust/Corrosion Only</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Warranty Period</div>
                  <div className="text-amber-400 font-bold text-xs font-mono">10 Years</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Factory Pincode</div>
                  <div className="text-emerald-400 font-bold text-xs font-mono">Kathwada ({ORIGIN_HUB_PINCODE})</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tax Invoice Modal Overlay */}
        {selectedInvoiceOrder && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-300">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src="/logo.webp" alt="Logo" className="h-10 w-auto" />
                  <div>
                    <h3 className="font-black text-lg text-[#0054A6]">TAX INVOICE</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Original for Recipient</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedInvoiceOrder(null)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <strong className="block text-slate-900">Seller / Manufacturer:</strong>
                  <div className="text-slate-600">Apollo Engineering</div>
                  <div className="text-slate-600">100 / Gopinath Ind. Landmark, Kathwada GIDC, Ahmedabad, Gujarat - 382430</div>
                  <div className="font-mono text-slate-700">GSTIN: 24AAAPA1234F1Z9</div>
                </div>

                <div>
                  <strong className="block text-slate-900">Buyer / Billed To:</strong>
                  <div className="text-slate-600 font-bold">{selectedInvoiceOrder.deliveryAddress?.fullName}</div>
                  <div className="text-slate-600">{selectedInvoiceOrder.deliveryAddress?.flatBuilding}, {selectedInvoiceOrder.deliveryAddress?.streetArea}</div>
                  <div className="text-slate-600">{selectedInvoiceOrder.deliveryAddress?.city}, {selectedInvoiceOrder.deliveryAddress?.state} - {selectedInvoiceOrder.deliveryAddress?.pincode}</div>
                  <div className="font-mono text-slate-700">Invoice: {selectedInvoiceOrder.invoiceNumber}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Item Description</th>
                    <th className="p-2">HSN</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedInvoiceOrder.shipments[0]?.items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium">{it.productTitle} ({it.sku})</td>
                      <td className="p-2 font-mono text-slate-500">{it.hsnCode}</td>
                      <td className="p-2 text-center font-mono">{it.quantity}</td>
                      <td className="p-2 text-right font-mono">₹{it.unitPrice}</td>
                      <td className="p-2 text-right font-mono font-bold">₹{it.unitPrice * it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Tax Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
