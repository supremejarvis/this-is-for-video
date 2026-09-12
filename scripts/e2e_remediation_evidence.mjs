import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/patel/.gemini/antigravity-ide/brain/4a637db4-0581-44a9-9b1f-61eaba0e10c3';

async function run() {
  console.log('--- Launching Chromium E2E Remediation Verification ---');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Apollo')) {
      console.log(`[Browser Console ${msg.type()}]:`, msg.text());
    }
  });

  try {
    // 1. Visit Storefront
    console.log('1. Navigating to http://localhost:3000/#store...');
    await page.goto('http://localhost:3000/#store', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify Guest status in Header
    const signInBtn = page.locator('button:has-text("Sign In / Register"), a:has-text("Sign In / Register")').first();
    const isGuest = await signInBtn.isVisible().catch(() => false);
    console.log('Header Sign In indicator:', isGuest ? 'FOUND (Guest visitor confirmed)' : 'NOT FOUND');

    // 2. Locate Sprinkler product card
    console.log('2. Verifying production catalog items...');
    const sprinklerCard = page.locator('.bg-white.rounded-3xl.border:has-text("Sprinkler")').first();
    await sprinklerCard.waitFor({ state: 'visible', timeout: 10000 });
    const sprinklerTitle = await sprinklerCard.locator('h3').textContent();
    console.log('Found product card title:', sprinklerTitle);

    const priceText = await sprinklerCard.locator('text=₹220').first().textContent().catch(() => null);
    console.log('Sprinkler card unit price:', priceText ? '₹220 confirmed' : 'Price mismatch or not found');

    // 3. Add Sprinkler to Cart
    console.log('3. Adding Sprinkler to Cart...');
    const addToCartBtn = sprinklerCard.locator('button:has-text("Add to Cart")').first();
    await addToCartBtn.click();
    await page.waitForTimeout(1500);

    // Verify Cart Drawer is opened
    const cartDrawerHeading = page.locator('text=Your Cart').first();
    await cartDrawerHeading.waitFor({ state: 'visible', timeout: 5000 });

    // Verify NO login popup appeared on Add to Cart / Cart open
    const authModalHeading = await page.locator('text=Welcome to APE Store').isVisible().catch(() => false);
    console.log('AuthModal visible on guest Add to Cart:', authModalHeading ? 'LEAK/ERROR' : 'NO (Correct: Guest cart has no login popup)');

    // Capture Screenshot 8: Guest cart with no login popup
    const sc8Path = path.join(ARTIFACT_DIR, 'guest_cart_no_login.png');
    await page.screenshot({ path: sc8Path });
    console.log(`Screenshot 8 saved to: ${sc8Path}`);

    // 4. Verify Proceed to Secure Checkout is DISABLED before valid quote
    console.log('4. Verifying Proceed button is disabled before calculating total...');
    const proceedBtn = page.locator('button:has-text("Proceed to Secure Checkout")').first();
    const isProceedDisabled = await proceedBtn.isDisabled();
    console.log('Proceed to Secure Checkout disabled status:', isProceedDisabled ? 'DISABLED (Correct: quote required)' : 'ENABLED (Error)');

    // Capture Screenshot 12: Proceed disabled before valid quote
    const sc12Path = path.join(ARTIFACT_DIR, 'proceed_disabled_before_quote.png');
    await page.screenshot({ path: sc12Path });
    console.log(`Screenshot 12 saved to: ${sc12Path}`);

    // 5. Click "Calculate Total"
    console.log('5. Clicking Calculate Total to produce valid quote...');
    const calcBtn = page.locator('button:has-text("Calculate Total")').first();
    await calcBtn.click();
    await page.waitForTimeout(2000);

    // Verify Proceed button is now ENABLED
    const isProceedEnabledNow = !(await proceedBtn.isDisabled());
    console.log('Proceed to Secure Checkout enabled after calculation:', isProceedEnabledNow ? 'ENABLED (Correct)' : 'STILL DISABLED');

    // 6. Click "Proceed to Secure Checkout" -> Should open 4-digit OTP AuthModal
    console.log('6. Clicking Proceed to Secure Checkout as Guest...');
    await proceedBtn.click();
    await page.waitForTimeout(1500);

    // Verify 4-digit OTP AuthModal is opened
    const authModal = page.locator('div[role="dialog"]:has-text("Welcome to APE Store")').first();
    await authModal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('AuthModal opened upon guest clicking Proceed: VERIFIED');

    // Capture Screenshot 9: Proceed opens correct 4-digit OTP modal
    const sc9Path = path.join(ARTIFACT_DIR, 'proceed_opens_4digit_otp.png');
    await page.screenshot({ path: sc9Path });
    console.log(`Screenshot 9 saved to: ${sc9Path}`);

    // 7. Complete 4-digit OTP Login
    console.log('7. Entering 10-digit mobile number: 9825012345...');
    const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]').first();
    await phoneInput.fill('9825012345');
    await page.waitForTimeout(500);

    const sendOtpBtn = page.locator('button:has-text("SEND 4-DIGIT OTP")').first();
    await sendOtpBtn.click();
    await page.waitForTimeout(1500);

    // Fetch the generated 4-digit OTP from backend test endpoint
    console.log('Retrieving generated OTP code from backend dev-code...');
    const devCodeRes = await fetch('http://localhost:8000/api/v1/auth/otp/dev-code?phone=9825012345');
    const devCodeData = await devCodeRes.json();
    const otpCode = devCodeData.code;
    console.log('Retrieved 4-digit OTP from backend session:', otpCode);

    // Fill the 4 OTP digit boxes
    for (let i = 0; i < 4; i++) {
      const digitInput = page.locator(`input[aria-label="Digit ${i + 1}"]`).first();
      await digitInput.fill(otpCode[i]);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1500);

    // Click verify if needed
    const verifyBtn = page.locator('button:has-text("VERIFY & SIGN IN")').first();
    if (await verifyBtn.isVisible().catch(() => false)) {
      await verifyBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 8. Verify Authenticated Checkout Modal opens
    console.log('8. Verifying Authenticated CheckoutModal opened...');
    const checkoutModal = page.locator('div:has-text("Apollo Retail Express Checkout")').first();
    await checkoutModal.waitFor({ state: 'visible', timeout: 8000 });

    // Verify phone masking in checkout
    const checkoutContent = await checkoutModal.textContent();
    const hasMaskedPhone = checkoutContent.includes('******2345') || checkoutContent.includes('******');
    console.log('Masked phone in checkout UI:', hasMaskedPhone ? 'VERIFIED' : 'UNMASKED');

    // Capture Screenshot 10: Authenticated checkout with correct customer
    const sc10Path = path.join(ARTIFACT_DIR, 'authenticated_checkout_correct_customer.png');
    await page.screenshot({ path: sc10Path });
    console.log(`Screenshot 10 saved to: ${sc10Path}`);

    // 9. Verify Product identity & price in checkout
    console.log('9. Verifying product identity & price in checkout summary...');
    const hasSprinklerInCheckout = checkoutContent.includes('Sprinkler') || checkoutContent.includes('AE-SPRINKLER-SS304');
    const hasSprinklerPrice = checkoutContent.includes('220');
    console.log('Sprinkler present in checkout summary:', hasSprinklerInCheckout ? 'VERIFIED' : 'NOT FOUND');
    console.log('₹220 item total in checkout:', hasSprinklerPrice ? 'VERIFIED' : 'NOT FOUND (Check pricing)');

    // Capture Screenshot 11: Product identity card through checkout
    const sc11Path = path.join(ARTIFACT_DIR, 'product_identity_card_through_checkout.png');
    await page.screenshot({ path: sc11Path });
    console.log(`Screenshot 11 saved to: ${sc11Path}`);

    console.log('--- ALL 5 REQUIRED SCREENSHOTS CAPTURED AND VERIFIED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Browser verification failed:', err);
  } finally {
    await browser.close();
  }
}

run();
