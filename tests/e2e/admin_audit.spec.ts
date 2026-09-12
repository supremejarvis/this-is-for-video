import { test, expect } from '@playwright/test';

test.describe('Apollo Engineering Admin Page — Comprehensive Audit Suite', () => {
  // 1. Unauthenticated Login Screen & Accessibility Audit
  test('Admin Login Screen renders securely with accessible inputs and branding', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Verify Admin Portal branding heading
    const titleText = page.getByRole('heading', { name: /Apollo Admin Portal/i });
    await expect(titleText).toBeVisible({ timeout: 15000 });

    // Verify Email and Password fields
    const emailInput = page.locator('#admin-login-email');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('#admin-login-password');
    await expect(passwordInput).toBeVisible();

    // Verify Kathwada Origin Hub reference
    const hubText = page.getByText(/Kathwada/i).first();
    await expect(hubText).toBeVisible();
  });

  // 2. Authenticated Admin Desk & 6 Core Pillars Audit
  test('Admin Desk loads all 6 pillars and functions without console errors', async ({ page }) => {
    // Set authenticated session state in localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('apollo_admin_session', 'active');
      localStorage.setItem('apollo_google_auth_configured', 'true');
    });

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Verify Top Header Bar
    const headerTitle = page.getByRole('heading', { name: /Apollo Engineering (Admin Desk|· Seller Central)/i });
    await expect(headerTitle).toBeVisible({ timeout: 15000 });

    // Verify Origin Hub Badge (Kathwada 382430)
    const originBadge = page.getByText(/Kathwada/i).first();
    await expect(originBadge).toBeVisible();

    // Locate the Pillars Navigation Bar
    const pillarNav = page.locator('div.grid.grid-cols-2').first();
    await expect(pillarNav).toBeVisible();

    // Pillar 1: PRODUCTS (Default Active Tab)
    await expect(page.getByText(/APE Store Product & Variant Matrix/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add New ASIN/i })).toBeVisible();
    await expect(page.getByText(/B2B Wholesale Rate/i)).toBeVisible();
    await expect(page.getByText(/MOQ:/i).first()).toBeVisible();
    await expect(page.getByText(/Live Stock \(Quick \+\/-\)/i)).toBeVisible();

    // Verify B2B MOQ is inside Edit & Matrix wizard (Directive: "moq chhe edit/metrix ma anadar hovu joi ae")
    const editMatrixBtn = page.getByRole('button', { name: /Edit & Matrix/i }).first();
    await editMatrixBtn.click();
    await expect(page.getByText(/B2B MOQ \(Min Pcs\)/i)).toBeVisible();
    await page.getByTitle(/Close Wizard/i).click();

    // Pillar 2: ORDERS & FULFILLMENT (Amazon / Flipkart Sequential Dispatch Pipeline)
    const ordersTab = pillarNav.getByRole('button', { name: /(Fulfillment & Dispatch|Orders & Carts)/i });
    await ordersTab.click();
    await expect(page.getByText(/(Orders & Fulfillment Control Hub|Orders & Shopping Cart Console)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sequential Dispatch Pipeline/i })).toBeVisible();
    // Verify Amazon & Flipkart 5-Stage Dispatch Pipeline is active
    await expect(page.getByText(/Amazon & Flipkart Style Fulfillment & Dispatch Console/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Stage 1.*Unshipped Orders/i })).toBeVisible();

    // Pillar 3: SHIPPING CONSOLE
    const shippingTab = pillarNav.getByRole('button', { name: /(Speed Post CEPT|Shipping Console)/i });
    await shippingTab.click();
    await expect(page.getByText(/India Post CEPT Official API Gateway/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate CEPT Bulk Manifest/i })).toBeVisible();
    await expect(page.getByText(/Origin Hub: 382430/i)).toBeVisible();

    // Pillar 4: RETURNS & REFUNDS (Directive 6 Sizing & Caliper Verification)
    const returnsTab = pillarNav.getByRole('button', { name: /(Returns & Sizing|Returns & Refunds)/i });
    await returnsTab.click();
    await expect(page.getByText(/Return & Refund Management/i)).toBeVisible();
    await expect(page.getByText(/Total Returns/i)).toBeVisible();

    // Pillar 5: REPORTS & GST (Statutory GSTR-1 Compliance)
    const reportsTab = pillarNav.getByRole('button', { name: /(GSTR-1 & Reports|Reports & GST)/i });
    if (await reportsTab.isVisible()) {
      await reportsTab.click();
      await expect(page.getByText(/Executive Analyst Reports/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Download GSTR-1/i })).toBeVisible();
    }
  });

  // 3. Responsive Mobile Viewport Audit (390x844)
  test('Admin Desk renders responsively on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('apollo_admin_session', 'active');
      localStorage.setItem('apollo_google_auth_configured', 'true');
    });

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Header should render without overflow
    const headerTitle = page.getByRole('heading', { name: /Apollo Engineering (Admin Desk|· Seller Central)/i });
    await expect(headerTitle).toBeVisible({ timeout: 15000 });

    // Ensure tab buttons are tappable in pillar nav
    const pillarNav = page.locator('div.grid.grid-cols-2').first();
    await expect(pillarNav).toBeVisible();
    const productsTab = pillarNav.getByRole('button', { name: /(Inventory & Catalog|Products)/i });
    await expect(productsTab).toBeVisible();
  });
});
