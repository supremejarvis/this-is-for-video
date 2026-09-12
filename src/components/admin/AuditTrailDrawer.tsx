import React, { useState } from 'react';
import { 
  X, History, Search, Filter, Download, Clock, User, 
  ArrowRight, ShieldCheck, Tag, Package, DollarSign, Layers
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AuditActionType, AdminAuditLog } from '../../types';

interface AuditTrailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({ isOpen, onClose }) => {
  const { adminAuditLogs, showToast } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredLogs = adminAuditLogs.filter((log) => {
    if (filterAction !== 'ALL' && log.actionType !== filterAction) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.entityTitle.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      log.userEmail.toLowerCase().includes(q) ||
      (log.notes || '').toLowerCase().includes(q)
    );
  });

  const getActionBadge = (type: AuditActionType) => {
    switch (type) {
      case 'STOCK_UPDATE':
        return <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold flex items-center gap-1"><Package className="w-2.5 h-2.5" /> Stock Adjusted</span>;
      case 'PRICE_UPDATE':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold flex items-center gap-1"><DollarSign className="w-2.5 h-2.5" /> Price Changed</span>;
      case 'MOQ_UPDATE':
        return <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold flex items-center gap-1"><Layers className="w-2.5 h-2.5" /> Wholesale MOQ</span>;
      case 'COUPON_CREATED':
        return <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> Promo Coupon</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-bold">{type}</span>;
    }
  };

  const exportAuditLogJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Apollo_Audit_Trail_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Audit trail exported successfully!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden text-slate-900">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 font-display">
                Inventory & Pricing Audit Trail
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {adminAuditLogs.length} immutable events recorded
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, SKU, user, or note..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs">
              {['ALL', 'STOCK_UPDATE', 'PRICE_UPDATE', 'MOQ_UPDATE', 'COUPON_CREATED'].map((act) => (
                <button
                  key={act}
                  onClick={() => setFilterAction(act)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                    filterAction === act
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {act === 'ALL' ? 'All Events' : act.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={exportAuditLogJson}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
              title="Export filtered log as JSON"
            >
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No audit logs matched your search filters.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const dateFormatted = new Date(log.timestamp).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              });

              return (
                <div 
                  key={log.id} 
                  className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-amber-300 bg-white hover:shadow-xs transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    {getActionBadge(log.actionType)}
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {dateFormatted}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900">{log.entityTitle}</h4>
                    <span className="font-mono text-[10px] text-slate-500">{log.entityId}</span>
                  </div>

                  {/* Value Transition */}
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl font-mono text-xs border border-slate-100">
                    <span className="text-slate-500 line-through">{String(log.oldValue)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-bold text-slate-900">{String(log.newValue)}</span>
                  </div>

                  {log.notes && (
                    <p className="text-[11px] text-slate-600 italic">
                      "{log.notes}"
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-50">
                    <User className="w-3 h-3" />
                    <span>{log.userEmail}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
