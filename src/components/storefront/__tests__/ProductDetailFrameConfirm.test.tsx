import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProductDetail } from '../ProductDetail';
import { useStore } from '../../../store/useStore';
import { MOCK_PRODUCTS } from '../../../data/mockData';

describe('Solar Drain Clip Frame Thickness Confirmation Workflow', () => {
  beforeEach(() => {
    useStore.getState().clearCart();
    useStore.getState().setIsCartDrawerOpen(false);
    // Product 1 in mock data is the Solar Drain Clip
    const drainClipProduct = MOCK_PRODUCTS.find(p => p.asin === 'AP-DRAIN-02') || MOCK_PRODUCTS[1];
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

    // Verify item was added to cart and cart drawer opened
    expect(useStore.getState().cart.length).toBeGreaterThan(0);
    expect(useStore.getState().isCartDrawerOpen).toBe(true);
  }, 20000);
});
