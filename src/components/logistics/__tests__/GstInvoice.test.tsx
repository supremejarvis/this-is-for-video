import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GstInvoice } from '../GstInvoice';
import { Order } from '../../../types';

describe('GstInvoice Statutory Modal Component', () => {
  const sampleOrder: Order = {
    id: 'ord_sample_8821',
    orderNumber: 'ORD-2026-08821',
    invoiceNumber: 'INV-2026-08821',
    userId: 'usr_test_buyer',
    customerName: 'Rajesh Patel',
    customerEmail: 'rajesh.patel@example.com',
    customerPhone: '9876543210',
    orderType: 'B2C',
    isInputTaxCreditClaimed: false,
    deliveryAddress: {
      id: 'addr_test_1',
      userId: 'usr_test_buyer',
      fullName: 'Rajesh Patel',
      phone: '9876543210',
      addressType: 'HOME',
      flatBuilding: 'B-402, Samruddhi Residency',
      streetArea: 'Near Prahlad Nagar Garden',
      pincode: '380015',
      postOffice: {
        name: 'Prahladnagar S.O.',
        branchType: 'Sub Office',
        deliveryStatus: 'Delivery',
        circle: 'Gujarat',
        district: 'Ahmedabad',
        state: 'Gujarat',
        facilityId: 'PO380015',
      },
      city: 'Ahmedabad',
      state: 'Gujarat',
      stateCode: '24',
      isDefault: true,
    },
    shipments: [
      {
        packageId: 'pkg_1',
        sellerId: 'apollo_central',
        sellerName: 'Apollo Engineering Kathwada Hub',
        items: [
          {
            sku: 'AE-SPRINKLER-SS304',
            parentAsin: 'AP-SPRINKLER-01',
            productTitle: 'SS304 Solar Panel Sprinkler',
            variantTitle: 'Standard 180°',
            attributes: { material: 'SS304' },
            imageUrl: '/solar_sprinkler.webp',
            unitPrice: 220,
            mrp: 350,
            gstRate: 18,
            hsnCode: '84248990',
            sellerId: 'apollo_central',
            sellerName: 'Apollo Engineering',
            fulfillmentType: 'FBF',
            weightGrams: 180,
            quantity: 2,
            isB2BPricingApplied: false,
          },
        ],
        shippingDetail: {
          carrier: 'INDIA_POST_SPEED_POST',
          articleNumber: 'EK892345102IN',
          tariffAmount: 185,
          gstAmount: 33.30,
          totalPostage: 218.30,
          originPincode: '382430',
          originHubName: 'Kathwada GIDC Central Hub',
          destinationPincode: '380015',
          destinationPostOffice: 'Vastrapur S.O.',
          bookingTimestamp: '2026-09-17T12:00:00Z',
          weightGrams: 360,
          chargeableWeightGrams: 360,
          barcode128: '*EK892345102IN*',
          manifestId: 'MNF-2026-08821',
        },
        status: 'IN_TRANSIT',
        milestones: [],
      },
    ],
    pricingSummary: {
      itemsTotal: 440,
      discountTotal: 0,
      taxableValue: 372.88,
      cgstAmount: 33.56,
      sgstAmount: 33.56,
      igstAmount: 0,
      totalTax: 67.12,
      shippingTotal: 218.30,
      grandTotal: 658.30,
    },
    paymentDetail: {
      method: 'UPI',
      transactionId: 'TXN_RZP_991820',
      paymentStatus: 'PAID',
      paidAt: '2026-09-17T12:00:00Z',
      idempotencyKey: 'idemp_8821',
    },
    createdAt: '2026-09-17T12:00:00Z',
    updatedAt: '2026-09-17T12:05:00Z',
  };

  it('renders official Apollo Engineering GST Tax Invoice header and numbers', () => {
    const handleClose = vi.fn();
    render(<GstInvoice order={sampleOrder} onClose={handleClose} />);

    // Check Header Titles
    expect(screen.getByText('APOLLO ENGINEERING')).toBeInTheDocument();
    expect(screen.getByText('GST TAX INVOICE')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-08821')).toBeInTheDocument();
    expect(screen.getByText(/24AAAPA1234F1Z9/)).toBeInTheDocument();
  });

  it('renders complete India Post Speed Post shipping and logistics details', () => {
    const handleClose = vi.fn();
    render(<GstInvoice order={sampleOrder} onClose={handleClose} />);

    // Verify Logistics Section
    expect(screen.getAllByText(/India Post Speed Post/i)[0]).toBeInTheDocument();
    expect(screen.getByText('EK892345102IN')).toBeInTheDocument();
    expect(screen.getByText(/Kathwada GIDC \(382430\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ahmedabad \(380015\)/i)).toBeInTheDocument();
  });

  it('renders complete payment method, transaction ref, and status badge', () => {
    const handleClose = vi.fn();
    render(<GstInvoice order={sampleOrder} onClose={handleClose} />);

    // Verify Payment Details
    expect(screen.getByText(/UPI Instant Payment/i)).toBeInTheDocument();
    expect(screen.getByText('TXN_RZP_991820')).toBeInTheDocument();
    expect(screen.getByText('PAID & SETTLED')).toBeInTheDocument();
  });

  it('renders items with HSN codes, quantity, rate, and taxable subtotal', () => {
    const handleClose = vi.fn();
    render(<GstInvoice order={sampleOrder} onClose={handleClose} />);

    // Verify Goods row
    expect(screen.getByText('SS304 Solar Panel Sprinkler')).toBeInTheDocument();
    expect(screen.getByText('84248990')).toBeInTheDocument();
    expect(screen.getByText('₹440')).toBeInTheDocument();
    expect(screen.getByText(/Six Hundred and Fifty Eight Rupees only/i)).toBeInTheDocument();
  });

  it('triggers print and close events when corresponding buttons are clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const handleClose = vi.fn();
    render(<GstInvoice order={sampleOrder} onClose={handleClose} />);

    // Click print button
    const printBtns = screen.getAllByRole('button', { name: /print tax invoice/i });
    fireEvent.click(printBtns[0]);
    expect(printSpy).toHaveBeenCalled();

    // Click close button
    const closeBtns = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeBtns[0]);
    expect(handleClose).toHaveBeenCalled();

    printSpy.mockRestore();
  });
});
