import { test, expect } from '@playwright/test';
import path from 'path';

const VIEWPORTS = [
  { name: 'mobile-small', width: 320, height: 640 },
  { name: 'mobile-medium', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop-small', width: 1024, height: 768 },
  { name: 'desktop-large', width: 1440, height: 900 },
];

import fs from 'fs';

const ARTIFACT_DIR = path.resolve('test-results/screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

test.describe('Responsive Usability & Multi-Viewport Verification Suite', () => {
  for (const vp of VIEWPORTS) {
    test(`verifies zero overflow and responsive integrity at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // 1. Check single H1 rule
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // 2. Check no horizontal overflow (allow max 1px margin of error for subpixel rendering)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(hasHorizontalScroll).toBe(false);

      // 3. Check WhatsApp button is positioned on bottom-right
      const whatsappBtn = page.locator('a[aria-label*="WhatsApp"]');
      await expect(whatsappBtn).toBeVisible();
      const waBox = await whatsappBtn.boundingBox();
      expect(waBox).not.toBeNull();
      if (waBox) {
        // Must be in bottom right quadrant
        expect(waBox.x + waBox.width).toBeGreaterThan(vp.width / 2);
        expect(waBox.y + waBox.height).toBeGreaterThan(vp.height / 2);
      }

      // 4. Check Hub or Brand text is present and visible
      const hubBadge = page.getByText(/(Kathwada|SS304|Apollo Engineering|Solar)/i).first();
      await expect(hubBadge).toBeVisible();

      // 5. Check Solar BOM Calculator or Storefront sections are rendered
      const storeSection = page.locator('text=/Solar|Apollo|Hardware/i').first();
      await expect(storeSection).toBeVisible();

      // 6. Capture screenshot evidence
      const screenshotPath = path.join(ARTIFACT_DIR, `responsive_${vp.name}_${vp.width}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
    });
  }
});
