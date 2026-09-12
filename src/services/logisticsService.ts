import { DeliveryAddress, IndiaPostBookingDetail, PostOfficeInfo, SplitShipmentPackage, CartItem, SellerListing } from '../types';
import { 
  ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME, ORIGIN_STATE_NAME as ORIGIN_STATE, 
  ORIGIN_STATE_CODE, DEFAULT_GST_RATE_PERCENT 
} from '../constants';
import { calculateExclusiveGst } from '../utils/gstCalculations';
import { ceptIndiaPostService } from './ceptIndiaPostService';

export { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME, ORIGIN_STATE, ORIGIN_STATE_CODE };
export { ceptIndiaPostService };
export const ORIGIN_FACILITY_ID = 'GJ38243001';

export const PINCODE_DIRECTORY: Record<string, { district: string; state: string; stateCode: string; postOffices: PostOfficeInfo[] }> = {
  '382430': {
    district: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    postOffices: [
      { name: 'KATHWADA GIDC S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: '21260024' },
      { name: 'KATHWADA S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38243002' },
      { name: 'SINGARVA B.O.', branchType: 'Branch Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38243003' }
    ]
  },
  '380001': {
    district: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    postOffices: [
      { name: 'AHMEDABAD G.P.O.', branchType: 'Head Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38000101' },
      { name: 'BHADRA S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38000102' },
      { name: 'LAL DARWAJA S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38000103' },
      { name: 'DRIVE IN ROAD S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38000104' }
    ]
  },
  '380054': {
    district: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    postOffices: [
      { name: 'BODAKDEV S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38005401' },
      { name: 'THALTEJ S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38005402' },
      { name: 'VASTRAPUR S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Gujarat', district: 'Ahmedabad', state: 'Gujarat', facilityId: 'GJ38005403' }
    ]
  },
  '110001': {
    district: 'New Delhi',
    state: 'Delhi',
    stateCode: '07',
    postOffices: [
      { name: 'CONNAUGHT PLACE H.O.', branchType: 'Head Post Office', deliveryStatus: 'Delivery', circle: 'Delhi', district: 'New Delhi', state: 'Delhi', facilityId: 'DL11000101' },
      { name: 'BARODA HOUSE S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Delhi', district: 'New Delhi', state: 'Delhi', facilityId: 'DL11000102' },
      { name: 'JANPATH S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Delhi', district: 'New Delhi', state: 'Delhi', facilityId: 'DL11000103' },
      { name: 'PARLIAMENT HOUSE S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Delhi', district: 'New Delhi', state: 'Delhi', facilityId: 'DL11000104' }
    ]
  },
  '400001': {
    district: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    postOffices: [
      { name: 'MUMBAI G.P.O.', branchType: 'Head Post Office', deliveryStatus: 'Delivery', circle: 'Maharashtra', district: 'Mumbai', state: 'Maharashtra', facilityId: 'MH40000101' },
      { name: 'FORT S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Maharashtra', district: 'Mumbai', state: 'Maharashtra', facilityId: 'MH40000102' },
      { name: 'STOCK EXCHANGE S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Maharashtra', district: 'Mumbai', state: 'Maharashtra', facilityId: 'MH40000103' },
      { name: 'BAZARGATE S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Maharashtra', district: 'Mumbai', state: 'Maharashtra', facilityId: 'MH40000104' }
    ]
  },
  '560001': {
    district: 'Bangalore',
    state: 'Karnataka',
    stateCode: '29',
    postOffices: [
      { name: 'BANGALORE G.P.O.', branchType: 'Head Post Office', deliveryStatus: 'Delivery', circle: 'Karnataka', district: 'Bangalore', state: 'Karnataka', facilityId: 'KA56000101' },
      { name: 'VIDHANA SOUDHA S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Karnataka', district: 'Bangalore', state: 'Karnataka', facilityId: 'KA56000102' },
      { name: 'MAHATMA GANDHI ROAD S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Karnataka', district: 'Bangalore', state: 'Karnataka', facilityId: 'KA56000103' }
    ]
  },
  '600001': {
    district: 'Chennai',
    state: 'Tamil Nadu',
    stateCode: '33',
    postOffices: [
      { name: 'CHENNAI G.P.O.', branchType: 'Head Post Office', deliveryStatus: 'Delivery', circle: 'Tamil Nadu', district: 'Chennai', state: 'Tamil Nadu', facilityId: 'TN60000101' },
      { name: 'PARRYS S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Tamil Nadu', district: 'Chennai', state: 'Tamil Nadu', facilityId: 'TN60000102' },
      { name: 'HIGH COURT BUILDING S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'Tamil Nadu', district: 'Chennai', state: 'Tamil Nadu', facilityId: 'TN60000103' }
    ]
  },
  '700001': {
    district: 'Kolkata',
    state: 'West Bengal',
    stateCode: '19',
    postOffices: [
      { name: 'KOLKATA G.P.O.', branchType: 'Head Post Office', deliveryStatus: 'Delivery', circle: 'West Bengal', district: 'Kolkata', state: 'West Bengal', facilityId: 'WB70000101' },
      { name: 'DALHOUSIE SQUARE S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'West Bengal', district: 'Kolkata', state: 'West Bengal', facilityId: 'WB70000102' },
      { name: 'ESPLANADE S.O.', branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: 'West Bengal', district: 'Kolkata', state: 'West Bengal', facilityId: 'WB70000103' }
    ]
  }
};

// In-memory cache for fast responsive lookups
const pincodeMemoryCache: Record<string, { district: string; state: string; stateCode: string; postOffices: PostOfficeInfo[] }> = {};

/**
 * Official 2-digit GST State Code mapping
 */
export function getGstStateCode(stateName: string, pincode?: string): string {
  const norm = (stateName || '').trim().toLowerCase();
  const stateMap: Record<string, string> = {
    'jammu and kashmir': '01',
    'jammu & kashmir': '01',
    'himachal pradesh': '02',
    'punjab': '03',
    'chandigarh': '04',
    'uttarakhand': '05',
    'haryana': '06',
    'delhi': '07',
    'new delhi': '07',
    'rajasthan': '08',
    'uttar pradesh': '09',
    'bihar': '10',
    'sikkim': '11',
    'arunachal pradesh': '12',
    'nagaland': '13',
    'manipur': '14',
    'mizoram': '15',
    'tripura': '16',
    'meghalaya': '17',
    'assam': '18',
    'west bengal': '19',
    'jharkhand': '20',
    'odisha': '21',
    'orissa': '21',
    'chhattisgarh': '22',
    'madhya pradesh': '23',
    'gujarat': '24',
    'dadra and nagar haveli and daman and diu': '26',
    'daman and diu': '26',
    'maharashtra': '27',
    'andhra pradesh': '37',
    'karnataka': '29',
    'goa': '30',
    'lakshadweep': '31',
    'kerala': '32',
    'tamil nadu': '33',
    'puducherry': '34',
    'pondicherry': '34',
    'andaman and nicobar islands': '35',
    'telangana': '36',
    'ladakh': '38'
  };

  for (const [key, code] of Object.entries(stateMap)) {
    if (norm.includes(key)) return code;
  }

  if (pincode) {
    const p2 = pincode.slice(0, 2);
    if (['36', '37', '38', '39'].includes(p2)) return '24';
    if (p2 === '11') return '07';
    if (['40', '41', '42', '43', '44'].includes(p2)) return '27';
    if (['56', '57', '58', '59'].includes(p2)) return '29';
    if (['60', '61', '62', '63', '64'].includes(p2)) return '33';
    if (['70', '71', '72', '73', '74'].includes(p2)) return '19';
    if (['30', '31', '32', '33', '34'].includes(p2)) return '08';
    if (['20', '21', '22', '23', '24', '25', '26', '27', '28'].includes(p2)) return '09';
  }

  return '24';
}

export async function lookupPincode(pincode: string): Promise<{
  pincode: string;
  district: string;
  state: string;
  stateCode: string;
  postOffices: PostOfficeInfo[];
} | null> {
  const cleanPin = pincode.trim();
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) return null;

  // 1. Check in-memory cache
  if (pincodeMemoryCache[cleanPin]) {
    return { pincode: cleanPin, ...pincodeMemoryCache[cleanPin] };
  }

  // 2. Query Live India Post Open Pincode Directory API
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      method: 'GET',
      headers: { 'accept': 'application/json' },
      signal: controller?.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json) && json.length > 0 && json[0].Status === 'Success' && Array.isArray(json[0].PostOffice) && json[0].PostOffice.length > 0) {
        const rawOffices = json[0].PostOffice;
        const firstPo = rawOffices[0];
        const state = firstPo.State || 'Gujarat';
        const district = firstPo.District || firstPo.Division || firstPo.Region || 'Ahmedabad';
        const stateCode = getGstStateCode(state, cleanPin);

        const postOffices: PostOfficeInfo[] = rawOffices.map((po: any, idx: number) => {
          const branchType = po.BranchType || 'Sub Post Office';
          const deliveryStatus = po.DeliveryStatus === 'Delivery' ? 'Delivery' : 'Non-Delivery';
          const rawName = (po.Name || `Post Office ${cleanPin}`).trim();
          
          let formattedName = rawName.toUpperCase();
          if (branchType === 'Head Post Office' && !formattedName.includes('H.O') && !formattedName.includes('G.P.O')) {
            formattedName += ' H.O.';
          } else if (branchType === 'Sub Post Office' && !formattedName.includes('S.O')) {
            formattedName += ' S.O.';
          } else if (branchType === 'Branch Post Office' && !formattedName.includes('B.O')) {
            formattedName += ' B.O.';
          }

          return {
            name: formattedName,
            branchType,
            deliveryStatus,
            circle: po.Circle || state,
            district: po.District || district,
            state: po.State || state,
            facilityId: `IN${cleanPin}_${(idx + 1).toString().padStart(2, '0')}`
          };
        });

        const result = { district, state, stateCode, postOffices };
        pincodeMemoryCache[cleanPin] = result;
        return { pincode: cleanPin, ...result };
      }
    }
  } catch {
    // Fallthrough to CEPT and local directory
  }

  // 3. Attempt CEPT Official Gateway Search
  try {
    const ceptRes = await ceptIndiaPostService.searchPincode(cleanPin);
    if (ceptRes && ceptRes.success && Array.isArray(ceptRes.data) && ceptRes.data.length > 0) {
      const firstOffice = ceptRes.data[0];
      const state = firstOffice.state_name || 'Gujarat';
      const district = firstOffice.city_name || firstOffice.taluk_name || 'Ahmedabad';
      const stateCode = getGstStateCode(state, cleanPin);

      const postOffices: PostOfficeInfo[] = ceptRes.data.map((off, idx) => ({
        name: off.office_name,
        branchType: off.office_type_code === 'SPO' ? 'Sub Post Office' : off.office_type_code === 'HO' ? 'Head Post Office' : 'Branch Post Office',
        deliveryStatus: off.delivery_office_flag ? 'Delivery' : 'Non-Delivery',
        circle: off.state_name || state,
        district: off.city_name || off.taluk_name || district,
        state: off.state_name || state,
        facilityId: off.office_id || `IN${cleanPin}_${(idx + 1).toString().padStart(2, '0')}`
      }));

      const result = { district, state, stateCode, postOffices };
      pincodeMemoryCache[cleanPin] = result;
      return { pincode: cleanPin, ...result };
    }
  } catch {
    // Fallthrough to local directory
  }

  // 4. Check Pre-loaded Pincode Directory
  if (PINCODE_DIRECTORY[cleanPin]) {
    pincodeMemoryCache[cleanPin] = PINCODE_DIRECTORY[cleanPin];
    return { pincode: cleanPin, ...PINCODE_DIRECTORY[cleanPin] };
  }

  // 5. Dynamic localized fallback generator
  const first2 = cleanPin.substring(0, 2);
  let state = 'Gujarat';
  let stateCode = '24';
  let district = 'Ahmedabad Area';

  if (first2 === '38' || first2 === '39' || first2 === '36' || first2 === '37') {
    state = 'Gujarat';
    stateCode = '24';
    district = 'Ahmedabad Area';
  } else if (first2 === '11') {
    state = 'Delhi';
    stateCode = '07';
    district = 'Central Delhi';
  } else if (first2 === '40' || first2 === '41' || first2 === '42') {
    state = 'Maharashtra';
    stateCode = '27';
    district = 'Western Division';
  } else if (first2 === '56' || first2 === '57') {
    state = 'Karnataka';
    stateCode = '29';
    district = 'Bengaluru Division';
  }

  const fallbackResult = {
    district,
    state,
    stateCode,
    postOffices: [
      { name: `MAIN SUB POST OFFICE (${cleanPin}) S.O.`, branchType: 'Sub Post Office', deliveryStatus: 'Delivery', circle: state, district, state, facilityId: `IN${cleanPin}_01` },
      { name: `TOWN BRANCH POST OFFICE (${cleanPin}) B.O.`, branchType: 'Branch Post Office', deliveryStatus: 'Delivery', circle: state, district, state, facilityId: `IN${cleanPin}_02` }
    ]
  };

  pincodeMemoryCache[cleanPin] = fallbackResult;
  return { pincode: cleanPin, ...fallbackResult };
}

export function isLocalPincode(destPincode: string): boolean {
  const pin = (destPincode || '').trim();
  if (pin === ORIGIN_HUB_PINCODE) return true;
  // Local delivery hub zone in Ahmedabad (382430 / 380xxx / 3823xx / 3824xx)
  if (pin.startsWith('380') || pin.startsWith('3824') || pin.startsWith('3823')) return true;
  return false;
}

export function isMetroPincode(destPincode: string): boolean {
  const pin = (destPincode || '').trim();
  // National Metro Hubs (Delhi NCR, Mumbai/MMR, Kolkata, Chennai, Bengaluru, Hyderabad, Pune)
  if (pin.startsWith('11') || pin.startsWith('121') || pin.startsWith('122') || pin.startsWith('201')) return true;
  if (pin.startsWith('400') || pin.startsWith('401')) return true;
  if (pin.startsWith('700')) return true;
  if (pin.startsWith('600')) return true;
  if (pin.startsWith('560')) return true;
  if (pin.startsWith('500')) return true;
  if (pin.startsWith('411')) return true;
  return false;
}

export function calculateSpeedPostTariff(
  destPincode: string,
  weightGrams: number
): {
  tariffBase: number;
  gstAmount: number;
  totalPostage: number;
  distanceZone: 'LOCAL' | 'INTRASTATE' | 'METRO' | 'REST_OF_INDIA';
  deliveryDaysEstimate: number;
} {
  const cleanPin = (destPincode || '').trim();
  const isLocal = isLocalPincode(cleanPin);
  const isIntrastate = !isLocal && (cleanPin.startsWith('36') || cleanPin.startsWith('37') || cleanPin.startsWith('38') || cleanPin.startsWith('39'));
  const isMetro = !isLocal && !isIntrastate && isMetroPincode(cleanPin);

  let distanceZone: 'LOCAL' | 'INTRASTATE' | 'METRO' | 'REST_OF_INDIA' = 'REST_OF_INDIA';
  let base50g = 45;
  let add50gTo200g = 15;
  let add200gTo500g = 20;
  let addPer500gThereafter = 25;
  let deliveryDaysEstimate = 3;

  if (isLocal) {
    distanceZone = 'LOCAL';
    base50g = 15;
    add50gTo200g = 5;
    add200gTo500g = 8;
    addPer500gThereafter = 10;
    deliveryDaysEstimate = 1;
  } else if (isIntrastate) {
    distanceZone = 'INTRASTATE';
    base50g = 25;
    add50gTo200g = 8;
    add200gTo500g = 12;
    addPer500gThereafter = 15;
    deliveryDaysEstimate = 1;
  } else if (isMetro) {
    distanceZone = 'METRO';
    base50g = 35;
    add50gTo200g = 12;
    add200gTo500g = 15;
    addPer500gThereafter = 20;
    deliveryDaysEstimate = 2;
  }

  const effectiveWeight = Math.max(0, weightGrams);
  let tariffBase = base50g;
  if (effectiveWeight > 50 && effectiveWeight <= 200) {
    tariffBase = base50g + add50gTo200g;
  } else if (effectiveWeight > 200 && effectiveWeight <= 500) {
    tariffBase = base50g + add50gTo200g + add200gTo500g;
  } else if (effectiveWeight > 500) {
    const extraWeight = effectiveWeight - 500;
    const extraSlabs = Math.ceil(extraWeight / 500);
    tariffBase = base50g + add50gTo200g + add200gTo500g + (extraSlabs * addPer500gThereafter);
  }

  const taxCalculation = calculateExclusiveGst(tariffBase, DEFAULT_GST_RATE_PERCENT, isIntrastate || isLocal);
  const gstAmount = taxCalculation.totalTax;
  const totalPostage = taxCalculation.grossAmount;

  return {
    tariffBase,
    gstAmount,
    totalPostage,
    distanceZone,
    deliveryDaysEstimate
  };
}

export function generateIndiaPostBooking(
  destAddress: DeliveryAddress,
  items: CartItem[]
): IndiaPostBookingDetail {
  const totalWeight = items.reduce((sum, item) => sum + (item.weightGrams * item.quantity), 0) || 0;
  const timestampSuffix = Date.now().toString().slice(-6);
  const randomPrefix = Math.floor(10 + Math.random() * 90);
  const articleNumber = `EM${randomPrefix}${timestampSuffix}IN`;
  const tariff = calculateSpeedPostTariff(destAddress.pincode, totalWeight);

  return {
    articleNumber,
    originPincode: ORIGIN_HUB_PINCODE,
    originHubName: ORIGIN_HUB_NAME,
    destinationPincode: destAddress.pincode,
    destinationPostOffice: destAddress.postOffice.name,
    bookingTimestamp: new Date().toISOString(),
    weightGrams: totalWeight,
    chargeableWeightGrams: totalWeight,
    tariffAmount: tariff.tariffBase,
    gstAmount: tariff.gstAmount,
    totalPostage: tariff.totalPostage,
    barcode128: articleNumber,
    manifestId: `MNF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-382430-01`,
    carrier: 'INDIA_POST_SPEED_POST'
  };
}

/**
 * 📦 Buy Box Algorithm Engine
 * Computes the winning seller for a given ASIN using the APE Store weighted score:
 * 
 * $S_{bb} = (w_1 \cdot \text{PriceScore}) + (w_2 \cdot \text{ShippingSpeedScore}) + (w_3 \cdot \text{SellerRating}) + (w_4 \cdot \text{FulfillmentType})$
 * 
 * Weights: w1=0.40, w2=0.25, w3=0.20, w4=0.15
 */
export function calculateBuyBoxScore(
  listing: SellerListing,
  customerPincode: string,
  isB2B: boolean = false
): number {
  // w1: Price Score (lower price = higher score, normalized 0-1)
  const priceScore = Math.max(0, 1 - (listing.price - 100) / 5000); // simplified normalization
  
  // w2: Shipping Speed Score (faster delivery = higher score)
  const deliveryDays = listing.deliveryDays;
  const speedScore = deliveryDays <= 1 ? 1.0 : deliveryDays <= 3 ? 0.8 : deliveryDays <= 7 ? 0.5 : 0.2;
  
  // w3: Seller Rating (normalized to 0-1, assuming max rating 5.0)
  const ratingScore = listing.rating / 5.0;
  
  // w4: Fulfillment Type (FBF gets slight preference over FBM)
  const fulfillmentScore = listing.fulfillmentType === 'FBF' ? 1.0 : 0.9;
  
  const weights = { price: 0.40, shipping: 0.25, rating: 0.20, fulfillment: 0.15 };
  
  const score = 
    (weights.price * priceScore) + 
    (weights.shipping * speedScore) + 
    (weights.rating * ratingScore) + 
    (weights.fulfillment * fulfillmentScore);
  
  return Math.round(score * 100) / 100;
}

/**
 * Determine distance zone and shipping score for Buy Box
 */
export function getShippingSpeedScore(destPincode: string, originPincode: string = '382430'): 'FAST' | 'MODERATE' | 'SLOW' {
  const isLocal = destPincode === originPincode;
  const isIntrastate = destPincode.startsWith('36') || destPincode.startsWith('37') || destPincode.startsWith('38') || destPincode.startsWith('39');
  const isMetro = ['110001', '400001', '560001', '600001', '700001'].includes(destPincode);

  if (isLocal) return 'FAST';
  if (isIntrastate) return 'MODERATE';
  if (isMetro) return 'MODERATE';
  return 'SLOW';
}
