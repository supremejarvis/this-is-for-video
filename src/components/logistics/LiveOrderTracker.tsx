import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, CheckCircle2, Clock, Printer, FileText, 
  MapPin, ShieldCheck, ArrowRight, Package, RefreshCw, Check, AlertCircle, Wifi, WifiOff 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ThermalShippingLabel } from './ThermalShippingLabel';
import { GstInvoice } from './GstInvoice';
import { Order } from '../../types';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../../services/logisticsService';
import { apiService, ConnectionManager } from '../../services/apiService';

export const LiveOrderTracker: React.FC = () => {
  const { 
    orders, selectedOrderForDetail, setSelectedOrderForDetail, 
    updateOrderStatus, orderFilterStatus, setOrderFilterStatus, showToast 
  } = useStore();

  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(ConnectionManager.getStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just Now');

  // Listen to network status
  useEffect(() => {
    const unsub = ConnectionManager.subscribe((status) => {
      setIsOnline(status);
    });
    return unsub;
  }, []);

  const filteredOrders = orders.filter((o) => {
    const isDelivered = o.shipments[0]?.status === 'DELIVERED';
    if (orderFilterStatus === 'DELIVERED') return isDelivered;
    if (orderFilterStatus === 'NOT_DELIVERED') return !isDelivered;
    return true;
  });

  const activeOrder = selectedOrderForDetail || filteredOrders[0] || orders[0];

  // Real-time carrier feed sync
  const syncLiveCarrierFeed = useCallback(async () => {
    if (!activeOrder) return;
    setIsRefreshing(true);
    try {
      const awb = activeOrder.shipments[0]?.shippingDetail.articleNumber;
      if (awb) {
        await apiService.fetchLiveTracking(awb);
        setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // Graceful offline fallback
    } finally {
      setIsRefreshing(false);
    }
  }, [activeOrder]);

  // Auto-polling interval every 25 seconds + on window focus
  useEffect(() => {
    syncLiveCarrierFeed();
    const interval = setInterval(syncLiveCarrierFeed, 25000);

    const onFocus = () => syncLiveCarrierFeed();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncLiveCarrierFeed]);

  if (!activeOrder) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 space-y-4">
        <Package className="w-16 h-16 mx-auto text-slate-400" />
        <h3 className="text-lg font-bold text-slate-800">No Orders Found</h3>
        <p className="text-xs">Browse the catalog, place an order, and your live APE tracking timeline will appear here.</p>
      </div>
    );
  }

  const primaryShipment = activeOrder.shipments[0];
  const shipping = primaryShipment.shippingDetail;
  const isDelivered = primaryShipment.status === 'DELIVERED';

  const handleAdvanceMilestone = () => {
    const milestones = primaryShipment.milestones;
    const nextUncompleted = milestones.find((m) => !m.isCompleted);
    if (nextUncompleted) {
      updateOrderStatus(
        activeOrder.id,
        primaryShipment.packageId,
        nextUncompleted.status.toUpperCase().replace(/\s+/g, '_') as any,
        `Live update: ${nextUncompleted.status} scan completed`,
        nextUncompleted.location
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${
              isDelivered
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {isDelivered ? <Check className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
              {isDelivered ? 'DELIVERED TO CUSTOMER' : 'IN TRANSIT (NOT DELIVERED YET)'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              APE Tracking AWB: <strong className="text-slate-900 font-bold">{shipping.articleNumber}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Order #{activeOrder.orderNumber}
          </h2>
        </div>

        {/* Customer Account Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Connection & Sync Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <Wifi className="w-3.5 h-3.5 animate-pulse" /> Live Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-600 font-bold">
                <WifiOff className="w-3.5 h-3.5" /> Offline Mode
              </span>
            )}
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 text-[10px]">Synced: {lastSyncTime}</span>
            <button
              onClick={syncLiveCarrierFeed}
              disabled={isRefreshing}
              className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
              title="Refresh Live Carrier Feed"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          <button
            onClick={() => setIsLabelModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-300 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4 text-[#0054A6]" />
            4x6 Thermal Shipping Label
          </button>

          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-4 py-2 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Official GST Tax Invoice
          </button>
        </div>
      </div>

      {/* Orders Filter Switcher */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
        <span className="text-xs font-bold text-slate-500 px-2">Filter Orders:</span>
        {(['ALL', 'NOT_DELIVERED', 'DELIVERED'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setOrderFilterStatus(filter)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              orderFilterStatus === filter
                ? 'bg-[#0054A6] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {filter === 'ALL' && `All Orders (${orders.length})`}
            {filter === 'NOT_DELIVERED' && 'In Transit / Not Delivered'}
            {filter === 'DELIVERED' && 'Delivered'}
          </button>
        ))}
      </div>

      {/* Main Order & Stepper Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Real-Time Milestones Stepper */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#0054A6]" />
                APE Priority Live Tracking Journey
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct route from Factory Hub (<strong className="font-mono text-slate-800">{ORIGIN_HUB_PINCODE}</strong>) to Bound Destination Delivery Hub
              </p>
            </div>

            {/* Test Simulation Button */}
            <button
              onClick={handleAdvanceMilestone}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0054A6] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Simulate Live APE Scan
            </button>
          </div>

          {/* Stepper */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {primaryShipment.milestones.map((m, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                <span className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  m.isCompleted 
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                }`}>
                  {m.isCompleted ? '✓' : idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`font-bold text-sm ${m.isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                      {m.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {m.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{m.description}</p>
                  <span className="text-[11px] text-blue-600 font-mono font-medium block mt-0.5">
                    📍 {m.location}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Electronic Manifest Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex items-center justify-between text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Direct Electronic Manifest with APE Logistics Engine</span>
            </div>
            <span className="font-mono text-slate-800 font-bold">Manifest: {shipping.manifestId}</span>
          </div>
        </div>

        {/* Right Column: Order Details & Address Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Destination Address Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
              Customer Shipping Destination
            </h4>
            
            <div className="space-y-1.5 text-xs text-slate-600">
              <strong className="text-slate-900 text-sm block">{activeOrder.deliveryAddress.fullName}</strong>
              <p>{activeOrder.deliveryAddress.flatBuilding}, {activeOrder.deliveryAddress.streetArea}</p>
              
              {/* Bound Postal Hub */}
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1 my-2">
                <span className="text-[10px] text-[#0054A6] font-bold block uppercase tracking-wider">
                  Bound Delivery Postal Hub / Office:
                </span>
                <div className="font-bold text-slate-900 font-mono text-xs">{activeOrder.deliveryAddress.postOffice.name}</div>
                <div className="text-slate-600">
                  {activeOrder.deliveryAddress.city}, {activeOrder.deliveryAddress.state} - <strong className="text-[#0054A6] font-mono">{activeOrder.deliveryAddress.pincode}</strong>
                </div>
              </div>

              <div className="text-slate-600">Contact: <strong>{activeOrder.deliveryAddress.phone}</strong></div>
              {activeOrder.gstin && (
                <div className="text-[#0054A6] font-mono font-bold pt-1">GSTIN: {activeOrder.gstin}</div>
              )}
            </div>
          </div>

          {/* Items In Shipment */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
              Package Items ({primaryShipment.items.length})
            </h4>

            <div className="space-y-3">
              {primaryShipment.items.map((item) => (
                <div key={item.sku} className="flex gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <img src={item.imageUrl} alt={item.productTitle} className="w-12 h-12 rounded-lg object-contain bg-white p-1 border border-slate-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 truncate block">{item.productTitle}</span>
                    <span className="text-[11px] text-slate-500 block">{item.variantTitle}</span>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-slate-600">Qty: <strong>{item.quantity}</strong></span>
                      <span className="font-mono font-bold text-[#0054A6]">₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Total */}
            <div className="space-y-1.5 pt-3 border-t border-slate-200 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">₹{activeOrder.pricingSummary.itemsTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>APE Shipping:</span>
                <span className="font-mono font-bold text-emerald-700">₹{activeOrder.pricingSummary.shippingTotal.toLocaleString('en-IN')}</span>
              </div>
              {Boolean(activeOrder.pricingSummary.codFee) && (
                <div className="flex justify-between text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                  <span className="font-bold">⚡ APE COD Fee (2.5%):</span>
                  <span className="font-mono font-black">₹{activeOrder.pricingSummary.codFee?.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Paid / Payable:</span>
                <span className="font-mono text-[#0054A6]">₹{activeOrder.pricingSummary.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isLabelModalOpen && (
        <ThermalShippingLabel order={activeOrder} onClose={() => setIsLabelModalOpen(false)} />
      )}
      {isInvoiceModalOpen && (
        <GstInvoice order={activeOrder} onClose={() => setIsInvoiceModalOpen(false)} />
      )}
    </div>
  );
};
