import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const requests: any[] = [];
  const responses: any[] = [];
  const consoleLogs: string[] = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('request', req => {
    if (req.url().includes('/api/')) {
      requests.push({
        url: req.url(),
        method: req.method(),
        headers: req.headers(),
        postData: req.postData()
      });
    }
  });

  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      let body = '';
      try {
        body = await res.text();
      } catch (e) {
        body = '<could not read text>';
      }
      responses.push({
        url: res.url(),
        status: res.status(),
        statusText: res.statusText(),
        headers: res.headers(),
        body: body
      });
    }
  });

  console.log('Navigating to http://localhost:3000/store ...');
  await page.goto('http://localhost:3000/store', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('Finding SS304 Solar Panel Sprinkler card...');
  const card = page.locator('div.group:has-text("SS304 Solar Panel Sprinkler")').first();
  await card.scrollIntoViewIfNeeded();

  const qtyInput = card.locator('input[type="number"]').first();
  await qtyInput.fill('2');
  console.log('Set quantity to 2');

  const addToCartBtn = card.locator('button:has-text("Add to Cart")').first();
  await addToCartBtn.click();
  console.log('Clicked Add to Cart');

  await page.waitForTimeout(1000);

  // Take screenshot of CartDrawer
  await page.screenshot({ path: 'scratch/cart_drawer_initial.png' });

  // In CartDrawer: select COD
  console.log('Selecting COD in CartDrawer...');
  const codBtn = page.locator('button:has-text("Cash on Delivery (COD)")').or(page.locator('button:has-text("COD")')).first();
  if (await codBtn.isVisible()) {
    await codBtn.click();
    console.log('Selected COD');
  }

  // Check pincode input
  const pincodeInput = page.locator('input[placeholder="e.g. 382430"]');
  if (await pincodeInput.isVisible()) {
    const currentPin = await pincodeInput.inputValue();
    console.log('Current PIN:', currentPin);
    if (!currentPin) {
      await pincodeInput.fill('382430');
    }
  }

  // Click Recalculate Quote or Generate Authoritative Quote
  console.log('Triggering Quote Calculation...');
  const quoteBtn = page.locator('button:has-text("Generate Authoritative Quote"), button:has-text("Recalculate Quote")').first();
  if (await quoteBtn.isVisible()) {
    await quoteBtn.click();
    console.log('Clicked Quote Button');
  } else {
    console.log('Quote button not visible, checking what buttons exist...');
  }

  await page.waitForTimeout(3000);

  // Take screenshot after quote trigger
  await page.screenshot({ path: 'scratch/cart_drawer_after_quote.png' });

  console.log('\n--- CAPTURED REQUESTS ---');
  console.log(JSON.stringify(requests, null, 2));

  console.log('\n--- CAPTURED RESPONSES ---');
  console.log(JSON.stringify(responses, null, 2));

  console.log('\n--- CONSOLE LOGS ---');
  console.log(consoleLogs.slice(-20).join('\n'));

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
