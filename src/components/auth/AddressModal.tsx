'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Trash2, Loader2, Home, Building2, Warehouse } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { lookupPincode } from '../../services/logisticsService';
import { PostOfficeInfo } from '../../types';

export const AddressModal: React.FC = () => {
  const { 
    isAddressModalOpen, setIsAddressModalOpen, 
    addresses, activeAddress, setActiveAddress, addAddress, deleteAddress, appMode, currentOrg, currentUser 
  } = useStore();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressType, setAddressType] = useState<'HOME' | 'OFFICE' | 'WAREHOUSE'>('HOME');
  const [flatBuilding, setFlatBuilding] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('24');
  const [gstin, setGstin] = useState('');
  const [dockInstructions, setDockInstructions] = useState('');
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [resolvedPostOffice, setResolvedPostOffice] = useState<PostOfficeInfo | null>(null);

  // Pre-fill only authentic user data when modal opens with no saved addresses
  useEffect(() => {
    if (isAddressModalOpen) {
      if (addresses.length === 0) {
        setIsCreatingNew(true);
      }
      if (currentUser?.name && !currentUser.name.startsWith('Customer ') && currentUser.name !== 'Valued Customer') {
        setFullName(currentUser.name);
      }
      if (currentUser?.phone) {
        setPhone(currentUser.phone);
      }
    }
  }, [isAddressModalOpen, addresses.length, currentUser]);

  // Automatic City/State lookup when a 6-digit Pincode is entered
  useEffect(() => {
    if (isAddressModalOpen && pincode.length === 6) {
      handlePincodeLookup(pincode);
    }
  }, [pincode, isAddressModalOpen]);

  const handlePincodeLookup = async (pin: string) => {
    if (pin.length !== 6) return;
    setIsLoadingPincode(true);
    try {
      const res = await lookupPincode(pin);
      if (res) {
        if (res.district && !city) setCity(res.district);
        if (res.state && !state) setState(res.state);
        if (res.stateCode) setStateCode(res.stateCode);
        if (res.postOffices && res.postOffices.length > 0) {
          setResolvedPostOffice(res.postOffices[0]);
        }
      }
    } catch {
      // Allow manual entry
    } finally {
      setIsLoadingPincode(false);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedPin = pincode.trim();
    const trimmedCity = city.trim() || 'Ahmedabad';
    const trimmedState = state.trim() || 'Gujarat';

    if (!trimmedName || !trimmedPhone || !trimmedPin || !flatBuilding.trim() || !streetArea.trim()) {
      useStore.getState().showToast('Please fill all required address fields', 'warning');
      return;
    }

    const effectivePostOffice: PostOfficeInfo = resolvedPostOffice || {
      name: `${trimmedCity} S.O`,
      branchType: 'Sub Post Office',
      deliveryStatus: 'Delivery',
      circle: trimmedState,
      district: trimmedCity,
      state: trimmedState,
      facilityId: `PO-${trimmedPin}`,
    };

    addAddress({
      userId: currentUser?.id || 'u_active',
      fullName: trimmedName,
      phone: trimmedPhone,
      addressType,
      flatBuilding: flatBuilding.trim(),
      streetArea: streetArea.trim(),
      pincode: trimmedPin,
      postOffice: effectivePostOffice,
      city: trimmedCity,
      state: trimmedState,
      stateCode: stateCode || '24',
      isDefault: true,
      gstin: (addressType === 'WAREHOUSE' || addressType === 'OFFICE' || gstin) ? (gstin.trim() || currentOrg.gstin) : undefined,
      dockInstructions: addressType === 'WAREHOUSE' ? dockInstructions.trim() : undefined
    });

    // Auto-update customer profile name & phone if currently generic
    if (trimmedName && (!currentUser?.name || currentUser.name.startsWith('Customer ') || currentUser.name === 'Valued Customer')) {
      useStore.getState().updateUserProfile({
        name: trimmedName,
        phone: trimmedPhone || currentUser?.phone
      });
    }

    // If B2B GSTIN or Organization is supplied, automatically sync
    if (gstin && gstin.trim()) {
      useStore.getState().updateOrgDetails({
        gstin: gstin.trim().toUpperCase(),
        companyName: (addressType === 'OFFICE' || addressType === 'WAREHOUSE') ? trimmedName : currentOrg.companyName
      });
      useStore.getState().setAppMode('B2B');
    }

    setIsCreatingNew(false);
    setIsAddressModalOpen(false);
  };

  if (!isAddressModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Select or Add Delivery Location</h3>
              <p className="text-xs text-slate-400">
                Enter your delivery address for fast doorstep delivery
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {!isCreatingNew ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Saved Addresses ({addresses.length})
                </span>
                <button
                  onClick={() => {
                    setFullName(appMode === 'B2B' ? currentOrg.companyName : (currentUser?.name && !currentUser.name.startsWith('Customer ') ? currentUser.name : ''));
                    setPhone(currentUser?.phone || '');
                    setFlatBuilding('');
                    setStreetArea('');
                    setPincode('');
                    setCity('');
                    setState('');
                    setIsCreatingNew(true);
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  + Add New Address
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <MapPin className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-300">No saved addresses yet</div>
                  <p className="text-xs text-slate-500">
                    Click &quot;+ Add New Address&quot; to add your delivery location.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
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
                          <div className="flex items-start justify-between gap-2 mb-1">
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
                              <span className="text-slate-400 font-mono text-[11px]">({addr.phone})</span>
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300">
                            {addr.flatBuilding}, {addr.streetArea}
                          </p>

                          <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                            <span>📍 {addr.city}, {addr.state}</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-white font-mono font-bold">
                              PIN: {addr.pincode}
                            </span>
                          </div>

                          {addr.gstin && (
                            <div className="mt-1 text-[10px] text-blue-400 font-mono">
                              GSTIN: {addr.gstin}
                            </div>
                          )}
                        </div>

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
                              {isSelected ? '✓ Selected' : 'Select Location'}
                            </button>

                            {confirmDeleteId === addr.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAddress(addr.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]"
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
              )}
            </div>
          ) : (
            /* Clean, Simple Delivery Address Form */
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wide">Enter Delivery Address</span>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ← Back to Saved Addresses
                  </button>
                )}
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="addr-fullname" className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name / Business Entity *
                  </label>
                  <input
                    type="text"
                    id="addr-fullname"
                    name="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name or Company name"
                    className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="addr-phone" className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="addr-phone"
                    name="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address Classification */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address Classification</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'HOME', label: 'Residential (Home)', icon: Home },
                    { id: 'OFFICE', label: 'Commercial (Office)', icon: Building2 },
                    { id: 'WAREHOUSE', label: 'Factory / Warehouse', icon: Warehouse }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAddressType(id as any)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        addressType === id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Flat / Building */}
              <div>
                <label htmlFor="addr-flatbuilding" className="block text-xs font-semibold text-slate-300 mb-1">
                  Flat, House No., Building, Company Complex *
                </label>
                <input
                  type="text"
                  id="addr-flatbuilding"
                  name="flatBuilding"
                  required
                  value={flatBuilding}
                  onChange={(e) => setFlatBuilding(e.target.value)}
                  placeholder="Unit / Flat No., Building name"
                  className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Street / Area / Landmark */}
              <div>
                <label htmlFor="addr-streetarea" className="block text-xs font-semibold text-slate-300 mb-1">
                  Street, Road, Area, Landmark *
                </label>
                <input
                  type="text"
                  id="addr-streetarea"
                  name="streetArea"
                  required
                  value={streetArea}
                  onChange={(e) => setStreetArea(e.target.value)}
                  placeholder="Road, Area, Nearest landmark"
                  className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Clean Pincode, City & State Row (Replaces complex Hub Binding) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="addr-pincode" className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>6-Digit Pincode *</span>
                    {isLoadingPincode && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                  </label>
                  <input
                    type="text"
                    id="addr-pincode"
                    name="pincode"
                    maxLength={6}
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 380001"
                    className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="addr-city" className="block text-xs font-semibold text-slate-300 mb-1">
                    City / District *
                  </label>
                  <input
                    type="text"
                    id="addr-city"
                    name="city"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Ahmedabad"
                    className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="addr-state" className="block text-xs font-semibold text-slate-300 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    id="addr-state"
                    name="state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Gujarat"
                    className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Delivery Gate / Loading Note</label>
                    <input
                      type="text"
                      value={dockInstructions}
                      onChange={(e) => setDockInstructions(e.target.value)}
                      placeholder="e.g. Gate 2, Delivery between 10am-5pm"
                      className="w-full h-9 px-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-colors"
                >
                  Save Delivery Address
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
