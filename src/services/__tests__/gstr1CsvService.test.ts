import { describe, it, expect } from 'vitest';
import { 
  parseGstr1Csv, 
  tokenizeCsvLine, 
  reconcileGstr1WithOrders, 
  generateGstr1CsvFromOrders,
  filterOrdersByPeriod,
  filterOrdersByDateRange,
  getGstr1Table4Rows,
  getGstr1Table7Rows,
  generateB2bInvoicesCsv,
  generateB2cSuppliesCsv,
  generateGstr1Hsn12Csv,
  generateGstr1DeepComprehensiveCsv,
  generateGstr1MultiSheetExcel,
  generateB2bExcel,
  generateB2cExcel,
  generateHsn12Excel,
  generateDocIssueExcel,
  generateAllOrdersExcel,
  generateAllDetailsExcel,
  generateShippingLogisticsExcel,
  generateTaxSummaryExcel,
  SAMPLE_GSTR1_CSV 
} from '../gstr1CsvService';
import ExcelJS from 'exceljs';
import { Order } from '../../types';

describe('GSTR-1 Statutory CSV Parser & Auditor Service', () => {
  it('tokenizes standard CSV lines with quotes, commas and spaces correctly', () => {
    const line = '24AABCS1429B1Z1,"SunShine Solar, EPC Ltd",INV-2026-08822,2026-09-11,6375.00';
    const tokens = tokenizeCsvLine(line);
    expect(tokens).toEqual([
      '24AABCS1429B1Z1',
      'SunShine Solar, EPC Ltd',
      'INV-2026-08822',
      '2026-09-11',
      '6375.00'
    ]);
  });

  it('tokenizes escaped quotes ("") correctly within quoted values', () => {
    const line = '73269099,"SS304 Solar ""Heavy-Duty"" Clips",PCS,600,18375.00';
    const tokens = tokenizeCsvLine(line);
    expect(tokens[1]).toBe('SS304 Solar "Heavy-Duty" Clips');
  });

  it('accurately parses the exact user statutory sample CSV', () => {
    const result = parseGstr1Csv(SAMPLE_GSTR1_CSV);

    expect(result.validationErrors).toHaveLength(0);
    expect(result.headerTitle).toContain('GSTR-1 STATUTORY EXPORT');

    // Table 4: B2B Registered Outward Supplies
    expect(result.table4).toHaveLength(2);
    expect(result.table4[0].gstin).toBe('24AABCS1429B1Z1');
    expect(result.table4[0].receiverName).toBe('SunShine Solar EPC Ltd');
    expect(result.table4[0].invoiceNumber).toBe('INV-2026-08822');
    expect(result.table4[0].invoiceValue).toBe(6375.00);
    expect(result.table4[0].taxableValue).toBe(5402.54);
    expect(result.table4[0].cgst).toBe(486.23);
    expect(result.table4[0].sgst).toBe(486.23);
    expect(result.table4[0].igst).toBe(0.00);

    expect(result.table4[1].gstin).toBe('24AAACG1111A1Z9');
    expect(result.table4[1].receiverName).toBe('Gujarat Green Power Infra');
    expect(result.table4[1].invoiceNumber).toBe('INV-2026-08815');
    expect(result.table4[1].invoiceValue).toBe(12000.00);
    expect(result.table4[1].taxableValue).toBe(10169.49);
    expect(result.table4[1].cgst).toBe(915.25);
    expect(result.table4[1].sgst).toBe(915.25);

    // Table 7: B2C Others
    expect(result.table7).toHaveLength(1);
    expect(result.table7[0].type).toBe('OE');
    expect(result.table7[0].placeOfSupply).toBe('24-Gujarat');
    expect(result.table7[0].taxableValue).toBe(2423.73);
    expect(result.table7[0].centralTax).toBe(218.14);
    expect(result.table7[0].stateUtTax).toBe(218.14);
    expect(result.table7[0].integratedTax).toBe(0.00);

    // Table 12: HSN Summary
    expect(result.table12).toHaveLength(3);
    expect(result.table12[0].hsn).toBe('73269099');
    expect(result.table12[0].description).toBe('SS304 Solar Drain Water Clips & Fasteners');
    expect(result.table12[0].totalQuantity).toBe(600);
    expect(result.table12[0].totalValue).toBe(18375.00);
    expect(result.table12[0].taxableValue).toBe(967.11);
    expect(result.table12[0].integratedTax).toBe(174.08);

    expect(result.table12[1].hsn).toBe('84248990');
    expect(result.table12[1].description).toBe('SS304 Solar Cleaning Sprinklers & Nozzles');
    expect(result.table12[1].totalQuantity).toBe(13);
    expect(result.table12[1].totalValue).toBe(2860.00);
    expect(result.table12[1].taxableValue).toBe(150.53);

    // Summary calculations
    expect(result.summary.totalB2bInvoices).toBe(2);
    expect(result.summary.totalB2bValue).toBe(18375.00);
    expect(result.summary.totalB2bTaxable).toBe(15572.03);
    expect(result.summary.totalB2cTaxable).toBe(2423.73);
    expect(result.summary.totalTaxable).toBe(17995.76);
    expect(result.summary.totalCgst).toBe(1619.62); // 486.23 + 915.25 + 218.14
    expect(result.summary.totalSgst).toBe(1619.62);
  });

  it('handles empty input gracefully', () => {
    const result = parseGstr1Csv('');
    expect(result.validationErrors).toContain('The uploaded CSV file is empty.');
    expect(result.table4).toHaveLength(0);
  });

  it('reconciles parsed CSV with live store orders', () => {
    const parsed = parseGstr1Csv(SAMPLE_GSTR1_CSV);
    const mockOrders: Partial<Order>[] = [
      {
        id: 'ord_1',
        invoiceNumber: 'INV-2026-08822',
        orderNumber: 'APL-8822',
        orderType: 'B2B',
        customerName: 'SunShine Solar EPC Ltd',
        pricingSummary: {
          grandTotal: 6375.00,
          subtotal: 5402.54,
          taxableValue: 5402.54,
          cgstAmount: 486.23,
          sgstAmount: 486.23,
          igstAmount: 0,
          totalTax: 972.46,
          shippingTotal: 0,
          shippingGst: 0,
          discountAmount: 0
        } as any
      },
      {
        id: 'ord_2',
        invoiceNumber: 'INV-2026-99999',
        orderNumber: 'APL-9999',
        orderType: 'B2B',
        customerName: 'Unlisted EPC Partner',
        pricingSummary: {
          grandTotal: 4500.00,
          subtotal: 3813.56,
          taxableValue: 3813.56,
          cgstAmount: 343.22,
          sgstAmount: 343.22,
          igstAmount: 0,
          totalTax: 686.44,
          shippingTotal: 0,
          shippingGst: 0,
          discountAmount: 0
        } as any
      }
    ];

    const reconciled = reconcileGstr1WithOrders(parsed.table4, mockOrders as Order[]);
    
    // INV-2026-08822 matches exactly
    const match1 = reconciled.find(r => r.invoiceNumber === 'INV-2026-08822');
    expect(match1).toBeDefined();
    expect(match1?.matchStatus).toBe('EXACT_MATCH');
    expect(match1?.amountDifference).toBe(0);

    // INV-2026-08815 is in CSV only
    const match2 = reconciled.find(r => r.invoiceNumber === 'INV-2026-08815');
    expect(match2).toBeDefined();
    expect(match2?.matchStatus).toBe('CSV_ONLY');

    // INV-2026-99999 is in Store only
    const match3 = reconciled.find(r => r.invoiceNumber === 'INV-2026-99999');
    expect(match3).toBeDefined();
    expect(match3?.matchStatus).toBe('STORE_ONLY');
  });

  it('generates CSV from orders and parses it back losslessly (round-trip test)', () => {
    const mockOrders: Partial<Order>[] = [
      {
        id: 'ord_roundtrip',
        invoiceNumber: 'INV-2026-0001',
        orderNumber: 'APL-0001',
        orderType: 'B2B',
        customerName: 'Reliance Solar Infra',
        deliveryAddress: {
          fullName: 'Reliance Solar Infra',
          gstin: '24AAACR1234A1Z5',
          state: 'Gujarat',
          stateCode: '24',
          streetArea: 'Sector 25, Gandhinagar',
          pincode: '382025',
          city: 'Gandhinagar',
          phone: '9876543210'
        } as any,
        createdAt: '2026-09-11T10:00:00Z',
        pricingSummary: {
          grandTotal: 11800.00,
          taxableValue: 10000.00,
          cgstAmount: 900.00,
          sgstAmount: 900.00,
          igstAmount: 0.00
        } as any,
        shipments: [
          {
            items: [
              {
                productTitle: 'SS304 Solar Drain Water Clips 35mm',
                hsnCode: '73269099',
                unitOfMeasure: 'PCS',
                quantity: 400,
                unitPrice: 25,
                gstRate: 0.18
              }
            ]
          } as any
        ]
      }
    ];

    const generatedCsv = generateGstr1CsvFromOrders(mockOrders as Order[]);
    expect(generatedCsv).toContain('=== GSTR-1 STATUTORY EXPORT - APOLLO ENGINEERING (382430 KATHWADA GIDC) ===');
    expect(generatedCsv).toContain('--- Table 4: Taxable outward supplies to registered persons (B2B) ---');
    expect(generatedCsv).toContain('24AAACR1234A1Z5,"Reliance Solar Infra",INV-2026-0001,2026-09-11,11800.00,24,N,100%,Regular,18%,10000.00,900.00,900.00,0.00');

    // Parse back
    const parsed = parseGstr1Csv(generatedCsv);
    expect(parsed.table4).toHaveLength(1);
    expect(parsed.table4[0].gstin).toBe('24AAACR1234A1Z5');
    expect(parsed.table4[0].invoiceValue).toBe(11800.00);
    expect(parsed.table4[0].taxableValue).toBe(10000.00);
  });

  it('filters orders accurately across Day, This Month, Last Month, and Year periods', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();

    const sampleOrders: Partial<Order>[] = [
      {
        id: 'ord_today',
        createdAt: `${todayStr}T10:00:00Z`
      },
      {
        id: 'ord_last_month',
        createdAt: lastMonthDate
      }
    ];

    const dayOrders = filterOrdersByPeriod(sampleOrders as Order[], 'DAY', todayStr);
    expect(dayOrders).toHaveLength(1);
    expect(dayOrders[0].id).toBe('ord_today');

    const lastMonthOrders = filterOrdersByPeriod(sampleOrders as Order[], 'LAST_MONTH');
    expect(lastMonthOrders).toHaveLength(1);
    expect(lastMonthOrders[0].id).toBe('ord_last_month');
  });

  it('generates exact Summary For HSN(12) CSV matching user statutory format', () => {
    const mockOrders: Partial<Order>[] = [
      {
        id: 'ord_hsn_1',
        createdAt: '2026-09-11T12:00:00Z',
        deliveryAddress: { state: 'Gujarat', stateCode: '24' } as any,
        pricingSummary: {
          grandTotal: 25756.86,
          taxableValue: 21827.85,
          shippingTotal: 5096.18,
          cgstAmount: 519.01,
          sgstAmount: 519.01,
          igstAmount: 0
        } as any,
        shipments: [
          {
            items: [
              {
                productTitle: 'SS304 Solar Drain Water Clips & Fasteners',
                hsnCode: '73269099',
                quantity: 1327,
                unitPrice: 19.41,
                gstRate: 0.18
              }
            ]
          } as any
        ]
      }
    ];

    const csv = generateGstr1Hsn12Csv(mockOrders as Order[]);

    // Line 1: Header banner
    expect(csv).toContain('Summary For HSN(12),,,,,,,,,,,,,');

    // Line 2: Headers
    expect(csv).toContain('No. of HSN,,,,Total Value,,Total Taxable Value,Total Integrated Tax,Total Central Tax,Total State/UT Tax,Total Cess,,,');

    // Line 4: HSN Columns
    expect(csv).toContain('HSN,Description,UQC,Total Quantity,Total Value,Rate,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount,,,');

    // Row: 7326
    expect(csv).toContain('7326,,PCS-PIECES,1327,');

    // Row: NA-NOT APPLICABLE for Shipping
    expect(csv).toContain(',,NA-NOT APPLICABLE,0,');
  });

  it('filters orders by arbitrary date range inclusive of bounds', () => {
    const orders: Partial<Order>[] = [
      { id: 'o1', createdAt: '2026-09-01T08:00:00Z' },
      { id: 'o2', createdAt: '2026-09-05T14:30:00Z' },
      { id: 'o3', createdAt: '2026-09-10T18:00:00Z' },
      { id: 'o4', createdAt: '2026-09-15T11:00:00Z' },
    ];

    const res1 = filterOrdersByDateRange(orders as Order[], '2026-09-05', '2026-09-10');
    expect(res1).toHaveLength(2);
    expect(res1.map(o => o.id)).toEqual(['o2', 'o3']);

    const res2 = filterOrdersByDateRange(orders as Order[], '2026-09-11', '2026-09-20');
    expect(res2).toHaveLength(1);
    expect(res2[0].id).toBe('o4');

    const resAll = filterOrdersByDateRange(orders as Order[]);
    expect(resAll).toHaveLength(4);
  });

  it('extracts Table 4 B2B invoices and Table 7 B2C supplies cleanly', () => {
    const mixedOrders: Partial<Order>[] = [
      {
        id: 'ord_b2b_1',
        orderType: 'B2B',
        invoiceNumber: 'INV-B2B-101',
        createdAt: '2026-09-11T10:00:00Z',
        customerName: 'Adani Solar Park',
        deliveryAddress: {
          fullName: 'Adani Solar Park',
          gstin: '24AAACA0000A1Z5',
          state: 'Gujarat',
          stateCode: '24'
        } as any,
        pricingSummary: {
          grandTotal: 11800.00,
          taxableValue: 10000.00,
          cgstAmount: 900.00,
          sgstAmount: 900.00,
          igstAmount: 0.00
        } as any
      },
      {
        id: 'ord_b2c_1',
        orderType: 'B2C',
        invoiceNumber: 'INV-B2C-201',
        createdAt: '2026-09-11T11:00:00Z',
        customerName: 'Rohit Patel',
        deliveryAddress: {
          fullName: 'Rohit Patel',
          state: 'Maharashtra',
          stateCode: '27'
        } as any,
        pricingSummary: {
          grandTotal: 2360.00,
          taxableValue: 2000.00,
          cgstAmount: 0.00,
          sgstAmount: 0.00,
          igstAmount: 360.00
        } as any
      }
    ];

    const b2bRows = getGstr1Table4Rows(mixedOrders as Order[]);
    expect(b2bRows).toHaveLength(1);
    expect(b2bRows[0].gstin).toBe('24AAACA0000A1Z5');
    expect(b2bRows[0].invoiceValue).toBe(11800.00);
    expect(b2bRows[0].cgst).toBe(900.00);

    const b2cRows = getGstr1Table7Rows(mixedOrders as Order[]);
    expect(b2cRows).toHaveLength(1);
    expect(b2cRows[0].placeOfSupply).toContain('27-Maharashtra');
    expect(b2cRows[0].taxableValue).toBe(2000.00);
    expect(b2cRows[0].integratedTax).toBe(360.00);

    const b2bCsv = generateB2bInvoicesCsv(mixedOrders as Order[]);
    expect(b2bCsv).toContain('24AAACA0000A1Z5,"Adani Solar Park",INV-B2B-101');

    const b2cCsv = generateB2cSuppliesCsv(mixedOrders as Order[]);
    expect(b2cCsv).toContain('OE,27-Maharashtra,100%,18%,2000.00,360.00,0.00,0.00,0.00');
  });

  it('generates Deep Comprehensive Master GSTR-1 CSV containing all 4 sections with deep line items', () => {
    const deepOrders: Partial<Order>[] = [
      {
        id: 'ord_deep_1',
        orderNumber: 'APL-DP-100',
        invoiceNumber: 'INV-2026-DP100',
        createdAt: '2026-09-11T12:00:00Z',
        customerName: 'Tata Power Renewable EPC',
        customerPhone: '9825012345',
        customerEmail: 'procurement@tatapower.com',
        orderType: 'B2B',
        deliveryAddress: {
          fullName: 'Tata Power Renewable EPC',
          phone: '9825012345',
          gstin: '24AAACT1234A1Z1',
          state: 'Gujarat',
          stateCode: '24'
        } as any,
        pricingSummary: {
          grandTotal: 14160.00,
          taxableValue: 12000.00,
          cgstAmount: 1080.00,
          sgstAmount: 1080.00,
          igstAmount: 0.00,
          shippingTotal: 590.00
        } as any,
        paymentDetail: {
          method: 'UPI',
          paymentStatus: 'PAID'
        } as any,
        shipments: [
          {
            items: [
              {
                productTitle: 'SS304 Solar Drain Water Clips 35mm',
                hsnCode: '73269099',
                unitOfMeasure: 'PCS',
                quantity: 500,
                unitPrice: 24.00,
                gstRate: 0.18
              }
            ]
          } as any
        ]
      }
    ];

    const deepCsv = generateGstr1DeepComprehensiveCsv(deepOrders as Order[], '2026-09-01', '2026-09-11');

    // Section 1: HSN(12)
    expect(deepCsv).toContain('SECTION 1: SUMMARY FOR HSN(12)');
    expect(deepCsv).toContain('Summary For HSN(12),,,,,,,,,,,,,');

    // Section 2: Table 4 B2B
    expect(deepCsv).toContain('SECTION 2: TABLE 4 - TAXABLE OUTWARD SUPPLIES TO REGISTERED PERSONS (B2B)');
    expect(deepCsv).toContain('24AAACT1234A1Z1,"Tata Power Renewable EPC",INV-2026-DP100');

    // Section 3: Table 7 B2C
    expect(deepCsv).toContain('SECTION 3: TABLE 7 - TAXABLE OUTWARD SUPPLIES TO UNREGISTERED PERSONS (B2C OTHERS)');

    // Section 4: Deep Line Items
    expect(deepCsv).toContain('SECTION 4: DEEP LINE-ITEM LEVEL TAX & SHIPMENT AUDIT BREAKDOWN');
    expect(deepCsv).toContain('ord_deep_1,INV-2026-DP100,2026-09-11,"Tata Power Renewable EPC",9825012345,procurement@tatapower.com,24AAACT1234A1Z1,B2B,Gujarat,24,73269099,"SS304 Solar Drain Water Clips 35mm",PCS,500,24.00');
  });

  it('generates multi-sheet Excel workbook (.xlsx) with dedicated sheets: b2b, b2c, hsn, doc_issue, all_details', async () => {
    const orders: Partial<Order>[] = [
      {
        id: 'ord_excel_b2b',
        invoiceNumber: 'INV-2026-EX1',
        createdAt: '2026-09-11T14:00:00Z',
        orderType: 'B2B',
        customerName: 'Adani Solar EPC',
        deliveryAddress: {
          fullName: 'Adani Solar EPC',
          gstin: '24AAACA0000A1Z5',
          state: 'Gujarat',
          stateCode: '24'
        } as any,
        pricingSummary: {
          grandTotal: 11800.00,
          taxableValue: 10000.00,
          cgstAmount: 900.00,
          sgstAmount: 900.00,
          igstAmount: 0.00,
          shippingTotal: 0.00
        } as any,
        shipments: [
          {
            items: [
              {
                productTitle: 'SS304 Drain Clips',
                hsnCode: '73269099',
                quantity: 400,
                unitPrice: 25.00,
                gstRate: 0.18,
                unitOfMeasure: 'PCS'
              }
            ]
          } as any
        ]
      },
      {
        id: 'ord_excel_b2c',
        invoiceNumber: 'INV-2026-EX2',
        createdAt: '2026-09-11T15:00:00Z',
        orderType: 'B2C',
        customerName: 'Pravin Patel',
        deliveryAddress: {
          fullName: 'Pravin Patel',
          state: 'Maharashtra',
          stateCode: '27'
        } as any,
        pricingSummary: {
          grandTotal: 2360.00,
          taxableValue: 2000.00,
          cgstAmount: 0.00,
          sgstAmount: 0.00,
          igstAmount: 360.00,
          shippingTotal: 0.00
        } as any
      }
    ];

    const excelBuffer = await generateGstr1MultiSheetExcel(orders as Order[], '2026-09-01', '2026-09-11');
    expect(excelBuffer).toBeInstanceOf(Uint8Array);
    expect(excelBuffer.length).toBeGreaterThan(1000);

    // Parse back the generated Excel workbook using ExcelJS to verify all 18 sheet names & data
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(excelBuffer);

    // Verify all 18 requested sheets are present in the full master workbook
    const expectedSheets = [
      'b2b', 'b2c', 'b2cs', 'b2cl', 'hsn', 'docs', 'doc_issue',
      'all_orders', 'all_details', 'shipping_logistics', 'tax_summary',
      'cdnr', 'cdnur', 'exp', 'at', 'atadj', 'exemp', 'eco'
    ];
    const sheetNames = wb.worksheets.map(ws => ws.name);
    expectedSheets.forEach(sheetName => {
      expect(sheetNames).toContain(sheetName);
      expect(wb.getWorksheet(sheetName)).toBeDefined();
    });

    // Check Sheet 'b2b'
    const wsB2b = wb.getWorksheet('b2b');
    expect(wsB2b).toBeDefined();
    expect(wsB2b!.rowCount).toBeGreaterThanOrEqual(2);

    // Check Sheet 'b2c'
    const wsB2c = wb.getWorksheet('b2c');
    expect(wsB2c).toBeDefined();
    expect(wsB2c!.rowCount).toBeGreaterThanOrEqual(2);

    // Check Sheet 'hsn'
    const wsHsn = wb.getWorksheet('hsn');
    expect(wsHsn).toBeDefined();

    // Check Sheet 'doc_issue'
    const wsDocs = wb.getWorksheet('doc_issue');
    expect(wsDocs).toBeDefined();
    expect(wsDocs!.rowCount).toBeGreaterThanOrEqual(2);

    // Check Sheet 'all_details'
    const wsAll = wb.getWorksheet('all_details');
    expect(wsAll).toBeDefined();
    expect(wsAll!.rowCount).toBeGreaterThanOrEqual(2);
  });

  it('generates individual Excel workbooks with explicit sheet names: b2b, b2c, hsn, doc_issue, all_details', async () => {
    const orders: Partial<Order>[] = [
      {
        id: 'ord_ex1',
        invoiceNumber: 'INV-2026-EX1',
        createdAt: '2026-09-10T10:00:00Z',
        orderType: 'B2B',
        customerName: 'SunShine Solar EPC Ltd',
        deliveryAddress: {
          fullName: 'SunShine Solar EPC Ltd',
          gstin: '24AAACA0000A1Z5',
          state: 'Gujarat',
          stateCode: '24',
          phone: '9876543210'
        } as any,
        pricingSummary: {
          grandTotal: 1180.00,
          taxableValue: 1000.00,
          cgstAmount: 90.00,
          sgstAmount: 90.00,
          igstAmount: 0.00,
          shippingTotal: 0.00
        } as any
      }
    ];

    // 1. Test B2B Excel
    const b2bBuf = await generateB2bExcel(orders as Order[]);
    expect(b2bBuf).toBeInstanceOf(Uint8Array);
    const wbB2b = new ExcelJS.Workbook();
    await wbB2b.xlsx.load(b2bBuf);
    expect(wbB2b.worksheets.map(w => w.name)).toEqual(['b2b']);

    // 2. Test B2C Excel
    const b2cBuf = await generateB2cExcel(orders as Order[]);
    expect(b2cBuf).toBeInstanceOf(Uint8Array);
    const wbB2c = new ExcelJS.Workbook();
    await wbB2c.xlsx.load(b2cBuf);
    expect(wbB2c.worksheets.map(w => w.name)).toEqual(['b2c']);

    // 3. Test HSN(12) Excel
    const hsnBuf = await generateHsn12Excel(orders as Order[]);
    expect(hsnBuf).toBeInstanceOf(Uint8Array);
    const wbHsn = new ExcelJS.Workbook();
    await wbHsn.xlsx.load(hsnBuf);
    expect(wbHsn.worksheets.map(w => w.name)).toEqual(['hsn']);

    // 4. Test Doc Issue Excel
    const docsBuf = await generateDocIssueExcel(orders as Order[]);
    expect(docsBuf).toBeInstanceOf(Uint8Array);
    const wbDocs = new ExcelJS.Workbook();
    await wbDocs.xlsx.load(docsBuf);
    expect(wbDocs.worksheets.map(w => w.name)).toEqual(['docs']);

    // 5. Test All Orders Excel
    const ordersBuf = await generateAllOrdersExcel(orders as Order[]);
    expect(ordersBuf).toBeInstanceOf(Uint8Array);
    const wbOrders = new ExcelJS.Workbook();
    await wbOrders.xlsx.load(ordersBuf);
    expect(wbOrders.worksheets.map(w => w.name)).toEqual(['all_orders']);

    // 6. Test All Details Excel
    const allBuf = await generateAllDetailsExcel(orders as Order[], '2026-09-01', '2026-09-11');
    expect(allBuf).toBeInstanceOf(Uint8Array);
    const wbAll = new ExcelJS.Workbook();
    await wbAll.xlsx.load(allBuf);
    expect(wbAll.worksheets.map(w => w.name)).toEqual(['all_details']);

    // 7. Test Shipping Logistics Excel
    const shipBuf = await generateShippingLogisticsExcel(orders as Order[]);
    expect(shipBuf).toBeInstanceOf(Uint8Array);
    const wbShip = new ExcelJS.Workbook();
    await wbShip.xlsx.load(shipBuf);
    expect(wbShip.worksheets.map(w => w.name)).toEqual(['shipping_logistics']);

    // 8. Test Tax Summary Excel
    const taxBuf = await generateTaxSummaryExcel(orders as Order[], '2026-09-01', '2026-09-11');
    expect(taxBuf).toBeInstanceOf(Uint8Array);
    const wbTax = new ExcelJS.Workbook();
    await wbTax.xlsx.load(taxBuf);
    expect(wbTax.worksheets.map(w => w.name)).toEqual(['tax_summary']);
  });
});


