import React, { useState } from 'react';
import { 
  Users, Building2, ShieldCheck, CheckCircle2, AlertCircle, 
  Search, Filter, Phone, Mail, ExternalLink, IndianRupee, 
  Calendar, Check, X, ShieldAlert, Award
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UserProfile, B2BOrganization } from '../../types';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: 'B2B_ORGANIZATION' | 'B2C_RETAIL';
  companyName?: string;
  gstin?: string;
  isGstVerified: boolean;
  creditTerms: 'ADVANCE' | 'NET_15' | 'NET_30';
  creditLimit: number;
  totalOrders: number;
  lifetimeValue: number;
  location: string;
  joinedDate: string;
}

export const CustomerManagementPanel: React.FC = () => {
  const { showToast, orders } = useStore();

  // Derive genuine customer accounts dynamically from real placed orders
  const derivedCustomers = React.useMemo<CustomerRecord[]>(() => {
    if (!orders || orders.length === 0) return [];

    const customerMap = new Map<string, CustomerRecord>();
    orders.forEach((order) => {
      const email = order.customerEmail || '';
      const phone = order.deliveryAddress?.phone || order.customerPhone || '';
      const key = email || phone || order.id;
      if (!key) return;

      const existing = customerMap.get(key);
      const isB2B = Boolean(order.gstin || order.orderType === 'B2B');
      const orderTotal = Number(order.pricingSummary?.grandTotal) || 0;

      if (existing) {
        existing.totalOrders += 1;
        existing.lifetimeValue += orderTotal;
        if (order.gstin && !existing.gstin) {
          existing.gstin = order.gstin;
        }
      } else {
        customerMap.set(key, {
          id: `cust_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: order.customerName || order.deliveryAddress?.fullName || 'Customer',
          phone: phone,
          email: email,
          type: isB2B ? 'B2B_ORGANIZATION' : 'B2C_RETAIL',
          companyName: isB2B ? order.customerName : undefined,
          gstin: order.gstin || undefined,
          isGstVerified: Boolean(order.gstin),
          creditTerms: isB2B ? 'NET_30' : 'ADVANCE',
          creditLimit: isB2B ? 500000 : 0,
          totalOrders: 1,
          lifetimeValue: orderTotal,
          location: order.deliveryAddress ? `${order.deliveryAddress.city} (${order.deliveryAddress.pincode})` : 'India',
          joinedDate: order.createdAt ? order.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
        });
      }
    });
    return Array.from(customerMap.values());
  }, [orders]);

  const [customers, setCustomers] = useState<CustomerRecord[]>(derivedCustomers);

  React.useEffect(() => {
    setCustomers(derivedCustomers);
  }, [derivedCustomers]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'B2B' | 'B2C' | 'UNVERIFIED_GST'>('ALL');
  const [validatingGstinId, setValidatingGstinId] = useState<string | null>(null);

  // Validate 15-character statutory GSTIN
  const validateGstinFormat = (gstin: string): { isValid: boolean; stateName: string; reason?: string } => {
    const cleanGstin = gstin.trim().toUpperCase();
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstinRegex.test(cleanGstin)) {
      return { 
        isValid: false, 
        stateName: 'Unknown',
        reason: 'Invalid 15-character GSTIN format. Expected: 2 state digits + 10 PAN characters + 1 entity digit + Z + 1 checksum character.' 
      };
    }

    const stateCode = cleanGstin.substring(0, 2);
    let stateName = 'Other State (Inter-State IGST)';
    if (stateCode === '24') stateName = 'Gujarat (Intra-State CGST+SGST)';
    else if (stateCode === '27') stateName = 'Maharashtra (Inter-State IGST)';
    else if (stateCode === '08') stateName = 'Rajasthan (Inter-State IGST)';
    else if (stateCode === '23') stateName = 'Madhya Pradesh (Inter-State IGST)';

    return { isValid: true, stateName };
  };

  const handleVerifyGstin = (customer: CustomerRecord) => {
    if (!customer.gstin) {
      showToast('No GSTIN provided for this customer.', 'error');
      return;
    }

    const result = validateGstinFormat(customer.gstin);
    if (!result.isValid) {
      showToast(result.reason || 'Invalid GSTIN format', 'error');
      return;
    }

    setValidatingGstinId(customer.id);
    setTimeout(() => {
      setCustomers(prev => prev.map(c => 
        c.id === customer.id ? { ...c, isGstVerified: true } : c
      ));
      setValidatingGstinId(null);
      showToast(`GSTIN ${customer.gstin} verified successfully! State: ${result.stateName}`, 'success');
    }, 600);
  };

  const handleUpdateCreditTerms = (customerId: string, terms: 'ADVANCE' | 'NET_15' | 'NET_30') => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, creditTerms: terms } : c
    ));
    showToast(`Credit terms updated to ${terms} for customer`, 'info');
  };

  const filteredCustomers = customers.filter(c => {
    if (filterType === 'B2B' && c.type !== 'B2B_ORGANIZATION') return false;
    if (filterType === 'B2C' && c.type !== 'B2C_RETAIL') return false;
    if (filterType === 'UNVERIFIED_GST' && (c.isGstVerified || !c.gstin)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
    );
  });

  const totalB2bSpend = customers.filter(c => c.type === 'B2B_ORGANIZATION').reduce((sum, c) => sum + c.lifetimeValue, 0);
  const totalVerifiedGst = customers.filter(c => c.isGstVerified).length;

  return (
    <div className="space-y-6 text-slate-900">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-bold mb-2">
            <Building2 className="w-3 h-3 text-[#0054A6]" />
            APOLLO ENGINEERING B2B & RETAIL BUYER REGISTRY
          </div>
          <h2 className="text-2xl font-black font-display tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-600" />
            <span>Customer Accounts & B2B GST Verification Desk</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Monitor registered retail customers, verify 15-character GSTIN tax credentials for B2B EPC contractors, and manage wholesale credit terms.
          </p>
        </div>

        {/* Top KPIs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Total Registered</span>
            <span className="text-lg font-black text-slate-900 font-mono">{customers.length} Accounts</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl">
            <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold block">Verified GSTINs</span>
            <span className="text-lg font-black text-emerald-900 font-mono">{totalVerifiedGst} Verified</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 px-4 py-2.5 rounded-2xl">
            <span className="text-[10px] font-mono text-blue-700 uppercase font-bold block">B2B Wholesale LTV</span>
            <span className="text-lg font-black text-blue-950 font-mono">₹{(totalB2bSpend / 1000).toFixed(1)}k</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Accounts' },
            { id: 'B2B', label: 'B2B Solar EPCs' },
            { id: 'B2C', label: 'Retail Buyers' },
            { id: 'UNVERIFIED_GST', label: 'Pending GST Verification' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, GSTIN, phone, or company..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Customer / Contact</th>
                <th className="p-3.5">Type & Location</th>
                <th className="p-3.5">Company & GSTIN</th>
                <th className="p-3.5 text-center">GST Status</th>
                <th className="p-3.5 text-center">Credit Terms</th>
                <th className="p-3.5 text-right">Orders & LTV</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">No Customer Records Found</h4>
                      <p className="text-xs text-slate-500 font-sans">
                        {searchQuery ? 'No customers match your active search or filter criteria.' : 'Registered retail and B2B customers will automatically appear here as accounts register and orders are placed.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                const gstinCheck = c.gstin ? validateGstinFormat(c.gstin) : null;
                const whatsappMsg = `Hello ${c.name}, Apollo Engineering welcomes you! Regarding your industrial solar equipment orders, please let us know how we can assist you today.`;
                const whatsappUrl = `https://api.whatsapp.com/send?phone=91${c.phone.replace(/\D/g, '')}&text=${encodeURIComponent(whatsappMsg)}`;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Contact */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {c.name}
                        {c.type === 'B2B_ORGANIZATION' && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-mono">
                            EPC
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> +91 {c.phone}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {c.email}</span>
                      </div>
                    </td>

                    {/* Type & Location */}
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.type === 'B2B_ORGANIZATION'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {c.type === 'B2B_ORGANIZATION' ? 'B2B Wholesale' : 'B2C Retail'}
                      </span>
                      <div className="text-slate-500 text-[11px] mt-1 font-mono">
                        {c.location}
                      </div>
                    </td>

                    {/* Company & GSTIN */}
                    <td className="p-3.5">
                      {c.companyName ? (
                        <div className="font-semibold text-slate-800 text-xs">
                          {c.companyName}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Individual Retail Buyer</span>
                      )}
                      
                      {c.gstin ? (
                        <div className="font-mono text-xs font-bold text-[#0054A6] tracking-wider mt-0.5">
                          {c.gstin}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No GSTIN provided</span>
                      )}
                    </td>

                    {/* GST Status & 1-Click Verification */}
                    <td className="p-3.5 text-center">
                      {c.isGstVerified ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[11px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Verified
                        </span>
                      ) : c.gstin ? (
                        <button
                          onClick={() => handleVerifyGstin(c)}
                          disabled={validatingGstinId === c.id}
                          className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          {validatingGstinId === c.id ? 'Validating...' : 'Verify GSTIN'}
                        </button>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Credit Terms */}
                    <td className="p-3.5 text-center">
                      <select
                        value={c.creditTerms}
                        onChange={(e) => handleUpdateCreditTerms(c.id, e.target.value as any)}
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                      >
                        <option value="ADVANCE">Advance (Prepaid)</option>
                        <option value="NET_15">Net 15 Days</option>
                        <option value="NET_30">Net 30 Days</option>
                      </select>
                      {c.creditLimit > 0 && (
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          Limit: ₹{(c.creditLimit / 1000).toFixed(0)}k
                        </div>
                      )}
                    </td>

                    {/* Orders & Lifetime Value */}
                    <td className="p-3.5 text-right">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        ₹{c.lifetimeValue.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {c.totalOrders} Dispatched Orders
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] inline-flex items-center gap-1 transition-all shadow-xs"
                        title="Open WhatsApp Chat with customer"
                      >
                        <span>💬 WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
