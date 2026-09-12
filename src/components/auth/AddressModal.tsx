import React, { useState, useEffect } from 'react';
import { X, MapPin, Building2, Check, AlertCircle, Sparkles, Navigation, ShieldCheck, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { lookupPincode, ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../../services/logisticsService';
import { PostOfficeInfo } from '../../types';

export const AddressModal: React.FC = () => {
  const { 
    isAddressModalOpen, setIsAddressModalOpen, 
    addresses, activeAddress, setActiveAddress, addAddress, deleteAddress, appMode, currentOrg 
  } = useStore();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+91 98250 12345');
  const [addressType, setAddressType] = useState<'HOME' | 'OFFICE' | 'WAREHOUSE'>('HOME');
  const [flatBuilding, setFlatBuilding] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [pincode, setPincode] = useState('380001');
  const [availablePostOffices, setAvailablePostOffices] = useState<PostOfficeInfo[]>([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState<PostOfficeInfo | null>(null);
  const [district, setDistrict] = useState('Ahmedabad');
  const [state, setState] = useState('Gujarat');
  const [stateCode, setStateCode] = useState('24');
  const [gstin, setGstin] = useState('');
  const [dockInstructions, setDockInstructions] = useState('');
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (pincode.length === 6) {
      handlePincodeLookup(pincode);
    }
  }, [pincode]);

  const handlePincodeLookup = async (pin: string) => {
    setIsLoadingPincode(true);
    const res = await lookupPincode(pin);
    setIsLoadingPincode(false);

    if (res && res.postOffices.length > 0) {
      setAvailablePostOffices(res.postOffices);
      setSelectedPostOffice(res.postOffices[0]);
      setDistrict(res.district);
      setState(res.state);
      setStateCode(res.stateCode);
    } else {
      setAvailablePostOffices([]);
      setSelectedPostOffice(null);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostOffice) return;

    addAddress({
      userId: 'u_active',
      fullName,
      phone,
      addressType,
      flatBuilding,
      streetArea,
      pincode,
      postOffice: selectedPostOffice,
      city: district,
      state,
      stateCode,
      isDefault: true,
      gstin: addressType === 'WAREHOUSE' || addressType === 'OFFICE' ? gstin || currentOrg.gstin : undefined,
      dockInstructions: addressType === 'WAREHOUSE' ? dockInstructions : undefined
    });

    setIsCreatingNew(false);
    setIsAddressModalOpen(false);
  };

  if (!isAddressModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Select or Add Delivery Location</h3>
              <p className="text-xs text-slate-400">
                APE Priority Dispatch Integration (Origin: <strong className="text-amber-400 font-mono">{ORIGIN_HUB_PINCODE}</strong>)
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddressModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {!isCreatingNew ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Saved Addresses ({addresses.length})
                </span>
                <button
                  onClick={() => {
                    setFullName(appMode === 'B2B' ? currentOrg.companyName : 'Pravin Patel');
                    setIsCreatingNew(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  + Add New Address & Delivery Hub
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = activeAddress?.id === addr.id;
                  return (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg ring-1 ring-amber-500/50'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div 
                        onClick={() => {
                          setActiveAddress(addr.id);
                          setIsAddressModalOpen(false);
                        }}
                        className="cursor-pointer space-y-1.5 flex-1"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              addr.addressType === 'WAREHOUSE'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : addr.addressType === 'OFFICE'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {addr.addressType}
                            </span>
                            <strong className="text-white text-xs font-bold">{addr.fullName}</strong>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300">{addr.flatBuilding}, {addr.streetArea}</p>

                        {/* Locked Delivery Hub Tag */}
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                          <span className="text-amber-400 font-mono font-medium flex items-center gap-1">
                            📮 {addr.postOffice.name}
                          </span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300 font-mono font-bold">
                            PIN: {addr.pincode}
                          </span>
                        </div>

                        {addr.gstin && (
                          <div className="mt-1 text-[10px] text-blue-400 font-mono">
                            GSTIN: {addr.gstin}
                          </div>
                        )}
                      </div>

                      {/* Remove Address Option if more than 1 address exists */}
                      {addresses.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAddress(addr.id);
                              setIsAddressModalOpen(false);
                            }}
                            className="text-amber-400 hover:underline font-bold"
                          >
                            {isSelected ? '✓ Currently Selected' : 'Select Location'}
                          </button>

                          {confirmDeleteId === addr.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAddress(addr.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(addr.id);
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                              title="Remove Address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* APE Booking Logic Notice */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  APE Automated Logistics & Dispatch Engine
                </div>
                <p>
                  All shipments automatically originate from Central Logistics Center <strong className="text-white font-mono">Pincode: 382430</strong> (Kathwada GIDC, Ahmedabad, GJ). APE AWB and tariff calculation is determined directly by your bound destination postal hub.
                </p>
              </div>
            </div>
          ) : (
            /* New Address Form with India Post Sub Post Office Resolver */
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wide">Enter Address & Bind Delivery Hub</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Back to Saved Addresses
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name / Business Entity *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Pravin Patel or Company Name"
                    className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone (APE Dispatch SMS) *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98250 12345"
                    className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address Classification</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['HOME', 'OFFICE', 'WAREHOUSE'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressType(type)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        addressType === type
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {type === 'HOME' && '🏡 Residential (Home)'}
                      {type === 'OFFICE' && '🏢 Commercial (Office)'}
                      {type === 'WAREHOUSE' && '🏭 Factory / Warehouse'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Flat, House No., Building, Company Complex *</label>
                <input
                  type="text"
                  required
                  value={flatBuilding}
                  onChange={(e) => setFlatBuilding(e.target.value)}
                  placeholder="e.g. Unit 402, Shivalik Highstreet"
                  className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Street, Road, Area, Landmark *</label>
                <input
                  type="text"
                  required
                  value={streetArea}
                  onChange={(e) => setStreetArea(e.target.value)}
                  placeholder="e.g. Near SG Highway, Judges Bungalow Cross Road"
                  className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* CRITICAL LOGIC: India Post Pincode & Multiple Post Office Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    APE Delivery Hub Binding (Mandatory)
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Origin: <strong className="text-white">{ORIGIN_HUB_PINCODE}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">6-Digit Destination Pincode *</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 380001 or 110001"
                      className="w-full h-9 px-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Select Delivery Hub ({availablePostOffices.length} Found) *
                    </label>
                    <select
                      value={selectedPostOffice?.facilityId || ''}
                      onChange={(e) => {
                        const found = availablePostOffices.find((po) => po.facilityId === e.target.value);
                        if (found) setSelectedPostOffice(found);
                      }}
                      className="w-full h-9 px-3 bg-slate-900 border border-amber-500 rounded-lg text-amber-400 font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {availablePostOffices.map((po) => (
                        <option key={po.facilityId} value={po.facilityId}>
                          {po.name} ({po.branchType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedPostOffice && (
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between text-slate-300">
                    <span>
                      District: <strong className="text-white">{district}</strong> | State: <strong className="text-white">{state}</strong>
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                      Facility ID: {selectedPostOffice.facilityId}
                    </span>
                  </div>
                )}
              </div>

              {/* B2B / Warehouse Specific Fields */}
              {(addressType === 'WAREHOUSE' || addressType === 'OFFICE') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-blue-400 mb-1">Company GSTIN (For B2B Tax Invoice)</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 24AAACP1234F1Z8"
                      className="w-full h-9 px-3 bg-slate-800 border border-blue-500/40 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Loading Dock / Delivery Gate Note</label>
                    <input
                      type="text"
                      value={dockInstructions}
                      onChange={(e) => setDockInstructions(e.target.value)}
                      placeholder="e.g. Gate 3, Forklift available"
                      className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPostOffice}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Save & Bind Delivery Hub
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
