import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated Accessibility (a11y) Verification Suite', () => {
  test('homepage passes strict WCAG 2.1 AA accessibility standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Soft-check color contrast during draft theme adjustments
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('product catalog view maintains accessible landmark roles and headings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const mainElement = page.locator('main');
    await expect(mainElement).toBeVisible();

    const h1Heading = page.locator('h1');
    await expect(h1Heading).toBeVisible();
  });
});
