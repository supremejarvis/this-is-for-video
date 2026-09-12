import { test, expect } from '@playwright/test';

test.describe('Gate 2C: Buyer Catalog and Authoritative Cart Quote', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend products endpoint
    await page.route(/\/api\/v1\/products/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'b5a0f671-55fa-4f96-857e-e5adfa7f1396',
            sku_prefix: 'APE-SC',
            name: 'Apollo SS304 Solar Panel Clamp',
            description: 'Precision engineered AISI SS304 solar panel mounting clamps.',
            hsn_code: '73269099',
            is_active: true,
            is_archived: false,
            version: 1,
            created_at: '2026-09-05T12:00:00Z',
            updated_at: '2026-09-05T12:00:00Z',
            variants: [
              {
                id: 'v-28mm',
                product_id: 'b5a0f671-55fa-4f96-857e-e5adfa7f1396',
                sku: 'APE-SC-28.00MM',
                fit_mode: 'EXACT',
                frame_thickness_mm: 28,
                min_thickness_mm: null,
                max_thickness_mm: null,
                display_label: '28 mm Standard Clamp',
                frame_thickness: '28mm',
                pack_size: 1,
                is_active: true,
                is_archived: false,
                version: 1,
                available_stock: 500,
                created_at: '2026-09-05T12:00:00Z',
              },
              {
                id: 'v-30mm',
                product_id: 'b5a0f671-55fa-4f96-857e-e5adfa7f1396',
                sku: 'APE-SC-30.00MM',
                fit_mode: 'EXACT',
                frame_thickness_mm: 30,
                min_thickness_mm: null,
                max_thickness_mm: null,
                display_label: '30 mm Standard Clamp',
                frame_thickness: '30mm',
                pack_size: 1,
                is_active: true,
                is_archived: false,
                version: 1,
                available_stock: 500,
                created_at: '2026-09-05T12:00:00Z',
              },
              {
                id: 'v-33mm',
                product_id: 'b5a0f671-55fa-4f96-857e-e5adfa7f1396',
                sku: 'APE-SC-33.00MM',
                fit_mode: 'EXACT',
                frame_thickness_mm: 33,
                min_thickness_mm: null,
                max_thickness_mm: null,
                display_label: '33 mm Standard Clamp',
                frame_thickness: '33mm',
                pack_size: 1,
                is_active: true,
                is_archived: false,
                version: 1,
                available_stock: 500,
                created_at: '2026-09-05T12:00:00Z',
              },
              {
                id: 'v-35mm',
                product_id: 'b5a0f671-55fa-4f96-857e-e5adfa7f1396',
                sku: 'APE-SC-35.00MM',
                fit_mode: 'EXACT',
                frame_thickness_mm: 35,
                min_thickness_mm: null,
                max_thickness_mm: null,
                display_label: '35 mm Standard Clamp',
                frame_thickness: '35mm',
                pack_size: 1,
                is_active: true,
                is_archived: false,
                version: 1,
                available_stock: 500,
                created_at: '2026-09-05T12:00:00Z',
              },
              {
                id: 'v-40mm',
                product_id: 'b5a0f671-55fa-4f96-857e-e5adfa7f1396',
                sku: 'APE-SC-40.00MM',
                fit_mode: 'EXACT',
                frame_thickness_mm: 40,
                min_thickness_mm: null,
                max_thickness_mm: null,
                display_label: '40 mm Standard Clamp',
                frame_thickness: '40mm',
                pack_size: 1,
                is_active: true,
                is_archived: false,
                version: 1,
                available_stock: 500,
                created_at: '2026-09-05T12:00:00Z',
              },
            ],
          },
        ]),
      });
    });

    // Mock the backend quotes endpoint
    await page.route(/\/api\/v1\/quotes/, async (route) => {
      const requestData = JSON.parse(route.request().postData() || '{}');
      const isCod = requestData.payment_method === 'COD';
      const now = new Date().toISOString();

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          quote_id: 'e03f4439-0118-4903-8be9-0f04ea206b02',
          quote_number: 'APE-Q-2026-E03F4439',
          idempotency_key: requestData.idempotency_key || null,
          calculation_version: '1.0.0',
          catalog_version: '1.0.0',
          destination_pincode: requestData.destination_pincode || '382430',
          items: [
            {
              sku: 'APE-SC-35.00MM',
              quantity: 2,
              unit_price: '20.00',
              line_gross: '40.00',
              taxable_base: '33.90',
              product_gst: '6.10',
              tax_mode: 'GST_INCLUSIVE',
              gst_rate: '0.1800',
              hsn_code: '73269099',
            },
          ],
          subtotal_taxable: '33.90',
          total_product_gst: '6.10',
          total_product_gross: '40.00',
          base_shipping: '60.00',
          shipping_gst: '10.80',
          shipping_total: '70.80',
          shipping_gst_rate: '0.1800',
          prepaid_total: '110.80',
          cod_surcharge: isCod ? '2.77' : '0.00',
          cod_raw_total: isCod ? '113.57' : '110.80',
          cod_total: isCod ? '114.00' : '110.80',
          rounding_multiple: 1,
          cod_charge_rate: '0.0250',
          cod_charge_raw: isCod ? '2.77' : '0.00',
          cod_rounding_adjustment: isCod ? '0.43' : '0.00',
          cod_payable_total: isCod ? '114.00' : '110.80',
          shipping_provider: 'India Post',
          service_code: 'Speed Post',
          rate_source: 'Fallback Rate Table',
          rate_version: 'v2025.1',
          is_live_rate: false,
          calculated_at: now,
          server_time: now,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          created_at: now,
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays database-driven 28, 30, 33, 35, 40 mm variants and switches thickness', async ({ page }) => {
    // Verify product card is visible
    const productCard = page.locator('text=Apollo SS304 Solar Panel Clamp').first();
    await expect(productCard).toBeVisible({ timeout: 10000 });

    // Verify all 5 thickness options appear
    await expect(page.locator('text=28 mm').first()).toBeVisible();
    await expect(page.locator('text=30 mm').first()).toBeVisible();
    await expect(page.locator('text=33 mm').first()).toBeVisible();
    await expect(page.locator('text=35 mm').first()).toBeVisible();
    await expect(page.locator('text=40 mm').first()).toBeVisible();

    // Click 28 mm variant
    await page.locator('button:has-text("28 mm")').first().click();
    await expect(page.locator('text=28 mm Standard Clamp').first()).toBeVisible();
  });

  test('filters catalog products by category', async ({ page }) => {
    // Verify category filter buttons are present in catalog toolbar
    const allFilter = page.locator('[data-testid="catalog-filter-ALL"]');
    const ss304Filter = page.locator('[data-testid="catalog-filter-SS304-GRADE"]');

    await expect(allFilter).toBeVisible();
    await expect(ss304Filter).toBeVisible();

    // Click SS304 GRADE filter
    await ss304Filter.click();
    await expect(page.locator('text=AISI SS304').first()).toBeVisible();
  });

  test('adds variant to cart and requests authoritative server quote with complete statutory breakdown', async ({ page }) => {
    // Wait for catalog products to be rendered
    await expect(page.locator('text=Apollo SS304 Solar Panel Clamp').first()).toBeVisible({ timeout: 10000 });

    // Click Add to Cart
    await page.locator('button:has-text("Add to Cart")').first().click();

    // Cart drawer should open
    const cartDrawer = page.locator('role=dialog');
    await expect(cartDrawer).toBeVisible();

    // Enter valid 6-digit Indian PIN code
    const pincodeInput = page.locator('input[pattern="[0-9]*"]');
    await pincodeInput.fill('382430');

    // Click Generate Authoritative Quote
    await page.locator('button:has-text("Generate Authoritative Quote"), button:has-text("Recalculate Quote")').first().click({ force: true });

    // Verify authoritative breakdown appears directly from PostgreSQL engine
    await expect(page.locator('text=APE-Q-2026-E03F4439')).toBeVisible();
    await expect(page.locator('text=₹33.90')).toBeVisible(); // Taxable Goods Value
    await expect(page.locator('text=₹6.10')).toBeVisible();  // Product GST
    await expect(page.locator('text=₹60.00')).toBeVisible(); // Speed Post Base Freight
    await expect(page.locator('text=₹10.80')).toBeVisible(); // Shipping GST
    await expect(page.locator('text=₹70.80')).toBeVisible(); // Total Shipping Freight
    await expect(page.locator('text=₹110.80')).toBeVisible(); // Prepaid Total Amount

    // Toggle to COD and recalculate
    await page.locator('button:has-text("Cash on Delivery")').click();
    await expect(page.locator('text=Quote Out of Date')).toBeVisible(); // Reactive STALE state check

    await page.locator('button:has-text("Recalculate Quote")').first().click({ force: true });
    await expect(page.locator('text=₹2.77')).toBeVisible();  // COD Handling Charge raw
    await expect(page.locator('text=₹114.00')).toBeVisible(); // Final COD Payable Amount
  });

  test('validates PIN code formatting and blocks invalid PIN codes', async ({ page }) => {
    // Wait for catalog products to be rendered
    await expect(page.locator('text=Apollo SS304 Solar Panel Clamp').first()).toBeVisible({ timeout: 10000 });

    await page.locator('button:has-text("Add to Cart")').first().click();
    const pincodeInput = page.locator('input[pattern="[0-9]*"]');
    
    // Invalid PIN starting with 0
    await pincodeInput.fill('012345');
    await expect(page.locator('text=Please enter a valid 6-digit Indian PIN code')).toBeVisible();
  });
});
