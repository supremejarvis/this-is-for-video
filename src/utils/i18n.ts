/**
 * Apollo Engineering Multi-Lingual Architecture (i18n)
 * Provides deterministic localized strings for English, Gujarati (ગુજરાતી), and Hindi (हिन्दी).
 */

export type SupportedLanguage = 'en' | 'gu' | 'hi';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
];

export const TRANSLATIONS = {
  en: {
    // Header & Brand
    brandName: 'Apollo Engineering',
    tagline: 'Precision SS304 Solar Cleaning Hardware',
    originHub: 'Direct Factory Dispatch: Kathwada GIDC, Ahmedabad (382430)',
    selectLanguage: 'Language',
    
    // Catalog & Sizing
    catalogTitle: 'Solar Panel Clamps & Cleaning Hardware',
    catalogSubtitle: 'Database-driven precision AISI SS304 clamps with structured frame thickness fits.',
    frameThicknessLabel: 'Solar Frame Thickness:',
    sizingGuide: 'Sizing Guide',
    viewDetails: 'View Product Details',
    addToCart: 'Add to Cart',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    popularRooftop: 'Popular Rooftop',
    bifacialTopcon: 'Bifacial / TOPCon',
    thinProfile: 'Thin Profile',
    utility72Cell: 'Utility 72-Cell',
    polyMonoStandard: 'Standard Clamp',
    
    // Cart & Quote
    cartTitle: 'Your Cart',
    cartSubtitle: 'Direct Factory Dispatch from Kathwada GIDC, Ahmedabad (382430)',
    emptyCartTitle: 'Your Cart is Empty',
    emptyCartDesc: 'Explore our catalog and select SS304 Solar hardware for instant quote.',
    destinationPincode: 'Destination PIN Code',
    pincodePlaceholder: 'Enter 6-digit PIN code (e.g. 380001)',
    invalidPincode: 'Please enter a valid 6-digit Indian PIN code',
    paymentMethod: 'Payment Method',
    prepaidUpi: 'Prepaid (UPI / NetBanking)',
    prepaidDesc: 'Zero handling charge • Fast India Post dispatch',
    cod: 'Cash on Delivery (COD)',
    codDesc: 'Handling charge & round-off applied',
    
    // Statutory Breakdown
    quoteBreakdownTitle: 'Tax & Freight Breakdown',
    taxableValue: 'Taxable Goods Value',
    productGstLabel: 'Product GST',
    productGst: 'Product GST',
    productGross: 'Product Line Total (incl. GST)',
    speedPostFreight: 'Speed Post Base Freight',
    shippingGstLabel: 'Shipping GST',
    shippingGst: 'Shipping GST',
    shippingTotal: 'Total Shipping Freight',
    prepaidPayable: 'Prepaid Total Amount',
    prepaidTotalLabel: 'Prepaid Total',
    codHandlingCharge: 'COD Handling Charge',
    codRoundingAdjustment: 'Rounding Adjustment',
    codPayable: 'Final COD Payable Amount',
    quoteId: 'Quote Number',
    quoteValidUntil: 'Quote Valid Until',
    quoteExpired: 'Quote Expired',
    quoteStale: 'Cart or PIN changed. Recalculate to verify current rates.',
    recalculateQuote: 'Calculate Total',
    calculatingQuote: 'Calculating Total...',
    authoritativeBadge: 'Direct Factory Verification',
    zeroJsMathNotice: 'Direct Factory Dispatch from Kathwada GIDC, Ahmedabad (382430)',
    shippingProvenanceLive: 'Live Speed Post Rate',
    shippingProvenanceFallback: 'Standard Rate Table',
  },
  gu: {
    // Header & Brand
    brandName: 'એપોલો એન્જિનિયરિંગ',
    tagline: 'ઉચ્ચ ગુણવત્તાવાળા SS304 સોલર ક્લિનિંગ હાર્ડવેર',
    originHub: 'ફેક્ટરી ડાયરેક્ટ ડિસ્પેચ: કઠવાડા જીઆઈડીસી, અમદાવાદ (૩૮૨૪૩૦)',
    selectLanguage: 'ભાષા',
    
    // Catalog & Sizing
    catalogTitle: 'સોલર પેનલ ક્લેમ્પ્સ અને ક્લિનિંગ હાર્ડવેર',
    catalogSubtitle: 'ડેટાબેઝ-સંચાલિત ઉચ્ચ ગુણવત્તાવાળા AISI SS304 ક્લેમ્પ્સ ચોક્કસ ફ્રેમ માપ સાથે.',
    frameThicknessLabel: 'સોલર ફ્રેમ જાડાઈ (Thickness):',
    sizingGuide: 'માપ માર્ગદર્શિકા',
    viewDetails: 'વિગતો જુઓ',
    addToCart: 'કાર્ટમાં ઉમેરો',
    inStock: 'સ્ટોક ઉપલબ્ધ છે',
    outOfStock: 'સ્ટોક ખાલી છે',
    popularRooftop: 'લોકપ્રિય રૂફટોપ',
    bifacialTopcon: 'બાયફેશિયલ / TOPCon',
    thinProfile: 'પાતળી પ્રોફાઇલ',
    utility72Cell: 'યુટિલિટી ૭૨-સેલ',
    polyMonoStandard: 'સ્ટાન્ડર્ડ ક્લેમ્પ',
    
    // Cart & Quote
    cartTitle: 'તમારી કાર્ટ',
    cartSubtitle: 'કઠવાડા જીઆઈડીસી, અમદાવાદ (૩૮૨૪૩૦) થી સીધું ડિસ્પેચ',
    emptyCartTitle: 'તમારું કાર્ટ ખાલી છે',
    emptyCartDesc: 'અમારા કેટલોગમાંથી SS304 સોલર હાર્ડવેર પસંદ કરો અને તાત્કાલિક ક્વોટ મેળવો.',
    destinationPincode: 'ડિલિવરી પિનકોડ',
    pincodePlaceholder: '૬-અંકનો પિનકોડ દાખલ કરો (દા.ત. 380001)',
    invalidPincode: 'કૃપા કરીને માન્ય ૬-અંકનો ભારતીય પિનકોડ દાખલ કરો',
    paymentMethod: 'ચુકવણી પદ્ધતિ',
    prepaidUpi: 'પ્રિપેડ (UPI / નેટ બેંકિંગ)',
    prepaidDesc: 'કોઈ હેન્ડલિંગ ચાર્જ નહીં • સ્પીડ પોસ્ટ ઝડપી રવાનગી',
    cod: 'કેશ ઓન ડિલિવરી (COD)',
    codDesc: 'હેન્ડલિંગ ચાર્જ અને રાઉન્ડ-ઓફ લાગુ થશે',
    
    // Statutory Breakdown
    quoteBreakdownTitle: 'કર અને શિપિંગ વિગતો',
    taxableValue: 'માલનું કરપાત્ર મૂલ્ય',
    productGstLabel: 'પ્રોડક્ટ GST',
    productGst: 'પ્રોડક્ટ GST',
    productGross: 'પ્રોડક્ટ કુલ રકમ (GST સહિત)',
    speedPostFreight: 'સ્પીડ પોસ્ટ મૂળ નૂર',
    shippingGstLabel: 'શિપિંગ GST',
    shippingGst: 'શિપિંગ GST',
    shippingTotal: 'કુલ શિપિંગ નૂર',
    prepaidPayable: 'પ્રિપેડ ચૂકવવાપાત્ર રકમ',
    prepaidTotalLabel: 'પ્રિપેડ કુલ રકમ',
    codHandlingCharge: 'COD હેન્ડલિંગ ચાર્જ',
    codRoundingAdjustment: 'રાઉન્ડિંગ એડજસ્ટમેન્ટ',
    codPayable: 'અંતિમ ચૂકવવાપાત્ર રકમ (COD)',
    quoteId: 'ક્વોટ નંબર',
    quoteValidUntil: 'ક્વોટ માન્યતા સમય',
    quoteExpired: 'ક્વોટની સમયમર્યાદા પૂરી થઈ',
    quoteStale: 'કાર્ટ અથવા પિનકોડ બદલાયો છે. દરો ચકાસવા માટે ફરી ગણતરી કરો.',
    recalculateQuote: 'કુલ ગણતરી કરો',
    calculatingQuote: 'ગણતરી થઈ રહી છે...',
    authoritativeBadge: 'ડાયરેક્ટ ફેક્ટરી ચકાસણી',
    zeroJsMathNotice: 'કઠવાડા જીઆઈડીસી, અમદાવાદ (૩૮૨૪૩૦) થી સીધું ડિસ્પેચ',
    shippingProvenanceLive: 'લાઇવ સ્પીડ પોસ્ટ દર',
    shippingProvenanceFallback: 'સ્ટાન્ડર્ડ દર કોષ્ટક',
  },
  hi: {
    // Header & Brand
    brandName: 'अपोलो इंजीनियरिंग',
    tagline: 'प्रीमियम SS304 सोलर क्लीनिंग हार्डवेयर',
    originHub: 'फैक्ट्री डायरेक्ट डिस्पैच: कठवाड़ा जीआईडीसी, अहमदाबाद (382430)',
    selectLanguage: 'भाषा',
    
    // Catalog & Sizing
    catalogTitle: 'सोलर पैनल क्लैम्प्स एवं क्लीनिंग हार्डवेयर',
    catalogSubtitle: 'सटीक AISI SS304 क्लैम्प्स विभिन्न फ्रेम मोटाई विकल्पों के साथ।',
    frameThicknessLabel: 'सोलर फ्रेम मोटाई (Thickness):',
    sizingGuide: 'साइज़िंग गाइड',
    viewDetails: 'विवरण देखें',
    addToCart: 'कार्ट में जोड़ें',
    inStock: 'स्टॉक में उपलब्ध',
    outOfStock: 'स्टॉक समाप्त',
    popularRooftop: 'लोकप्रिय रूफटॉप',
    bifacialTopcon: 'बायफेशियल / TOPCon',
    thinProfile: 'थिन प्रोफाइल',
    utility72Cell: 'यूटिलिटी 72-सेल',
    polyMonoStandard: 'स्टैंडर्ड क्लैम्प',
    
    // Cart & Quote
    cartTitle: 'आपकी कार्ट',
    cartSubtitle: 'कठवाड़ा जीआईडीसी, अहमदाबाद (३८२४३०) से सीधा डिस्पैच',
    emptyCartTitle: 'आपकी कार्ट खाली है',
    emptyCartDesc: 'कैटलॉग से SS304 सोलर हार्डवेयर चुनें और तुरंत कोटेशन प्राप्त करें।',
    destinationPincode: 'डिलीवरी पिनकोड',
    pincodePlaceholder: '6-अंकों का पिनकोड दर्ज करें (उदा. 380001)',
    invalidPincode: 'कृपया एक मान्य 6-अंकीय भारतीय पिनकोड दर्ज करें',
    paymentMethod: 'भुगतान का तरीका',
    prepaidUpi: 'प्रीपेड (UPI / नेट बैंकिंग)',
    prepaidDesc: 'शून्य हैंडलिंग शुल्क • स्पीड पोस्ट प्राथमिकता डिलीवरी',
    cod: 'कैश ऑन डिलीवरी (COD)',
    codDesc: 'हैंडलिंग शुल्क एवं राउंड-ऑफ लागू',
    
    // Statutory Breakdown
    quoteBreakdownTitle: 'कर एवं भाड़ा विवरण',
    taxableValue: 'कर योग्य माल मूल्य',
    productGstLabel: 'उत्पाद GST',
    productGst: 'उत्पाद GST',
    productGross: 'कुल उत्पाद मूल्य (GST सहित)',
    speedPostFreight: 'स्पीड पोस्ट मूल भाड़ा',
    shippingGstLabel: 'शिपिंग GST',
    shippingGst: 'शिपिंग GST',
    shippingTotal: 'कुल शिपिंग भाड़ा',
    prepaidPayable: 'प्रीपेड देय कुल राशि',
    prepaidTotalLabel: 'प्रीपेड कुल राशि',
    codHandlingCharge: 'COD हैंडलिंग शुल्क',
    codRoundingAdjustment: 'राउंडिंग एडजस्टमेंट',
    codPayable: 'अंतिम देय कुल राशि (COD)',
    quoteId: 'कोटेशन संख्या',
    quoteValidUntil: 'कोटेशन वैधता',
    quoteExpired: 'कोटेशन समाप्त हो गया',
    quoteStale: 'कार्ट या पिनकोड बदल गया है। दरों की पुष्टि हेतु पुनः गणना करें।',
    recalculateQuote: 'कुल गणना करें',
    calculatingQuote: 'गणना हो रही है...',
    authoritativeBadge: 'डायरेक्ट फैक्ट्री सत्यापन',
    zeroJsMathNotice: 'कठवाड़ा जीआईडीसी, अहमदाबाद (३८२४३०) से सीधा डिस्पैच',
    shippingProvenanceLive: 'लाइव स्पीड पोस्ट दर',
    shippingProvenanceFallback: 'मानक दर तालिका',
  },
} as const;

export function getTranslation(lang: SupportedLanguage = 'en') {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
