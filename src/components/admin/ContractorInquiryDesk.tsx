import React, { useState } from 'react';
import { 
  PhoneCall, Plus, Search, Filter, Calendar, MessageSquare, 
  CheckCircle2, Clock, AlertCircle, Building2, User, 
  MapPin, Check, X, ShieldAlert, ArrowRight, Sparkles, Download
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SolarContractorInquiry, InquiryStatus } from '../../types';

// Standard Solar Panel Reference Specs in Indian Market
export const SOLAR_PANEL_SIZING_DATABASE: Record<string, { frameMm: '30mm' | '35mm' | '40mm'; powerRange: string; cellType: string }> = {
  'Adani Solar 545W/550W Bifacial': { frameMm: '35mm', powerRange: '540W - 550W', cellType: 'Mono PERC Bifacial' },
  'Adani Solar 650W TOPCon Bifacial': { frameMm: '35mm', powerRange: '600W - 650W', cellType: 'N-Type TOPCon' },
  'Waaree 540W/545W Mono PERC': { frameMm: '35mm', powerRange: '535W - 550W', cellType: '144 Half-Cut Mono' },
  'Waaree 440W-450W Mono PERC': { frameMm: '30mm', powerRange: '435W - 450W', cellType: '108 Half-Cut Mono' },
  'Vikram Solar 450W SOMERA': { frameMm: '30mm', powerRange: '440W - 450W', cellType: 'Mono PERC' },
  'Vikram Solar 540W PREXOS': { frameMm: '35mm', powerRange: '530W - 545W', cellType: 'Bifacial MBB' },
  'Tata Power Solar 335W Poly': { frameMm: '35mm', powerRange: '330W - 340W', cellType: '72 Multi-Crystalline' },
  'Tata Power Solar 540W Mono': { frameMm: '35mm', powerRange: '535W - 545W', cellType: 'Mono PERC' },
  'Goldi Solar 535W/545W Heloc Plus': { frameMm: '35mm', powerRange: '535W - 550W', cellType: 'Mono PERC Bifacial' },
  'RenewSys 400W-450W DESERV': { frameMm: '40mm', powerRange: '390W - 450W', cellType: 'Heavy Frame Commercial' },
  'Generic Rooftop 330W (Legacy)': { frameMm: '40mm', powerRange: '320W - 335W', cellType: 'Traditional Poly 40mm' }
};

export const ContractorInquiryDesk: React.FC = () => {
  const { 
    contractorInquiries, 
    addContractorInquiry, 
    updateContractorInquiry, 
    deleteContractorInquiry,
    showToast 
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<SolarContractorInquiry | null>(null);

  // Form State
  const [contractorName, setContractorName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('');
  const [panelBrand, setPanelBrand] = useState('Adani Solar 545W/550W Bifacial');
  const [recommendedFrameThickness, setRecommendedFrameThickness] = useState<'30mm' | '35mm' | '40mm'>('35mm');
  const [productOfInterest, setProductOfInterest] = useState('SS304 Water Drain Clips (35mm)');
  const [estimatedQty, setEstimatedQty] = useState(500);
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );

  // Auto update recommended frame thickness when panel brand changes
  const handlePanelBrandChange = (brand: string) => {
    setPanelBrand(brand);
    const matched = SOLAR_PANEL_SIZING_DATABASE[brand];
    if (matched) {
      setRecommendedFrameThickness(matched.frameMm);
      setProductOfInterest(`SS304 Water Drain Clips (${matched.frameMm})`);
    }
  };

  const handleCreateInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorName.trim() || !phone.trim()) {
      showToast('Please provide contractor name and phone number', 'error');
      return;
    }

    addContractorInquiry({
      contractorName: contractorName.trim(),
      firmName: firmName.trim() || 'Independent Solar Installer',
      phone: phone.trim().replace(/\D/g, ''),
      city: city.trim() || 'Ahmedabad',
      state: state.trim() || 'Gujarat',
      pincode: pincode.trim() || '380001',
      panelBrand,
      recommendedFrameThickness,
      productOfInterest,
      estimatedQty: Number(estimatedQty) || 500,
      status: 'NEW',
      notes: notes.trim() || `Inquired for ${estimatedQty} pcs for ${panelBrand} solar installation.`,
      nextFollowUpDate
    });

    setIsNewModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setContractorName('');
    setFirmName('');
    setPhone('');
    setCity('');
    setPincode('');
    setNotes('');
    setEstimatedQty(500);
  };

  const handleWhatsAppQuote = (inq: SolarContractorInquiry) => {
    const cleanPhone = inq.phone.replace(/\D/g, '');
    const recipientPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const message = `Namaste ${inq.contractorName} ji,\n\n` +
      `Thank you for contacting Apollo Engineering (Direct Factory, Kathwada GIDC, Ahmedabad).\n\n` +
      `Regarding your inquiry for ${inq.panelBrand} solar modules:\n` +
      `• Verified Frame Thickness: ${inq.recommendedFrameThickness}\n` +
      `• Recommended Product: ${inq.productOfInterest}\n` +
      `• Inquired Quantity: ${inq.estimatedQty} pcs\n` +
      `• Material Spec: Genuine AISI SS304 Rust-Proof Spring Steel\n` +
      `• Factory Direct Rate: ₹18.00/pc + 18% GST (Tax Invoice provided)\n` +
      `• Dispatch Hub: Kathwada GIDC Hub (382430) via Priority Express Delivery\n\n` +
      `Would you like us to generate the official Tax Proforma Invoice or dispatch a free sizing test sample box?\n\n` +
      `Apollo Engineering Works\n` +
      `Phone: +91 85116 26267\n` +
      `Website: https://www.apolloengineering.co.in`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${recipientPhone}&text=${encoded}`, '_blank');
    
    // Auto update status to QUOTATION_SENT
    if (inq.status === 'NEW' || inq.status === 'FOLLOW_UP') {
      updateContractorInquiry(inq.id, { status: 'QUOTATION_SENT' });
    }
  };

  // Filtered inquiries
  const filtered = contractorInquiries.filter(inq => {
    const matchesSearch = 
      inq.contractorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.firmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.phone.includes(searchTerm) ||
      inq.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.panelBrand.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && inq.status === statusFilter;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingFollowUps = contractorInquiries.filter(
    i => (i.status === 'NEW' || i.status === 'FOLLOW_UP') && i.nextFollowUpDate <= todayStr
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0054A6] text-xs font-mono font-bold border border-blue-200">
              SOLAR EPC & INSTALLER DESK
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold border border-emerald-200">
              Direct Sizing Guide
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 font-display mt-1.5">
            Solar Contractor Inquiries & Technical Call Log
          </h2>
          <p className="text-xs text-slate-500">
            Log contractor sizing queries (e.g. Adani 550W vs Waaree 540W), track follow-up dates, and dispatch 1-click factory quotes via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingFollowUps > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold shadow-xs">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>{pendingFollowUps} Follow-ups Due Today</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-5 py-2.5 bg-[#0054A6] hover:bg-[#004080] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Log New Contractor Call
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by contractor name, firm, phone, city, or panel brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0054A6]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['ALL', 'NEW', 'FOLLOW_UP', 'QUOTATION_SENT', 'CONVERTED', 'CLOSED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Inquiries' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px] font-mono">
                <th className="p-4">Contractor / Firm</th>
                <th className="p-4">Solar Panel Make & Model</th>
                <th className="p-4 text-center">Verified Frame Size</th>
                <th className="p-4">Required Hardware & Qty</th>
                <th className="p-4">Follow-Up Date</th>
                <th className="p-4 text-center">Inquiry Status</th>
                <th className="p-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 font-sans">
                    No contractor inquiries found matching your filters. Click "Log New Contractor Call" to add one.
                  </td>
                </tr>
              ) : (
                filtered.map((inq) => {
                  const isDueToday = inq.nextFollowUpDate <= todayStr && inq.status !== 'CONVERTED' && inq.status !== 'CLOSED';
                  return (
                    <tr key={inq.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{inq.contractorName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" /> {inq.firmName}
                        </div>
                        <div className="text-[11px] font-mono text-blue-700 flex items-center gap-1 mt-0.5">
                          <PhoneCall className="w-3 h-3" /> +91 {inq.phone} • {inq.city} ({inq.state})
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-800">{inq.panelBrand}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                          "{inq.notes}"
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-xl font-mono font-black text-xs border ${
                          inq.recommendedFrameThickness === '35mm'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : inq.recommendedFrameThickness === '30mm'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {inq.recommendedFrameThickness}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{inq.productOfInterest}</div>
                        <div className="text-[11px] font-mono text-emerald-700 font-bold">
                          Qty: {inq.estimatedQty.toLocaleString('en-IN')} pcs
                        </div>
                      </td>

                      <td className="p-4">
                        <div className={`font-mono text-xs flex items-center gap-1 ${
                          isDueToday ? 'text-rose-600 font-bold' : 'text-slate-600'
                        }`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{inq.nextFollowUpDate}</span>
                        </div>
                        {isDueToday && (
                          <span className="inline-block mt-0.5 text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            Due Today
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <select
                          value={inq.status}
                          onChange={(e) => updateContractorInquiry(inq.id, { status: e.target.value as InquiryStatus })}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border cursor-pointer focus:outline-none ${
                            inq.status === 'NEW'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : inq.status === 'FOLLOW_UP'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : inq.status === 'QUOTATION_SENT'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : inq.status === 'CONVERTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <option value="NEW">New Inquiry</option>
                          <option value="FOLLOW_UP">Follow-Up Required</option>
                          <option value="QUOTATION_SENT">Quotation Sent</option>
                          <option value="CONVERTED">Converted to Order</option>
                          <option value="CLOSED">Closed / Inactive</option>
                        </select>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleWhatsAppQuote(inq)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                            title="Send WhatsApp Quote & Sizing Guide"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> WA Quote
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteContractorInquiry(inq.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LOG NEW CONTRACTOR CALL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6]">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-display">Log Contractor Phone Call & Inquiry</h3>
                  <p className="text-xs text-slate-500">Record solar panel model and get instant frame thickness sizing.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInquiry} className="space-y-4 text-xs">
              {/* Contractor & Firm Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Contractor / Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Bhai Patel"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Company / EPC Firm Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Gujarat Solar EPC Projects"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
              </div>

              {/* Phone & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="98250 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City / District</label>
                  <input
                    type="text"
                    placeholder="e.g. Surat"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pincode</label>
                  <input
                    type="text"
                    placeholder="395007"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
              </div>

              {/* Smart Solar Panel Sizing Calculator Box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0054A6]" />
                    Smart Solar Panel Frame Thickness Helper
                  </span>
                  <span className="text-[10px] text-blue-700 font-mono">
                    Official Kathwada Factory Standards
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-blue-900">Select Solar Panel Make / Model</label>
                    <select
                      value={panelBrand}
                      onChange={(e) => handlePanelBrandChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                    >
                      {Object.keys(SOLAR_PANEL_SIZING_DATABASE).map((brand) => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-blue-900">Recommended Frame Thickness</label>
                    <div className="flex items-center gap-2">
                      {(['30mm', '35mm', '40mm'] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setRecommendedFrameThickness(size);
                            setProductOfInterest(`SS304 Water Drain Clips (${size})`);
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-mono font-black border transition-all ${
                            recommendedFrameThickness === size
                              ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-sm'
                              : 'bg-white text-slate-700 border-blue-200 hover:bg-blue-100/50'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Hardware & Estimated Qty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Hardware of Interest</label>
                  <input
                    type="text"
                    value={productOfInterest}
                    onChange={(e) => setProductOfInterest(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Estimated Quantity (Pcs)</label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedQty}
                    onChange={(e) => setEstimatedQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
              </div>

              {/* Next Follow-Up Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">State / Region</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Call Discussion & Technical Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Contractor needs sample for testing on 500kW project in Morbi. Asked for volume pricing."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0054A6] hover:bg-[#004080] text-white font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Inquiry & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
