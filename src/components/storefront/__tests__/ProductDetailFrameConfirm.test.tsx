import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProductDetail } from '../ProductDetail';
import { useStore } from '../../../store/useStore';
// MOCK_PRODUCTS removed — using inline test fixture

describe('Solar Drain Clip Frame Thickness Confirmation Workflow', () => {
  beforeEach(() => {
    useStore.getState().clearCart();
    useStore.getState().setIsCartDrawerOpen(false);
    // Inline test fixture for drain clip product
    const drainClipProduct = {
      asin: 'AP-DRAINCLIPS-02',
      title: 'Apollo AISI SS304 Solar Panel Water Drain & Anti-Soiling Clamp',
      brand: 'Apollo Engineering',
      category: 'SS304 GRADE',
      subCategory: 'Auto Drain Clips',
      description: 'Test fixture for frame thickness confirmation workflow',
      highlights: ['Measure Frame Thickness Before Order'],
      rating: 4.9,
      reviewCount: 485,
      isLive: true,
      badges: ['BEST_SELLER', 'PRIME'],
      createdAt: '2025-01-01T00:00:00Z',
      selectedVariantSku: 'APE-SC-35.00MM',
      variants: [
        {
          sku: 'APE-SC-35.00MM',
          title: 'Apollo SS304 Solar Drain Clip - 35mm Frame Size',
          attributes: { material: 'AISI SS304', size: '35mm' },
          mrp: 35,
          b2cPrice: 20,
          b2bTierPricing: [],
          inventory: 50000,
          barcode: 'B0H3ZJ1J5L',
          images: ['/Drain_clips.webp'],
          weightGrams: 25,
          dimensionsCm: { length: 5, width: 5, height: 5 },
          hsnCode: '73269099',
          gstRatePercent: 18,
          unitOfMeasure: 'PCS'
        }
      ],
      sellerListings: {},
      aPlusContent: []
    } as any;
    useStore.getState().setSelectedProduct(drainClipProduct);
  });

  it('triggers frame thickness confirmation modal when clicking Add to Cart for drain clips', () => {
    render(<ProductDetail />);

    // Click "Add to Cart"
    const addToCartBtn = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartBtn);

    // Verify modal appeared with frame verification instruction
    expect(screen.getByText(/Check Frame Thickness Before Ordering/i)).toBeDefined();
    expect(screen.getByText(/SS304 Precision Spring Fit — Mandatory Sizing Verification/i)).toBeDefined();

    // Confirm button should be disabled until checkbox is checked
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Add to Cart/i });
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    // Check the confirmation checkbox
    const checkbox = screen.getByLabelText(/I confirm that I measured my solar panel frame thickness and selected/i);
    fireEvent.click(checkbox);

    // Confirm button should now be enabled
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);

    // Click Confirm & Add to Cart
    fireEvent.click(confirmBtn);

    // Verify item was added to cart while keeping cart drawer closed (as per user requirement)
    expect(useStore.getState().cart.length).toBeGreaterThan(0);
    expect(useStore.getState().isCartDrawerOpen).toBe(false);
  }, 20000);
});
