import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckoutModal } from '../CheckoutModal';
import { useStore } from '../../../store/useStore';
import { CartItem } from '../../../types';
import { apiService } from '../../../services/apiService';

describe('CheckoutModal B2C & B2B Form Requirements', () => {
  const mockItem: CartItem = {
    sku: 'DZ-K6JS-CCOO',
    parentAsin: 'B0C7XY8902',
    productTitle: 'Apollo SS304 Solar Drain Clip - 30mm Frame Size',
    variantTitle: '30mm Frame Size',
    attributes: { material: 'AISI SS304', size: '30mm' },
    imageUrl: '/Drain_clips.webp',
    unitPrice: 20,
    mrp: 30,
    gstRate: 18,
    hsnCode: '73269099',
    sellerId: 'apollo_mfg',
    sellerName: 'Apollo Engineering',
    fulfillmentType: 'FBF',
    weightGrams: 25,
    quantity: 2,
    isB2BPricingApplied: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.getState().clearCart();
    useStore.getState().addToCart(mockItem, 2);
    useStore.setState({
      isCheckoutOpen: true,
      authStatus: 'AUTHENTICATED',
      quoteStatus: 'QUOTE_VALID',
      appMode: 'B2C',
      currentUser: {
        id: 'usr_new_9714710854',
        name: '', // Empty name for first-time OTP customer
        email: '',
        phone: '+91 9714710854',
        role: 'B2C_CUSTOMER',
        isPrime: false,
        createdAt: new Date().toISOString()
      },
      activeAddress: null,
      shippingAddress: null,
      billingAddress: null,
      addresses: [],
      currentQuote: {
        quote_id: 'q-test-req',
        quote_number: 'APE-Q-TEST-REQ',
        idempotency_key: null,
        calculation_version: '1.0.0',
        catalog_version: '1.0.0',
        destination_pincode: '382430',
        items: [],
        subtotal_taxable: '33.90',
        total_product_gst: '6.10',
        total_product_gross: '40.00',
        base_shipping: '25.00',
        shipping_gst: '4.50',
        shipping_total: '29.50',
        prepaid_total: '69.50',
        cod_surcharge: '1.74',
        cod_raw_total: '71.24',
        cod_total: '75.00',
        rounding_multiple: 5,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }
    });
  });

  it('B2C first-time login: mobile number is auto-filled while name and address fields start empty', async () => {
    render(<CheckoutModal />);

    // Mobile number input must be prefilled with 10 digits
    const phoneInput = screen.getByPlaceholderText('10-digit mobile number') as HTMLInputElement;
    expect(phoneInput.value).toBe('9714710854');

    // Customer Name field must be completely empty
    const nameInput = screen.getByPlaceholderText('Enter your real full name') as HTMLInputElement;
    expect(nameInput.value).toBe('');

    // Delivery address fields must be completely empty
    const flatInput = screen.getByPlaceholderText('Plot 42, APE Industrial Complex') as HTMLInputElement;
    expect(flatInput.value).toBe('');

    const streetInput = screen.getByPlaceholderText('Kathwada GIDC Phase 2, Near Ring Road') as HTMLInputElement;
    expect(streetInput.value).toBe('');
  });

  it('blocks order placement when customer name or delivery address is missing', async () => {
    render(<CheckoutModal />);

    // An amber warning banner must be shown indicating name & address are compulsory
    expect(screen.getByText(/Customer name & delivery address are compulsory to place order/i)).toBeInTheDocument();

    // The order action button must be disabled with prompt text
    const orderBtn = screen.getByRole('button', { name: /Confirm and place order/i });
    expect(orderBtn).toBeDisabled();
    expect(screen.getByText(/Enter Customer Name & Address to Order/i)).toBeInTheDocument();
  });

  it('B2B mode: entering 15-character GSTIN automatically fills and locks business name & state', async () => {
    useStore.setState({ appMode: 'B2B' });

    vi.spyOn(apiService, 'verifyGstin').mockResolvedValueOnce({
      success: true,
      data: {
        legalName: 'RELIANCE INDUSTRIES LIMITED',
        tradeName: 'RIL SOLAR DIVISION',
        stateName: 'Gujarat',
        stateCode: '24',
        status: 'Active',
        taxpayerType: 'Regular',
        principalAddress: '3rd Floor, Maker Chambers IV, 222 Nariman Point, Mumbai',
        registrationDate: '01/07/2017'
      }
    });

    render(<CheckoutModal />);

    const gstinInput = screen.getByPlaceholderText('e.g. 24ABCDE1234F1Z5');
    fireEvent.change(gstinInput, { target: { value: '24AAACR5055K1Z8' } });

    await waitFor(() => {
      // Legal business name must be auto-filled
      const nameInput = screen.getByPlaceholderText('Enter your real full name') as HTMLInputElement;
      expect(nameInput.value).toBe('RELIANCE INDUSTRIES LIMITED');

      // The name input must be locked (readOnly) so user cannot tamper with official GST name
      expect(nameInput).toHaveAttribute('readOnly');
      expect(screen.getByText(/Locked to GSTIN/i)).toBeInTheDocument();
      expect(screen.getByText(/Legal Entity Name & Registered State auto-filled and locked to statutory GSTIN/i)).toBeInTheDocument();
    });
  });

  it('In-Modal Address Management: Manage in Profile button is removed and all actions happen directly in checkout', async () => {
    const existingAddr = {
      id: 'addr_saved_1',
      userId: 'usr_new_9714710854',
      fullName: 'Apollo Solar Tech Ltd',
      phone: '9714710854',
      addressType: 'OFFICE' as const,
      flatBuilding: 'Unit 401, Tech Park',
      streetArea: 'Ring Road',
      pincode: '382430',
      postOffice: {
        name: 'KATHWADA GIDC S.O.',
        branchType: 'Sub Post Office',
        deliveryStatus: 'Delivery' as const,
        circle: 'Gujarat',
        district: 'Ahmedabad',
        state: 'Gujarat',
        facilityId: '21260024'
      },
      city: 'Ahmedabad',
      state: 'Gujarat',
      stateCode: '24',
      isDefault: true,
      gstin: '24AABCA1234F1Z5'
    };

    useStore.setState({
      activeAddress: existingAddr,
      shippingAddress: existingAddr,
      billingAddress: existingAddr,
      addresses: [existingAddr]
    });

    render(<CheckoutModal />);

    // 1. "Manage in Profile" must NOT exist
    expect(screen.queryByText(/Manage in Profile/i)).not.toBeInTheDocument();

    // 2. Direct in-modal actions must be present
    const savedBtn = screen.getByTitle('Manage Saved Addresses directly in checkout');
    expect(savedBtn).toBeInTheDocument();
    expect(screen.getAllByText(/\+ Add New Address/i).length).toBeGreaterThan(0);

    // 3. Open Saved Addresses in modal
    fireEvent.click(savedBtn);

    // 4. Saved address card must display complete details and inline actions
    expect(screen.getAllByText('Unit 401, Tech Park, Ring Road').length).toBeGreaterThan(0);
    expect(screen.getByTitle('Edit address')).toBeInTheDocument();
    expect(screen.getByTitle('Delete address')).toBeInTheDocument();

    // 5. Delete address directly inside modal
    fireEvent.click(screen.getByTitle('Delete address'));
    expect(useStore.getState().addresses).toHaveLength(0);
  });
});
