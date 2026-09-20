'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  X,
  Check,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import {
  adminReturnsApi,
  ReturnCase,
  ReturnReceiveItemSpec,
} from '../../services/api';

export const ReturnsDeskConsole: React.FC = () => {
  const [returns, setReturns] = useState<ReturnCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ReturnCase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Caliper Inspection Modal State
  const [caliperThickness, setCaliperThickness] = useState<string>('35.00');
  const [caliperApproval, setCaliperApproval] = useState<boolean>(true);
  const [caliperNotes, setCaliperNotes] = useState<string>('');
  const [caliperSubmitting, setCaliperSubmitting] = useState<boolean>(false);

  // Warehouse Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('00000000-0000-0000-0000-000000000001');
  const [receiptSpecs, setReceiptSpecs] = useState<Record<string, { received: number; accepted: number; disposition: string }>>({});
  const [receiptSubmitting, setReceiptSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadReturns();
  }, [statusFilter]);

  const loadReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminReturnsApi.getReturns(statusFilter || undefined);
      setReturns(data);
      if (data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to load return cases');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectCaliper = async () => {
    if (!selectedCase) return;
    setCaliperSubmitting(true);
    setError(null);
    try {
      const updated = await adminReturnsApi.inspectCaliper(selectedCase.id, {
        verified_frame_thickness_mm: caliperThickness,
        approval: caliperApproval,
        notes: caliperNotes,
      });
      setSelectedCase(updated);
      setSuccessMsg(`Caliper evidence reviewed: Return is now ${updated.status}!`);
      await loadReturns();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Inspection failed');
    } finally {
      setCaliperSubmitting(false);
    }
  };

  const openReceiptModal = () => {
    if (!selectedCase) return;
    const initialSpecs: Record<string, { received: number; accepted: number; disposition: string }> = {};
    selectedCase.items.forEach((item) => {
      initialSpecs[item.id] = {
        received: item.requested_qty,
        accepted: item.requested_qty,
        disposition: 'RESTOCK_INVENTORY',
      };
    });
    setReceiptSpecs(initialSpecs);
    setShowReceiptModal(true);
  };

  const handleReceiveAndRestock = async () => {
    if (!selectedCase) return;
    setReceiptSubmitting(true);
    setError(null);
    try {
      const inspectionItems: ReturnReceiveItemSpec[] = Object.entries(receiptSpecs).map(([return_item_id, spec]) => ({
        return_item_id,
        received_qty: spec.received,
        accepted_qty: spec.accepted,
        disposition: spec.disposition,
      }));

      const updated = await adminReturnsApi.receiveAndRestock(selectedCase.id, {
        warehouse_id: targetWarehouseId,
        inspection_items: inspectionItems,
      });
      setSelectedCase(updated);
      setShowReceiptModal(false);
      setSuccessMsg('Physical return inspected and accepted items restocked to warehouse inventory!');
      await loadReturns();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Restock receipt failed');
    } finally {
      setReceiptSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'EVIDENCE_SUBMITTED':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'COMPLETED':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-lg">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Returns & Frame Sizing Inspection Desk</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Solar Panel Frame Thickness Caliper Verification • Item Inspection • Physical Restock Invariant
            </p>
          </div>
        </div>

        <button
          onClick={loadReturns}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-purple-700 bg-slate-50 hover:bg-purple-50 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Cases
        </button>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Returns Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-purple-600"
              >
                <option value="">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="EVIDENCE_SUBMITTED">Evidence Submitted</option>
                <option value="APPROVED">Approved (Awaiting Return)</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Total: {returns.length} case(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Case ID / Date</th>
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                      Loading return cases...
                    </td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No return cases found matching filter.
                    </td>
                  </tr>
                ) : (
                  returns.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-purple-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">
                            {c.id.slice(0, 8)}...
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(c.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                          {c.order_id.slice(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">
                          {c.reason}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                              c.status
                            )}`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                          {c.items.length} line(s)
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Drawer: Inspection Desk */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col gap-5">
          {selectedCase ? (
            <>
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                    Inspection Workspace
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                      selectedCase.status
                    )}`}
                  >
                    {selectedCase.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Reason: {selectedCase.reason}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Order ID: {selectedCase.order_id}
                </p>
              </div>

              {/* Sizing Verification: Vernier Caliper Evidence */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-600" />
                  Vernier Caliper Photo Evidence
                </h4>
                {selectedCase.caliper_photo_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-100 max-h-48 flex items-center justify-center">
                    <img
                      src={selectedCase.caliper_photo_url}
                      alt="Caliper Evidence"
                      className="object-contain max-h-48 w-full"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400">
                    No caliper photo uploaded yet. Customer must provide photo with vernier calliper / ruler on solar frame.
                  </div>
                )}

                {/* Caliper Review Controls */}
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Measured Thickness (mm)
                      </label>
                      <select
                        value={caliperThickness}
                        onChange={(e) => setCaliperThickness(e.target.value)}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      >
                        <option value="28.00">28 mm</option>
                        <option value="30.00">30 mm</option>
                        <option value="33.00">33 mm</option>
                        <option value="35.00">35 mm</option>
                        <option value="40.00">40 mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Verification Decision
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setCaliperApproval(true)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md border transition-all ${
                            caliperApproval
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setCaliperApproval(false)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md border transition-all ${
                            !caliperApproval
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleInspectCaliper}
                    disabled={caliperSubmitting}
                    className="w-full py-2 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {caliperSubmitting ? 'Recording...' : 'Submit Caliper Verification'}
                  </button>
                </div>
              </div>

              {/* Items List & Restock Action */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-slate-400" />
                    Return Items
                  </h4>
                  {selectedCase.status === 'APPROVED' && (
                    <button
                      onClick={openReceiptModal}
                      className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-2xs"
                    >
                      Receive & Restock
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedCase.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Line Item #{item.order_item_id.slice(0, 8)}</span>
                        <span>Req: {item.requested_qty} pcs</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Accepted: {item.accepted_qty} pcs</span>
                        <span className="font-mono text-purple-700 font-semibold">
                          {item.disposition}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              Select a return case to view evidence and inspect items.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Receive and Restock Physical Items */}
      {showReceiptModal && selectedCase && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <WarehouseIcon className="w-5 h-5 text-blue-600" />
              Physical Warehouse Receipt & Restock
            </h3>
            <p className="text-xs text-slate-600">
              <span className="font-bold text-rose-600">Statutory Stock Invariant:</span> Credit notes alone do not restock inventory. Only items physically inspected, accepted, and set to <span className="font-mono font-bold">RESTOCK_INVENTORY</span> will increment on-hand inventory!
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receiving Warehouse
              </label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="00000000-0000-0000-0000-000000000001">
                  Kathwada GIDC Central Hub (Plot 108)
                </option>
              </select>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {selectedCase.items.map((item) => {
                const spec = receiptSpecs[item.id] || {
                  received: item.requested_qty,
                  accepted: item.requested_qty,
                  disposition: 'RESTOCK_INVENTORY',
                };
                return (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="font-bold text-slate-800">
                      Item #{item.order_item_id.slice(0, 8)} (Requested: {item.requested_qty})
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Received Qty</label>
                        <input
                          type="number"
                          value={spec.received}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setReceiptSpecs({
                              ...receiptSpecs,
                              [item.id]: { ...spec, received: val },
                            });
                          }}
                          className="w-full p-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Accepted Qty</label>
                        <input
                          type="number"
                          value={spec.accepted}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setReceiptSpecs({
                              ...receiptSpecs,
                              [item.id]: { ...spec, accepted: val },
                            });
                          }}
                          className="w-full p-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Disposition</label>
                        <select
                          value={spec.disposition}
                          onChange={(e) => {
                            setReceiptSpecs({
                              ...receiptSpecs,
                              [item.id]: { ...spec, disposition: e.target.value },
                            });
                          }}
                          className="w-full p-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
                        >
                          <option value="RESTOCK_INVENTORY">Restock</option>
                          <option value="SCRAP_DEFECTIVE">Scrap</option>
                          <option value="REFURBISH">Refurbish</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleReceiveAndRestock}
                disabled={receiptSubmitting}
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {receiptSubmitting ? 'Receiving...' : 'Confirm Warehouse Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
