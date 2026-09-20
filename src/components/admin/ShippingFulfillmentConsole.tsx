'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  Barcode,
  Search,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Check,
  X,
  Clock,
  Send,
} from 'lucide-react';
import {
  adminShippingApi,
  ShipmentDetail,
  DispatchManifestResponse,
  ShippingQuoteResponse,
} from '../../services/api';

export const ShippingFulfillmentConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SHIPMENTS' | 'MANIFEST' | 'CALCULATOR'>('SHIPMENTS');
  const [shipments, setShipments] = useState<ShipmentDetail[]>([]);
  const [manifest, setManifest] = useState<DispatchManifestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Selected Shipment for Detail / Tracking
  const [selectedShipment, setSelectedShipment] = useState<ShipmentDetail | null>(null);

  // Rate Calculator State
  const [calcDestPincode, setCalcDestPincode] = useState<string>('400001');
  const [calcSku, setCalcSku] = useState<string>('APE-SC-35MM-P50');
  const [calcQty, setCalcQty] = useState<number>(2);
  const [calcUnitWeight, setCalcUnitWeight] = useState<number>(20);
  const [calcIsCod, setCalcIsCod] = useState<boolean>(false);
  const [calcQuote, setCalcQuote] = useState<ShippingQuoteResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Dispatch modal
  const [dispatchShipmentId, setDispatchShipmentId] = useState<string | null>(null);
  const [dispatchWarehouseId, setDispatchWarehouseId] = useState<string>('00000000-0000-0000-0000-000000000001');

  useEffect(() => {
    loadShipments();
  }, [statusFilter]);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminShippingApi.getShipments(statusFilter || undefined);
      setShipments(data);
      if (data.length > 0 && !selectedShipment) {
        setSelectedShipment(data[0]);
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const loadManifest = async () => {
    setLoading(true);
    try {
      const data = await adminShippingApi.getManifest('INDIA_POST');
      setManifest(data);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to generate dispatch manifest');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateQuote = async () => {
    setCalcLoading(true);
    setError(null);
    try {
      const res = await adminShippingApi.calculateQuote({
        origin_pincode: '382430',
        destination_pincode: calcDestPincode,
        is_cod: calcIsCod,
        items: [
          {
            sku: calcSku,
            quantity: calcQty,
            weight_g: calcUnitWeight,
          },
        ],
      });
      setCalcQuote(res);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to calculate quote');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleDispatch = async (shipmentId: string) => {
    try {
      await adminShippingApi.dispatchShipment(shipmentId, dispatchWarehouseId);
      setSuccessMsg('Shipment dispatched and warehouse stock consumed successfully!');
      setDispatchShipmentId(null);
      await loadShipments();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Dispatch failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_TO_SHIP':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'SHIPPED':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'OUT_FOR_DELIVERY':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'RTO':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Shipping & Logistics Operations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                India Post Speed Post Integration • Origin Kathwada GIDC (382430) • Weight Verification & Manifest
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('SHIPMENTS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'SHIPMENTS' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shipments Queue
          </button>
          <button
            onClick={() => {
              setActiveTab('MANIFEST');
              loadManifest();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'MANIFEST' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dispatch Manifest
          </button>
          <button
            onClick={() => setActiveTab('CALCULATOR')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'CALCULATOR' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tariff Calculator
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab 1: Shipments Queue */}
      {activeTab === 'SHIPMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Shipments */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">All Statuses</option>
                  <option value="READY_TO_SHIP">Ready to Ship</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="OUT_FOR_DELIVERY">Out For Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="RTO">RTO</option>
                </select>
              </div>

              <button
                onClick={loadShipments}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">AWB / Shipment</th>
                    <th className="py-3 px-4">Origin / Dest</th>
                    <th className="py-3 px-4">Packages</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading shipments...
                      </td>
                    </tr>
                  ) : shipments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No shipments found matching filter.
                      </td>
                    </tr>
                  ) : (
                    shipments.map((s) => {
                      const isSelected = selectedShipment?.id === s.id;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedShipment(s)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Barcode className="w-4 h-4 text-blue-600" />
                              {s.awb_number || 'PENDING_AWB'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Carrier: {s.carrier}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800">
                              {s.origin_pincode} → {s.destination_pincode}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(s.created_at).toLocaleDateString('en-IN')}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium">
                            {s.packages.length} Parcel(s)
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                                s.status
                              )}`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {s.status === 'READY_TO_SHIP' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDispatchShipmentId(s.id);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                              >
                                Dispatch
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel: Shipment Detail & Tracking Events */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col gap-5">
            {selectedShipment ? (
              <>
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      Shipment Details
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                        selectedShipment.status
                      )}`}
                    >
                      {selectedShipment.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-slate-500" />
                    {selectedShipment.awb_number || 'Awaiting Booking'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    ID: {selectedShipment.id}
                  </p>
                </div>

                {/* Package Specifications */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-slate-400" />
                    Packages & Dimensions
                  </h4>
                  <div className="space-y-2">
                    {selectedShipment.packages.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1"
                      >
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Package #{p.package_number || idx + 1}</span>
                          <span className="text-blue-700">{p.chargeable_weight_g} g (Chargeable)</span>
                        </div>
                        <div className="text-slate-500 flex items-center gap-3 text-[11px]">
                          <span>Actual: {p.actual_weight_g}g</span>
                          <span>•</span>
                          <span>Dims: {p.length_mm}×{p.width_mm}×{p.height_mm} mm</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Items: {p.items.length} product line(s)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Events Timeline */}
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Carrier Tracking Timeline
                  </h4>
                  {selectedShipment.tracking_events.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center text-xs text-slate-400">
                      No tracking scans received yet from carrier.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-4 border-l-2 border-blue-200 ml-2">
                      {selectedShipment.tracking_events.map((ev) => (
                        <div key={ev.id} className="relative text-xs">
                          <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                          <div className="font-bold text-slate-900">{ev.status}</div>
                          {ev.location && (
                            <div className="text-slate-600 text-[11px]">{ev.location}</div>
                          )}
                          {ev.description && (
                            <div className="text-slate-500 text-[11px]">{ev.description}</div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {new Date(ev.provider_occurred_at).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                Select a shipment to view packages and tracking events.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Dispatch Manifest */}
      {activeTab === 'MANIFEST' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                India Post Speed Post Official Dispatch Manifest
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official handover sheet for daily pickup at Kathwada GIDC Hub (382430)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4" />
                Print Manifest
              </button>
            </div>
          </div>

          {manifest ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">Manifest ID:</span>
                  <span className="font-mono font-bold text-slate-900">{manifest.manifest_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Carrier:</span>
                  <span className="font-bold text-slate-900">{manifest.carrier}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Parcels:</span>
                  <span className="font-bold text-blue-700 text-sm">{manifest.total_shipments}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Weight:</span>
                  <span className="font-bold text-slate-900 text-sm">{manifest.total_weight_kg} kg</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Sr.</th>
                      <th className="py-2.5 px-3">AWB Number</th>
                      <th className="py-2.5 px-3">Order Number</th>
                      <th className="py-2.5 px-3">Recipient Pincode</th>
                      <th className="py-2.5 px-3">Weight (g)</th>
                      <th className="py-2.5 px-3 text-center">Carrier Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {manifest.shipments.map((item, index) => (
                      <tr key={item.shipment_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-400">{index + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.awb_number}</td>
                        <td className="py-2.5 px-3 font-mono">{item.order_number}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.destination_pincode}</td>
                        <td className="py-2.5 px-3">{item.weight_g} g</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">_________________</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Click &quot;Dispatch Manifest&quot; to load today&apos;s carrier pickup manifest.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Speed Post Tariff Calculator */}
      {activeTab === 'CALCULATOR' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Statutory Speed Post Rate Calculator (Origin: 382430)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative CEPT Speed Post statutory tariff calculation with 18% GST and COD surcharge rules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination PIN Code
              </label>
              <input
                type="text"
                value={calcDestPincode}
                onChange={(e) => setCalcDestPincode(e.target.value)}
                maxLength={6}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="e.g. 400001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product SKU
              </label>
              <input
                type="text"
                value={calcSku}
                onChange={(e) => setCalcSku(e.target.value)}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={calcQty}
                onChange={(e) => setCalcQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Physical Weight (grams)
              </label>
              <input
                type="number"
                value={calcUnitWeight}
                onChange={(e) => setCalcUnitWeight(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isCodCheckbox"
                checked={calcIsCod}
                onChange={(e) => setCalcIsCod(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="isCodCheckbox" className="text-xs font-medium text-slate-700">
                Cash on Delivery (Adds 2.5% statutory COD surcharge to shipping)
              </label>
            </div>
          </div>

          <button
            onClick={handleCalculateQuote}
            disabled={calcLoading}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${calcLoading ? 'animate-spin' : ''}`} />
            Calculate Authoritative Quote
          </button>

          {calcQuote && (
            <div className="p-5 bg-slate-50 rounded-xl border border-blue-200 space-y-4">
              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Authoritative Quote Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Zone:</span>
                  <span className="font-bold text-slate-900">{calcQuote.zone}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Chargeable Weight:</span>
                  <span className="font-bold text-slate-900">{calcQuote.chargeable_weight_g} g</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Base Shipping:</span>
                  <span className="font-bold text-slate-900">₹{calcQuote.base_shipping}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Shipping GST (18%):</span>
                  <span className="font-bold text-slate-900">₹{calcQuote.shipping_gst}</span>
                </div>
                {calcQuote.cod_surcharge !== '0.00' && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">COD Surcharge (2.5%):</span>
                    <span className="font-bold text-amber-700">₹{calcQuote.cod_surcharge}</span>
                  </div>
                )}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-blue-600 block text-[11px] font-semibold">Total Shipping:</span>
                  <span className="font-extrabold text-blue-900 text-sm">₹{calcQuote.total_shipping}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dispatch Confirmation Modal */}
      {dispatchShipmentId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Confirm Shipment Dispatch
            </h3>
            <p className="text-xs text-slate-600">
              Dispatching this shipment will update fulfillment status to <span className="font-bold text-blue-600">SHIPPED</span> and atomically deduct on-hand physical stock from the selected warehouse.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Source Warehouse
              </label>
              <select
                value={dispatchWarehouseId}
                onChange={(e) => setDispatchWarehouseId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="00000000-0000-0000-0000-000000000001">
                  Kathwada GIDC Central Hub (Plot 108)
                </option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDispatchShipmentId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDispatch(dispatchShipmentId)}
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
