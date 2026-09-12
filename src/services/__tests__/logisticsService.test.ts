import { describe, it, expect } from 'vitest';
import { 
  calculateSpeedPostTariff, 
  lookupPincode, 
  generateIndiaPostBooking,
  ORIGIN_HUB_PINCODE,
  ORIGIN_HUB_NAME 
} from '../logisticsService';

describe('India Post Speed Post Logistics Engine', () => {
  it('correctly maps Kathwada origin hub (382430)', async () => {
    const hub = await lookupPincode(ORIGIN_HUB_PINCODE);
    expect(hub).toBeDefined();
    expect(hub?.district).toBe('Ahmedabad');
    expect(hub?.state).toBe('Gujarat');
    expect(hub?.stateCode).toBe('24');
    expect(hub?.postOffices.length).toBeGreaterThan(0);
  });

  it('calculates 1-day local Speed Post tariff for Kathwada hub destinations', () => {
    const tariff = calculateSpeedPostTariff('382430', 250); // 250 grams local
    expect(tariff.distanceZone).toBe('LOCAL');
    expect(tariff.deliveryDaysEstimate).toBe(1);
    expect(tariff.tariffBase).toBe(28); // 15 base + 5 + 8
    expect(tariff.totalPostage).toBeGreaterThan(tariff.tariffBase);
  });

  it('calculates Speed Post tariff for National Metro zones (110001 - Delhi)', () => {
    const tariff = calculateSpeedPostTariff('110001', 400); // 400 grams
    expect(tariff.distanceZone).toBe('METRO');
    expect(tariff.deliveryDaysEstimate).toBe(2);
    expect(tariff.tariffBase).toBe(62); // 35 base + 12 + 15
  });

  it('handles zero weight edge case gracefully with base tariff slab', () => {
    const tariff = calculateSpeedPostTariff('382430', 0);
    expect(tariff.tariffBase).toBe(15);
    expect(tariff.deliveryDaysEstimate).toBe(1);
  });

  it('calculates heavy multi-kg parcel tariff (2500 grams)', () => {
    const tariff = calculateSpeedPostTariff('110001', 2500);
    expect(tariff.distanceZone).toBe('METRO');
    // base 62 + 4 * 20 = 142
    expect(tariff.tariffBase).toBe(142);
    expect(tariff.totalPostage).toBe(167.56);
  });

  it('dynamically generates post office metadata for unlisted 6-digit Gujarat pincode (383456)', async () => {
    const info = await lookupPincode('383456');
    expect(info).toBeDefined();
    expect(info?.state).toBe('Gujarat');
    expect(info?.stateCode).toBe('24');
    expect(info?.postOffices[0].deliveryStatus).toBe('Delivery');
  });

  it('fetches all real post offices for Kubernagar Ahmedabad pincode (382340)', async () => {
    const info = await lookupPincode('382340');
    expect(info).toBeDefined();
    expect(info?.pincode).toBe('382340');
    expect(info?.state).toBe('Gujarat');
    expect(info?.stateCode).toBe('24');
    expect(info?.postOffices.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for invalid non-6-digit pincode', async () => {
    expect(await lookupPincode('3824')).toBeNull();
    expect(await lookupPincode('ABCDEF')).toBeNull();
    expect(await lookupPincode('1234567')).toBeNull();
  });

  it('generates valid Speed Post booking with unique EM...IN tracking AWB', () => {
    const dest = {
      id: 'addr_test',
      userId: 'usr_1',
      fullName: 'Test Recipient',
      phone: '9876543210',
      addressType: 'WAREHOUSE' as const,
      flatBuilding: 'Unit 4, Connaught Complex',
      streetArea: 'Barakhamba Road',
      city: 'New Delhi',
      state: 'Delhi',
      stateCode: '07',
      pincode: '110001',
      postOffice: {
        name: 'CONNAUGHT PLACE H.O.',
        branchType: 'Head Post Office' as const,
        deliveryStatus: 'Delivery' as const,
        circle: 'Delhi',
        district: 'New Delhi',
        state: 'Delhi',
        facilityId: 'DL11000101'
      },
      landmark: 'Near Metro Gate 2',
      isDefault: true
    };

    const items = [
      {
        sku: 'AE-SPRINK-SS304-01',
        parentAsin: 'B0C7XY8901',
        productTitle: 'SS304 Sprinkler',
        variantTitle: 'Standard',
        attributes: {},
        imageUrl: '/solar_sprinkler.webp',
        unitPrice: 220,
        mrp: 350,
        gstRate: 18,
        hsnCode: '84248990',
        sellerId: 'apollo_factory',
        sellerName: ORIGIN_HUB_NAME,
        fulfillmentType: 'FBF' as const,
        weightGrams: 200,
        quantity: 5,
        isB2BPricingApplied: false
      }
    ];

    const booking = generateIndiaPostBooking(dest, items);

    expect(booking.articleNumber).toMatch(/^EM[0-9]{8}IN$/);
    expect(booking.originPincode).toBe(ORIGIN_HUB_PINCODE);
    expect(booking.carrier).toBe('INDIA_POST_SPEED_POST');
    expect(booking.totalPostage).toBeGreaterThan(0);
  });
});
