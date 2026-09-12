import React, { useRef, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { Order } from '../../types';

interface StandardThermalShippingLabelProps {
  order: Order;
  onClose: () => void;
}

/* ═══ Code 128-B SVG Barcode (scannable) ═══ */
const C128 = ["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];

const Code128Barcode: React.FC<{ text: string; id?: string }> = ({ text, id }) => {
  const codes = [104, ...[...text].map(ch => ch.charCodeAt(0) - 32)];
  let sum = 104;
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103, 106);
  let x = 0;
  const rects: React.ReactNode[] = [];
  codes.forEach((code, ci) => {
    [...C128[code]].forEach((ww, i) => {
      const width = +ww;
      if (i % 2 === 0) rects.push(<rect key={`${ci}-${i}`} x={x} y={0} width={width} height={55} fill="#000" />);
      x += width;
    });
  });
  return (
    <svg id={id} viewBox={`0 0 ${x} 55`} role="img" aria-label="AWB barcode" style={{ display: 'block', width: '48.5mm', height: '15.3mm', margin: '0 auto' }}>
      {rects}
    </svg>
  );
};

/* ═══ 2D Carrier Sorting Quadrant ═══ */
const MatrixCanvas: React.FC<{ value: string; salt: number }> = ({ value, salt }) => {
  const quadrantNames = ['HUB-01', 'SORT-SEC', 'DEST-PIN', 'ROUTE-QC'];
  const name = quadrantNames[salt] || `QUAD-${salt + 1}`;
  return (
    <div
      style={{
        width: '17.8mm',
        height: '17.8mm',
        border: '.25mm solid #000',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1mm',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
      title="Courier 2D Barcode: Official carrier dispatch API integration required"
    >
      <div style={{ fontSize: '4.2pt', fontWeight: 900, color: '#000', letterSpacing: '.05mm' }}>
        {name}
      </div>
      <div style={{ fontSize: '3.4pt', fontWeight: 700, color: '#444', marginTop: '.8mm', lineHeight: 1.1 }}>
        COURIER 2D
      </div>
      <div style={{ fontSize: '3pt', color: '#666', marginTop: '.5mm' }}>
        UNAVAILABLE
      </div>
    </div>
  );
};

/* ═══ MAIN A6 THERMAL SHIPPING LABEL (104mm × 148mm) ═══ */
export const StandardThermalShippingLabel: React.FC<StandardThermalShippingLabelProps> = ({ order, onClose }) => {
  const shipment = order.shipments?.[0];
  const sd = shipment?.shippingDetail;
  const rawAwb = sd?.articleNumber || order.orderNumber.replace(/\D/g, '').padStart(9, '3') || '632430019';
  const awb = rawAwb.startsWith('EK') ? rawAwb : `EK${rawAwb}IN`;

  const recipient = order.deliveryAddress?.fullName || order.customerName || 'Amit Shah';
  const address = [
    [order.deliveryAddress?.flatBuilding, order.deliveryAddress?.streetArea].filter(Boolean).join(', ') || '12, Alkapuri Arcade, R.C. Dutt Road',
    `${order.deliveryAddress?.city || 'Vadodara'} ${order.deliveryAddress?.pincode || '390007'}`,
    (order.deliveryAddress?.state || 'GUJARAT').toUpperCase(),
    `Landmark: ${order.deliveryAddress?.landmark || 'Near Railway Station'}`,
  ];
  const orderId = order.orderNumber || 'APE-ORD-3819';
  const invoice = order.invoiceNumber || `INV-${new Date(order.createdAt).getFullYear()}-${order.id?.slice(-4).padStart(4, '0') || '0019'}`;
  const dt = new Date(order.createdAt);
  const shipDate = dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const shortDate = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
  const invoiceDate = `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}-${dt.getFullYear()}`;
  const weight = `${((sd?.weightGrams || 1800) / 1000).toFixed(2)} kgs`;
  const prepaid = order.paymentDetail?.paymentStatus === 'PAID' || order.orderType === 'B2B' || !order.paymentDetail?.method?.toLowerCase().includes('cod');
  const payment = prepaid ? 'PREPAID' : 'COD';
  const parcel = 'BOX 1 of 1';
  const it0 = shipment?.items?.[0]?.productTitle || 'SOLAR_HARDWARE';
  const itemType = it0.toLowerCase().includes('sprinkler') ? 'SOLAR_SPRINKLER' : it0.toLowerCase().includes('clip') ? 'DRAIN_CLIP' : 'SOLAR_PANEL';
  const state = (order.deliveryAddress?.state || 'GUJARAT').toUpperCase();
  const service = state.includes('MAHARASHTRA') ? 'BOM' : state.includes('UTTAR') ? 'UPCA' : state.includes('RAJASTHAN') ? 'JAI' : state.includes('DELHI') ? 'DEL' : state.includes('GUJARAT') ? 'SUR' : 'SUR';
  const verticalCode = `FD${rawAwb.replace(/\D/g, '').slice(-4).padStart(4, '0')}R`;
  const station = 'GNNQ';
  const sector = 'S-01';
  const sortZone = 'GNNQ';

  const matrixPayloads = [
    `APE|${awb}|01`,
    `APE|${orderId.replace('APE-', '')}|02`,
    `APE|${station}|${sector}|03`,
    `APE|${itemType}|04`
  ];

  const sortData = [
    { top: 'GNNH', tag: 'A', rest: '004' },
    { top: 'MAMA', tag: '3', rest: 'C1W' },
    { top: 'NCRU', tag: 'B', rest: 'BB#' },
    { top: 'MIXD', tag: 'R', rest: '2C5' },
    { top: service, tag: '', rest: '' },
  ];

  const shipFrom = 'NILESHKUMAR BHARATBHAI PATEL';
  const returnAddress = 'UNIT NO.FF/B/111, SHREEHARI INDUSTRIAL PARK/ESTATE, NEAR HINGLAJ MATAJI MANDIR, Ahmedabad Ahmedabad GUJARAT 382430 India';
  const seller = 'NILESHKUMAR\nBHARATBHAI\nPATEL';
  const gstin = '24DDPPS7036E1ZG';
  const soldOn = 'Sold on: www.apolloengineering.co.in';

  const B = '.38mm solid #000';
  const B_INV = '.25mm solid #111';
  const BG = '.2mm solid #777';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-100 border border-slate-300 rounded-3xl w-full max-w-[120mm] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Action Header */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs font-mono">A6</div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Apollo A6 Shipping Label</h3>
              <p className="text-[10px] text-slate-500 font-mono">AWB: <strong>{awb}</strong> (104 × 148 mm)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print A6 Label
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with exact 104mm × 148mm label preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center bg-[#e9edf2]">
          <main
            id="thermal-shipping-label"
            style={{
              position: 'relative',
              width: '104mm',
              height: '148mm',
              margin: '0 auto 10px',
              padding: '7mm 4.5mm 2mm',
              overflow: 'hidden',
              backgroundColor: '#fff',
              fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
              fontSize: '5.8pt',
              lineHeight: 1.08,
              color: '#000',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Grid: Barcode/Address (50.5mm) | Center Boxes (19.5mm) | Vertical Code (22mm) — Height 66.5mm */}
            <section style={{ display: 'grid', gridTemplateColumns: '50.5mm 19.5mm 22mm', columnGap: '1.5mm', height: '66.5mm' }}>
              <div>
                <div style={{ width: '50.5mm', height: '29.5mm', paddingTop: '9mm', textAlign: 'center' }}>
                  <Code128Barcode text={awb} id="awbBarcode" />
                  <div style={{ marginTop: '.3mm', fontSize: '6.4pt', fontWeight: 900, letterSpacing: '.02mm' }}>AWB {awb}</div>
                </div>
                <div style={{ marginTop: '1.2mm', fontSize: '6.6pt', fontWeight: 900 }}>Ship To:</div>
                <div style={{ marginTop: '1.2mm', fontSize: '6.65pt', fontWeight: 600, lineHeight: 1.17, whiteSpace: 'pre-line' }}>
                  {[recipient, ...address].join('\n')}
                </div>
                <div style={{ marginTop: '3mm', fontSize: '6pt', fontWeight: 800, lineHeight: 1.16, whiteSpace: 'pre-line' }}>
                  {`Order Id: ${orderId}\nShip Date: ${shipDate}`}
                </div>
              </div>

              {/* Center Boxes + Route Strip */}
              <div style={{ width: '19.5mm' }}>
                <div style={{ border: B, display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'center', textAlign: 'center', fontWeight: 900, height: '9.4mm', fontSize: '12.5pt' }}>{service}</div>
                <div style={{ border: B, display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'center', textAlign: 'center', fontWeight: 900, height: '5.1mm', marginTop: '.6mm', fontSize: '7.2pt' }}>{weight}</div>
                <div style={{ border: B, height: '5.1mm', marginTop: '.75mm' }}></div>
                <div style={{ border: B, display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'center', textAlign: 'center', fontWeight: 900, height: '8.6mm', marginTop: '.8mm', fontSize: '11pt' }}>{shortDate}</div>
                <div style={{ border: B, display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'center', textAlign: 'center', fontWeight: 900, height: '8.6mm', marginTop: '.8mm', padding: '0 .6mm', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '10.2pt', letterSpacing: '-.18mm' }}>{payment}</div>
                <div style={{ border: B, display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'center', textAlign: 'center', fontWeight: 900, height: '7.5mm', marginTop: '.8mm', fontSize: '6.3pt' }}>{parcel}</div>

                {/* Route strip: extends across centre + right columns */}
                <div style={{ position: 'relative', zIndex: 3, width: '43mm', height: '9.1mm', marginTop: '.6mm', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#fff' }}>
                  <div style={{ border: B, borderRight: 0, textAlign: 'center', fontWeight: 900, overflow: 'hidden' }}>
                    <small style={{ display: 'block', height: '2.8mm', paddingTop: '.5mm', fontSize: '3.15pt', whiteSpace: 'nowrap' }}>DELIVERY STATION</small>
                    <strong style={{ display: 'block', padding: '0 .35mm', fontSize: '9.2pt', lineHeight: '5.4mm', letterSpacing: '-.12mm', whiteSpace: 'nowrap' }}>{station}</strong>
                  </div>
                  <div style={{ border: B, borderRight: 0, textAlign: 'center', fontWeight: 900, overflow: 'hidden', color: '#fff', background: '#000' }}>
                    <small style={{ display: 'block', height: '2.8mm', paddingTop: '.5mm', fontSize: '3.15pt', whiteSpace: 'nowrap' }}>SECTOR</small>
                    <strong style={{ display: 'block', padding: '0 .35mm', fontSize: '9.2pt', lineHeight: '5.4mm', letterSpacing: '-.12mm', whiteSpace: 'nowrap' }}>{sector}</strong>
                  </div>
                  <div style={{ border: B, textAlign: 'center', fontWeight: 900, overflow: 'hidden' }}>
                    <small style={{ display: 'block', height: '2.8mm', paddingTop: '.5mm', fontSize: '3.15pt', whiteSpace: 'nowrap' }}>SORTZONE</small>
                    <strong style={{ display: 'block', padding: '0 .35mm', fontSize: '9.2pt', lineHeight: '5.4mm', letterSpacing: '-.12mm', whiteSpace: 'nowrap' }}>{sortZone}</strong>
                  </div>
                </div>
              </div>

              {/* Vertical code */}
              <div>
                <div style={{ height: '28mm', margin: '16mm auto 0', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 900, fontSize: '5pt', letterSpacing: '.2mm', textAlign: 'center' }}>
                  {verticalCode}
                </div>
              </div>
            </section>

            {/* Matrix row */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 17.8mm)', gap: '4.6mm', padding: '1.5mm 5mm 1.9mm', borderBottom: BG }}>
              {matrixPayloads.map((val, i) => (
                <MatrixCanvas key={i} value={val} salt={i} />
              ))}
            </section>

            {/* Ship From */}
            <section style={{ padding: '.8mm .4mm .6mm', minHeight: '8.5mm', borderBottom: BG, fontSize: '5.6pt', fontWeight: 600, lineHeight: 1.15 }}>
              <b>Ship From: {shipFrom}</b><br />
              Return Address: {returnAddress}
            </section>

            {/* Customer Declaration */}
            <section style={{ padding: '.4mm .5mm', textAlign: 'center', borderBottom: BG, fontSize: '4.45pt', fontWeight: 600, lineHeight: 1.12 }}>
              Customer Self Declaration : The goods sold are intended for end user consumption. Not for resale.
            </section>

            {/* Invoice Table */}
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ border: B_INV, padding: '.45mm .65mm', height: '4.6mm', background: '#f4f4f4', fontSize: '5.9pt', fontWeight: 900, letterSpacing: '.05mm', textAlign: 'center', width: '4mm' }}>#</th>
                  <th style={{ border: B_INV, padding: '.45mm .65mm', height: '4.6mm', background: '#f4f4f4', fontSize: '5.9pt', fontWeight: 900, letterSpacing: '.05mm', textAlign: 'center', width: '19mm' }}>SELLER</th>
                  <th style={{ border: B_INV, padding: '.45mm .65mm', height: '4.6mm', background: '#f4f4f4', fontSize: '5.9pt', fontWeight: 900, letterSpacing: '.05mm', textAlign: 'center', width: '21mm' }}>GSTIN</th>
                  <th style={{ border: B_INV, padding: '.45mm .65mm', height: '4.6mm', background: '#f4f4f4', fontSize: '5.9pt', fontWeight: 900, letterSpacing: '.05mm', textAlign: 'center', width: '19mm' }}>INVOICE</th>
                  <th style={{ border: B_INV, padding: '.45mm .65mm', height: '4.6mm', background: '#f4f4f4', fontSize: '5.9pt', fontWeight: 900, letterSpacing: '.05mm', textAlign: 'center', width: '15mm' }}>DATE</th>
                  <th style={{ border: B_INV, padding: '.45mm .65mm', height: '4.6mm', background: '#f4f4f4', fontSize: '5.9pt', fontWeight: 900, letterSpacing: '.05mm', textAlign: 'center' }}>ITEM TYPE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: B_INV, height: '9.3mm', padding: '.6mm .7mm', fontSize: '5.05pt', fontWeight: 600, lineHeight: 1.14, overflow: 'hidden', verticalAlign: 'top' }}>1<br />1</td>
                  <td style={{ border: B_INV, height: '9.3mm', padding: '.6mm .7mm', fontSize: '5.05pt', fontWeight: 600, lineHeight: 1.14, overflow: 'hidden', verticalAlign: 'top', whiteSpace: 'pre-line' }}>{seller}</td>
                  <td style={{ border: B_INV, height: '9.3mm', padding: '.6mm .7mm', fontSize: '4.45pt', fontWeight: 700, letterSpacing: '-.07mm', whiteSpace: 'nowrap', lineHeight: 1.14, overflow: 'hidden', verticalAlign: 'top' }}>{gstin}</td>
                  <td style={{ border: B_INV, height: '9.3mm', padding: '.6mm .7mm', fontSize: '4.45pt', fontWeight: 700, letterSpacing: '-.07mm', whiteSpace: 'nowrap', lineHeight: 1.14, overflow: 'hidden', verticalAlign: 'top' }}>{invoice}</td>
                  <td style={{ border: B_INV, height: '9.3mm', padding: '.6mm .7mm', fontSize: '4.45pt', fontWeight: 700, letterSpacing: '-.07mm', whiteSpace: 'nowrap', lineHeight: 1.14, overflow: 'hidden', verticalAlign: 'top' }}>{invoiceDate}</td>
                  <td style={{ border: B_INV, height: '9.3mm', padding: '.6mm .7mm', fontSize: '5.05pt', fontWeight: 600, lineHeight: 1.14, overflow: 'hidden', verticalAlign: 'top' }}>{itemType}</td>
                </tr>
              </tbody>
            </table>

            {/* Bottom Sort Grid */}
            <section style={{ display: 'block', marginTop: '1.2mm' }}>
              <div>
                <div style={{ display: 'grid', width: '100%', gridTemplateColumns: 'repeat(5, 1fr)', border: '.4mm solid #000' }}>
                  {sortData.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        height: '18.5mm',
                        borderRight: i < 4 ? '.35mm solid #000' : '0',
                        padding: '1mm .75mm',
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '10pt',
                        letterSpacing: '-.08mm',
                        overflow: 'hidden',
                      }}
                    >
                      {s.top}
                      <span style={{ display: 'block', marginTop: '2.4mm', fontSize: '9.2pt', lineHeight: 1.02 }}>
                        {s.tag && (
                          <b style={{ display: 'inline-block', minWidth: '4.2mm', padding: '.4mm .55mm', marginRight: '.5mm', color: '#fff', background: '#000', textAlign: 'center' }}>
                            {s.tag}
                          </b>
                        )}
                        {s.rest}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Absolute Sold-On Label */}
              <div
                style={{
                  position: 'absolute',
                  zIndex: 6,
                  left: '4.5mm',
                  bottom: '4mm',
                  margin: 0,
                  paddingRight: '1mm',
                  backgroundColor: '#fff',
                  fontSize: '4.5pt',
                  lineHeight: '2.2mm',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {soldOn}
              </div>

              {/* Authentic Apollo Engineering Lion Logo */}
              <div
                style={{
                  position: 'absolute',
                  zIndex: 5,
                  top: '7mm',
                  left: '4.5mm',
                  width: '22mm',
                  height: '8mm',
                  margin: 0,
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <img
                  src="/logo.webp"
                  alt="Apollo Engineering"
                  style={{
                    height: '8mm',
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Print: Exact 104mm × 148mm thermal page */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: 104mm 148mm; margin: 0; }
          html, body {
            width: 104mm!important;
            height: 148mm!important;
            margin: 0!important;
            padding: 0!important;
            overflow: hidden!important;
            background: #fff!important;
          }
          body * { visibility: hidden!important; }
          #thermal-shipping-label, #thermal-shipping-label * { visibility: visible!important; }
          #thermal-shipping-label {
            position: fixed!important;
            left: 0!important;
            top: 0!important;
            width: 104mm!important;
            height: 148mm!important;
            max-height: 148mm!important;
            margin: 0!important;
            padding: 7mm 4.5mm 2mm!important;
            border: none!important;
            box-shadow: none!important;
            box-sizing: border-box!important;
            overflow: hidden!important;
            background: #fff!important;
            -webkit-print-color-adjust: exact!important;
            print-color-adjust: exact!important;
            break-after: page!important;
          }
        }
      `}} />
    </div>
  );
};
