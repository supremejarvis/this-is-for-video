import React, { useState } from 'react';
import { Truck, MapPin, CheckCircle2, Search, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../../services/logisticsService';

export const PincodeDeliveryChecker: React.FC = () => {
  const [pincode, setPincode] = useState('380015');
  const [checkedPincode, setCheckedPincode] = useState('380015');
  const [cityInfo, setCityInfo] = useState('Ahmedabad Local Express');

  const popularPincodes = [
    { city: 'Ahmedabad', pin: '380015', time: 'Same Day / 24 Hours' },
    { city: 'Surat', pin: '395001', time: '1-2 Days' },
    { city: 'Mumbai', pin: '400001', time: '2 Days' },
    { city: 'Delhi NCR', pin: '110001', time: '2-3 Days' },
    { city: 'Bengaluru', pin: '560001', time: '2-3 Days' },
    { city: 'Jaipur', pin: '302001', time: '2 Days' },
  ];

  const handleCheck = (pin: string, city?: string) => {
    if (pin.length === 6) {
      setCheckedPincode(pin);
      if (city) {
        setCityInfo(city);
      } else {
        if (pin.startsWith('38') || pin.startsWith('39')) setCityInfo('Gujarat Rapid Transit');
        else if (pin.startsWith('40') || pin.startsWith('41')) setCityInfo('Maharashtra Express');
        else if (pin.startsWith('11') || pin.startsWith('12')) setCityInfo('North Hub Express Delivery');
        else setCityInfo('All-India Priority Air Freight');
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0054A6] border border-blue-200 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0054A6] uppercase tracking-wider font-mono">
              Live Logistics Delivery & Pincode Checker
            </h4>
            <p className="text-xs text-slate-600">
              Check guaranteed delivery dates and freight slabs from Kathwada GIDC Central Hub ({ORIGIN_HUB_PINCODE}).
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit Pincode"
              value={pincode}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPincode(val);
                if (val.length === 6) handleCheck(val);
              }}
              className="h-9 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#0054A6] w-48 shadow-inner"
            />
          </div>
          <button
            type="button"
            onClick={() => handleCheck(pincode)}
            className="px-3.5 h-9 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs shadow-sm transition-all"
          >
            Check
          </button>
        </div>
      </div>

      {/* Result Card & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pincode {checkedPincode} ({cityInfo}): Direct Dispatch Available</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Estimated SLA: <strong>{checkedPincode.startsWith('38') ? 'Within 24 Hours' : '2-3 Business Days'}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="text-slate-400">Quick Cities:</span>
          {popularPincodes.map(p => (
            <button
              key={p.pin}
              type="button"
              onClick={() => {
                setPincode(p.pin);
                handleCheck(p.pin, p.city);
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
            >
              {p.city}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
