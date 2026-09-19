import React, { useState, useMemo } from 'react';
import { 
  Calculator, Zap, Package, ShoppingCart, CheckCircle2, 
  ArrowRight, ShieldCheck, Sparkles, Building2, ExternalLink, 
  Layers, Check, Eye
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SolarBOMCalculator: React.FC = () => {
  const { 
    addToCart, 
    showToast, 
    appMode, 
    currentUser, 
    products, 
    setSelectedProduct, 
    selectProductVariant, 
    setIsCartDrawerOpen 
  } = useStore();
  
  const isB2B = Boolean(appMode === 'B2B' || (currentUser?.role && currentUser.role.includes('B2B')));

  const [plantCapacityKw, setPlantCapacityKw] = useState<number>(10);
  const wattsPerPanel = 550; // Standard 540-550W mono-perc utility panels
  // Interactive Panel writing numbers (editable by user: Vertical 10, Horizontal 9, Total 19)
  const [ubhiPanels, setUbhiPanels] = useState<number>(10);
  const [aadiPanels, setAadiPanels] = useState<number>(9);
  const [totalPanels, setTotalPanels] = useState<number>(19);

  // Equipment Options: Motor & Timer toggles
  const [includeMotor, setIncludeMotor] = useState<boolean>(true);
  const [includeTimer, setIncludeTimer] = useState<boolean>(true);

  // Mandatory Frame Size Selection (Compulsory - No Default Size)
  const [selectedFrameSize, setSelectedFrameSize] = useState<string | null>(null);
  const [sizeErrorShake, setSizeErrorShake] = useState<boolean>(false);

  // Handle Capacity (kW) change from slider or direct kW input
  const handleCapacityChange = (kw: number) => {
    const validKw = Math.max(1, Math.min(5000, kw));
    setPlantCapacityKw(validKw);
    const panels = Math.max(1, Math.ceil((validKw * 1000) / wattsPerPanel));
    setTotalPanels(panels);
    if (totalPanels > 0 && (ubhiPanels > 0 || aadiPanels > 0)) {
      const ubhiRatio = ubhiPanels / totalPanels;
      const newUbhi = Math.round(panels * ubhiRatio);
      setUbhiPanels(newUbhi);
      setAadiPanels(Math.max(0, panels - newUbhi));
    } else {
      setUbhiPanels(panels);
      setAadiPanels(0);
    }
  };

  // Handle Ubhi (Vertical) Panels write change
  const handleUbhiPanelsChange = (count: number) => {
    const validUbhi = Math.max(0, Math.min(10000, isNaN(count) ? 0 : count));
    setUbhiPanels(validUbhi);
    const newTotal = Math.max(1, validUbhi + aadiPanels);
    setTotalPanels(newTotal);
    const kw = Number(((newTotal * wattsPerPanel) / 1000).toFixed(1));
    setPlantCapacityKw(kw);
  };

  // Handle Aadi (Horizontal) Panels write change
  const handleAadiPanelsChange = (count: number) => {
    const validAadi = Math.max(0, Math.min(10000, isNaN(count) ? 0 : count));
    setAadiPanels(validAadi);
    const newTotal = Math.max(1, ubhiPanels + validAadi);
    setTotalPanels(newTotal);
    const kw = Number(((newTotal * wattsPerPanel) / 1000).toFixed(1));
    setPlantCapacityKw(kw);
  };

  // Handle Total Panels direct write change
  const handleTotalPanelsChange = (count: number) => {
    const validTotal = Math.max(1, Math.min(10000, isNaN(count) ? 1 : count));
    setTotalPanels(validTotal);
    if (validTotal >= aadiPanels) {
      setUbhiPanels(validTotal - aadiPanels);
    } else {
      setUbhiPanels(validTotal);
      setAadiPanels(0);
    }
    const kw = Number(((validTotal * wattsPerPanel) / 1000).toFixed(1));
    setPlantCapacityKw(kw);
  };

  // Find Admin Combo Product (AP-FULLKIT-05 or isComboBundle)
  const comboProduct = useMemo(() => {
    return products.find(p => p.isComboBundle || p.asin === 'AP-FULLKIT-05') || null;
  }, [products]);

  // Quantities for Kit Components based on user formula:
  // Vertical Panel (Portrait): 1 sprinkler and 2 drain clips per panel
  // Horizontal Panel (Landscape): 2 sprinklers and 3 drain clips per panel
  const sprinklersNeeded = useMemo(() => {
    const total = (ubhiPanels * 1) + (aadiPanels * 2);
    return Math.max(1, total);
  }, [ubhiPanels, aadiPanels]);

  const clipsNeeded = useMemo(() => {
    const total = (ubhiPanels * 2) + (aadiPanels * 3);
    return Math.max(2, total);
  }, [ubhiPanels, aadiPanels]);

  const clampsNeeded = useMemo(() => Math.max(2, sprinklersNeeded), [sprinklersNeeded]);
  const teesNeeded = useMemo(() => sprinklersNeeded, [sprinklersNeeded]);

  // Match corresponding variant from Admin Combo Kit
  const matchedComboVariant = useMemo(() => {
    if (!comboProduct || !comboProduct.variants || comboProduct.variants.length === 0) return null;

    // 1. Direct match on configured solarKitConfig.plantCapacityKw
    const exact = comboProduct.variants.find(v => v.solarKitConfig?.plantCapacityKw === plantCapacityKw);
    if (exact) return exact;

    // 2. Direct match in SKU or Title (e.g. '3KW', '5KW', '10KW')
    const textMatch = comboProduct.variants.find(v => 
      v.sku.toUpperCase().includes(`${plantCapacityKw}KW`) || 
      v.title.toUpperCase().includes(`${plantCapacityKw} KW`)
    );
    if (textMatch) return textMatch;

    // 3. Find closest configured variant
    return comboProduct.variants.reduce((closest, curr) => {
      const currKw = curr.solarKitConfig?.plantCapacityKw || 0;
      const closestKw = closest.solarKitConfig?.plantCapacityKw || 0;
      return Math.abs(currKw - plantCapacityKw) < Math.abs(closestKw - plantCapacityKw) ? curr : closest;
    }, comboProduct.variants[0]);
  }, [comboProduct, plantCapacityKw]);

  const isExactComboMatch = Boolean(
    matchedComboVariant && (
      matchedComboVariant.solarKitConfig?.plantCapacityKw === plantCapacityKw ||
      matchedComboVariant.sku.toUpperCase().includes(`${plantCapacityKw}KW`) ||
      matchedComboVariant.title.toUpperCase().includes(`${plantCapacityKw} KW`)
    )
  );

  // Equipment Specs based on panel count & plant capacity
  const motorLpm = matchedComboVariant?.solarKitConfig?.motorLpm || (totalPanels * 7);
  const motorHp = matchedComboVariant?.solarKitConfig?.motorHp || 
    (totalPanels <= 8 ? '0.5 HP' : totalPanels <= 15 ? '1.0 HP' : '2.0 HP');
  const electricalPhase = matchedComboVariant?.solarKitConfig?.electricalPhase || 'Single Phase 220V/230V AC (50Hz)';
  const motorPrice = totalPanels <= 8 ? 1700 : totalPanels <= 15 ? 2400 : 4200;
  const timerPrice = 850;

  // Pricing calculations for individual components
  const clipKitRate = 20;
  const clipRetailRate = 20;
  const clipB2bRate = 12.75;

  const sprinklerKitRate = 60;
  const sprinklerRetailRate = 220;
  const sprinklerB2bRate = 185;

  const clampKitRate = 25;
  const clampRetailRate = 45;
  const clampB2bRate = 32;

  const teeKitRate = 33;
  const teeRetailRate = 55;

  // Effective price adjustments for optional motor and timer
  const effectiveMotorPrice = includeMotor ? motorPrice : 0;
  const effectiveMotorPriceB2B = includeMotor ? Math.round(motorPrice * 0.88) : 0;
  const effectiveTimerPrice = includeTimer ? timerPrice : 0;
  const effectiveTimerPriceB2B = includeTimer ? 750 : 0;

  // Hardware BOM total calculations
  const totalHardwareRetailPrice = useMemo(() => {
    return (clipsNeeded * clipRetailRate) + 
           (sprinklersNeeded * sprinklerRetailRate) + 
           (clampsNeeded * clampRetailRate) + 
           (teesNeeded * teeKitRate) + 
           effectiveMotorPrice + 
           effectiveTimerPrice;
  }, [clipsNeeded, sprinklersNeeded, clampsNeeded, teesNeeded, effectiveMotorPrice, effectiveTimerPrice]);

  const totalHardwareB2bPrice = useMemo(() => {
    return Math.round(
      (clipsNeeded * clipB2bRate) + 
      (sprinklersNeeded * sprinklerB2bRate) + 
      (clampsNeeded * clampB2bRate) + 
      (teesNeeded * 28) + 
      effectiveMotorPriceB2B + 
      effectiveTimerPriceB2B
    );
  }, [clipsNeeded, sprinklersNeeded, clampsNeeded, teesNeeded, clipB2bRate, sprinklerB2bRate, clampB2bRate, effectiveMotorPriceB2B, effectiveTimerPriceB2B]);

  const totalHardwareSavings = useMemo(() => {
    return totalHardwareRetailPrice - totalHardwareB2bPrice;
  }, [totalHardwareRetailPrice, totalHardwareB2bPrice]);

  // Admin Combo Variant Pricing (responsive to Motor & Timer inclusion)
  const comboRetailPrice = useMemo(() => {
    if (matchedComboVariant && includeMotor && includeTimer) {
      return matchedComboVariant.b2cPrice;
    }
    return (
      (sprinklersNeeded * sprinklerKitRate) + 
      (clipsNeeded * clipKitRate) + 
      (clampsNeeded * clampKitRate) + 
      (teesNeeded * teeKitRate) + 
      effectiveMotorPrice + 
      effectiveTimerPrice
    );
  }, [matchedComboVariant, includeMotor, includeTimer, sprinklersNeeded, clipsNeeded, clampsNeeded, teesNeeded, effectiveMotorPrice, effectiveTimerPrice]);

  const comboMrp = useMemo(() => {
    return matchedComboVariant && includeMotor && includeTimer
      ? matchedComboVariant.mrp
      : Math.round(comboRetailPrice * 1.35);
  }, [matchedComboVariant, includeMotor, includeTimer, comboRetailPrice]);

  const comboB2bPrice = useMemo(() => {
    if (matchedComboVariant && includeMotor && includeTimer) {
      if (matchedComboVariant.b2bTierPricing && matchedComboVariant.b2bTierPricing.length > 0) {
        return matchedComboVariant.b2bTierPricing[1]?.pricePerUnit || 
               matchedComboVariant.b2bTierPricing[0]?.pricePerUnit || 
               matchedComboVariant.b2cPrice;
      }
      return Math.round(matchedComboVariant.b2cPrice * 0.82);
    }
    return Math.round(comboRetailPrice * 0.82);
  }, [matchedComboVariant, includeMotor, includeTimer, comboRetailPrice]);

  const totalWeightKg = useMemo(() => {
    const clipsWeightKg = (clipsNeeded * 48) / 1000;
    const sprinklersWeightKg = (sprinklersNeeded * 140) / 1000;
    const clampsWeightKg = (clampsNeeded * 120) / 1000;
    const motorWeightKg = includeMotor ? (totalPanels <= 8 ? 3.5 : totalPanels <= 15 ? 5.5 : 9.0) : 0;
    const timerWeightKg = includeTimer ? 0.5 : 0;
    const teesWeightKg = (teesNeeded * 45) / 1000;
    return Number((clipsWeightKg + sprinklersWeightKg + clampsWeightKg + motorWeightKg + timerWeightKg + teesWeightKg).toFixed(1));
  }, [clipsNeeded, sprinklersNeeded, clampsNeeded, totalPanels, teesNeeded, includeMotor, includeTimer]);

  // All Products included in Admin Combo Kit (Freight removed, motor & timer optional)
  const comboKitProducts = useMemo(() => {
    const items = [
      {
        id: 'sprinklers',
        title: 'Apollo SS304 Shadowless Sprinklers (180° Curtain)',
        asin: 'AP-SPRINKLER-01',
        imageUrl: '/solar_sprinkler.webp',
        quantity: sprinklersNeeded,
        unitOfMeasure: 'Pcs',
        unitRate: isB2B ? 50 : sprinklerKitRate,
        lineTotal: sprinklersNeeded * (isB2B ? 50 : sprinklerKitRate),
        ratioLabel: ubhiPanels > 0 && aadiPanels > 0 ? `${ubhiPanels} Portrait (×1) + ${aadiPanels} Landscape (×2)` : ubhiPanels > 0 ? '1 per Portrait Panel' : '2 per Landscape Panel',
        specs: 'AISI SS304 · ½" BSP Thread',
        anchorId: 'catalog-product-sprinkler'
      },
      {
        id: 'drain-clips',
        title: selectedFrameSize 
          ? `Apollo SS304 Auto Drain Clips (${selectedFrameSize} Frame Sized)`
          : 'Apollo SS304 Auto Drain Clips (Frame Sized - Select Frame Size)',
        asin: 'AP-DRAINCLIPS-02',
        imageUrl: '/Drain_clips.webp',
        quantity: clipsNeeded,
        unitOfMeasure: 'Pcs',
        unitRate: isB2B ? clipB2bRate : clipKitRate,
        lineTotal: Math.round(clipsNeeded * (isB2B ? clipB2bRate : clipKitRate)),
        ratioLabel: ubhiPanels > 0 && aadiPanels > 0 ? `${ubhiPanels} Portrait (×2) + ${aadiPanels} Landscape (×3)` : ubhiPanels > 0 ? '2 per Portrait Panel' : '3 per Landscape Panel',
        specs: 'AISI SS304 · Anti-Soiling Siphon',
        anchorId: 'catalog-product-drain-clips'
      },
      {
        id: 'gi-clamps',
        title: 'Heavy Galvanized GI Piping Support Clamps',
        asin: 'AP-GICLAMP-03',
        imageUrl: '/gi_pipe_clamp.webp',
        quantity: clampsNeeded,
        unitOfMeasure: 'Pcs',
        unitRate: isB2B ? clampB2bRate : clampKitRate,
        lineTotal: Math.round(clampsNeeded * (isB2B ? clampB2bRate : clampKitRate)),
        ratioLabel: '1 per panel',
        specs: 'Hot-Dip Galvanized Iron (GI)',
        anchorId: 'catalog-product-clamp'
      },
      {
        id: 'upvc-tees',
        title: 'UPVC Threaded Brass Insert Plumb Tees',
        asin: 'AP-FITTINGTEE-04',
        imageUrl: '/cpvc_upvc.webp',
        quantity: teesNeeded,
        unitOfMeasure: 'Pcs',
        unitRate: isB2B ? 28 : teeKitRate,
        lineTotal: teesNeeded * (isB2B ? 28 : teeKitRate),
        ratioLabel: 'Matches Sprinklers',
        specs: 'Schedule 80 UPVC · Brass Thread',
        anchorId: 'catalog-product-kit'
      }
    ];

    if (includeMotor) {
      items.splice(3, 0, {
        id: 'booster-pump',
        title: `High-Pressure Booster Motor (${motorLpm} LPM · ${motorHp})`,
        asin: 'AP-PUMP-06',
        imageUrl: '/pump.webp',
        quantity: 1,
        unitOfMeasure: 'Unit',
        unitRate: isB2B ? Math.round(motorPrice * 0.88) : motorPrice,
        lineTotal: isB2B ? Math.round(motorPrice * 0.88) : motorPrice,
        ratioLabel: '1 Motor per Kit',
        specs: `${motorLpm} LPM · ${motorHp} · 220V AC`,
        anchorId: 'catalog-product-kit'
      });
    }

    if (includeTimer) {
      const insertIdx = includeMotor ? 4 : 3;
      items.splice(insertIdx, 0, {
        id: 'automation-timer',
        title: 'Apollo Digital Programmable Automation Timer',
        asin: 'AP-TIMER-07',
        imageUrl: '/auto_timer.webp',
        quantity: 1,
        unitOfMeasure: 'Unit',
        unitRate: isB2B ? 750 : timerPrice,
        lineTotal: isB2B ? 750 : timerPrice,
        ratioLabel: '1 Timer per Kit',
        specs: 'IP65 Weatherproof · Auto Daily Wash',
        anchorId: 'catalog-product-kit'
      });
    }

    return items;
  }, [
    sprinklersNeeded, clipsNeeded, clampsNeeded, teesNeeded, 
    includeMotor, includeTimer, motorLpm, motorHp, motorPrice, timerPrice, 
    isB2B, clipB2bRate, clampB2bRate, ubhiPanels, aadiPanels, selectedFrameSize
  ]);

  // Navigate directly to the Admin Combo Product page
  const handleOpenComboProduct = (variantSku?: string) => {
    if (comboProduct) {
      const targetSku = variantSku || matchedComboVariant?.sku || comboProduct.variants[0]?.sku;
      if (targetSku) {
        selectProductVariant(comboProduct.asin, targetSku);
      }
      setSelectedProduct(comboProduct);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Opening Official Apollo Combo Kit (${plantCapacityKw} kW)`, 'info');
    } else {
      scrollToCatalogProduct('catalog-product-kit');
    }
  };

  // Add the official Admin Combo Kit to Cart as an integrated turnkey bundle
  const handleAddComboKitToCart = () => {
    if (!selectedFrameSize) {
      setSizeErrorShake(true);
      setTimeout(() => setSizeErrorShake(false), 1500);
      showToast('⚠️ Please select solar panel frame thickness size (28mm, 30mm, 33mm, 35mm, or 40mm). Size selection is compulsory!', 'error');
      const el = document.getElementById('bom-frame-size-selector');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!comboProduct || !matchedComboVariant) {
      handleAddEntireBOMToCart();
      return;
    }

    const panelMountOrientation: 'PORTRAIT' | 'LANDSCAPE' = ubhiPanels >= aadiPanels ? 'PORTRAIT' : 'LANDSCAPE';
    const price = isB2B ? comboB2bPrice : comboRetailPrice;

    addToCart({
      sku: `${matchedComboVariant.sku}-${selectedFrameSize.toUpperCase()}${!includeMotor ? '-NOMOTOR' : ''}${!includeTimer ? '-NOTIMER' : ''}`,
      parentAsin: comboProduct.asin,
      productTitle: comboProduct.title,
      variantTitle: `${matchedComboVariant.title} (${selectedFrameSize} Frame Drain Clips Included)${!includeMotor ? ' (Without Motor)' : ''}${!includeTimer ? ' (Without Timer)' : ''}`,
      attributes: {
        ...((matchedComboVariant.attributes as Record<string, string>) || {}),
        frameSize: selectedFrameSize,
        orientation: panelMountOrientation,
        packSize: `${plantCapacityKw} kW Kit (${totalPanels} Panels)`,
        material: 'Complete Turnkey Combo Kit',
        motor: includeMotor ? `${motorHp} Included` : 'Motor Excluded',
        timer: includeTimer ? 'Timer Included' : 'Timer Excluded'
      },
      imageUrl: matchedComboVariant.images?.[0] || '/solar_cleaning_fullset.webp',
      unitPrice: price,
      mrp: comboMrp,
      gstRate: matchedComboVariant.gstRatePercent || 18,
      hsnCode: matchedComboVariant.hsnCode || '84248990',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Factory Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: matchedComboVariant.weightGrams || Math.round(totalWeightKg * 1000),
      isB2BPricingApplied: isB2B
    }, 1);

    showToast(
      `Added Official Apollo ${plantCapacityKw} kW Complete Combo Kit (${selectedFrameSize} Clips) to Cart!`,
      'success'
    );
  };

  // Add individual BOM hardware items (Clips, Sprinklers, Clamps, Tees, Motor, Timer)
  const handleAddEntireBOMToCart = () => {
    if (!selectedFrameSize) {
      setSizeErrorShake(true);
      setTimeout(() => setSizeErrorShake(false), 1500);
      showToast('⚠️ Please select solar panel frame thickness size (28mm, 30mm, 33mm, 35mm, or 40mm). Size selection is compulsory!', 'error');
      const el = document.getElementById('bom-frame-size-selector');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Add Drain Clips with chosen frame size
    const clipSkuMap: Record<string, string> = {
      '28mm': 'APE-SC-28.00MM',
      '30mm': 'APE-SC-30.00MM',
      '33mm': 'APE-SC-33.00MM',
      '35mm': 'APE-SC-35.00MM',
      '40mm': 'APE-SC-40.00MM',
    };
    const clipSku = (selectedFrameSize && clipSkuMap[selectedFrameSize.toLowerCase()]) || 'APE-SC-35.00MM';

    addToCart({
      sku: clipSku,
      parentAsin: 'AP-DRAINCLIPS-02',
      asin: 'AP-DRAINCLIPS-02',
      productTitle: `Apollo SS304 Solar Auto Drain Clips (${selectedFrameSize})`,
      variantTitle: `${selectedFrameSize} Frame Size - Apollo SS304 Auto Drain Clips`,
      attributes: { size: selectedFrameSize, material: 'SS304' },
      imageUrl: '/Drain_clips.webp',
      unitPrice: isB2B ? clipB2bRate : clipRetailRate,
      mrp: clipRetailRate,
      gstRate: 18,
      hsnCode: '73269099',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 48,
      isB2BPricingApplied: isB2B
    }, clipsNeeded);

    // Add Sprinklers
    addToCart({
      sku: 'AE-SPRINKLER-SS304',
      parentAsin: 'AP-SPRINKLER-01',
      asin: 'AP-SPRINKLER-01',
      productTitle: 'Apollo SS304 Shadowless Solar Sprinkler (180° Curtain)',
      variantTitle: '180° Curtain - ½" BSP Male Thread',
      attributes: { size: '½" BSP', material: 'SS304' },
      imageUrl: '/solar_sprinkler.webp',
      unitPrice: isB2B ? sprinklerB2bRate : sprinklerRetailRate,
      mrp: sprinklerRetailRate,
      gstRate: 18,
      hsnCode: '84248990',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 140,
      isB2BPricingApplied: isB2B
    }, sprinklersNeeded);

    // Add GI Clamps
    addToCart({
      sku: 'AE-CLAMP-GI-HALF',
      parentAsin: 'AP-GICLAMP-03',
      asin: 'AP-GICLAMP-03',
      productTitle: 'Heavy Galvanized GI Piping Support Clamps',
      variantTitle: '½" (12.7 mm) Universal Fit',
      attributes: { size: 'Universal Fit', material: 'Galvanized Iron (GI)' },
      imageUrl: '/gi_pipe_clamp.webp',
      unitPrice: isB2B ? clampB2bRate : clampRetailRate,
      mrp: clampRetailRate,
      gstRate: 18,
      hsnCode: '73269099',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 120,
      isB2BPricingApplied: isB2B
    }, clampsNeeded);

    // Add UPVC Tees
    addToCart({
      sku: 'AE-TEE-UPVC-HALF',
      parentAsin: 'AP-FITTINGTEE-04',
      asin: 'AP-FITTINGTEE-04',
      productTitle: 'UPVC / CPVC Threaded Equal Tee with Brass Female Thread',
      variantTitle: '½" Equal Tee · Brass Thread',
      attributes: { size: '½" BSP', material: 'UPVC Brass' },
      imageUrl: '/cpvc_upvc.webp',
      unitPrice: isB2B ? 28 : teeKitRate,
      mrp: teeRetailRate,
      gstRate: 18,
      hsnCode: '39174000',
      sellerId: 'seller_apollo_mfg',
      sellerName: 'Apollo Engineering Direct Hub (382430)',
      fulfillmentType: 'FBF',
      weightGrams: 45,
      isB2BPricingApplied: isB2B
    }, teesNeeded);

    // Conditionally Add Booster Motor if option is enabled
    if (includeMotor) {
      addToCart({
        sku: 'AE-PUMP-05HP',
        parentAsin: 'AP-PUMP-06',
        asin: 'AP-PUMP-06',
        productTitle: `High-Pressure Booster Motor (${motorLpm} LPM · ${motorHp})`,
        variantTitle: `${motorHp} Single Phase 220V AC`,
        attributes: { power: motorHp, flow: `${motorLpm} LPM` },
        imageUrl: '/pump.webp',
        unitPrice: isB2B ? Math.round(motorPrice * 0.88) : motorPrice,
        mrp: motorPrice,
        gstRate: 18,
        hsnCode: '84137010',
        sellerId: 'seller_apollo_mfg',
        sellerName: 'Apollo Engineering Direct Hub (382430)',
        fulfillmentType: 'FBF',
        weightGrams: totalPanels <= 8 ? 3500 : totalPanels <= 15 ? 5500 : 9000,
        isB2BPricingApplied: isB2B
      }, 1);
    }

    // Conditionally Add Digital Timer if option is enabled
    if (includeTimer) {
      addToCart({
        sku: 'AE-TIMER-DIGITAL',
        parentAsin: 'AP-TIMER-07',
        asin: 'AP-TIMER-07',
        productTitle: 'Apollo Digital Programmable Automation Timer',
        variantTitle: 'IP65 Weatherproof Auto Daily Wash',
        attributes: { type: 'Digital Timer', rating: 'IP65' },
        imageUrl: '/auto_timer.webp',
        unitPrice: isB2B ? 750 : timerPrice,
        mrp: timerPrice,
        gstRate: 18,
        hsnCode: '91070000',
        sellerId: 'seller_apollo_mfg',
        sellerName: 'Apollo Engineering Direct Hub (382430)',
        fulfillmentType: 'FBF',
        weightGrams: 500,
        isB2BPricingApplied: isB2B
      }, 1);
    }

    const capacityDisplay = plantCapacityKw >= 1000 
      ? `${(plantCapacityKw / 1000).toFixed(plantCapacityKw % 1000 === 0 ? 0 : 2)} MW (${plantCapacityKw.toLocaleString('en-IN')} kW)`
      : `${plantCapacityKw} kW`;

    showToast(
      isB2B 
        ? `Added Complete ${capacityDisplay} Solar Cleaning BOM to Cart with B2B Wholesale Pricing!`
        : `Added Complete ${capacityDisplay} Solar Hardware Kit to Cart!`, 
      'success'
    );
  };

  const scrollToCatalogProduct = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-[#0054A6]', 'ring-offset-2', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-[#0054A6]', 'ring-offset-2');
      }, 2500);
    } else {
      handleOpenComboProduct();
    }
  };

  return (
    <div id="solar-bom-calculator" className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden space-y-6">
      
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_top_right,rgba(0,84,166,0.05)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0054A6]/10 text-[#0054A6] border border-[#0054A6]/20 flex items-center justify-center font-bold shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0054A6] font-mono tracking-wide">
                {isB2B ? '🏢 B2B Commercial EPC Engineering Tool' : '⚡ Solar Plant Hardware Sizing Calculator'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                isB2B ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'
              }`}>
                {isB2B ? 'Wholesale BOM Tier' : 'Retail Sizing'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 font-display tracking-tight">
              Solar Plant Hardware Bill of Materials (BOM) Estimator
            </h2>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 📐 PANEL NUMBERS INPUT & CALCULATION (Vertical 10, Horizontal 9, Total 19) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white rounded-2xl border border-blue-200/90 space-y-4 shadow-xs relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0054A6]" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Solar Panels Count:
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#0054A6] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            All Writable Inputs
          </span>
        </div>

        {/* 3 Writable Inputs: Vertical (10), Horizontal (9), Total (19) */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            {/* 1. Vertical Panels Input */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border-2 border-blue-200 hover:border-blue-400 transition-all">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <label htmlFor="panel-ubhi-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                  <span className="text-base">↕️</span>
                  <span>Vertical Panels (Portrait):</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-[#0054A6] bg-white px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                  1 Sprinkler + 2 Clips
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="panel-ubhi-input"
                  name="vertical_panels"
                  type="number"
                  min={0}
                  max={10000}
                  value={ubhiPanels}
                  aria-label="Vertical Panels Count"
                  onChange={(e) => handleUbhiPanelsChange(Number(e.target.value))}
                  className="w-full h-11 font-mono font-black text-2xl text-slate-950 bg-white border-2 border-blue-300 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#0054A6] shadow-inner"
                />
                <span className="text-xs font-bold text-slate-600 shrink-0">Nos.</span>
              </div>
            </div>

            {/* 2. Horizontal Panels Input */}
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border-2 border-indigo-200 hover:border-indigo-400 transition-all">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <label htmlFor="panel-aadi-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                  <span className="text-base">↔️</span>
                  <span>Horizontal Panels (Landscape):</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                  2 Sprinklers + 3 Clips
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="panel-aadi-input"
                  name="horizontal_panels"
                  type="number"
                  min={0}
                  max={10000}
                  value={aadiPanels}
                  aria-label="Horizontal Panels Count"
                  onChange={(e) => handleAadiPanelsChange(Number(e.target.value))}
                  className="w-full h-11 font-mono font-black text-2xl text-slate-950 bg-white border-2 border-indigo-300 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner"
                />
                <span className="text-xs font-bold text-slate-600 shrink-0">Nos.</span>
              </div>
            </div>

            {/* 3. Total Solar Panels Input */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border-2 border-amber-300 hover:border-amber-400 transition-all">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <label htmlFor="panel-total-writing-input" className="text-xs font-black text-slate-900 flex items-center gap-1.5 cursor-pointer">
                  <span className="text-base">☀️</span>
                  <span>Total Solar Panels:</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                  ~{plantCapacityKw} kW Plant
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="panel-total-writing-input"
                  name="total_panels"
                  type="number"
                  min={1}
                  max={10000}
                  value={totalPanels}
                  aria-label="Total Solar Panels Count"
                  onChange={(e) => handleTotalPanelsChange(Number(e.target.value))}
                  className="w-full h-11 font-mono font-black text-2xl text-slate-950 bg-white border-2 border-amber-400 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
                <span className="text-xs font-bold text-slate-700 shrink-0">Nos.</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ⚙️ EQUIPMENT OPTIONS: BOOSTER MOTOR & AUTOMATION TIMER               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Booster Motor & Automation Timer Options:
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Toggle equipment based on your system requirement
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
          {/* Option 1: Booster Motor */}
          <label 
            htmlFor="toggle-include-motor"
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
              includeMotor 
                ? 'bg-blue-50/80 border-[#0054A6] shadow-xs ring-1 ring-[#0054A6]/20' 
                : 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                id="toggle-include-motor"
                name="includeMotor"
                type="checkbox"
                checked={includeMotor}
                onChange={(e) => setIncludeMotor(e.target.checked)}
                className="w-4 h-4 text-[#0054A6] rounded border-slate-300 focus:ring-[#0054A6] cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${includeMotor ? 'text-amber-500' : 'text-slate-400'}`} />
                  High-Pressure Booster Motor
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  {includeMotor 
                    ? `${motorLpm} LPM · ${motorHp} · ₹${(isB2B ? Math.round(motorPrice * 0.88) : motorPrice).toLocaleString('en-IN')}`
                    : 'Motor Excluded from Kit'}
                </span>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
              includeMotor ? 'bg-[#0054A6] text-white shadow-xs' : 'bg-slate-200 text-slate-600'
            }`}>
              {includeMotor ? 'Included' : 'Excluded'}
            </span>
          </label>

          {/* Option 2: Digital Automation Timer */}
          <label 
            htmlFor="toggle-include-timer"
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
              includeTimer 
                ? 'bg-blue-50/80 border-[#0054A6] shadow-xs ring-1 ring-[#0054A6]/20' 
                : 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                id="toggle-include-timer"
                name="includeTimer"
                type="checkbox"
                checked={includeTimer}
                onChange={(e) => setIncludeTimer(e.target.checked)}
                className="w-4 h-4 text-[#0054A6] rounded border-slate-300 focus:ring-[#0054A6] cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${includeTimer ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Digital Automation Timer
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  {includeTimer 
                    ? `IP65 Weatherproof · ₹${(isB2B ? 750 : timerPrice).toLocaleString('en-IN')}`
                    : 'Timer Excluded from Kit'}
                </span>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
              includeTimer ? 'bg-[#0054A6] text-white shadow-xs' : 'bg-slate-200 text-slate-600'
            }`}>
              {includeTimer ? 'Included' : 'Excluded'}
            </span>
          </label>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 📏 COMPULSORY FRAME SIZE SELECTION (NO DEFAULT PRE-SELECTED)       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div 
        id="bom-frame-size-selector"
        className={`p-4 rounded-2xl border transition-all duration-300 relative z-10 space-y-3 ${
          sizeErrorShake 
            ? 'bg-rose-50 border-rose-400 ring-4 ring-rose-400/30' 
            : !selectedFrameSize 
            ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white border-amber-300 shadow-sm'
            : 'bg-gradient-to-r from-emerald-50/80 via-blue-50/40 to-white border-emerald-300 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${selectedFrameSize ? 'text-emerald-600' : 'text-amber-600'}`} />
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Select Solar Panel Frame Thickness Size:
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!selectedFrameSize ? (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                ⚠️ Size Selection Mandatory
              </span>
            ) : (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                Selected Size: {selectedFrameSize}
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600">
          To ensure a precision snap-on fit on your solar panel frame, please select your aluminum frame thickness (no size pre-selected by default):
        </p>

        {/* 5 Distinct Frame Size Buttons (28mm, 30mm, 33mm, 35mm, 40mm) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { size: '28mm', desc: 'Thin Profile Frame' },
            { size: '30mm', desc: 'Bifacial / TOPCon Solar' },
            { size: '33mm', desc: '330W Poly / Mono Panels' },
            { size: '35mm', desc: 'Most Popular Rooftop' },
            { size: '40mm', desc: '72-Cell Utility / Commercial' },
          ].map((item) => {
            const isSelected = selectedFrameSize === item.size;
            return (
              <button
                key={item.size}
                type="button"
                onClick={() => setSelectedFrameSize(item.size)}
                aria-label={`Select ${item.size} frame thickness (${item.desc})`}
                aria-pressed={isSelected}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 shadow-xs hover:scale-[1.02] ${
                  isSelected
                    ? 'bg-[#0054A6] text-white border-[#0054A6] ring-2 ring-blue-500/30 shadow-md font-bold'
                    : 'bg-white hover:bg-blue-50/60 border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black font-mono">{item.size}</span>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className={`text-[10px] truncate w-full text-center px-1 rounded ${
                  isSelected ? 'text-blue-100 bg-white/10' : 'text-slate-500 bg-slate-100'
                }`}>
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 📦 ADMIN COMBO KIT COMPLETE INCLUDED PRODUCTS                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#0054A6]" />
            <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
              Included Products in Apollo Turnkey Kit:
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            Total {comboKitProducts.length} Items · All-in-One Turnkey Set
          </span>
        </div>

        {/* Product Grid (Freight Removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {comboKitProducts.map((prod) => {
            return (
              <div
                key={prod.id}
                onClick={() => scrollToCatalogProduct(prod.anchorId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToCatalogProduct(prod.anchorId); }}
                aria-label={`View ${prod.title} in Catalog`}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0054A6] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:border-[#0054A6] transition-all shadow-inner">
                      <img 
                        src={prod.imageUrl} 
                        alt={prod.title} 
                        className="w-full h-full object-contain" 
                        loading="lazy"
                        decoding="async"
                        width={56}
                        height={56}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight group-hover:text-[#0054A6] transition-colors line-clamp-2">
                        {prod.title}
                      </h4>
                      <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-50 text-[#0054A6] border border-blue-200 inline-block mt-1">
                        {prod.ratioLabel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                        {prod.specs}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                    <div className="text-2xl font-black text-slate-900 font-mono">
                      {prod.quantity.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">{prod.unitOfMeasure}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-black text-slate-900">
                        ₹{prod.lineTotal.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ₹{prod.unitRate}/{prod.unitOfMeasure.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-[#0054A6]">
                  <span>View in Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 📦 OFFICIAL ADMIN COMBO PRODUCT KIT LINKED SECTION (TURNKEY BUNDLE) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {comboProduct && matchedComboVariant && (
        <div className="relative rounded-2xl p-5 md:p-6 bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/40 border border-blue-200/90 shadow-sm overflow-hidden z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Left: Product Media & Information */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div 
                onClick={() => handleOpenComboProduct()}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white border border-blue-200 p-1.5 shrink-0 overflow-hidden cursor-pointer hover:shadow-md hover:scale-105 transition-all shadow-inner group relative"
                title="Click to view Official Combo Kit page"
              >
                <img 
                  src={matchedComboVariant.images?.[0] || '/solar_cleaning_fullset.webp'} 
                  alt={matchedComboVariant.title} 
                  className="w-full h-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-5 h-5 text-[#0054A6]" />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0054A6] text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Admin Configured Combo Bundle
                  </span>
                  {isExactComboMatch ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                      ✓ Exact {plantCapacityKw} kW Kit Available
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono font-bold">
                      ⚡ Closest Standard Modular Kit
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-500">
                    ASIN: <strong className="text-slate-700">{comboProduct.asin}</strong> · SKU: <strong className="text-slate-700">{matchedComboVariant.sku}</strong>
                  </span>
                </div>

                <h3 
                  onClick={() => handleOpenComboProduct()}
                  className="text-base md:text-lg font-black text-slate-900 hover:text-[#0054A6] cursor-pointer transition-colors leading-snug"
                >
                  {matchedComboVariant.title}
                </h3>

                {/* Kit Breakdown Highlights */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-mono pt-1">
                  <span className="flex items-center gap-1 text-slate-800 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Motor: {motorLpm} LPM ({motorHp})
                  </span>
                  <span className="flex items-center gap-1 text-slate-800 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Timer: Digital Programmable IP65
                  </span>
                  <span className="flex items-center gap-1 text-slate-800 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Fittings: UPVC Sized Tees + GI Clamps + Clips
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Combo Kit Pricing & Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0 w-full lg:w-auto border-t lg:border-t-0 border-blue-200/60 pt-3 lg:pt-0">
              <div className="text-left lg:text-right">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-500 font-medium line-through font-mono">
                    ₹{comboMrp.toLocaleString('en-IN')}
                  </span>
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    ₹{(isB2B ? comboB2bPrice : comboRetailPrice).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-bold block">
                  {isB2B ? '🏢 Direct Factory B2B Wholesale Tier' : '📦 Complete Pre-Packaged Kit Price (Incl. GST)'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddComboKitToCart}
                  aria-label="Add Official Combo Kit to Cart"
                  className="flex-1 sm:flex-none h-10 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add Combo Kit to Cart</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenComboProduct()}
                  aria-label="View combo kit specifications and photos"
                  className="flex-1 sm:flex-none h-10 px-4 bg-white hover:bg-slate-100 text-[#0054A6] border border-blue-300 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Kit Specs & Photos</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Action CTA Bar & Separation */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          {isB2B ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 line-through font-mono">Retail: ₹{totalHardwareRetailPrice.toLocaleString('en-IN')}</span>
                <span className="text-xl md:text-2xl font-black text-emerald-700 font-mono">₹{totalHardwareB2bPrice.toLocaleString('en-IN')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-black">
                  Save ₹{totalHardwareSavings.toLocaleString('en-IN')} (Direct Factory B2B Rate)
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Includes 18% GST Input Tax Credit (ITC) claimable: <strong>₹{Math.round(totalHardwareB2bPrice * 0.18 / 1.18).toLocaleString('en-IN')}</strong>
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 uppercase font-bold font-mono">Estimated Hardware BOM Cost:</span>
                <span className="text-xl md:text-2xl font-black text-slate-900 font-mono">₹{totalHardwareRetailPrice.toLocaleString('en-IN')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0054A6] text-xs font-mono font-bold">
                  Hardware Only
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Includes Priority Express Doorstep Parcel Dispatch with GST tax invoice.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Option A: Buy individual BOM components */}
          <button
            type="button"
            onClick={handleAddEntireBOMToCart}
            aria-label={isB2B 
              ? `Add Entire ${plantCapacityKw >= 1000 ? `${(plantCapacityKw / 1000).toFixed(1)} MW` : `${plantCapacityKw} kW`} Hardware BOM` 
              : `Add Hardware BOM Items Only`}
            className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <ShoppingCart className="w-4 h-4 text-slate-600" />
            <span>Add Hardware-Only BOM (₹{(isB2B ? totalHardwareB2bPrice : totalHardwareRetailPrice).toLocaleString('en-IN')})</span>
          </button>

          {/* Option B: Direct Buy Official Complete Kit */}
          {comboProduct && matchedComboVariant && (
            <button
              type="button"
              onClick={handleAddComboKitToCart}
              aria-label={`Add Complete ${plantCapacityKw} kW Combo Kit to Cart`}
              className={`h-11 px-6 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isB2B 
                  ? 'bg-[#0054A6] hover:bg-[#003d7a] text-white focus-visible:ring-brand-blue'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-slate-950 focus-visible:ring-amber-500'
              }`}
            >
              <Package className="w-4 h-4" /> 
              <span>
                Add Complete {plantCapacityKw >= 1000 ? `${(plantCapacityKw / 1000).toFixed(1)} MW` : `${plantCapacityKw} kW`} Combo Kit
              </span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
