import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CatalogService, ApiProduct } from '../services/catalogService';
import { QuoteService, CreateQuotePayload, AuthoritativeQuote } from '../services/quoteService';
import { getTranslation, SUPPORTED_LANGUAGES } from '../utils/i18n';
import { useStore } from '../store/useStore';

describe('Gate 2C: Buyer Catalog & Authoritative Cart Quote', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      cart: [],
      currentQuote: null,
      quoteStatus: 'EMPTY_CART',
      quoteError: null,
      quotePaymentMethod: 'PREPAID',
      destinationPincode: '382430',
      selectedLanguage: 'en',
    });
  });

  describe('1. Database-Driven Buyer Catalog (28/30/33/35/40 mm)', () => {
    it('fetches catalog and maps structured frame thickness fits accurately', async () => {
      const mockApiCatalog: ApiProduct[] = [
        {
          id: 'b5a0f671-55fa-4f96-857e-e5adfa7f1396',
          sku_prefix: 'APE-SC',
          name: 'Apollo SS304 Solar Panel Clamp',
          description: 'Industrial SS304 solar mounting clamp with structured thickness fits',
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
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiCatalog,
      } as Response);

      const products = await CatalogService.getCatalog();
      expect(products.length).toBe(1);
      const variants = products[0].variants;
      expect(variants.length).toBe(5);

      const thicknessValues = variants.map(v => v.frame_thickness_mm);
      expect(thicknessValues).toEqual([28, 30, 33, 35, 40]);

      // Confirms all variants are strictly EXACT fit
      variants.forEach(v => {
        expect(v.fit_mode).toBe('EXACT');
        expect(v.min_thickness_mm).toBeNull();
        expect(v.max_thickness_mm).toBeNull();
      });
    });

    it('preserves public B2C boundaries (no supplier or internal cost fields)', async () => {
      const mockApiCatalog: ApiProduct[] = [
        {
          id: 'prod-1',
          sku_prefix: 'APE-SC',
          name: 'Solar Clamp',
          description: 'SS304 Clamp',
          hsn_code: '73269099',
          is_active: true,
          is_archived: false,
          version: 1,
          created_at: '2026-09-05T12:00:00Z',
          updated_at: '2026-09-05T12:00:00Z',
          variants: [],
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiCatalog,
      } as Response);

      const products = await CatalogService.getCatalog();
      const rawProduct = products[0] as unknown as Record<string, unknown>;
      expect(rawProduct.supplier_id).toBeUndefined();
      expect(rawProduct.cost_price).toBeUndefined();
      expect(rawProduct.internal_ledger).toBeUndefined();
    });
  });

  describe('2. Authoritative Server Quote Generation', () => {
    it('validates 6-digit Indian PIN code and rejects invalid values before API call', async () => {
      const invalidPayloads = [
        { destination_pincode: '012345', items: [{ sku: 'APE-SC-28.00MM', quantity: 1 }] },
        { destination_pincode: '38243', items: [{ sku: 'APE-SC-28.00MM', quantity: 1 }] },
        { destination_pincode: 'ABCDEF', items: [{ sku: 'APE-SC-28.00MM', quantity: 1 }] },
        { destination_pincode: '', items: [{ sku: 'APE-SC-28.00MM', quantity: 1 }] },
      ];

      for (const payload of invalidPayloads) {
        await expect(QuoteService.requestQuote(payload)).rejects.toThrow(/PIN code/i);
      }
    });

    it('rejects quote generation for empty cart', async () => {
      const payload: CreateQuotePayload = {
        destination_pincode: '382430',
        items: [],
      };
      await expect(QuoteService.requestQuote(payload)).rejects.toThrow(/Cart must contain at least one item/i);
    });

    it('sends only variant identifier and quantity (no client-dictated unit prices)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async (): Promise<AuthoritativeQuote> => ({
          quote_id: 'q-101',
          quote_number: 'APE-Q-2026-ABCD1234',
          idempotency_key: null,
          calculation_version: '1.0.0',
          catalog_version: '1.0.0',
          destination_pincode: '382430',
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
            },
          ],
          subtotal_taxable: '33.90',
          total_product_gst: '6.10',
          total_product_gross: '40.00',
          base_shipping: '60.00',
          shipping_gst: '10.80',
          shipping_total: '70.80',
          prepaid_total: '110.80',
          cod_surcharge: '2.77',
          cod_raw_total: '113.57',
          cod_total: '115.00',
          rounding_multiple: 5,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        }),
      } as Response);

      const payload: CreateQuotePayload = {
        destination_pincode: '382430',
        payment_method: 'PREPAID',
        items: [
          {
            sku: 'APE-SC-35.00MM',
            variant_id: 'v-35mm',
            quantity: 2,
          },
        ],
      };

      const quote = await QuoteService.requestQuote(payload);

      // Verify what was sent to backend
      const requestCall = fetchSpy.mock.calls[0];
      const requestBody = JSON.parse(requestCall[1]?.body as string);
      expect(requestBody.destination_pincode).toBe('382430');
      expect(requestBody.items[0]).toEqual({
        variant_id: 'v-35mm',
        sku: 'APE-SC-35.00MM',
        quantity: 2,
      });
      // Explicit invariant: client cannot supply unit_price in request
      expect(requestBody.items[0].unit_price).toBeUndefined();

      // Verify complete authoritative monetary breakdown returned
      expect(quote.subtotal_taxable).toBe('33.90');
      expect(quote.total_product_gst).toBe('6.10');
      expect(quote.total_product_gross).toBe('40.00');
      expect(quote.base_shipping).toBe('60.00');
      expect(quote.shipping_gst).toBe('10.80');
      expect(quote.shipping_total).toBe('70.80');
      expect(quote.prepaid_total).toBe('110.80');
      expect(quote.cod_surcharge).toBe('2.77');
      expect(quote.cod_total).toBe('115.00');
    });
  });

  describe('3. Storefront State Invariants & Quote Transitions', () => {
    it('sets quoteStatus to QUOTE_REQUIRED whenever cart items or quantities change after an active quote', () => {
      const store = useStore.getState();

      // Hydrate with a valid quote
      useStore.setState({
        currentQuote: {
          quote_id: 'q-101',
          quote_number: 'APE-Q-1',
          idempotency_key: null,
          calculation_version: '1.0.0',
          catalog_version: '1.0.0',
          destination_pincode: '382430',
          items: [],
          subtotal_taxable: '33.90',
          total_product_gst: '6.10',
          total_product_gross: '40.00',
          base_shipping: '60.00',
          shipping_gst: '10.80',
          shipping_total: '70.80',
          prepaid_total: '110.80',
          cod_surcharge: '2.77',
          cod_raw_total: '113.57',
          cod_total: '115.00',
          rounding_multiple: 5,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
        quoteStatus: 'QUOTE_VALID',
      });

      expect(useStore.getState().quoteStatus).toBe('QUOTE_VALID');

      // Update quantity -> Must become QUOTE_REQUIRED
      store.addToCart({
        sku: 'APE-SC-28.00MM',
        parentAsin: 'prod-1',
        productTitle: 'Solar Clamp',
        variantTitle: '28mm',
        attributes: {},
        imageUrl: '/test.png',
        unitPrice: 20,
        mrp: 30,
        gstRate: 18,
        hsnCode: '73269099',
        sellerId: 's1',
        sellerName: 'Apollo',
        fulfillmentType: 'FBF',
        weightGrams: 45,
        isB2BPricingApplied: false,
      }, 1);

      expect(useStore.getState().quoteStatus).toBe('QUOTE_REQUIRED');

      // Reset to QUOTE_VALID and test PIN code change -> Must become QUOTE_REQUIRED
      useStore.setState({ quoteStatus: 'QUOTE_VALID' });
      store.setDestinationPincode('380001');
      expect(useStore.getState().quoteStatus).toBe('QUOTE_REQUIRED');

      // Reset to QUOTE_VALID and test payment method toggle -> Must become QUOTE_REQUIRED
      useStore.setState({ quoteStatus: 'QUOTE_VALID' });
      store.setQuotePaymentMethod('COD');
      expect(useStore.getState().quoteStatus).toBe('QUOTE_REQUIRED');
    });
  });

  describe('4. Multi-Lingual Architecture (Gujarati, Hindi, English)', () => {
    it('provides complete statutory and sizing translations in Gujarati, Hindi, and English', () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(3);

      const en = getTranslation('en');
      const gu = getTranslation('gu');
      const hi = getTranslation('hi');

      // English
      expect(en.cartTitle).toContain('Your Cart');
      expect(en.productGst).toContain('Product GST');
      expect(en.popularRooftop).toBe('Popular Rooftop');
      expect(en.bifacialTopcon).toBe('Bifacial / TOPCon');

      // Gujarati
      expect(gu.cartTitle).toContain('તમારી કાર્ટ');
      expect(gu.taxableValue).toContain('કરપાત્ર મૂલ્ય');
      expect(gu.popularRooftop).toBe('લોકપ્રિય રૂફટોપ');
      expect(gu.bifacialTopcon).toBe('બાયફેશિયલ / TOPCon');

      // Hindi
      expect(hi.cartTitle).toContain('आपकी कार्ट');
      expect(hi.taxableValue).toContain('कर योग्य माल मूल्य');
      expect(hi.popularRooftop).toBe('लोकप्रिय रूफटॉप');
      expect(hi.bifacialTopcon).toBe('बायफेशियल / TOPCon');
    });
  });
});
