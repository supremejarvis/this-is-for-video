'use client';

import React, { useState, useEffect } from 'react';
import {
  adminOrderApi,
  AdminOrderListItem,
  AdminOrderDetailResponse,
} from '../../services/api';

export const OrderManagementConsole: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Order for Detail Drawer
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetailResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminOrderApi.listOrders({
        order_status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        page_size: pageSize,
      });
      setOrders(res.items);
      setTotalOrders(res.total);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectOrder = async (orderId: string) => {
    try {
      setActionLoading(true);
      const detail = await adminOrderApi.getOrderDetail(orderId);
      setSelectedOrder(detail);
      setDrawerOpen(true);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to fetch order details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!confirm('Confirm order payment and commit reserved stock?')) return;
    try {
      setActionLoading(true);
      const updated = await adminOrderApi.confirmOrder(orderId, {
        notes: 'Manual payment confirmation by seller admin',
      });
      setSelectedOrder(updated);
      await loadOrders();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to confirm order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt('Enter mandatory cancellation reason for audit log:');
    if (!reason || reason.trim().length < 3) {
      alert('Cancellation aborted: valid reason is required.');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await adminOrderApi.cancelOrder(orderId, { reason: reason.trim() });
      setSelectedOrder(updated);
      await loadOrders();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Order Fulfillment & Saga Pipeline
          </h2>
          <p className="text-xs text-slate-500">
            Authoritative order lifecycle, reservation tracking, and compensation state. Total: {totalOrders} orders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Order Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="QUOTED">QUOTED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Search Order #, customer, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <button
            onClick={loadOrders}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Order Number</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer / Buyer</th>
              <th className="px-4 py-3 text-center">Items</th>
              <th className="px-4 py-3 text-right">Payable Total</th>
              <th className="px-4 py-3">Order Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Fulfillment</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  {loading ? 'Loading orders...' : 'No orders found.'}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {o.order_number}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {o.customer_name || 'Direct Buyer'}
                    </div>
                    {o.customer_phone && (
                      <div className="text-xs text-slate-400 font-mono">{o.customer_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {o.item_count}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    ₹{o.total_payable}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        o.order_status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : o.order_status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {o.order_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        o.payment_status === 'CAPTURED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : o.payment_status === 'REFUNDED'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        o.fulfilment_status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : o.fulfilment_status === 'SHIPPED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {o.fulfilment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleInspectOrder(o.id)}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail & Saga Drawer */}
      {drawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border-l dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Order {selectedOrder.order_number}
                </h3>
                <p className="text-xs text-slate-500">
                  Created on {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Order Status & Primary Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Order Status</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedOrder.order_status} / {selectedOrder.payment_status}
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectedOrder.order_status !== 'CONFIRMED' && selectedOrder.order_status !== 'CANCELLED' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleConfirmOrder(selectedOrder.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Confirm & Allocate
                    </button>
                  )}
                  {selectedOrder.order_status !== 'CANCELLED' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                    >
                      Cancel & Compensate
                    </button>
                  )}
                </div>
              </div>

              {/* Distributed Saga Execution Tracker */}
              {selectedOrder.saga && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                      Distributed Saga State Machine
                    </h4>
                    <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-mono font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {selectedOrder.saga.state} (Step: {selectedOrder.saga.current_step})
                    </span>
                  </div>

                  {selectedOrder.saga.last_error && (
                    <div className="mt-2 rounded-lg bg-red-100 p-2 text-xs font-mono text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      Exception: {selectedOrder.saga.last_error}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {selectedOrder.saga.steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs shadow-xs dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              step.status === 'SUCCEEDED'
                                ? 'bg-emerald-500'
                                : step.status === 'FAILED'
                                ? 'bg-rose-500'
                                : step.status === 'COMPENSATED'
                                ? 'bg-purple-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{step.step_name}</span>
                          <span className="font-mono text-slate-400">({step.command_id})</span>
                        </div>
                        <span className="font-mono text-slate-500">{step.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line Items Snapshot */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Immutable Line Item Snapshots
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                      <tr>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Taxable</th>
                        <th className="px-3 py-2 text-right">GST Rate</th>
                        <th className="px-3 py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedOrder.items.map((it) => (
                        <tr key={it.id}>
                          <td className="px-3 py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {it.sku}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">{it.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono">₹{it.unit_price}</td>
                          <td className="px-3 py-2 text-right font-mono">₹{it.taxable_base}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {(parseFloat(it.gst_rate) * 100).toFixed(0)}%
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">₹{it.line_gross}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Authoritative Financial Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable Product Base:</span>
                    <span className="font-mono font-medium">₹{selectedOrder.subtotal_taxable}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Product GST:</span>
                    <span className="font-mono font-medium">₹{selectedOrder.product_gst}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">India Post Speed Post Shipping:</span>
                    <span className="font-mono font-medium">₹{selectedOrder.shipping_base}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipping GST (18% Statutory):</span>
                    <span className="font-mono font-medium">₹{selectedOrder.shipping_gst}</span>
                  </div>
                  {parseFloat(selectedOrder.cod_surcharge) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">COD Surcharge (2.5%):</span>
                      <span className="font-mono font-medium">₹{selectedOrder.cod_surcharge}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:border-slate-700 dark:text-slate-100">
                    <span>Grand Total Payable:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{selectedOrder.total_payable} {selectedOrder.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address Snapshot */}
              {selectedOrder.address && (
                <div className="rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
                  <h4 className="font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Verified Shipping Destination
                  </h4>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedOrder.address.full_name}</p>
                  <p className="text-slate-600 dark:text-slate-400">{selectedOrder.address.address_line1}</p>
                  {selectedOrder.address.address_line2 && (
                    <p className="text-slate-600 dark:text-slate-400">{selectedOrder.address.address_line2}</p>
                  )}
                  <p className="text-slate-600 dark:text-slate-400">
                    {selectedOrder.address.city}, {selectedOrder.address.state} — {selectedOrder.address.pincode}
                  </p>
                  <p className="font-mono text-slate-500 mt-1">Contact: {selectedOrder.address.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
