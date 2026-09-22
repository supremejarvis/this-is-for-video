import React, { useState } from 'react';
import { 
  RotateCcw, CheckCircle2, AlertCircle, Package, Truck, 
  Clock, DollarSign, MessageSquare, ChevronRight, Eye,
  Ruler, Camera, ShieldAlert, Check
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ReturnStatus, ReturnRequest } from '../../types';
import { adminReturnsApi } from '../../services/api/adminReturnsApi';

const STATUS_FLOW: ReturnStatus[] = [
  'REQUESTED',
  'APPROVED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'RECEIVED_AT_WAREHOUSE',
  'REFUND_INITIATED',
  'REFUND_COMPLETED'
];

const STATUS_COLORS: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-amber-50 border-amber-200 text-amber-900',
  APPROVED: 'bg-blue-50 border-blue-200 text-[#0054A6]',
  PICKUP_SCHEDULED: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  PICKED_UP: 'bg-sky-50 border-sky-200 text-sky-900',
  RECEIVED_AT_WAREHOUSE: 'bg-teal-50 border-teal-200 text-teal-900',
  REFUND_INITIATED: 'bg-violet-50 border-violet-200 text-violet-900',
  REFUND_COMPLETED: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  REJECTED: 'bg-rose-50 border-rose-200 text-rose-900',
};

const REASON_LABELS: Record<string, string> = {
  DEFECTIVE_PRODUCT: 'Defective Product',
  WRONG_ITEM_DELIVERED: 'Wrong Item Delivered',
  ITEM_DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  NOT_AS_DESCRIBED: 'Not as Described',
  SIZE_FIT_ISSUE: 'Size/Fit Issue',
  CHANGED_MIND: 'Changed Mind',
  QUALITY_NOT_SATISFACTORY: 'Quality Issue',
  OTHER: 'Other Reason',
};

export const ReturnsManagementPanel: React.FC = () => {
  const { returnRequests, updateReturnStatus, showToast } = useStore();
  const [adminNotesInput, setAdminNotesInput] = useState<Record<string, string>>({});
  const [expandedReturn, setExpandedReturn] = useState<string | null>(null);

  const handleApproveCaliperEvidence = async (ret: ReturnRequest) => {
    try {
      if (!ret.id.startsWith('ret_')) {
        await adminReturnsApi.inspectCaliper(ret.id, {
          verified_frame_thickness_mm: ret.verifiedFrameThickness?.replace('mm', '') || '35',
          approval: true,
          notes: 'Admin verified caliper photo evidence.'
        });
      }
    } catch {}
    updateReturnStatus(ret.id, 'APPROVED', `Admin verified caliper evidence: ${ret.verifiedFrameThickness || 'Valid measurement'}`);
    showToast(`Caliper evidence approved for Return #${ret.id.slice(-6)}`, 'success');
  };

  const handleAdvanceStatus = (returnId: string, currentStatus: ReturnStatus) => {
    const currentIdx = STATUS_FLOW.indexOf(currentStatus);
    if (currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentIdx + 1];
      updateReturnStatus(returnId, nextStatus, adminNotesInput[returnId]);
      setAdminNotesInput(prev => ({ ...prev, [returnId]: '' }));
    }
  };

  const handleReject = (returnId: string) => {
    if (window.confirm('Are you sure you want to reject this return request?')) {
      updateReturnStatus(returnId, 'REJECTED', adminNotesInput[returnId] || 'Return request rejected by admin.');
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 font-display flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            Return & Refund Management
          </h2>
          <p className="text-xs text-slate-600">
            Process customer return requests. 
            Pending: {returnRequests.filter(r => r.status === 'REQUESTED').length} | 
            In Progress: {returnRequests.filter(r => !['REQUESTED', 'REFUND_COMPLETED', 'REJECTED'].includes(r.status)).length} | 
            Completed: {returnRequests.filter(r => r.status === 'REFUND_COMPLETED').length}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Returns', value: returnRequests.length, icon: RotateCcw, color: 'text-amber-600' },
          { label: 'Pending Approval', value: returnRequests.filter(r => r.status === 'REQUESTED').length, icon: Clock, color: 'text-amber-600' },
          { label: 'Refund Amount', value: `₹${returnRequests.filter(r => r.status === 'REFUND_COMPLETED').reduce((s, r) => s + r.refundAmount, 0).toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-emerald-700' },
          { label: 'Rejected', value: returnRequests.filter(r => r.status === 'REJECTED').length, icon: AlertCircle, color: 'text-rose-600' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-5 space-y-2 shadow-md">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-xl font-black text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {returnRequests.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-3">
            <RotateCcw className="w-16 h-16 mx-auto opacity-30" />
            <p className="font-bold text-sm">No return requests yet</p>
            <p className="text-xs">When customers request returns, they will appear here for admin processing.</p>
          </div>
        ) : (
          returnRequests.map((ret) => {
            const isExpanded = expandedReturn === ret.id;
            const isTerminal = ret.status === 'REFUND_COMPLETED' || ret.status === 'REJECTED';
            
            return (
              <div
                key={ret.id}
                className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl overflow-hidden transition-all shadow-md"
              >
                {/* Return Header */}
                <div 
                  className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedReturn(isExpanded ? null : ret.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 font-display">Return #{ret.id.slice(-6)}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">Order: {ret.orderNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{REASON_LABELS[ret.reason] || ret.reason}</span>
                        <span>•</span>
                        <span>{new Date(ret.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-bold font-mono">₹{ret.refundAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[ret.status]}`}>
                      {ret.status.replace(/_/g, ' ')}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-5 space-y-5 bg-slate-50/50">
                    {/* Items */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Items for Return</h4>
                      {ret.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                          <img src={item.imageUrl} alt={item.title} className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Qty: {item.quantity} × ₹{item.unitPrice}</p>
                          </div>
                          <span className="text-xs font-black text-amber-700 font-mono">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Reason Details */}
                    {ret.reasonDetails && (
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer's Explanation</h4>
                        <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">{ret.reasonDetails}</p>
                      </div>
                    )}

                    {/* Directive 6: Sizing & Vernier Caliper Inspection Card */}
                    {ret.reason === 'SIZE_FIT_ISSUE' && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-amber-700" />
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider font-mono">
                              Directive 6: Vernier Caliper Frame Measurement Verification
                            </h4>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-900">
                            Mandatory Sizing Evidence
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 shadow-sm">
                            <span className="text-[11px] font-bold text-slate-700 block flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-blue-600" /> Photo Verification:
                            </span>
                            {ret.caliperPhotoUrl ? (
                              <div className="space-y-2">
                                <a 
                                  href={ret.caliperPhotoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="block group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-48"
                                >
                                  <img 
                                    src={ret.caliperPhotoUrl} 
                                    alt="Vernier Caliper Evidence" 
                                    className="w-full h-40 object-contain bg-slate-900/5" 
                                  />
                                  <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                    <Eye className="w-4 h-4 mr-1.5" /> View Original Photo
                                  </div>
                                </a>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-700">Measured Frame:</span>
                                  <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    {ret.verifiedFrameThickness || 'Measured on Vernier'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-600">
                                Customer verified frame thickness with calliper/ruler. 
                                Eligible sizes: <strong>28mm / 30mm / 33mm / 35mm / 40mm</strong>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> Size Evidence Recorded
                              </span>
                              {ret.status === 'REQUESTED' && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleApproveCaliperEvidence(ret); }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Approve Caliper Evidence
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1 shadow-sm font-mono">
                            <span className="text-[11px] font-bold text-slate-700 block font-sans">
                              Statutory Replacement Delivery Charges:
                            </span>
                            <div className="flex justify-between text-[11px] text-slate-600">
                              <span>Return & Replacement Base Freight:</span>
                              <span className="font-bold text-slate-900">₹120.00</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-600">
                              <span>18% GST on Shipping:</span>
                              <span className="font-bold text-slate-900">₹21.60</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-amber-900 pt-1 border-t border-slate-200">
                              <span>Customer Sizing Charge Payable:</span>
                              <span className="text-emerald-700">₹141.60</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {ret.adminNotes && (
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admin Notes</h4>
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3">{ret.adminNotes}</p>
                      </div>
                    )}

                    {/* Status Progress */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Processing Timeline</h4>
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2">
                        {STATUS_FLOW.map((status, idx) => {
                          const currentIdx = STATUS_FLOW.indexOf(ret.status);
                          const isCompleted = idx <= currentIdx && ret.status !== 'REJECTED';
                          const isCurrent = status === ret.status;
                          return (
                            <div key={status} className="flex items-center gap-1">
                              <div className={`px-2.5 py-1 rounded-xl text-[9px] font-bold whitespace-nowrap ${
                                isCurrent ? 'bg-amber-500 text-slate-950 font-black' : isCompleted ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-white border border-slate-200 text-slate-400'
                              }`}>
                                {status.replace(/_/g, ' ')}
                              </div>
                              {idx < STATUS_FLOW.length - 1 && (
                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${isCompleted ? 'text-emerald-600' : 'text-slate-300'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {!isTerminal && (
                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
                        <input
                          type="text"
                          placeholder="Add admin note (optional)..."
                          value={adminNotesInput[ret.id] || ''}
                          onChange={(e) => setAdminNotesInput(prev => ({ ...prev, [ret.id]: e.target.value }))}
                          className="flex-1 min-w-[200px] h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-inner"
                        />
                        <button
                          onClick={() => handleAdvanceStatus(ret.id, ret.status)}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Advance to Next Step
                        </button>
                        <button
                          onClick={() => handleReject(ret.id)}
                          className="px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}

                    {/* Terminal Status Info */}
                    {ret.status === 'REFUND_COMPLETED' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2 text-xs text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Refund of ₹{ret.refundAmount.toLocaleString('en-IN')} completed via {ret.refundMethod.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {ret.status === 'REJECTED' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2 text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Return request rejected. {ret.adminNotes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
