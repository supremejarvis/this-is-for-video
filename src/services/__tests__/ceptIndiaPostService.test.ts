import { describe, it, expect } from 'vitest';
import { ceptIndiaPostService, CEPT_DEFAULT_CONFIG } from '../ceptIndiaPostService';

describe('CEPT India Post Official REST API Service', () => {
  it('authenticates and retrieves JWT tokens via /v1/access/login', async () => {
    const auth = await ceptIndiaPostService.login('username', 'password');
    expect(auth.success).toBe(true);
    expect(auth.data.access_token).toBeDefined();
    expect(auth.data.token_type).toBe('Bearer');
    expect(auth.data.expires_in).toBeGreaterThan(0);
  });

  it('refreshes token via /v1/access/TokenWithRtoken', async () => {
    const refreshed = await ceptIndiaPostService.refreshToken();
    expect(refreshed.success).toBe(true);
    expect(refreshed.data.access_token).toBeDefined();
  });

  it('performs pincode directory search via /v1/pincode-search', async () => {
    const res = await ceptIndiaPostService.searchPincode('570001', 50, 'post');
    expect(res.success).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].pincode).toBe(570001);
    expect(res.data[0].state_name).toBeDefined();
  });

  it('calculates Speed Post dynamic tariffs via /v1/speed-post/tariffs', async () => {
    const tariff = await ceptIndiaPostService.calculateTariff({
      productCode: 'SP',
      weight: 250,
      sourcePincode: '400001',
      destinationPincode: '110001',
      length: 30,
      width: 21,
      height: 5,
      ins: 1000,
      pod: 'YES',
      reg: 'YES',
      otp: 'YES'
    });

    expect(tariff.success).toBe(true);
    expect(tariff.weight).toBe(250);
    expect(tariff.base_tariff).toBeGreaterThan(0);
    expect(tariff.final_amount).toBeGreaterThan(0);
    expect(tariff.currency).toBe('INR');
  });

  it('processes bulk manifest articles via /process-articles-file/{bulk_customer_id}', async () => {
    const manifest = await ceptIndiaPostService.processArticlesManifest(
      CEPT_DEFAULT_CONFIG.bulkCustomerId,
      [
        {
          bulk_customer_id: CEPT_DEFAULT_CONFIG.bulkCustomerId,
          contract_id: CEPT_DEFAULT_CONFIG.contractId,
          barcode_no: 'EB468827991IN',
          pickup_or_dropoff: 'DROPOFF',
          pickup_dropoff_office_id: CEPT_DEFAULT_CONFIG.pickupOfficeId,
          article_type: 'SP',
          physical_weight: 0.25,
          shape_of_article: 'NROL',
          length: 10,
          breadth_diameter: 10,
          height: 5,
          priority_flag: true,
          delivery_instruction: 'ND',
          instruction_rts: 'RTS',
          sender_name: 'Apollo Engineering',
          sender_company: 'Apollo Engineering Pvt Ltd',
          sender_add_line_1: 'Kathwada GIDC',
          sender_add_line_2: 'Ahmedabad',
          sender_city: 'Ahmedabad',
          sender_state: 'Gujarat',
          sender_pincode: '382430',
          sender_emailid: 'admin@apolloengineering.co.in',
          sender_mobile_no: '8511626267',
          receiver_name: 'Solar Plant Site',
          receiver_add_line_1: 'Rooftop Plant',
          receiver_add_line_2: 'Main Road',
          receiver_city: 'New Delhi',
          receiver_state: 'Delhi',
          receiver_pincode: '110001',
          receiver_mobile_no: '9825012345',
          drop_off_pincode: '382430'
        }
      ]
    );

    expect(manifest.success).toBe(true);
    expect(manifest.batch_id).toBeDefined();
    expect(manifest.valid_articles.length).toBe(1);
    expect(manifest.valid_articles[0].barcode_no).toBe('EB468827991IN');
  });

  it('fetches live Speed Post article tracking via /v1/tracking/{trackingNumber}', async () => {
    const tracking = await ceptIndiaPostService.trackArticle('RM019388105IN');
    expect(tracking.success).toBe(true);
    expect(tracking.data.trackingNumber).toBe('RM019388105IN');
    expect(tracking.data.history.length).toBeGreaterThan(0);
    expect(tracking.data.currentStatus).toBeDefined();
  });

  it('fetches bulk tracking data via /v1/tracking/bulk', async () => {
    const bulk = await ceptIndiaPostService.trackBulkArticles(['EB126023474IN', 'EB126023770IN']);
    expect(bulk.success).toBe(true);
    expect(bulk.data.length).toBe(2);
  }, 15000);

  it('creates domestic thermal shipping label via /v1/label/create/domestic', async () => {
    const label = await ceptIndiaPostService.createDomesticShippingLabel({
      identifier: 'Domestic',
      delivery_office_name: 'Rajkot Sau Uni Area SO',
      booking_datetime: new Date().toISOString(),
      channel_type: 'E',
      user_type: 'R',
      user_id: 1516467976,
      barcode_no: 'RK169063347IN',
      service_type: 'LETTER',
      booking_type: 'COM',
      customer_id: 1516467976,
      article_length: '18',
      article_breadth: '15',
      article_height: '3',
      prepaid_flag: true,
      insurance_flag: false,
      insurance_value: 0,
      physical_weight: 50,
      volumetric_weight: 135,
      recipient_name: 'Solar Tech Solutions',
      recipient_mobile: '9825012345',
      recipient_addressl1: 'Plot 42, GIDC',
      recipient_addressl2: 'Industrial Area',
      recipient_city: 'Rajkot',
      recipient_pin: '360005',
      recipient_state: 'Gujarat',
      sender_name: 'Apollo Engineering',
      sender_mobile: '8511626267',
      sender_addressl1: '100 / Gopinath Ind. Landmark',
      sender_addressl2: 'Kathwada GIDC',
      sender_city: 'Ahmedabad',
      sender_pin: '382430',
      sender_state: 'Gujarat',
      routing_data: '-RAJKOT',
      booking_office_pin: '382430',
      size: 'A7',
      total_amount: 45
    });

    expect(label.success).toBe(true);
    expect(label.barcode).toBe('RK169063347IN');
  });
});
