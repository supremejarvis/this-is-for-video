import React, { useState, useRef, useEffect } from 'react';
import { 
  Package, Truck, Calendar, Clock, CheckCircle2, AlertCircle, 
  Printer, FileText, Download, ArrowRight, Search, Filter, 
  Layers, MapPin, Building2, ChevronRight, BarChart3, CheckSquare, 
  Square, RefreshCw, Eye, ShieldCheck, UserCheck, PhoneCall,
  QrCode, Volume2, Sparkles, Send
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Order, OrderStatus } from '../../types';
import { StandardThermalShippingLabel } from './StandardThermalShippingLabel';
import { StandardTaxInvoice } from './StandardTaxInvoice';
import { msg91OtpService } from '../../services/msg91OtpService';

export type DispatchPipelineStage = 
  | 'UNSHIPPED' 
  | 'READY_TO_SHIP' 
  | 'SCHEDULED' 
  | 'READY_MANIFEST' 
  | 'IN_TRANSIT' 
  | 'DELIVERED';

export const EnterpriseDispatchConsole: React.FC = () => {
  const { 
    orders, 
    schedulePickupForOrder, 
    confirmPackedAndReady, 
    confirmHandoverToCourier, 
    batchSchedulePickup,
    showToast 
  } = useStore();

  const [activeStage, setActiveStage] = useState<DispatchPipelineStage>('UNSHIPPED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Barcode Scanner Gun Mode
  const [isBarcodeScannerActive, setIsBarcodeScannerActive] = useState(false);
  const [scannedBarcodeInput, setScannedBarcodeInput] = useState('');
  const [scannerFlashMsg, setScannerFlashMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [recentScans, setRecentScans] = useState<{ orderNumber: string; customerName: string; time: string; status: string; awb: string }[]>([]);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus scanner input when mode is toggled on
  useEffect(() => {
    if (isBarcodeScannerActive && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [isBarcodeScannerActive]);

  // Audio confirmation tone
  const playChimeTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  // Modals
  const [scheduleModalOrder, setScheduleModalOrder] = useState<Order | null>(null);
  const [isBatchScheduleOpen, setIsBatchScheduleOpen] = useState(false);
  const [printingLabelOrder, setPrintingLabelOrder] = useState<Order | null>(null);
  const [printingInvoiceOrder, setPrintingInvoiceOrder] = useState<Order | null>(null);
  const [manifestModalOrders, setManifestModalOrders] = useState<Order[] | null>(null);

  // Pick-up Form State
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pickupSlot, setPickupSlot] = useState('Morning (10:00 AM – 01:00 PM)');
  const [courierPartner, setCourierPartner] = useState('Priority Express Delivery (Kathwada Hub 382430)');

  // Handle Barcode Scan Submit
  const handleBarcodeScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = scannedBarcodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    // Find order by orderNumber, invoiceNumber, AWB, or ID
    const foundOrder = orders.find(o => 
      o.orderNumber.toUpperCase() === cleanCode ||
      (o.invoiceNumber && o.invoiceNumber.toUpperCase() === cleanCode) ||
      (o.shipments[0]?.shippingDetail?.articleNumber && o.shipments[0].shippingDetail.articleNumber.toUpperCase() === cleanCode) ||
      o.id.toUpperCase() === cleanCode
    );

    if (!foundOrder) {
      setScannerFlashMsg({ text: `Barcode "${cleanCode}" not found in orders database!`, type: 'error' });
      showToast(`Barcode "${cleanCode}" not found in orders`, 'error');
      setScannedBarcodeInput('');
      return;
    }

    const currentStatus = foundOrder.shipments[0]?.status || 'CONFIRMED';
    const pkgId = foundOrder.shipments[0]?.packageId || 'PKG-1';
    const awb = foundOrder.shipments[0]?.shippingDetail?.articleNumber || 'EK382430099IN';

    if (currentStatus === 'CONFIRMED' || currentStatus === 'PAYMENT_PENDING') {
      confirmPackedAndReady(foundOrder.id, pkgId);
      playChimeTone();
      setScannerFlashMsg({ text: `PACKED & READY: ${foundOrder.orderNumber} (${foundOrder.customerName})`, type: 'success' });
      showToast(`Scanned ${foundOrder.orderNumber}: Marked PACKED & READY`, 'success');
    } else if (currentStatus === 'PROCESSING_PICK_PACK' || currentStatus === 'AWB_GENERATED') {
      confirmHandoverToCourier(foundOrder.id, pkgId);
      playChimeTone();
      setScannerFlashMsg({ text: `DISPATCHED TO CARRIER: ${foundOrder.orderNumber} (AWB: ${awb})`, type: 'success' });
      showToast(`Scanned ${foundOrder.orderNumber}: Handed over to Carrier at Kathwada Hub`, 'success');
      
      // Auto-dispatch WhatsApp alert
      msg91OtpService.sendWhatsAppDispatchAlert(
        foundOrder.customerPhone,
        foundOrder.orderNumber,
        awb,
        'Priority Express Delivery (Kathwada Hub 382430)',
        'https://apolloengineering.co.in/track'
      ).catch(() => {});
    } else {
      setScannerFlashMsg({ text: `Order ${foundOrder.orderNumber} is already in state: ${currentStatus}`, type: 'success' });
    }

    setRecentScans(prev => [
      {
        orderNumber: foundOrder.orderNumber,
        customerName: foundOrder.customerName,
        time: new Date().toLocaleTimeString(),
        status: currentStatus === 'CONFIRMED' ? 'PACKED_READY' : 'DISPATCHED',
        awb
      },
      ...prev.slice(0, 6)
    ]);
    setScannedBarcodeInput('');
  };

  // Filter orders by active fulfillment stage
  const getOrdersInStage = (stage: DispatchPipelineStage) => {
    return orders.filter((ord) => {
      const status = ord.shipments[0]?.status || 'CONFIRMED';
      if (stage === 'UNSHIPPED') {
        return status === 'CONFIRMED' || status === 'PAYMENT_PENDING';
      }
      if (stage === 'READY_TO_SHIP' || stage === 'SCHEDULED' || stage === 'READY_MANIFEST') {
        return status === 'PROCESSING_PICK_PACK' || status === 'AWB_GENERATED';
      }
      if (stage === 'IN_TRANSIT') {
        return status === 'IN_TRANSIT' || status === 'DISPATCHED' || status === 'OUT_FOR_DELIVERY';
      }
      if (stage === 'DELIVERED') {
        return status === 'DELIVERED';
      }
      return false;
    });
  };

  const unshippedCount = getOrdersInStage('UNSHIPPED').length;
  const readyToShipCount = getOrdersInStage('READY_TO_SHIP').length;
  const inTransitCount = getOrdersInStage('IN_TRANSIT').length;
  const deliveredCount = getOrdersInStage('DELIVERED').length;

  const currentStageOrders = getOrdersInStage(activeStage).filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.deliveryAddress.city.toLowerCase().includes(q) ||
      ord.deliveryAddress.pincode.includes(q) ||
      ord.shipments[0]?.shippingDetail?.articleNumber?.toLowerCase().includes(q)
    );
  });

  const handleSelectAll = () => {
    if (selectedOrderIds.length === currentStageOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(currentStageOrders.map(o => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmSchedulePickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduleModalOrder) {
      schedulePickupForOrder(
        scheduleModalOrder.id,
        scheduleModalOrder.shipments[0]?.packageId || 'PKG-1',
        pickupSlot,
        courierPartner,
        pickupDate
      );
      setScheduleModalOrder(null);
    } else if (isBatchScheduleOpen && selectedOrderIds.length > 0) {
      batchSchedulePickup(selectedOrderIds, pickupSlot, courierPartner, pickupDate);
      setSelectedOrderIds([]);
      setIsBatchScheduleOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 🚀 ENTERPRISE HEADER: FACTORY FULFILLMENT & DISPATCH HUB                      */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white text-slate-900 rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              KATHWADA GIDC FACTORY HUB (382430) · DISPATCH ACTIVE
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 flex items-center gap-2.5">
              <Truck className="w-6 h-6 text-amber-500" />
              <span>Express Dispatch & Logistics Operations</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Consolidated order fulfillment, 4x6 thermal shipping labels, courier manifests, and live transit consignments.
            </p>
          </div>

          {/* Quick Carrier Badges */}
          {/* Carrier Badges & Scan-to-Ship Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBarcodeScannerActive(!isBarcodeScannerActive)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-xs border ${
                isBarcodeScannerActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 animate-pulse'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
              }`}
            >
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>{isBarcodeScannerActive ? 'Barcode Gun Active' : 'Scan-to-Ship Mode'}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs">
              <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Primary Carrier</div>
                  <div className="text-xs font-black text-slate-900">Priority Express (382430)</div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Heavy Cargo</div>
                  <div className="text-xs font-black text-slate-900">Delhivery Surface</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* 🔫 INTERACTIVE SCAN-TO-SHIP BARCODE CONSOLE                                */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {isBarcodeScannerActive && (
          <div className="mt-5 p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-amber-500/40 text-white shadow-xl space-y-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-display text-white flex items-center gap-2">
                    <span>Warehouse USB Barcode Scanner Console</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                      LISTENING (ENTER KEY AUTO-DISPATCH)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Scan invoice barcode (INV-...), Order No (APE-...), or AWB with handheld laser gun.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio Tone Enabled</span>
              </div>
            </div>

            {/* Flash Feedback Banner */}
            {scannerFlashMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold font-mono flex items-center gap-2 ${
                scannerFlashMsg.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-400/40 text-rose-300'
              }`}>
                {scannerFlashMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{scannerFlashMsg.text}</span>
              </div>
            )}

            {/* Scanner Input Form */}
            <form onSubmit={handleBarcodeScanSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={scannedBarcodeInput}
                  onChange={(e) => setScannedBarcodeInput(e.target.value)}
                  placeholder="Scan barcode with handheld scanner or type and press Enter (e.g. APE-ORD-8821)..."
                  className="w-full h-11 pl-4 pr-12 bg-slate-950/80 border border-amber-500/50 rounded-xl font-mono text-sm tracking-wider text-amber-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Submit
                </button>
              </div>
            </form>

            {/* Recent Scans Strip */}
            {recentScans.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Recent Scans in This Session:
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentScans.map((scan, sIdx) => (
                    <div key={sIdx} className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-[11px] font-mono flex items-center gap-2">
                      <span className="font-bold text-amber-400">{scan.orderNumber}</span>
                      <span className="text-slate-300">{scan.customerName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">{scan.status}</span>
                      <span className="text-slate-500 text-[10px]">{scan.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* 4-STAGE SEQUENTIAL PIPELINE STEPPER                                       */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200">
          {/* Step 1: Unshipped */}
          <button
            onClick={() => { setActiveStage('UNSHIPPED'); setSelectedOrderIds([]); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeStage === 'UNSHIPPED'
                ? 'bg-amber-50 border-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">Stage 1</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                unshippedCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-500'
              }`}>
                {unshippedCount}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" /> Unshipped Orders
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Pending Pick Up Scheduling</div>
          </button>

          {/* Merged Step 2: Ready to Ship (Scheduled + Ready for Handover) */}
          <button
            onClick={() => { setActiveStage('READY_TO_SHIP'); setSelectedOrderIds([]); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeStage === 'READY_TO_SHIP' || activeStage === 'SCHEDULED' || activeStage === 'READY_MANIFEST'
                ? 'bg-blue-50 border-blue-400 text-slate-950 shadow-sm ring-1 ring-blue-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700">Stage 2</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                readyToShipCount > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {readyToShipCount}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" /> Ready to Ship
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Slot Booked · Pack, Label & Ship</div>
          </button>

          {/* Step 3: In Transit */}
          <button
            onClick={() => { setActiveStage('IN_TRANSIT'); setSelectedOrderIds([]); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeStage === 'IN_TRANSIT'
                ? 'bg-purple-50 border-purple-400 text-slate-950 shadow-sm ring-1 ring-purple-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700">Stage 3</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                inTransitCount > 0 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {inTransitCount}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-600" /> Picked Up & In Transit
            </div>
            <div className="text-[11px] text-slate-500 mt-1">En Route to Destination</div>
          </button>

          {/* Step 4: Delivered */}
          <button
            onClick={() => { setActiveStage('DELIVERED'); setSelectedOrderIds([]); }}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeStage === 'DELIVERED'
                ? 'bg-emerald-50 border-emerald-400 text-slate-950 shadow-sm ring-1 ring-emerald-400'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">Stage 4</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                deliveredCount > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {deliveredCount}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Delivered & Done
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Proof of Delivery Received</div>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* CONTROLS BAR: SEARCH, BATCH ACTIONS & SLOTS                                  */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer Name, Pincode, or AWB tracking..."
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
            Showing <strong className="text-slate-900">{currentStageOrders.length}</strong> orders
          </span>
        </div>

        {/* Batch Actions depending on Stage */}
        <div className="flex items-center gap-2">
          {activeStage === 'UNSHIPPED' && (
            <button
              onClick={() => setIsBatchScheduleOpen(true)}
              disabled={selectedOrderIds.length === 0}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Pick Up for Selected ({selectedOrderIds.length})</span>
            </button>
          )}

          {(activeStage === 'READY_TO_SHIP' || activeStage === 'SCHEDULED' || activeStage === 'READY_MANIFEST') && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const ordersToShip = currentStageOrders.filter(o => selectedOrderIds.length === 0 || selectedOrderIds.includes(o.id));
                  ordersToShip.forEach(o => confirmHandoverToCourier(o.id, o.shipments[0]?.packageId || 'PKG-1'));
                  setSelectedOrderIds([]);
                  showToast(`Dispatched and shipped ${ordersToShip.length} order(s) via Priority Express!`, 'success');
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Ship Selected ({selectedOrderIds.length || currentStageOrders.length})</span>
              </button>

              <button
                onClick={() => setManifestModalOrders(currentStageOrders)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 shadow-sm transition-all flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Handover Manifest</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* STAGE ORDERS TABLE                                                           */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-700">
                <th className="p-4 w-12 text-center">
                  <button onClick={handleSelectAll} className="p-1 rounded hover:bg-slate-200 text-slate-700">
                    {selectedOrderIds.length === currentStageOrders.length && currentStageOrders.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-4">Order & Invoice ID</th>
                <th className="p-4">Buyer & Destination</th>
                <th className="p-4">SKU / Item Details</th>
                <th className="p-4 text-center font-bold">Qty</th>
                <th className="p-4 text-right">Order Value & Tax</th>
                <th className="p-4 text-center">Pickup Slot / Courier</th>
                <th className="p-4 text-center">AWB / Status</th>
                <th className="p-4 text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentStageOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-sm text-slate-600">No orders found in {activeStage.replace('_', ' ')} stage</div>
                    <div className="text-xs text-slate-400">New customer orders will automatically appear here for pick-up scheduling.</div>
                  </td>
                </tr>
              ) : (
                currentStageOrders.map((ord) => {
                  const shp = ord.shipments[0];
                  const isSelected = selectedOrderIds.includes(ord.id);

                  return (
                    <tr 
                      key={ord.id} 
                      className={`hover:bg-amber-50/20 transition-colors ${isSelected ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="p-4 text-center">
                        <button onClick={() => handleToggleSelectOrder(ord.id)} className="p-1 rounded hover:bg-slate-200">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="font-mono font-black text-slate-900 text-xs">{ord.orderNumber}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Inv: {ord.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{ord.customerName}</span>
                          {ord.orderType === 'B2B' ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0054A6] text-[9px] font-black border border-blue-200">B2B</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black border border-amber-200">B2C</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{ord.deliveryAddress.city} - <strong className="text-slate-900 font-mono">{ord.deliveryAddress.pincode}</strong></span>
                        </div>
                        {ord.gstin && (
                          <div className="text-[10px] text-emerald-700 font-mono font-bold">GSTIN: {ord.gstin}</div>
                        )}
                      </td>

                      <td className="p-4">
                        {shp?.items.map((item, idx) => (
                          <div key={idx} className="font-bold text-slate-900 leading-snug">
                            {item.productTitle}
                          </div>
                        ))}
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Weight: {shp?.shippingDetail?.weightGrams || 500}g · HSN: {shp?.items[0]?.hsnCode || '73269099'}
                        </div>
                      </td>

                      {/* Dedicated Qty Column right after SKU / Item Details */}
                      <td className="p-4 text-center">
                        {(() => {
                          const totalUnits = shp?.items.reduce((sum, it) => sum + it.quantity, 0) || 0;
                          return (
                            <div className="inline-flex flex-col items-center">
                              <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 font-mono font-black text-sm shadow-2xs">
                                {totalUnits}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                {totalUnits === 1 ? 'Unit' : 'Units'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="p-4 text-right font-mono">
                        <div className="font-black text-slate-900 text-sm">₹{ord.pricingSummary.grandTotal.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-slate-500">Taxable: ₹{ord.pricingSummary.taxableValue.toFixed(2)}</div>
                        <div className="text-[9px] text-emerald-600 font-bold">GST: ₹{ord.pricingSummary.totalTax.toFixed(2)}</div>
                      </td>

                      <td className="p-4 text-center">
                        {shp?.pickupDetail ? (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {shp.pickupDetail.date}
                            </span>
                            <div className="text-[10px] text-slate-700 font-medium">{shp.pickupDetail.slot}</div>
                            <div className="text-[9px] text-slate-500 font-mono">{shp.pickupDetail.courier.split('(')[0]}</div>
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            Pending Scheduling
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="font-mono text-xs font-black text-slate-900">{shp?.shippingDetail?.articleNumber || 'AWB-PENDING'}</div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase mt-1 ${
                          shp?.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-800' :
                          shp?.status === 'PROCESSING_PICK_PACK' ? 'bg-blue-100 text-blue-800' :
                          shp?.status === 'AWB_GENERATED' ? 'bg-indigo-100 text-indigo-800' :
                          shp?.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {shp?.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stage 1: Schedule Pick Up Button */}
                          {activeStage === 'UNSHIPPED' && (
                            <button
                              onClick={() => setScheduleModalOrder(ord)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-sm transition-all hover:scale-105 flex items-center gap-1"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Schedule Pick Up
                            </button>
                          )}

                          {/* Merged Stage 2: Print Label & Invoice + Ship Order */}
                          {(activeStage === 'READY_TO_SHIP' || activeStage === 'SCHEDULED' || activeStage === 'READY_MANIFEST') && (
                            <>
                              <button
                                onClick={() => setPrintingLabelOrder(ord)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 border border-slate-300 shadow-sm transition-all"
                                title="Print 4x6 Thermal Shipping Label"
                              >
                                <Printer className="w-3.5 h-3.5" /> Label
                              </button>
                              <button
                                onClick={() => setPrintingInvoiceOrder(ord)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 border border-slate-300 shadow-sm transition-all"
                                title="Print Statutory GST Tax Invoice"
                              >
                                <FileText className="w-3.5 h-3.5" /> Tax Inv
                              </button>
                              <button
                                onClick={() => {
                                  const awb = shp?.shippingDetail?.articleNumber || 'AWB-PENDING';
                                  confirmHandoverToCourier(ord.id, shp?.packageId || 'PKG-1');
                                  showToast(`Order #${ord.orderNumber} successfully shipped via Priority Express Logistics!`, 'success');
                                  // Trigger WhatsApp tracking alert
                                  msg91OtpService.sendWhatsAppDispatchAlert(
                                    ord.customerPhone,
                                    ord.orderNumber,
                                    awb,
                                    'Priority Express Delivery (Kathwada Hub 382430)',
                                    'https://apolloengineering.co.in/track'
                                  ).catch(() => {});
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-sm transition-all hover:scale-105 flex items-center gap-1.5"
                                title="Ship package & handover to Priority Express courier"
                              >
                                <Truck className="w-3.5 h-3.5" /> Ship Order
                              </button>
                              <a
                                href={msg91OtpService.generateWhatsAppWebUrl(
                                  ord.customerPhone,
                                  `Hello ${ord.customerName}, your Apollo Engineering industrial equipment order #${ord.orderNumber} is packed and ready for dispatch from Kathwada GIDC Hub! Tracking AWB: ${shp?.shippingDetail?.articleNumber || 'In-Process'}. Track live at: https://apolloengineering.co.in/track. Thank you!`
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 shadow-2xs flex items-center gap-1 transition-all"
                                title="Send WhatsApp Tracking Update"
                              >
                                <span>💬 WA</span>
                              </a>
                            </>
                          )}

                          {/* Stage 4: In Transit Tracking */}
                          {activeStage === 'IN_TRANSIT' && (
                            <>
                              <button
                                onClick={() => {
                                  showToast(`Carrier live tracking: AWB ${shp?.shippingDetail?.articleNumber} en route to ${ord.deliveryAddress.city}`, 'info');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs border border-purple-300 flex items-center gap-1"
                              >
                                <Truck className="w-3.5 h-3.5" /> Live Tracking
                              </button>
                              <a
                                href={msg91OtpService.generateWhatsAppWebUrl(
                                  ord.customerPhone,
                                  `Hello ${ord.customerName}, your Apollo Engineering consignment #${ord.orderNumber} is currently in transit with Priority Express Logistics (AWB: ${shp?.shippingDetail?.articleNumber}). Track live: https://apolloengineering.co.in/track`
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 shadow-2xs flex items-center gap-1 transition-all"
                                title="Send Live WhatsApp Tracking to Buyer"
                              >
                                <span>💬 WA</span>
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: SCHEDULE PICK UP (ENTERPRISE LOGISTICS SLOT BOOKING)                 */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {(scheduleModalOrder || isBatchScheduleOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">Schedule Courier Pick Up</h3>
                  <p className="text-xs text-slate-500">
                    {scheduleModalOrder ? `Order #${scheduleModalOrder.orderNumber}` : `Batch scheduling for ${selectedOrderIds.length} orders`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setScheduleModalOrder(null); setIsBatchScheduleOpen(false); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSchedulePickup} className="space-y-4 text-xs">
              {/* Pick-up Hub Notice */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Dispatch Location: Kathwada GIDC Hub (382430)</div>
                  <div className="text-[11px] text-slate-500">Official Priority Express Cargo & Transport Handover Bay</div>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Pick Up Date *
                </label>
                <input
                  type="date"
                  required
                  value={pickupDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Slot Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Pick Up Time Slot *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Morning (10:00 AM – 01:00 PM)',
                    'Afternoon (02:00 PM – 06:00 PM)'
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPickupSlot(slot)}
                      className={`p-3 rounded-xl border text-left font-bold transition-all ${
                        pickupSlot === slot
                          ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 mb-1 text-amber-600" />
                      <div className="text-xs">{slot.split('(')[0]}</div>
                      <div className="text-[10px] text-slate-500 font-normal">({slot.split('(')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Courier Partner Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Carrier / Logistics Partner *
                </label>
                <select
                  value={courierPartner}
                  onChange={(e) => setCourierPartner(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="Priority Express Delivery (Kathwada Hub 382430)">Priority Express Delivery (Kathwada Hub 382430 - Official)</option>
                  <option value="Delhivery B2B Surface Logistics">Delhivery B2B Surface Logistics (Heavy Solar Cargo)</option>
                  <option value="BlueDart Priority Express">BlueDart Priority Express (Air Priority)</option>
                  <option value="Apollo Factory Transport Fleet">Apollo Factory Transport Fleet (Direct GIDC Truck)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setScheduleModalOrder(null); setIsBatchScheduleOpen(false); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Pick Up Slot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: OFFICIAL COURIER HANDOVER MANIFEST                                  */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {manifestModalOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Official Handover Document</div>
                <h3 className="text-lg font-black text-slate-900 font-display">Courier Dispatch Manifest</h3>
                <p className="text-xs text-slate-600">Batch ID: MNF-KATH-{Date.now().toString().slice(-6)} · Date: {new Date().toLocaleDateString('en-IN')}</p>
              </div>
              <button
                onClick={() => setManifestModalOrders(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Manifest Header Details */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <div className="font-bold text-slate-700">Origin Dispatch Hub:</div>
                <div className="text-slate-900 font-semibold">Apollo Engineering Factory Hub</div>
                <div className="text-slate-500 text-[11px]">Kathwada GIDC, Ahmedabad · PIN 382430</div>
                <div className="text-slate-500 text-[11px]">GSTIN: 24AAAPA1234A1Z5</div>
              </div>
              <div>
                <div className="font-bold text-slate-700">Logistics Carrier:</div>
                <div className="text-slate-900 font-semibold">Priority Express Logistics / Nodal Fleet Network</div>
                <div className="text-slate-500 text-[11px]">Total Consignments: {manifestModalOrders.length} Packages</div>
              </div>
            </div>

            {/* Manifest Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Article / AWB Number</th>
                    <th className="p-2.5">Order ID</th>
                    <th className="p-2.5">Recipient Name & Pincode</th>
                    <th className="p-2.5 text-right">Weight (g)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {manifestModalOrders.map((ord, idx) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-700">
                        {ord.shipments[0]?.shippingDetail?.articleNumber || `EK3824300${idx}IN`}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="p-2.5">
                        {ord.customerName} ({ord.deliveryAddress.city} - {ord.deliveryAddress.pincode})
                      </td>
                      <td className="p-2.5 text-right font-mono">{ord.shipments[0]?.shippingDetail?.weightGrams || 500}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures Section */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs">
              <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center">
                <div className="h-12" />
                <div className="font-bold text-slate-900">Courier Pickup Agent Signature</div>
                <div className="text-[10px] text-slate-500">Name, Mobile & Handover Timestamp</div>
              </div>
              <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center">
                <div className="h-12" />
                <div className="font-bold text-slate-900">Apollo Factory Dispatch Officer</div>
                <div className="text-[10px] text-slate-500">Kathwada GIDC Hub · Security Stamp</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Manifest
              </button>
              <button
                onClick={() => {
                  manifestModalOrders.forEach(o => confirmHandoverToCourier(o.id, o.shipments[0]?.packageId || 'PKG-1'));
                  setManifestModalOrders(null);
                  showToast('Handover confirmed! All packages moved to In-Transit stage.', 'success');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm Courier Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* LABEL & INVOICE PRINT MODALS (MATCHED TO UPLOADED PDF SPECIFICATIONS)        */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {printingLabelOrder && (
        <StandardThermalShippingLabel
          order={printingLabelOrder}
          onClose={() => setPrintingLabelOrder(null)}
        />
      )}

      {printingInvoiceOrder && (
        <StandardTaxInvoice
          order={printingInvoiceOrder}
          onClose={() => setPrintingInvoiceOrder(null)}
        />
      )}
    </div>
  );
};
