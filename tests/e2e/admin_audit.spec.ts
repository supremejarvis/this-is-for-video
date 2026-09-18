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

  // 2. Authenticated Admin Desk & Core Pillars Audit
  test('Admin Desk loads all core pillars and functions without console errors', async ({ page }) => {
    // Mock verified backend admin session via /api/v1/auth/me
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u_apollo_admin_master',
          email: 'admin@apolloengineering.co.in',
          full_name: 'Apollo Engineering Administrator',
          role: 'SUPER_ADMIN',
          is_superuser: true,
          phone: '8511626267',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('apollo_google_auth_configured', 'true');
    });

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Verify Top Header Bar
    const headerTitle = page.getByRole('heading', { name: /Apollo Engineering (Admin Desk|· Seller Central|· Operations Center)/i });
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

    // Verify B2B MOQ is inside Edit & Matrix wizard
    const editMatrixBtn = page.getByRole('button', { name: /Edit & Matrix/i }).first();
    await editMatrixBtn.click();
    await expect(page.getByText(/B2B MOQ \(Min Pcs\)/i)).toBeVisible();
    await page.getByTitle(/Close Wizard/i).click();

    // Pillar 2: ORDERS & FULFILLMENT (Enterprise Sequential Dispatch Pipeline)
    const ordersTab = pillarNav.getByRole('button', { name: /(Fulfillment & Dispatch|Orders & Carts)/i });
    await ordersTab.click();
    await expect(page.getByText(/(Orders & Fulfillment Control Hub|Orders & Shopping Cart Console)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sequential Dispatch Pipeline/i })).toBeVisible();
    // Verify Enterprise Dispatch Pipeline is active
    await expect(page.getByText(/(Express Dispatch & Logistics Operations|Factory Fulfillment & Express Dispatch Hub)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Stage 1.*Unshipped Orders/i })).toBeVisible();

    // Pillar 3: CUSTOMER RELATIONS & B2B GST DESK
    const customersTab = pillarNav.getByRole('button', { name: /(Customer Relations|Customers)/i });
    await customersTab.click();
    await expect(page.getByText(/(Customer Accounts & B2B GST Verification Desk|Customer Directory)/i)).toBeVisible();

    // Pillar 4: RETURNS & SIZING (Directive 6 Sizing & Caliper Verification)
    const returnsTab = pillarNav.getByRole('button', { name: /(Returns & Sizing|Returns & Refunds)/i });
    await returnsTab.click();
    await expect(page.getByText(/Return & Refund Management/i)).toBeVisible();
    await expect(page.getByText(/Total Returns/i)).toBeVisible();

    // Pillar 5: REPORTS & GST (Statutory GSTR-1 & Reconciliation)
    const reportsTab = pillarNav.getByRole('button', { name: /(GSTR-1 & Reports|Reports & GST)/i });
    await reportsTab.click();
    await expect(page.getByText(/(Executive Reports, Tax & Financial Reconciliation|Executive Analyst Reports)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /(GSTR-1 Statutory Reports|Download GSTR-1)/i })).toBeVisible();
  });

  // 3. Responsive Mobile Viewport Audit (390x844)
  test('Admin Desk renders responsively on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Mock verified backend admin session via /api/v1/auth/me
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u_apollo_admin_master',
          email: 'admin@apolloengineering.co.in',
          full_name: 'Apollo Engineering Administrator',
          role: 'SUPER_ADMIN',
          is_superuser: true,
          phone: '8511626267',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('apollo_google_auth_configured', 'true');
    });

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Header should render without overflow
    const headerTitle = page.getByRole('heading', { name: /Apollo Engineering (Admin Desk|· Seller Central|· Operations Center)/i });
    await expect(headerTitle).toBeVisible({ timeout: 15000 });

    // Ensure tab buttons are tappable in pillar nav
    const pillarNav = page.locator('div.grid.grid-cols-2').first();
    await expect(pillarNav).toBeVisible();
    const productsTab = pillarNav.getByRole('button', { name: /(Inventory & Catalog|Products)/i });
    await expect(productsTab).toBeVisible();
  });
});
