'use client';

import React, { useState, useEffect } from 'react';
import {
  adminInventoryApi,
  Warehouse,
  StockBalanceItem,
  StockTransfer,
  StockCount,
} from '../../services/api';

export const WarehouseInventoryConsole: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'BALANCES' | 'TRANSFERS' | 'COUNTS' | 'WAREHOUSES'>('BALANCES');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [balances, setBalances] = useState<StockBalanceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Adjustment Modal State
  const [isAdjustOpen, setIsAdjustOpen] = useState<boolean>(false);
  const [adjustTarget, setAdjustTarget] = useState<StockBalanceItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjusting, setAdjusting] = useState<boolean>(false);

  // Transfers & Counts State
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [counts, setCounts] = useState<StockCount[]>([]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'BALANCES') {
      loadBalances();
    } else if (activeSubTab === 'TRANSFERS') {
      loadTransfers();
    } else if (activeSubTab === 'COUNTS') {
      loadCounts();
    }
  }, [activeSubTab, selectedWarehouseId]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await adminInventoryApi.getWarehouses();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(data[0].id);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminInventoryApi.getBalances({
        warehouse_id: selectedWarehouseId || undefined,
        search: searchQuery || undefined,
      });
      setBalances(res.items);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const res = await adminInventoryApi.getTransfers();
      setTransfers(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      setLoading(true);
      const res = await adminInventoryApi.getStockCounts();
      setCounts(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch stock counts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjust = (item: StockBalanceItem) => {
    setAdjustTarget(item);
    setAdjustDelta(0);
    setAdjustReason('');
    setIsAdjustOpen(true);
  };

  const handleExecuteAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    if (adjustDelta === 0) {
      alert('Quantity delta cannot be zero');
      return;
    }
    if (!adjustReason.trim() || adjustReason.trim().length < 3) {
      alert('Mandatory adjustment reason is required for audit trail');
      return;
    }

    try {
      setAdjusting(true);
      await adminInventoryApi.adjustStock({
        warehouse_id: adjustTarget.warehouse_id,
        variant_id: adjustTarget.variant_id,
        sku: adjustTarget.sku,
        quantity_delta: adjustDelta,
        reason: adjustReason.trim(),
      });
      setIsAdjustOpen(false);
      await loadBalances();
    } catch (err: unknown) {
      alert((err as Error).message || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDispatchTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to dispatch this stock transfer? Stock will be deducted from origin.')) return;
    try {
      await adminInventoryApi.dispatchTransfer(transferId);
      await loadTransfers();
    } catch (err: unknown) {
      alert((err as Error).message || 'Dispatch failed');
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    if (!confirm('Confirm physical arrival and receipt of this stock transfer?')) return;
    try {
      await adminInventoryApi.receiveTransfer(transferId);
      await loadTransfers();
    } catch (err: unknown) {
      alert((err as Error).message || 'Receipt failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('BALANCES')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeSubTab === 'BALANCES'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Stock Balances & Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('TRANSFERS')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeSubTab === 'TRANSFERS'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Inter-Warehouse Transfers
          </button>
          <button
            onClick={() => setActiveSubTab('COUNTS')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeSubTab === 'COUNTS'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Physical Cycle Counts
          </button>
          <button
            onClick={() => setActiveSubTab('WAREHOUSES')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeSubTab === 'WAREHOUSES'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Hub Locations
          </button>
        </div>

        {/* Warehouse Selector Filter */}
        {activeSubTab === 'BALANCES' && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Warehouse:</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tab 1: Stock Balances */}
      {activeSubTab === 'BALANCES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search SKU or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadBalances()}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              onClick={loadBalances}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Physical On Hand</th>
                  <th className="px-4 py-3 text-right">Committed Reserved</th>
                  <th className="px-4 py-3 text-right">Quarantined</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">Saleable Available</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {loading ? 'Loading stock balances...' : 'No inventory balances found.'}
                    </td>
                  </tr>
                ) : (
                  balances.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.warehouse_code}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {item.product_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {item.on_hand}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        {item.reserved}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {item.quarantined}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.available}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Transfers */}
      {activeSubTab === 'TRANSFERS' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Transfer ID</th>
                  <th className="px-4 py-3">From Hub</th>
                  <th className="px-4 py-3">To Hub</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No stock transfers found.
                    </td>
                  </tr>
                ) : (
                  transfers.map((tr) => (
                    <tr key={tr.id}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {tr.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {warehouses.find((w) => w.id === tr.from_warehouse_id)?.name || tr.from_warehouse_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {warehouses.find((w) => w.id === tr.to_warehouse_id)?.name || tr.to_warehouse_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {tr.items.length} line(s)
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            tr.status === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : tr.status === 'IN_TRANSIT'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {tr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(tr.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        {tr.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDispatchTransfer(tr.id)}
                            className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
                          >
                            Dispatch
                          </button>
                        )}
                        {tr.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleReceiveTransfer(tr.id)}
                            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                          >
                            Confirm Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Counts */}
      {activeSubTab === 'COUNTS' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Count Session ID</th>
                  <th className="px-4 py-3">Warehouse Hub</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Items Counted</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {counts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No physical cycle count audits found.
                    </td>
                  </tr>
                ) : (
                  counts.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {c.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {warehouses.find((w) => w.id === c.warehouse_id)?.name || c.warehouse_id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            c.status === 'RECONCILED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {c.items.length} items
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(c.count_date).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Hub Locations */}
      {activeSubTab === 'WAREHOUSES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{wh.name}</h4>
                  <p className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{wh.code}</p>
                </div>
                {wh.is_default && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Default Hub
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{wh.address_line}</p>
              <p className="text-xs text-slate-500">{wh.city}, {wh.state} — {wh.pincode}</p>
            </div>
          ))}
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {isAdjustOpen && adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Audited Stock Adjustment
            </h3>
            <p className="mt-1 font-mono text-xs text-blue-600 dark:text-blue-400">
              SKU: {adjustTarget.sku} ({adjustTarget.warehouse_code})
            </p>

            <form onSubmit={handleExecuteAdjust} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current Physical On Hand
                </label>
                <input
                  type="text"
                  disabled
                  value={`${adjustTarget.on_hand} units (Committed: ${adjustTarget.reserved})`}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Adjustment Delta (Positive = Add, Negative = Deduct)
                </label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <span className="text-xs text-slate-500">
                  Resulting on hand: <strong className="font-mono">{adjustTarget.on_hand + adjustDelta}</strong> units
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mandatory Audit Reason
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Physical stock count variance write-down / Damage during handling"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {adjusting ? 'Committing...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
