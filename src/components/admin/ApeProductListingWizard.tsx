import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, Plus, Trash2, Edit3, Image, Video, Sparkles, Layers, ShieldCheck, 
  HelpCircle, ChevronRight, ArrowRight, ArrowLeft, Save, AlertCircle, 
  Sliders, Package, DollarSign, FileText, CheckSquare, Square, Eye, RefreshCw, 
  Upload, Play, Film, Camera, Settings, CheckCircle2, Zap, Copy, Grid,
  Truck, Tag, Box, Info, ExternalLink, Clock, CreditCard, RotateCcw, BadgeCheck,
  Printer, Download, FileSpreadsheet, Scale, BarChart2, CheckCircle
} from 'lucide-react';
import { Product, ProductVariant, APlusModule, SellerListing, ComboComponentItem } from '../../types';
import { useStore } from '../../store/useStore';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../../services/logisticsService';

interface ApeProductListingWizardProps {
  initialProduct?: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const GST_RATES = [
  { value: 0, label: '0% (Exempt / Nil Rated)' },
  { value: 5, label: '5% (Solar Devices / Inverters / Selected Solar Parts)' },
  { value: 12, label: '12% (Pumps / Renewable Assemblies)' },
  { value: 18, label: '18% (SS304 Hardware / Sprinklers / Clamps / Fittings)' },
  { value: 28, label: '28% (Specialized Industrial Machinery)' }
];

const UNITS_OF_MEASURE = [
  { value: 'PCS', label: 'PCS (Pieces / Units)' },
  { value: 'NOS', label: 'NOS (Numbers)' },
  { value: 'SET', label: 'SET (Complete Sets)' },
  { value: 'KG', label: 'KG (Kilograms)' },
  { value: 'LTR', label: 'LTR (Litres - Cleaning Liquids / Chemicals)' },
  { value: 'MTR', label: 'MTR (Meters - Piping / High-Pressure Tubing)' },
  { value: 'PAC', label: 'PAC (Pack of 10 / 50 / 100)' },
  { value: 'BOX', label: 'BOX (Boxes)' },
  { value: 'ROLL', label: 'ROLL (Rolls - Wire / Seal Tape)' }
];

interface ManualSampleItem {
  size: string;
  sku: string;
  b2cPrice: number;
  b2bPrice: number;
  b2bMoq: number;
  inventory: number;
  barcode: string;
}

interface DefaultVariantPackagingOpts {
  fsnSuffix?: string | number;
  image?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  hsn?: string;
  gst?: number;
  uom?: string;
  barcode?: string;
  lowStockThreshold?: number;
}

function getDefaultVariantPackaging(opts: DefaultVariantPackagingOpts = {}) {
  return {
    lowStockThreshold: opts.lowStockThreshold || 10,
    barcode: opts.barcode || '',
    flipkartFsn: opts.fsnSuffix !== undefined
      ? `FSN-APE-${opts.fsnSuffix}`
      : '',
    images: opts.image ? [opts.image] : [],
    weightGrams: opts.weight || 0,
    dimensionsCm: {
      length: opts.length || 0,
      width: opts.width || 0,
      height: opts.height || 0
    },
    hsnCode: opts.hsn || '73269099',
    gstRatePercent: opts.gst !== undefined ? opts.gst : 18,
    unitOfMeasure: (opts.uom || 'PCS') as any
  };
}
  };
}

interface TagBadgeListProps {
  items: string[];
  onRemove: (idx: number) => void;
  badgeClassName: string;
  fontMono?: boolean;
}

const TagBadgeList: React.FC<TagBadgeListProps> = ({ items, onRemove, badgeClassName, fontMono }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((item, idx) => (
      <span 
        key={idx} 
        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${badgeClassName} ${fontMono ? 'font-mono' : ''}`}
      >
        {item}
        <button 
          type="button"
          onClick={() => onRemove(idx)}
          className="text-slate-400 hover:text-rose-600 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    ))}
  </div>
);

interface ImageSlotCardProps {
  slotNumber: number;
  title: string;
  badgeText: string;
  badgeColorClass: string;
  alt: string;
  imageUrl: string;
  onImageUrlChange: (val: string) => void;
  onFileUpload: (file: File) => void;
}

const ImageSlotCard: React.FC<ImageSlotCardProps> = ({
  slotNumber,
  title,
  badgeText,
  badgeColorClass,
  alt,
  imageUrl,
  onImageUrlChange,
  onFileUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white p-4.5 rounded-2xl border border-slate-200 space-y-3.5 shadow-sm flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 font-mono">{slotNumber}. {title}</span>
          <span className={`px-2 py-0.5 rounded ${badgeColorClass} text-[10px] font-bold`}>{badgeText}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-center h-40 relative group">
          {imageUrl ? (
            <img src={imageUrl} alt={alt} className="max-h-36 object-contain" />
          ) : (
            <div className="text-center text-slate-400 text-xs">No Image Selected</div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onFileUpload(e.target.files[0]);
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Upload File
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => onImageUrlChange('')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="Or enter image URL..."
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800 font-mono focus:outline-none focus:border-[#0054A6]"
        />
      </div>
    </div>
  );
};

export const ApeProductListingWizard: React.FC<ApeProductListingWizardProps> = ({
  initialProduct,
  onClose,
  onSaved
}) => {
  const { addNewProduct, updateProduct, showToast, products, fetchApiCatalog } = useStore();

  const isNewProduct = !initialProduct;

  // Catalog Item Picker state for merging existing products into this listing
  const [isCatalogPickerOpen, setIsCatalogPickerOpen] = useState(false);
  const [selectedCatalogAsins, setSelectedCatalogAsins] = useState<string[]>([]);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');

  // Manual 5-Item Custom Builder state (Add 5 items manually)
  const [isManualBuilderOpen, setIsManualBuilderOpen] = useState(false);
  const [manualEntryMode, setManualEntryMode] = useState<'TABLE' | 'QUICK'>('TABLE');
  const [manualItems, setManualItems] = useState<ManualSampleItem[]>([]);

  // Active Wizard Tab: If new product, start on DETAILS (Tab 1), else start on VARIATIONS (Tab 3)
  const [activeListingTab, setActiveListingTab] = useState<'DETAILS' | 'MEDIA' | 'VARIATIONS' | 'OFFER' | 'COMPLIANCE'>(
    isNewProduct ? 'DETAILS' : 'VARIATIONS'
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 1: PRODUCT VITAL INFO & IDENTITY (APE STORE STANDARD)
  // ─────────────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(initialProduct?.title || '');
  const [brand, setBrand] = useState(initialProduct?.brand || 'Apollo Engineering');
  const [modelNumber, setModelNumber] = useState(initialProduct?.modelNumber || '');
  const [partNumber, setPartNumber] = useState(initialProduct?.partNumber || '');
  const [category, setCategory] = useState(initialProduct?.category || 'SS304 GRADE');
  const [subCategory, setSubCategory] = useState(initialProduct?.subCategory || 'Solar Cleaning Hardware');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialProduct?.countryOfOrigin || 'India');
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>(
    initialProduct?.unitOfMeasure || initialProduct?.variants?.[0]?.unitOfMeasure || 'PCS'
  );
  
  // First-Class Combo Kit / Bundle State
  const [isComboBundle, setIsComboBundle] = useState<boolean>(
    Boolean(initialProduct?.isComboBundle || initialProduct?.variants?.[0]?.isComboVariant)
  );
  const [comboComponents, setComboComponents] = useState<ComboComponentItem[]>(
    initialProduct?.comboComponents || initialProduct?.variants?.[0]?.comboComponents || []
  );

  // Bundle Component Entry Inputs
  const [newComponentAsin, setNewComponentAsin] = useState('');
  const [newComponentTitle, setNewComponentTitle] = useState('');
  const [newComponentSku, setNewComponentSku] = useState('');
  const [newComponentQty, setNewComponentQty] = useState(1);
  const [newComponentPrice, setNewComponentPrice] = useState(0);
  const [newComponentSpecs, setNewComponentSpecs] = useState('');

  const [highlights, setHighlights] = useState<string[]>(
    initialProduct?.highlights && initialProduct.highlights.length > 0 
      ? initialProduct.highlights 
      : []
  );
  const [newHighlightInput, setNewHighlightInput] = useState('');

  const [targetAudience, setTargetAudience] = useState<string[]>(
    initialProduct?.targetAudience && initialProduct.targetAudience.length > 0
      ? initialProduct.targetAudience
      : []
  );
  const [newAudienceInput, setNewAudienceInput] = useState('');

  const [hsnCode, setHSNCode] = useState(initialProduct?.variants?.[0]?.hsnCode || '73269099');
  const [gstRate, setGstRate] = useState<number>(
    initialProduct?.variants?.[0]?.gstRatePercent !== undefined ? initialProduct.variants[0].gstRatePercent : 18
  );
  const [includeAPlusComparison, setIncludeAPlusComparison] = useState(false);

  // Industrial Catalog Vital Info Identifiers
  const [productIdType, setProductIdType] = useState<'ASIN' | 'UPC' | 'EAN' | 'GTIN_EXEMPTION'>('ASIN');
  const [productIdValue, setProductIdValue] = useState(initialProduct?.asin || '');
  const [hasGtinExemption, setHasGtinExemption] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 2: MEDIA UPLOADS & 6-IMAGE GALLERY SPECIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  const [image1, setImage1] = useState<string>(
    initialProduct?.variants?.[0]?.images?.[0] || ''
  );
  const [image2, setImage2] = useState<string>(
    initialProduct?.variants?.[0]?.images?.[1] || ''
  );
  const [image3, setImage3] = useState<string>(
    initialProduct?.variants?.[0]?.images?.[2] || ''
  );
  const [image4, setImage4] = useState<string>(
    initialProduct?.variants?.[0]?.images?.[3] || ''
  );
  const [image5, setImage5] = useState<string>(
    initialProduct?.variants?.[0]?.images?.[4] || ''
  );
  const [image6, setImage6] = useState<string>(
    initialProduct?.variants?.[0]?.images?.[5] || ''
  );
  const [videoUrl, setVideoUrl] = useState<string>(
    initialProduct?.videoUrl || initialProduct?.variants?.[0]?.videoUrl || ''
  );

  const videoInputRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File, setter: (val: string) => void, type: 'image' | 'video') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setter(e.target.result as string);
        showToast(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully!`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 3: VARIATIONS MATRIX (APE STORE ASIN + ENTERPRISE FSN DUAL MATRIX)
  // ─────────────────────────────────────────────────────────────────────────
  const [selectedVariationThemes, setSelectedVariationThemes] = useState<{
    size: boolean;
    numberOfItems: boolean;
    color: boolean;
    material: boolean;
    itemShape: boolean;
    orientation: boolean;
  }>({
    size: true,
    numberOfItems: false,
    color: false,
    material: false,
    itemShape: false,
    orientation: false,
  });

  const [variationTheme, setVariationTheme] = useState<string>('Size');

  const handleVariationThemeChange = (newTheme: string) => {
    setVariationTheme(newTheme);
    setSelectedVariationThemes({
      size: newTheme.includes('Size'),
      material: newTheme.includes('Material'),
      numberOfItems: newTheme.includes('Package') || newTheme.includes('Pack'),
      color: newTheme.includes('Color'),
      itemShape: false,
      orientation: false,
    });
    showToast(`Updated variation theme to ${newTheme}`, 'info');
  };

  const [newSizeInput, setNewSizeInput] = useState('');
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [printingBarcodeVariant, setPrintingBarcodeVariant] = useState<ProductVariant | null>(null);

  const [variantsList, setVariantsList] = useState<ProductVariant[]>(() => {
    if (initialProduct?.variants && initialProduct.variants.length > 0) {
      return initialProduct.variants.map((v, i) => ({
        ...v,
        b2bMoq: v.b2bMoq || initialProduct.b2bMoq || v.b2bTierPricing?.[0]?.minQty || 50,
        flipkartFsn: v.flipkartFsn || `FSN-APE-${(i + 1).toString().padStart(4, '0')}`,
        lowStockThreshold: v.lowStockThreshold || 10,
        gstRatePercent: v.gstRatePercent !== undefined ? v.gstRatePercent : 18,
        unitOfMeasure: (v.unitOfMeasure || initialProduct.unitOfMeasure || 'PCS') as any
      }));
    }

    // Clean blank starter variant for a new product
    return [
      {
        sku: '',
        title: 'Standard',
        attributes: { size: 'Standard' },
        mrp: 0,
        b2cPrice: 0,
        b2bTierPricing: [{ minQty: 50, pricePerUnit: 0, discountPercent: 0 }],
        inventory: 0,
        ...getDefaultVariantPackaging()
      }
    ];
  });

  const [defaultB2cPrice, setDefaultB2cPrice] = useState(initialProduct?.variants?.[0]?.b2cPrice || 0);
  const [defaultMrp, setDefaultMrp] = useState(initialProduct?.variants?.[0]?.mrp || 0);
  const [b2bTiers, setB2bTiers] = useState<{ minQty: number; pricePerUnit: number; discountPercent?: number }[]>(() => {
    if (initialProduct?.variants?.[0]?.b2bTierPricing && initialProduct.variants[0].b2bTierPricing.length > 0) {
      return initialProduct.variants[0].b2bTierPricing.map(t => ({
        minQty: t.minQty,
        pricePerUnit: t.pricePerUnit,
        discountPercent: t.discountPercent
      }));
    }
    return [
      { minQty: 50, pricePerUnit: 0, discountPercent: 0 }
    ];
  });
  const defaultB2bPrice = b2bTiers[0]?.pricePerUnit || 0;
  const defaultB2bMinQty = b2bTiers[0]?.minQty || 50;

  const handleAddB2bTier = () => {
    const lastTier = b2bTiers[b2bTiers.length - 1];
    const newMin = lastTier ? (lastTier.minQty >= 1000 ? lastTier.minQty + 1500 : 1000) : 1000;
    const newPrice = lastTier ? Math.max(1, lastTier.pricePerUnit - 2) : 15;
    const disc = defaultB2cPrice > 0 ? Math.max(0, Math.round(((defaultB2cPrice - newPrice) / defaultB2cPrice) * 100)) : 25;
    setB2bTiers([...b2bTiers, { minQty: newMin, pricePerUnit: newPrice, discountPercent: disc }]);
  };

  const handleUpdateB2bTier = (idx: number, field: 'minQty' | 'pricePerUnit', val: number) => {
    setB2bTiers(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const updated = { ...t, [field]: Math.max(field === 'minQty' ? 1 : 0, val) };
      if (field === 'pricePerUnit') {
        updated.discountPercent = defaultB2cPrice > 0
          ? Math.max(0, Math.round(((defaultB2cPrice - val) / defaultB2cPrice) * 100))
          : 0;
      }
      return updated;
    }));
  };

  const handleRemoveB2bTier = (idx: number) => {
    if (b2bTiers.length <= 1) {
      showToast('At least one B2B wholesale tier is required', 'warning');
      return;
    }
    setB2bTiers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleApplyDefaultPriceToAll = () => {
    const formattedTiers = b2bTiers.map(t => ({
      minQty: Math.max(1, Number(t.minQty) || 1),
      pricePerUnit: Math.max(0, Number(t.pricePerUnit) || 0),
      discountPercent: defaultB2cPrice > 0 ? Math.max(0, Math.round(((defaultB2cPrice - Number(t.pricePerUnit)) / defaultB2cPrice) * 100)) : 0
    })).sort((a, b) => a.minQty - b.minQty);

    const lowestMoq = formattedTiers[0]?.minQty || 1;

    setVariantsList((prev) =>
      prev.map((v) => ({
        ...v,
        b2bMoq: lowestMoq,
        b2cPrice: defaultB2cPrice,
        mrp: defaultMrp,
        b2bTierPricing: formattedTiers
      }))
    );
    showToast(`Applied B2C ₹${defaultB2cPrice} and ${formattedTiers.length} B2B wholesale tiers across all ${variantsList.length} variations!`, 'success');
  };

  const handleAddVariant = (term: string) => {
    if (!term.trim()) return;
    // Support multi-term comma, semicolon, or newline input (e.g. 28mm, 30mm, 33mm, 35mm, 40mm)
    const terms = term.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
    if (terms.length === 0) return;

    let addedCount = 0;
    const newVariants = [...variantsList];

    for (const cleanTerm of terms) {
      // Check if variant with this size already exists
      const exists = newVariants.some(v => v.attributes.size?.toLowerCase() === cleanTerm.toLowerCase());
      if (exists) {
        continue;
      }

      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const cleanSlug = cleanTerm.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'VAR';
      const randomSku = `APE-${cleanSlug}-${randomSuffix}`;
      const randomAsin = `8908511${Math.floor(100000 + Math.random() * 900000)}`;
      const randomFsn = `FSN-APE-${Math.floor(1000 + Math.random() * 9000)}`;

      const newVariant: ProductVariant = {
        sku: randomSku,
        title: `${title || 'Apollo Product'} - ${cleanTerm}`,
        attributes: { size: cleanTerm, material: 'SS304' },
        mrp: defaultMrp || 120,
        b2cPrice: defaultB2cPrice || 20,
        b2bTierPricing: [{ minQty: defaultB2bMinQty || 50, pricePerUnit: defaultB2bPrice || 12.75, discountPercent: 36 }],
        inventory: 500,
        lowStockThreshold: 50,
        barcode: randomAsin,
        flipkartFsn: randomFsn,
        images: [image1 || '/solar_sprinkler.webp'],
        videoUrl: videoUrl,
        weightGrams: 50,
        dimensionsCm: { length: 8, width: 4, height: 3 },
        hsnCode: hsnCode || '73269099',
        gstRatePercent: gstRate || 18,
        unitOfMeasure: (unitOfMeasure || 'PCS') as any
      };

      newVariants.push(newVariant);
      addedCount++;
    }

    if (addedCount > 0) {
      setVariantsList(newVariants);
      setNewSizeInput('');
      showToast(`Added ${addedCount} variant(s) to matrix!`, 'success');
    } else {
      showToast(`Variant(s) already exist in matrix!`, 'info');
    }
  };

  const handleDuplicateVariant = (index: number) => {
    const source = variantsList[index];
    const copySuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const duplicated: ProductVariant = {
      ...source,
      sku: `${source.sku}-CPY${copySuffix}`,
      title: `${source.title} (Copy)`,
      barcode: `8908511${Math.floor(100000 + Math.random() * 900000)}`,
      flipkartFsn: `FSN-APE-${Math.floor(1000 + Math.random() * 9000)}`,
      attributes: { ...source.attributes }
    };
    const updated = [...variantsList];
    updated.splice(index + 1, 0, duplicated);
    setVariantsList(updated);
    showToast(`Duplicated variant ${source.sku}!`, 'success');
  };

  const handleUpdateVariantRow = (index: number, field: string, value: any) => {
    setVariantsList((prev) => {
      const updated = [...prev];
      if (field === 'size') {
        updated[index] = {
          ...updated[index],
          attributes: { ...updated[index].attributes, size: value },
          title: `${title || 'Apollo Product'} - ${value}`
        };
      } else if (field === 'b2cPrice') {
        const numVal = Math.max(0, Number(value));
        const existingTiers = updated[index].b2bTierPricing;
        const currentB2bPrice = existingTiers?.[0]?.pricePerUnit;
        const b2bPriceToUse = currentB2bPrice && currentB2bPrice > 0 ? currentB2bPrice : Math.round(numVal * 0.7);
        const b2bMoqToUse = updated[index].b2bMoq || existingTiers?.[0]?.minQty || defaultB2bMinQty || 50;

        updated[index] = {
          ...updated[index],
          b2cPrice: numVal,
          // Preserve custom B2B wholesale pricing while updating discount percentages dynamically
          b2bTierPricing: existingTiers && existingTiers.length > 0
            ? existingTiers.map(tier => ({
                ...tier,
                discountPercent: numVal > 0 ? Math.max(0, Math.round(((numVal - tier.pricePerUnit) / numVal) * 100)) : tier.discountPercent
              }))
            : [
                {
                  minQty: b2bMoqToUse,
                  pricePerUnit: b2bPriceToUse,
                  discountPercent: numVal > 0 ? Math.max(0, Math.round(((numVal - b2bPriceToUse) / numVal) * 100)) : 30
                }
              ]
        };
      } else if (field === 'b2bPrice') {
        const numVal = Math.max(0, Number(value));
        updated[index] = {
          ...updated[index],
          b2bTierPricing: [
            {
              minQty: updated[index].b2bMoq || updated[index].b2bTierPricing?.[0]?.minQty || 50,
              pricePerUnit: numVal,
              discountPercent: Math.round(((updated[index].b2cPrice - numVal) / (updated[index].b2cPrice || 1)) * 100)
            }
          ]
        };
      } else if (field === 'b2bMoq') {
        const moqVal = Math.max(1, Number(value));
        const currentPrice = updated[index].b2bTierPricing?.[0]?.pricePerUnit || Math.round(updated[index].b2cPrice * 0.7);
        updated[index] = {
          ...updated[index],
          b2bMoq: moqVal,
          b2bTierPricing: [
            {
              minQty: moqVal,
              pricePerUnit: currentPrice,
              discountPercent: Math.round(((updated[index].b2cPrice - currentPrice) / (updated[index].b2cPrice || 1)) * 100)
            }
          ]
        };
      } else {
        (updated[index] as any)[field] = value;
      }
      return updated;
    });
  };

  // Catalog Item Merger: Combine selected catalog products as variations in this listing
  const handleCombineSelectedCatalogItems = () => {
    if (selectedCatalogAsins.length === 0) {
      showToast('Please select at least 1 product from catalog to combine.', 'error');
      return;
    }

    const matchedProducts = selectedCatalogAsins
      .map(asin => products.find(p => p.asin === asin))
      .filter(Boolean) as Product[];

    if (matchedProducts.length === 0) return;

    const importedVariants: ProductVariant[] = [];
    matchedProducts.forEach((prod, pIdx) => {
      prod.variants.forEach((v, vIdx) => {
        const sizeLabel = v.attributes?.size || `${v.title || prod.title}`;
        importedVariants.push({
          ...v,
          sku: v.sku || `APE-${pIdx + 1}-${vIdx + 1}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          title: v.title || `${prod.title} - ${sizeLabel}`,
          attributes: {
            ...v.attributes,
            size: v.attributes?.size || sizeLabel,
            material: v.attributes?.material || 'AISI SS304'
          },
          images: v.images && v.images.length > 0 ? v.images : (prod.variants[0]?.images || [image1 || '/logo.webp']),
          unitOfMeasure: (v.unitOfMeasure || prod.unitOfMeasure || unitOfMeasure || 'PCS') as any,
          gstRatePercent: v.gstRatePercent !== undefined ? v.gstRatePercent : (prod.variants[0]?.gstRatePercent || 18)
        });
      });
    });

    if (importedVariants.length > 0) {
      const isDummyStarter = variantsList.length === 1 && variantsList[0].sku.startsWith('APE-') && variantsList[0].title.includes('Standard Variant');
      const updatedList = isDummyStarter ? importedVariants : [...variantsList, ...importedVariants];
      setVariantsList(updatedList);

      if (!title.trim() && matchedProducts[0]) {
        setTitle(`Apollo Multi-Item Variation Family - ${matchedProducts[0].title.replace(/\s*\(.*?\)\s*/g, '')}`);
      }

      showToast(`Combined ${matchedProducts.length} catalog items (${importedVariants.length} variations) into this listing!`, 'success');
      setIsCatalogPickerOpen(false);
      setSelectedCatalogAsins([]);
    }
  };

  const handleDeleteVariantRow = (index: number) => {
    if (variantsList.length <= 1) {
      showToast('A product listing must have at least 1 variant row.', 'error');
      return;
    }
    setVariantsList((prev) => prev.filter((_, i) => i !== index));
    showToast('Variant removed from Matrix.', 'info');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ✍️ MANUAL 5-ITEM CUSTOM BUILDER HANDLERS (Add 5 items manually)
  // ─────────────────────────────────────────────────────────────────────────
  const handleUpdateManualItem = (index: number, field: string, value: any) => {
    setManualItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddManualItemRow = () => {
    const nextIdx = manualItems.length + 1;
    setManualItems(prev => [
      ...prev,
      {
        size: `Size ${nextIdx}`,
        sku: `APE-VAR-${nextIdx}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        b2cPrice: defaultB2cPrice || 22,
        b2bPrice: defaultB2bPrice || 16,
        b2bMoq: defaultB2bMinQty || 50,
        inventory: 1000,
        barcode: `8908511${Math.floor(100000 + Math.random() * 900000)}`
      }
    ]);
    showToast(`Added manual item row #${nextIdx}`, 'info');
  };

  const handleRemoveManualItemRow = (index: number) => {
    if (manualItems.length <= 1) {
      showToast('You need at least 1 manual row.', 'error');
      return;
    }
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleResetManualItemsBlank = () => {
    setManualItems([
      { size: '', sku: '', b2cPrice: 20, b2bPrice: 15, b2bMoq: 50, inventory: 500, barcode: '' },
      { size: '', sku: '', b2cPrice: 20, b2bPrice: 15, b2bMoq: 50, inventory: 500, barcode: '' },
      { size: '', sku: '', b2cPrice: 20, b2bPrice: 15, b2bMoq: 50, inventory: 500, barcode: '' },
      { size: '', sku: '', b2cPrice: 20, b2bPrice: 15, b2bMoq: 50, inventory: 500, barcode: '' },
      { size: '', sku: '', b2cPrice: 20, b2bPrice: 15, b2bMoq: 50, inventory: 500, barcode: '' }
    ]);
    showToast('Reset to 5 blank manual rows for custom entry.', 'info');
  };

  const handleLoadManualSampleClips = () => {
    setManualItems(DEFAULT_SAMPLE_MANUAL_ITEMS);
    showToast('Loaded 5 sample items into manual builder.', 'info');
  };

  const handleApplyManualItems = () => {
    const validItems = manualItems.filter(item => item.size && item.size.trim().length > 0);
    if (validItems.length === 0) {
      showToast('Please enter at least 1 item name/size in the manual form.', 'error');
      return;
    }

    const newVariants: ProductVariant[] = validItems.map((item, idx) => {
      const cleanSize = item.size.trim();
      const cleanSku = item.sku.trim() || `APE-${cleanSize.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'VAR'}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const cleanBarcode = item.barcode.trim() || `8908511${Math.floor(100000 + Math.random() * 900000)}`;
      const b2c = Number(item.b2cPrice) > 0 ? Number(item.b2cPrice) : 22;
      const b2b = Number(item.b2bPrice) > 0 ? Number(item.b2bPrice) : Math.round(b2c * 0.7);
      const moq = Number(item.b2bMoq) > 0 ? Number(item.b2bMoq) : 50;
      const inv = Number(item.inventory) >= 0 ? Number(item.inventory) : 500;

      return {
        sku: cleanSku,
        title: `${title || 'Apollo Product'} - ${cleanSize}`,
        attributes: { size: cleanSize, material: 'AISI SS304', packSize: 'Pack of 50' },
        mrp: defaultMrp || 35,
        b2cPrice: b2c,
        b2bTierPricing: [
          {
            minQty: moq,
            pricePerUnit: b2b,
            discountPercent: Math.max(0, Math.round(((b2c - b2b) / (b2c || 1)) * 100))
          }
        ],
        inventory: inv,
        ...getDefaultVariantPackaging({
          barcode: cleanBarcode,
          fsnSuffix: cleanSize.replace(/\D/g, '') || (idx + 1).toString(),
          image: image1,
          weight: itemWeight,
          length: itemLength,
          width: itemWidth,
          height: itemHeight,
          hsn: hsnCode,
          gst: gstRate,
          uom: unitOfMeasure
        })
      };
    });

    setVariantsList(newVariants);
    setSelectedVariationThemes(prev => ({ ...prev, size: true, material: true }));
    showToast(`Saved ${newVariants.length} manual custom items to the Variation Matrix!`, 'success');
    setIsManualBuilderOpen(false);
  };

  const handleAddBlankManualRow = () => {
    const nextNum = variantsList.length + 1;
    const newVariant: ProductVariant = {
      sku: '',
      title: `Variant ${nextNum}`,
      attributes: { size: `Option ${nextNum}` },
      mrp: defaultMrp || 0,
      b2cPrice: defaultB2cPrice || 0,
      b2bTierPricing: [{ minQty: defaultB2bMinQty || 50, pricePerUnit: defaultB2bPrice || 0, discountPercent: 0 }],
      inventory: 0,
      ...getDefaultVariantPackaging({
        image: image1,
        weight: itemWeight,
        length: itemLength,
        width: itemWidth,
        height: itemHeight,
        hsn: hsnCode,
        gst: gstRate,
        uom: unitOfMeasure
      })
    };
    setVariantsList(prev => [...prev, newVariant]);
    showToast(`Added blank variant row #${nextNum}`, 'success');
  };

  const handleSelectCatalogProductForBundle = (selectedAsin: string) => {
    setNewComponentAsin(selectedAsin);
    const prod = products.find(p => p.asin === selectedAsin);
    if (prod) {
      setNewComponentTitle(prod.title);
      setNewComponentSku(prod.variants[0]?.sku || prod.asin);
      setNewComponentPrice(prod.variants[0]?.b2cPrice || 0);
    }
  };

  const handleAddBundleComponent = () => {
    if (!newComponentTitle.trim()) {
      showToast('Please provide a component title or select from catalog', 'warning');
      return;
    }
    const newComp: ComboComponentItem = {
      asin: newComponentAsin || `COMP-${Date.now().toString(36).toUpperCase()}`,
      sku: newComponentSku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
      productTitle: newComponentTitle.trim(),
      quantity: Math.max(1, newComponentQty),
      unitPrice: Math.max(0, newComponentPrice),
      unitOfMeasure: 'PCS',
      technicalDetails: newComponentSpecs ? { specs: { Description: newComponentSpecs } } : undefined
    };
    setComboComponents(prev => [...prev, newComp]);
    setNewComponentAsin('');
    setNewComponentTitle('');
    setNewComponentSku('');
    setNewComponentQty(1);
    setNewComponentPrice(0);
    setNewComponentSpecs('');
    showToast(`Added component "${newComp.productTitle}" to bundle`, 'success');
  };

  const handleRemoveBundleComponent = (index: number) => {
    setComboComponents(prev => prev.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // BULK CSV EXPORT & IMPORT (WITH GST & UNIT)
  // ─────────────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Size', 'SKU', 'Unit', 'GST_Rate_Percent', 'APE_ASIN', 'Enterprise_FSN', 'MRP', 'B2C_Price', 'B2B_Price', 'Inventory', 'Low_Stock_Threshold', 'Weight_Grams', 'HSN'];
    const rows = variantsList.map(v => [
      `"${v.attributes.size || ''}"`,
      `"${v.sku}"`,
      `"${v.unitOfMeasure || unitOfMeasure || 'PCS'}"`,
      v.gstRatePercent !== undefined ? v.gstRatePercent : 18,
      `"${v.barcode}"`,
      `"${v.flipkartFsn || ''}"`,
      v.mrp,
      v.b2cPrice,
      v.b2bTierPricing?.[0]?.pricePerUnit || Math.round(v.b2cPrice * 0.7),
      v.inventory,
      v.lowStockThreshold || 50,
      v.weightGrams,
      `"${v.hsnCode}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Apollo_${title.replace(/[^a-zA-Z0-9]/g, '_') || 'Catalog'}_Variations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded variations CSV spreadsheet!', 'success');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
          showToast('CSV file is empty or missing data rows.', 'error');
          return;
        }

        const parsedVariants: ProductVariant[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 7) {
            const size = cols[0];
            const sku = cols[1] || `APE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const uom = (cols[2] || unitOfMeasure || 'PCS') as any;
            const itemGst = Number(cols[3]) || gstRate || 18;
            const asin = cols[4] || `8908511${Math.floor(100000 + Math.random() * 900000)}`;
            const fsn = cols[5] || `FSN-APE-${Math.floor(1000 + Math.random() * 9000)}`;
            const mrp = Number(cols[6]) || 120;
            const b2c = Number(cols[7]) || 20;
            const b2b = Number(cols[8]) || 12.75;
            const inv = Number(cols[9]) || 500;
            const lowStock = Number(cols[10]) || 50;
            const weight = Number(cols[11]) || 50;
            const hsn = cols[12] || hsnCode || '73269099';

            parsedVariants.push({
              sku,
              title: `${title || 'Apollo Product'} - ${size}`,
              attributes: { size, material: 'SS304' },
              mrp,
              b2cPrice: b2c,
              b2bTierPricing: [{ minQty: 50, pricePerUnit: b2b, discountPercent: Math.round(((b2c - b2b) / (b2c || 1)) * 100) }],
              inventory: inv,
              lowStockThreshold: lowStock,
              barcode: asin,
              flipkartFsn: fsn,
              images: [image1 || '/solar_sprinkler.webp'],
              videoUrl,
              weightGrams: weight,
              dimensionsCm: { length: 8, width: 4, height: 3 },
              hsnCode: hsn,
              gstRatePercent: itemGst,
              unitOfMeasure: uom
            });
          }
        }

        if (parsedVariants.length > 0) {
          setVariantsList(parsedVariants);
          showToast(`Successfully imported ${parsedVariants.length} variations from CSV!`, 'success');
        } else {
          showToast('Could not find valid variation rows in CSV.', 'error');
        }
      } catch (err) {
        showToast('Error reading CSV file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 4: OFFER, FULFILLMENT & SHIPPING RULES
  // ─────────────────────────────────────────────────────────────────────────
  const [condition, setCondition] = useState('New');
  const [handlingTimeDays, setHandlingTimeDays] = useState(initialProduct?.handlingTimeDays || 1);
  const [isCodAllowed, setIsCodAllowed] = useState(initialProduct?.isCodAllowed ?? true);
  const [maxOrderQuantity, setMaxOrderQuantity] = useState(initialProduct?.maxOrderQuantity || 1000);
  const [returnPolicy, setReturnPolicy] = useState(initialProduct?.returnPolicy || '7 Days Replacement for Manufacturing Defects');

  // ─────────────────────────────────────────────────────────────────────────
  // TAB 5: TECHNICAL SPECS, DIMENSIONS & VOLUMETRIC CALCULATOR
  // ─────────────────────────────────────────────────────────────────────────
  const [itemLength, setItemLength] = useState(8);
  const [itemWidth, setItemWidth] = useState(4);
  const [itemHeight, setItemHeight] = useState(3);
  const [itemWeight, setItemWeight] = useState(48);

  const [packageLength, setPackageLength] = useState(15);
  const [packageWidth, setPackageWidth] = useState(10);
  const [packageHeight, setPackageHeight] = useState(8);
  const [packageWeight, setPackageWeight] = useState(120);

  const volumetricWeightKg = useMemo(() => {
    return Number(((packageLength * packageWidth * packageHeight) / 5000).toFixed(2));
  }, [packageLength, packageWidth, packageHeight]);

  const deadWeightKg = useMemo(() => {
    return Number((packageWeight / 1000).toFixed(2));
  }, [packageWeight]);

  const billableWeightKg = useMemo(() => {
    return Math.max(volumetricWeightKg, deadWeightKg);
  }, [volumetricWeightKg, deadWeightKg]);

  const [includedComponents, setIncludedComponents] = useState(
    initialProduct?.includedComponents || 'Pack of 50 Stainless Steel 35mm Solar Drain Clips, 1x Quality Inspection Card'
  );

  const [keywords, setKeywords] = useState<string[]>(
    initialProduct?.keywords && initialProduct.keywords.length > 0
      ? initialProduct.keywords
      : ['solar drain clip', 'ss304 solar clip', 'water drainage nozzle', 'solar panel cleaning clamp', 'sludge remover clip', 'kathwada factory direct']
  );
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // ─────────────────────────────────────────────────────────────────────────
  // 📊 LISTING QUALITY SCORE METER (APE STORE COMPLIANCE 0-100%)
  // ─────────────────────────────────────────────────────────────────────────
  const listingQualityScore = useMemo(() => {
    let score = 0;
    if (title.trim().length >= 40 && title.trim().length <= 200) score += 20;
    else if (title.trim().length > 0) score += 10;

    if (image1) score += 5;
    if (image2 && image3) score += 5;
    if (image4 && image5 && image6) score += 5;
    if (videoUrl) score += 5;

    const hasIndustrialFormattedBullets = highlights.filter(h => /^\[.+\]/.test(h)).length >= 3;
    if (highlights.length >= 4 && hasIndustrialFormattedBullets) score += 15;
    else if (highlights.length >= 4) score += 10;
    else if (highlights.length > 0) score += 5;

    if (variantsList.length >= 5) score += 15;
    else if (variantsList.length >= 2) score += 10;
    else if (variantsList.length === 1) score += 5;

    if (packageLength > 0 && packageWeight > 0 && itemLength > 0 && includedComponents.length > 10) score += 15;
    else score += 5;

    if (hsnCode && countryOfOrigin && keywords.length >= 3) score += 15;
    else score += 5;

    if (productIdValue || hasGtinExemption) score += 5;

    return Math.min(100, score);
  }, [title, image1, image2, image3, image4, image5, image6, videoUrl, highlights, variantsList, packageLength, packageWeight, itemLength, includedComponents, hsnCode, countryOfOrigin, keywords, productIdValue, hasGtinExemption]);

  // ─────────────────────────────────────────────────────────────────────────
  // 💾 SAVE & FINISH LISTING HANDLER
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveListing = () => {
    if (!title.trim()) {
      setActiveListingTab('DETAILS');
      showToast('Please provide a Product Title in Product Details', 'error');
      return;
    }

    if (variantsList.length === 0) {
      setActiveListingTab('VARIATIONS');
      showToast('Please add at least 1 variant in the Variations Matrix', 'error');
      return;
    }

    const generatedAsin = hasGtinExemption
      ? `APE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : (productIdValue.trim() ? productIdValue.trim() : `AP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
    const asin = initialProduct?.asin || generatedAsin;
    const mediaImages = [image1, image2, image3, image4, image5, image6].filter(img => img && img.trim() !== '');
    const fallbackImage = mediaImages.length > 0 ? mediaImages : ['/logo.webp'];

    const finalizedVariants: ProductVariant[] = variantsList.map((v, i) => ({
      ...v,
      sku: v.sku.trim() || `${asin}-${(i + 1).toString().padStart(2, '0')}`,
      b2bMoq: v.b2bMoq || defaultB2bMinQty || 50,
      images: v.images && v.images.length > 0 ? v.images : fallbackImage,
      videoUrl: v.videoUrl || videoUrl,
      dimensionsCm: { length: itemLength, width: itemWidth, height: itemHeight },
      packageDimensionsCm: { length: packageLength, width: packageWidth, height: packageHeight },
      gstRatePercent: v.gstRatePercent !== undefined ? v.gstRatePercent : (gstRate || 18),
      unitOfMeasure: (v.unitOfMeasure || unitOfMeasure || 'PCS') as any,
      isComboVariant: isComboBundle,
      comboComponents: isComboBundle && comboComponents.length > 0 ? comboComponents : undefined
    }));

    // Auto-generate robust seller listings for all variants
    const generatedSellerListings: Record<string, SellerListing[]> = initialProduct?.sellerListings && Object.keys(initialProduct.sellerListings).length > 0
      ? { ...initialProduct.sellerListings }
      : {};

    finalizedVariants.forEach(v => {
      if (!generatedSellerListings[v.sku] || generatedSellerListings[v.sku].length === 0) {
        generatedSellerListings[v.sku] = [
          {
            sellerId: 'seller_apollo_mfg',
            sellerName: 'Apollo Engineering Direct Hub (382430)',
            rating: 5.0,
            ratingCount: 1,
            fulfillmentType: 'FBF',
            price: v.b2cPrice || 0,
            shippingFee: 0,
            deliveryDays: 1,
            stock: v.inventory || 0,
            isWinningBuyBox: true,
            buyBoxScore: 100
          }
        ];
      }
    });

    const aPlusModules: APlusModule[] = initialProduct?.aPlusContent && initialProduct.aPlusContent.length > 0
      ? initialProduct.aPlusContent
      : [];

    const computedIncludedComponents = isComboBundle && comboComponents.length > 0
      ? comboComponents.map(c => `${c.quantity}x ${c.productTitle}`).join(', ')
      : includedComponents;

    const completeProduct: Product = {
      asin,
      b2bMoq: defaultB2bMinQty || finalizedVariants[0]?.b2bMoq || 50,
      title,
      brand: brand || 'Apollo Engineering',
      modelNumber: modelNumber || `APE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      partNumber: partNumber || '',
      category: category || 'SS304 GRADE',
      subCategory: subCategory || 'Solar Cleaning Hardware',
      description: description || `${title} manufactured by Apollo Engineering at Kathwada Factory Hub.`,
      highlights,
      targetAudience,
      countryOfOrigin: countryOfOrigin || 'India',
      includedComponents: computedIncludedComponents,
      isComboBundle: isComboBundle,
      comboComponents: isComboBundle && comboComponents.length > 0 ? comboComponents : undefined,
      handlingTimeDays,
      isCodAllowed,
      maxOrderQuantity,
      returnPolicy,
      keywords,
      unitOfMeasure: unitOfMeasure || 'PCS',
      rating: initialProduct?.rating || 0,
      reviewCount: initialProduct?.reviewCount || 0,
      variants: finalizedVariants,
      selectedVariantSku: finalizedVariants[0]?.sku || 'SKU-01',
      videoUrl: videoUrl,
      sellerListings: generatedSellerListings,
      aPlusContent: includeAPlusComparison ? aPlusModules : (initialProduct?.aPlusContent || []),
      badges: ['PRIME', 'ENTERPRISE_ASSURED'],
      isLive: true,
      createdAt: initialProduct?.createdAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    if (initialProduct) {
      updateProduct(initialProduct.asin, completeProduct);
    } else {
      addNewProduct(completeProduct);
    }

    try {
      fetchApiCatalog();
    } catch {}

    onSaved(completeProduct);
    onClose();
    showToast(`Product ASIN ${asin} successfully published to Apollo Engineering Catalog!`, 'success');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL DOM PORTAL
  // ─────────────────────────────────────────────────────────────────────────
  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-1 sm:p-3 bg-black/65 backdrop-blur-md animate-fadeIn text-slate-900"
      style={{ isolation: 'isolate' }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-[1750px] shadow-2xl flex flex-col h-[96vh] max-h-[96vh] overflow-hidden">
        
        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* TOP HEADER STRIP & QUALITY SCORE METER (STICKY)                      */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <div className="bg-white px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base md:text-lg">
                  {isNewProduct ? 'Add New Product Listing' : `Edit Product: ${title || initialProduct?.title}`}
                </h2>
                {isComboBundle && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-600" /> Combo Kit / Bundle
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Kathwada Origin Hub ({ORIGIN_HUB_PINCODE}) • Direct Factory Catalog & Variation Master
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveListing}
              className="px-5 py-2 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Product Listing</span>
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
              title="Close Wizard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* 5 CORE APE STORE TABS BAR (STICKY)                                   */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <div className="bg-slate-50 px-6 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'DETAILS', label: '1. Vital Info & Identity', icon: FileText, badge: 'APE Store' },
            { id: 'MEDIA', label: '2. Images & Video', icon: Camera, badge: '3 Img + 1 Vid' },
            { id: 'VARIATIONS', label: '3. Variations Matrix', icon: Sliders, badge: `${variantsList.length} Variants` },
            { id: 'OFFER', label: '4. Offer & Fulfillment', icon: DollarSign, badge: 'B2C + B2B' },
            { id: 'COMPLIANCE', label: '5. Specs & Legal', icon: ShieldCheck, badge: 'Volumetric' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeListingTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveListingTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'border-[#0054A6] text-[#0054A6] bg-blue-50/70'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-blue-100 text-[#0054A6]' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* TAB BODY (SCROLLABLE CONTAINER)                                      */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 min-h-0">
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: VITAL INFO & PRODUCT IDENTITY                                 */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeListingTab === 'DETAILS' && (
            <div className="space-y-6 max-w-4xl mx-auto">

              {/* Product Type / Architecture Selection */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0054A6]" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                      Product Architecture & Type
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {isComboBundle ? 'Combo Kit / Multi-Component Bundle' : 'Standard Manufacturing Part / Line'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsComboBundle(false)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      !isComboBundle
                        ? 'border-[#0054A6] bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs font-bold text-slate-900">Standard Industrial Product</strong>
                      {!isComboBundle && <CheckCircle2 className="w-4 h-4 text-[#0054A6]" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Single manufactured component or size variant matrix (e.g. Drain Clip size variations).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsComboBundle(true)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isComboBundle
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs font-bold text-slate-900">Combo Kit / Bundle</strong>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">Multi-Item</span>
                      </div>
                      {isComboBundle && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pre-assembled combo package containing multiple products with a defined bill of materials.
                    </p>
                  </button>
                </div>
              </div>

              {/* BUNDLE INCLUSIONS & COMPONENTS MANAGER (When Combo Kit is selected) */}
              {isComboBundle && (
                <div className="bg-indigo-50/40 border border-indigo-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-indigo-200/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-700" />
                        <h4 className="text-sm font-bold text-indigo-950 font-mono uppercase tracking-wide">
                          Bundle Components & Inclusions
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-bold font-mono">
                          {comboComponents.length} {comboComponents.length === 1 ? 'Component' : 'Components'}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-900/70 mt-0.5">
                        Add the individual components included in this combo package.
                      </p>
                    </div>

                    {comboComponents.length > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                        <span className="text-slate-500 font-mono">Combined Value:</span>
                        <span className="font-bold font-mono text-indigo-950 text-sm">
                          ₹{comboComponents.reduce((acc, c) => acc + (c.quantity * (c.unitPrice || 0)), 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Components List Table */}
                  {comboComponents.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-indigo-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-indigo-100/60 text-indigo-950 font-mono text-[10px] uppercase border-b border-indigo-200">
                          <tr>
                            <th className="p-2.5 w-10 text-center">#</th>
                            <th className="p-2.5">Component Item</th>
                            <th className="p-2.5 w-32">SKU</th>
                            <th className="p-2.5 w-24 text-center">Qty</th>
                            <th className="p-2.5 w-24 text-right">Unit Rate</th>
                            <th className="p-2.5 w-24 text-right">Total</th>
                            <th className="p-2.5 w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-100">
                          {comboComponents.map((comp, cIdx) => (
                            <tr key={cIdx} className="hover:bg-indigo-50/30">
                              <td className="p-2.5 text-center font-mono text-slate-400 font-bold">{cIdx + 1}</td>
                              <td className="p-2.5 font-semibold text-slate-900">
                                {comp.productTitle}
                                {comp.technicalDetails?.specs?.Description && (
                                  <span className="block text-[10px] text-slate-500 font-normal">
                                    {comp.technicalDetails.specs.Description}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono text-slate-600 text-[11px]">{comp.sku || '—'}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                                {comp.quantity} {comp.unitOfMeasure || 'PCS'}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-700">
                                ₹{(comp.unitPrice || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-indigo-950">
                                ₹{(comp.quantity * (comp.unitPrice || 0)).toLocaleString('en-IN')}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBundleComponent(cIdx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove component"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white border border-dashed border-indigo-200 text-center text-xs text-indigo-900/60">
                      No components added yet. Select a product from your catalog below or enter a custom item.
                    </div>
                  )}

                  {/* Add Component to Bundle Form */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-3">
                    <span className="text-[11px] font-bold text-indigo-950 uppercase font-mono block">
                      + Add Component to this Bundle
                    </span>

                    {/* Quick Pick from Catalog */}
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-600 font-semibold">
                        Select from Existing Catalog Product (Optional):
                      </label>
                      <select
                        value={newComponentAsin}
                        onChange={(e) => handleSelectCatalogProductForBundle(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0054A6]"
                      >
                        <option value="">-- Choose from Catalog or Type Below --</option>
                        {products.map(p => (
                          <option key={p.asin} value={p.asin}>
                            {p.title} ({p.asin}) — ₹{p.variants[0]?.b2cPrice || 0}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5 space-y-1">
                        <label className="block text-[11px] text-slate-600 font-semibold">Component Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. AISI SS304 Solar Drain Clips (35mm)"
                          value={newComponentTitle}
                          onChange={(e) => setNewComponentTitle(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#0054A6]"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="block text-[11px] text-slate-600 font-semibold">SKU / Code</label>
                        <input
                          type="text"
                          placeholder="e.g. APE-SC-35MM"
                          value={newComponentSku}
                          onChange={(e) => setNewComponentSku(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0054A6]"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-[11px] text-slate-600 font-semibold">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={newComponentQty}
                          onChange={(e) => setNewComponentQty(Number(e.target.value))}
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0054A6]"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-[11px] text-slate-600 font-semibold">Unit Value (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={newComponentPrice}
                          onChange={(e) => setNewComponentPrice(Number(e.target.value))}
                          className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0054A6]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <input
                        type="text"
                        placeholder="Optional spec / notes (e.g. 50 Pcs Pack, SS304 Grade)"
                        value={newComponentSpecs}
                        onChange={(e) => setNewComponentSpecs(e.target.value)}
                        className="flex-1 max-w-md h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:border-[#0054A6]"
                      />

                      <button
                        type="button"
                        onClick={handleAddBundleComponent}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ml-3 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Component</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Core Catalog Identity (APE Store Standard)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Character Count: <strong className={title.length > 200 ? 'text-rose-600' : 'text-slate-800'}>{title.length}/200</strong>
                  </span>
                </div>

                {/* Product Title with live counter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-slate-700 font-semibold">
                      Product Title (Standard: 80 - 150 characters recommended) *
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      Chars: <strong className={title.length > 150 ? 'text-amber-600' : 'text-emerald-700'}>{title.length}/200</strong>
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    placeholder="e.g. Apollo Engineering AISI SS304 Solar Panel Water Drain Clips (28mm-40mm Frames) - Auto Siphon - Pack of 50"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-[#0054A6] focus:ring-1 focus:ring-[#0054A6]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Listing Guidelines: Do not include promotional claims ("Free Delivery", "Lowest Price", "#1").</span>
                    <span>Max 200 Characters</span>
                  </div>
                </div>

                {/* Product ID & GTIN Exemption Standard */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
                        Universal Product Identifier (GTIN / ASIN / UPC / EAN)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0054A6] text-[10px] font-mono font-bold">
                        Mandatory
                      </span>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="gtin-exemption"
                        name="hasGtinExemption"
                        checked={hasGtinExemption}
                        onChange={(e) => {
                          setHasGtinExemption(e.target.checked);
                          if (e.target.checked) setProductIdType('GTIN_EXEMPTION');
                        }}
                        className="w-4 h-4 accent-[#0054A6] rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800">
                        I have a <strong>GTIN Exemption</strong> (Direct Apollo Manufacturer Brand)
                      </span>
                    </label>
                  </div>

                  {!hasGtinExemption ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="block text-xs text-slate-600 font-semibold">Product ID Type</label>
                        <select
                          value={productIdType}
                          onChange={(e) => setProductIdType(e.target.value as any)}
                          className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                        >
                          <option value="ASIN">ASIN (Standard Identification Number)</option>
                          <option value="UPC">UPC (Universal Product Code - 12 Digits)</option>
                          <option value="EAN">EAN (European Article Number - 13 Digits)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs text-slate-600 font-semibold">Product ID Value *</label>
                        <input
                          type="text"
                          value={productIdValue}
                          onChange={(e) => setProductIdValue(e.target.value)}
                          placeholder="e.g. B0H3ZJ1J5L"
                          className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>GTIN Exemption Active:</strong> No barcode/UPC required for brand <strong>Apollo Engineering</strong>. An internal ASIN will be assigned automatically.
                      </span>
                    </div>
                  )}
                </div>

                {/* Brand & Model Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Brand Name *</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Model Number (APE Spec) *</label>
                    <input
                      type="text"
                      value={modelNumber}
                      onChange={(e) => setModelNumber(e.target.value)}
                      placeholder="e.g. APE-DC-35MM"
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Part Number / SKU Code *</label>
                    <input
                      type="text"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="e.g. 73269099-SS"
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>
                </div>

                {/* Category, Taxes, and Unit of Measure */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Category Hierarchy *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                    >
                      <option value="SS304 GRADE">SS304 GRADE (Stainless Steel)</option>
                      <option value="GI SERIES">GI SERIES (Galvanized Iron)</option>
                      <option value="POLYMER FIT">POLYMER FIT</option>
                      <option value="AUTOMATION">AUTOMATION & PUMPS</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">HSN Code (India GST) *</label>
                    <input
                      type="text"
                      value={hsnCode}
                      onChange={(e) => setHSNCode(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>

                  {/* GST % Selection (0%, 5%, 12%, 18%, 28%) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#0054A6] font-bold">GST Rate (%) *</label>
                    <select
                      value={gstRate}
                      onChange={(e) => {
                        const newRate = Number(e.target.value);
                        setGstRate(newRate);
                        // Also update variants to match default
                        setVariantsList(prev => prev.map(v => ({ ...v, gstRatePercent: newRate })));
                      }}
                      className="w-full h-10 px-3 bg-blue-50/50 border border-blue-300 rounded-xl text-blue-950 font-mono font-bold text-xs focus:outline-none focus:border-[#0054A6]"
                    >
                      {GST_RATES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit of Measurement (PCS, NOS, SET, KG, LTR, MTR, PAC, BOX) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs text-amber-800 font-bold">Unit of Measure (UOM) *</label>
                    <select
                      value={unitOfMeasure}
                      onChange={(e) => {
                        const newUom = e.target.value;
                        setUnitOfMeasure(newUom);
                        setVariantsList(prev => prev.map(v => ({ ...v, unitOfMeasure: newUom as any })));
                      }}
                      className="w-full h-10 px-3 bg-amber-50/50 border border-amber-300 rounded-xl text-amber-950 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                    >
                      {UNITS_OF_MEASURE.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-700 font-semibold">Detailed Engineering Description *</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter engineering specifications, surface finish, anti-clog design, and operational advantages..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
              </div>

              {/* Target Audience / Application Areas */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Target Audience & Recommended Applications
                </h3>

                <TagBadgeList
                  items={targetAudience}
                  onRemove={(idx) => setTargetAudience(targetAudience.filter((_, i) => i !== idx))}
                  badgeClassName="bg-blue-50 border-blue-200 text-blue-900"
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add target application (e.g. Floating Solar, Agrivoltaics)..."
                    value={newAudienceInput}
                    onChange={(e) => setNewAudienceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newAudienceInput.trim()) {
                        e.preventDefault();
                        setTargetAudience([...targetAudience, newAudienceInput.trim()]);
                        setNewAudienceInput('');
                      }
                    }}
                    className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0054A6]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAudienceInput.trim()) {
                        setTargetAudience([...targetAudience, newAudienceInput.trim()]);
                        setNewAudienceInput('');
                      }
                    }}
                    className="px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 border border-slate-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Bullet Points / Highlights */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Key Product Highlights
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Key technical features, certifications, and product warranty specifications.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {highlights.map((hl, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0054A6] border border-blue-200 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={hl}
                        onChange={(e) => {
                          const updated = [...highlights];
                          updated[idx] = e.target.value;
                          setHighlights(updated);
                        }}
                        className="flex-1 bg-transparent text-xs text-slate-900 focus:outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setHighlights(highlights.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add highlight point (e.g. 10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers)..."
                      value={newHighlightInput}
                      onChange={(e) => setNewHighlightInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newHighlightInput.trim()) {
                          e.preventDefault();
                          setHighlights([...highlights, newHighlightInput.trim()]);
                          setNewHighlightInput('');
                        }
                      }}
                      className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0054A6]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newHighlightInput.trim()) {
                          setHighlights([...highlights, newHighlightInput.trim()]);
                          setNewHighlightInput('');
                        }
                      }}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 border border-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* A+ Comparison Table Toggle Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-emerald-600" /> A+ Enhanced Brand Comparison Table (APE Store Standard)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Automatically renders an engineering comparison table on the storefront (Apollo SS304 vs Recycled Plastic/Generic).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="include-aplus-comparison"
                      name="includeAPlusComparison"
                      checked={includeAPlusComparison} 
                      onChange={(e) => setIncludeAPlusComparison(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0054A6]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: 6-IMAGE GALLERY & 1 HD VIDEO (ENTERPRISE SPEC)              */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeListingTab === 'MEDIA' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Media Standards Compliance Guide */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-[#0054A6] shrink-0" />
                  <div>
                    <strong className="block text-slate-900 font-bold">High-Resolution Media Specification</strong>
                    <span className="text-slate-500">White background (RGB 255,255,255), minimum 1000×1000px resolution, clean industrial angles.</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">✓ 6 Dedicated Slots</span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold border border-purple-200">✓ 1 HD Video</span>
                </div>
              </div>

              {/* 6 Dedicated Enterprise Image Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <ImageSlotCard
                  slotNumber={1}
                  title="Main Hero (Pure White BG) *"
                  badgeText="Primary"
                  badgeColorClass="bg-amber-50 text-amber-800 border border-amber-200"
                  alt="Hero Image"
                  imageUrl={image1}
                  onImageUrlChange={setImage1}
                  onFileUpload={(file) => handleFileUpload(file, setImage1, 'image')}
                />
                <ImageSlotCard
                  slotNumber={2}
                  title="Infographic & Features"
                  badgeText="Callouts"
                  badgeColorClass="bg-blue-50 text-blue-800 border border-blue-200"
                  alt="Infographic"
                  imageUrl={image2}
                  onImageUrlChange={setImage2}
                  onFileUpload={(file) => handleFileUpload(file, setImage2, 'image')}
                />
                <ImageSlotCard
                  slotNumber={3}
                  title="Dimensions & Blueprint"
                  badgeText="28-40mm"
                  badgeColorClass="bg-slate-100 text-slate-700 border border-slate-200"
                  alt="Dimensions"
                  imageUrl={image3}
                  onImageUrlChange={setImage3}
                  onFileUpload={(file) => handleFileUpload(file, setImage3, 'image')}
                />
                <ImageSlotCard
                  slotNumber={4}
                  title="In-Action Installation"
                  badgeText="Rooftop/Park"
                  badgeColorClass="bg-emerald-50 text-emerald-800 border border-emerald-200"
                  alt="Installation Image"
                  imageUrl={image4}
                  onImageUrlChange={setImage4}
                  onFileUpload={(file) => handleFileUpload(file, setImage4, 'image')}
                />
                <ImageSlotCard
                  slotNumber={5}
                  title="Pack Box & Contents"
                  badgeText="Pack of 50"
                  badgeColorClass="bg-amber-50 text-amber-800 border border-amber-200"
                  alt="Packaging Image"
                  imageUrl={image5}
                  onImageUrlChange={setImage5}
                  onFileUpload={(file) => handleFileUpload(file, setImage5, 'image')}
                />
                <ImageSlotCard
                  slotNumber={6}
                  title="SS304 Mill Certificate"
                  badgeText="Tested QA"
                  badgeColorClass="bg-purple-50 text-purple-800 border border-purple-200"
                  alt="Certificate Image"
                  imageUrl={image6}
                  onImageUrlChange={setImage6}
                  onFileUpload={(file) => handleFileUpload(file, setImage6, 'image')}
                />
              </div>

              {/* 1 Dedicated Video Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0054A6] border border-blue-200 flex items-center justify-center">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0054A6] uppercase tracking-wider font-mono">
                        Product Demonstration Video (MP4 / WebM / Embed)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Demonstrating water curtain pressure, siphon cleaning, or snap-on clip installation.
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-mono font-bold">
                    HD Video Player
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-6 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center min-h-[180px] relative">
                    {videoUrl ? (
                      <video 
                        src={videoUrl} 
                        controls 
                        className="w-full h-48 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
                        <Play className="w-8 h-8 text-slate-400" />
                        <span>No Video URL Loaded</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-6 space-y-3">
                    <input
                      type="file"
                      ref={videoInputRef}
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0], setVideoUrl, 'video');
                      }}
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="flex-1 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#004284] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Upload className="w-4 h-4" /> Upload Video File
                      </button>

                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => setVideoUrl('')}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 font-mono">Or direct video link (MP4 / WebM):</label>
                      <input
                        type="text"
                        placeholder="https://.../solar_testing_demo.mp4"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: VARIATIONS MATRIX WITH DUAL IDENTIFIERS, GST %, & UOM (PCS/KG/LTR) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeListingTab === 'VARIATIONS' && (
            <div className="space-y-6">
              {/* Product Variations Header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900 font-display tracking-tight">
                      Variations
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      {variantsList.length} Child SKU{variantsList.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl">
                    Does your product have variations (such as different sizes, finishes, or pack quantities)? Configure themes below to combine them into one parent listing.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <input
                    type="file"
                    ref={csvImportRef}
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportCSV}
                  />
                  <button
                    type="button"
                    onClick={() => csvImportRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" /> Import CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCatalogPickerOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#0054A6] text-xs font-semibold border border-blue-200 shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Grid className="w-3.5 h-3.5 text-[#0054A6]" /> Combine Catalog Products
                  </button>
                </div>
              </div>

              {/* Variation Configuration Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                        Variation Theme & Attributes
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0054A6] text-[10px] font-bold font-mono">
                        Parent-Child Listing Family
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select the variation theme that defines how your child listings differ, then add the attribute terms below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Active Matrix:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-mono">
                      {variantsList.length} Child SKU{variantsList.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Variation Theme Dropdown Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Variation Theme <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={variationTheme}
                      onChange={(e) => handleVariationThemeChange(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="Size">Size (Frame Thickness: 28mm, 30mm, 35mm, 40mm...)</option>
                      <option value="Size, Material">Size, Material (SS304 / Galvanized GI / Brass) — Standard</option>
                      <option value="ItemPackageQuantity">Item Package Quantity (Pack of 10, 50, 100, 500)</option>
                      <option value="Size, ItemPackageQuantity">Size, Item Package Quantity (Size & Pack)</option>
                      <option value="Material">Material (AISI SS304, GI, Brass)</option>
                      <option value="Color">Color / Finish (SS304 Natural, Matte Silver)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Theme Differentiation Behavior:
                    </span>
                    <p className="text-xs text-slate-600">
                      Customers will select from <strong className="text-slate-900 font-semibold">{variationTheme}</strong> options on the Apollo Storefront. Pricing, statutory GST (18%), stock, and SKUs are configured individually in the matrix below.
                    </p>
                  </div>
                </div>

                {/* Values Entry Bar */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Add Variation Terms (Single term or comma-separated):
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex-1 min-w-[280px]">
                      <input
                        type="text"
                        placeholder="Enter terms separated by commas (e.g. 28mm, 30mm, 33mm, 35mm, 40mm)"
                        value={newSizeInput}
                        onChange={(e) => setNewSizeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSizeInput.trim()) {
                            e.preventDefault();
                            handleAddVariant(newSizeInput);
                          }
                        }}
                        className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/20 font-mono shadow-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddVariant(newSizeInput)}
                      className="px-5 h-10 rounded-xl bg-[#0054A6] hover:bg-[#004282] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add to Matrix
                    </button>

                    <button
                      type="button"
                      onClick={handleAddBlankManualRow}
                      className="px-4 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4 text-slate-500" /> + Add Blank Row
                    </button>
                  </div>

                  </div>
                </div>

                {/* Active Child Variation Tags */}
                {variantsList.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide font-mono">
                        Active Child Variations in Matrix ({variantsList.length}):
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Click ✕ to remove any child SKU from this parent listing
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {variantsList.map((variant, idx) => (
                        <div
                          key={variant.sku || idx}
                          className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-mono transition-all"
                        >
                          <span className="font-bold text-slate-900">
                            {variant.attributes.size || `Item #${idx + 1}`}
                          </span>
                          {variant.attributes.material && (
                            <span className="text-slate-500 text-[10px]">
                              · {variant.attributes.material}
                            </span>
                          )}
                          <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                            ₹{variant.b2cPrice}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteVariantRow(idx)}
                            title={`Remove ${variant.attributes.size || variant.sku}`}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: APE Variation Matrix Table with GST % and Unit of Measure */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">
                      Variation Matrix Table ({variantsList.length} Variations)
                    </span>
                    <span className="text-[10px] text-emerald-800 font-mono bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                      Live Editable
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddBlankManualRow}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0054A6] hover:bg-[#003d7a] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Variant Row
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyDefaultPriceToAll}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> Sync Pricing to All Variants
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800 min-w-[1150px]">
                    <thead className="bg-slate-100/80 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-8">#</th>
                        <th className="p-3">* Size / Theme</th>
                        <th className="p-3">* SKU</th>
                        <th className="p-3 text-center">* Unit (UOM)</th>
                        <th className="p-3 text-center">* GST %</th>
                        <th className="p-3">* Catalog ASIN</th>
                        <th className="p-3">* Enterprise FSN</th>
                        <th className="p-3">Images</th>
                        <th className="p-3 text-right">* MRP (₹)</th>
                        <th className="p-3 text-right">* B2C Price (₹)</th>
                        <th className="p-3 text-right">* B2B Wholesale (₹)</th>
                        <th className="p-3 text-center bg-emerald-50 text-emerald-950 font-black border-x border-emerald-200">* B2B MOQ (Min Pcs)</th>
                        <th className="p-3 text-center">* Live Stock</th>
                        <th className="p-3 text-center">Low Alert</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {variantsList.map((variant, idx) => (
                        <tr key={variant.sku || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>

                          {/* Size / Theme */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={variant.attributes.size || ''}
                              onChange={(e) => handleUpdateVariantRow(idx, 'size', e.target.value)}
                              className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold font-mono text-xs w-24 focus:outline-none focus:border-[#0054A6]"
                            />
                          </td>

                          {/* SKU */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={variant.sku}
                              onChange={(e) => handleUpdateVariantRow(idx, 'sku', e.target.value)}
                              className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-amber-700 font-mono text-xs w-32 focus:outline-none focus:border-[#0054A6]"
                            />
                          </td>

                          {/* Unit of Measure (UOM) Dropdown: PCS, NOS, SET, KG, LTR, MTR, PAC, BOX */}
                          <td className="p-3 text-center">
                            <select
                              value={variant.unitOfMeasure || unitOfMeasure || 'PCS'}
                              onChange={(e) => handleUpdateVariantRow(idx, 'unitOfMeasure', e.target.value)}
                              className="h-8 px-2 rounded-lg bg-amber-50/70 border border-amber-300 text-amber-950 font-bold font-mono text-xs focus:outline-none focus:border-amber-500"
                            >
                              <option value="PCS">PCS</option>
                              <option value="NOS">NOS</option>
                              <option value="SET">SET</option>
                              <option value="KG">KG</option>
                              <option value="LTR">LTR</option>
                              <option value="MTR">MTR</option>
                              <option value="PAC">PAC</option>
                              <option value="BOX">BOX</option>
                              <option value="ROLL">ROLL</option>
                            </select>
                          </td>

                          {/* Individual GST Rate (%) Dropdown: 0%, 5%, 12%, 18%, 28% */}
                          <td className="p-3 text-center">
                            <select
                              value={variant.gstRatePercent !== undefined ? variant.gstRatePercent : (gstRate || 18)}
                              onChange={(e) => handleUpdateVariantRow(idx, 'gstRatePercent', Number(e.target.value))}
                              className="h-8 px-2 rounded-lg bg-blue-50/70 border border-blue-300 text-blue-950 font-bold font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </td>

                          {/* APE Catalog ASIN */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={variant.barcode || ''}
                              onChange={(e) => handleUpdateVariantRow(idx, 'barcode', e.target.value)}
                              placeholder="APE Catalog ASIN"
                              className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-slate-800 font-mono text-xs w-28 focus:outline-none focus:border-[#0054A6]"
                            />
                          </td>

                          {/* Enterprise FSN */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={variant.flipkartFsn || ''}
                              onChange={(e) => handleUpdateVariantRow(idx, 'flipkartFsn', e.target.value)}
                              placeholder="Enterprise FSN"
                              className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-blue-700 font-mono text-xs w-28 focus:outline-none focus:border-[#0054A6]"
                            />
                          </td>

                          {/* Image Thumbnail */}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={variant.images[0] || image1 || '/logo.webp'}
                                alt="Thumb"
                                className="w-7 h-7 rounded-lg bg-white object-contain p-0.5 border border-slate-200 shadow-sm"
                              />
                              <span className="text-[10px] text-slate-400 font-mono">+3 Media</span>
                            </div>
                          </td>

                          {/* MRP */}
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              value={variant.mrp || 120}
                              onChange={(e) => handleUpdateVariantRow(idx, 'mrp', Number(e.target.value))}
                              className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-slate-600 font-mono text-xs w-16 text-right focus:outline-none focus:border-[#0054A6]"
                            />
                          </td>

                          {/* B2C Price (INR) */}
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-slate-400 font-mono text-[10px]">₹</span>
                              <input
                                type="number"
                                value={variant.b2cPrice}
                                onChange={(e) => handleUpdateVariantRow(idx, 'b2cPrice', e.target.value)}
                                className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs w-18 text-right focus:outline-none focus:border-[#0054A6]"
                              />
                            </div>
                          </td>

                          {/* B2B Tier Price (INR) */}
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-emerald-600 font-mono text-[10px]">₹</span>
                              <input
                                type="number"
                                value={variant.b2bTierPricing?.[0]?.pricePerUnit || Math.round(variant.b2cPrice * 0.7)}
                                onChange={(e) => handleUpdateVariantRow(idx, 'b2bPrice', e.target.value)}
                                className="h-8 px-2 rounded-lg bg-emerald-50/50 border border-emerald-300 text-emerald-800 font-mono font-bold text-xs w-18 text-right focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </td>

                          {/* B2B Minimum Order Quantity (MOQ) */}
                          <td className="p-3 text-center bg-emerald-50/40 border-x border-emerald-100">
                            <div className="inline-flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                min="1"
                                value={variant.b2bMoq || variant.b2bTierPricing?.[0]?.minQty || 50}
                                onChange={(e) => handleUpdateVariantRow(idx, 'b2bMoq', e.target.value)}
                                className="h-8 px-2 rounded-lg bg-white border border-emerald-400 text-emerald-950 font-mono font-black text-xs w-16 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                                title="B2B Wholesale Minimum Order Quantity (MOQ)"
                              />
                              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">
                                {variant.unitOfMeasure || unitOfMeasure || 'PCS'}
                              </span>
                            </div>
                          </td>

                          {/* Stock Quantity */}
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={variant.inventory}
                              onChange={(e) => handleUpdateVariantRow(idx, 'inventory', Number(e.target.value))}
                              className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs w-18 text-center focus:outline-none focus:border-[#0054A6]"
                            />
                          </td>

                          {/* Low Stock Alert */}
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={variant.lowStockThreshold || 50}
                              onChange={(e) => handleUpdateVariantRow(idx, 'lowStockThreshold', Number(e.target.value))}
                              className="h-8 px-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-mono text-xs w-14 text-center focus:outline-none focus:border-amber-400"
                              title="Alert triggered when stock falls below this quantity"
                            />
                          </td>

                          {/* Actions: Print Barcode, Duplicate, Deep Edit, Delete */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setPrintingBarcodeVariant(variant)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Print Barcode & Shipping Sticker"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateVariant(idx)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                title="Duplicate Variant Row"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingVariantIndex(idx)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title="Edit Full Variant Specs"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVariantRow(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Variant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: OFFER, FULFILLMENT & SHIPPING RULES (APE STORE)               */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeListingTab === 'OFFER' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Global Pricing & Wholesale Rules
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Standard MRP (₹) *</label>
                    <input
                      type="number"
                      value={defaultMrp}
                      onChange={(e) => setDefaultMrp(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">
                      Default B2C Selling Price (₹ / {unitOfMeasure}) *
                    </label>
                    <input
                      type="number"
                      value={defaultB2cPrice}
                      onChange={(e) => setDefaultB2cPrice(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>
                </div>

                {/* Dynamic B2B Multi-Tier Wholesale Pricing (Cross-Size Volume Pooling) */}
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider font-mono">
                          B2B Wholesale Volume Pricing Tiers (Only B2B)
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                          Cross-Size Pooled
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/80 mt-0.5">
                        Set wholesale volume rates. Units are aggregated across all sizes/variants of this product family ("koi pn size ma"). B2C retail orders always pay B2C price.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setB2bTiers([
                            { minQty: 1, pricePerUnit: 17, discountPercent: defaultB2cPrice > 0 ? Math.round(((defaultB2cPrice - 17) / defaultB2cPrice) * 100) : 15 },
                            { minQty: 1000, pricePerUnit: 15, discountPercent: defaultB2cPrice > 0 ? Math.round(((defaultB2cPrice - 15) / defaultB2cPrice) * 100) : 25 },
                            { minQty: 2500, pricePerUnit: 10, discountPercent: defaultB2cPrice > 0 ? Math.round(((defaultB2cPrice - 10) / defaultB2cPrice) * 100) : 50 }
                          ]);
                          showToast('Loaded Apollo 3-tier wholesale preset (<1k @ ₹17 | 1k+ @ ₹15 | 2.5k+ @ ₹10)', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold transition-all"
                      >
                        Load Standard Preset (&lt;1k: ₹17 | 1k+: ₹15 | 2.5k+: ₹10)
                      </button>
                      <button
                        type="button"
                        onClick={handleAddB2bTier}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all"
                      >
                        <Plus className="w-3 h-3" /> Add Tier
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {b2bTiers.map((tier, tIdx) => (
                      <div
                        key={tIdx}
                        className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs"
                      >
                        <span className="text-[11px] font-mono font-bold text-emerald-950 w-16 shrink-0">
                          Tier #{tIdx + 1}
                        </span>

                        <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                          <label className="text-[10px] text-slate-500 font-semibold shrink-0">Min Qty ({unitOfMeasure}):</label>
                          <input
                            type="number"
                            min={1}
                            value={tier.minQty}
                            onChange={(e) => handleUpdateB2bTier(tIdx, 'minQty', Number(e.target.value))}
                            className="w-24 h-8 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                          <label className="text-[10px] text-slate-500 font-semibold shrink-0">Rate (₹):</label>
                          <input
                            type="number"
                            min={0}
                            value={tier.pricePerUnit}
                            onChange={(e) => handleUpdateB2bTier(tIdx, 'pricePerUnit', Number(e.target.value))}
                            className="w-24 h-8 px-2 bg-emerald-50/60 border border-emerald-400 rounded-lg text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-600"
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 text-[10px] font-mono font-bold">
                            {defaultB2cPrice > 0 ? Math.max(0, Math.round(((defaultB2cPrice - tier.pricePerUnit) / defaultB2cPrice) * 100)) : 0}% OFF B2C
                          </span>
                          {b2bTiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveB2bTier(tIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Delete this tier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Item Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                    >
                      <option value="New">New (Factory Sealed & Tested)</option>
                      <option value="Certified Refurbished">Certified Refurbished</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={handleApplyDefaultPriceToAll}
                      className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Sliders className="w-4 h-4" /> Apply B2C Price & B2B Tiers to All {variantsList.length} Variations
                    </button>
                  </div>
                </div>
              </div>

              {/* Fulfillment & Shipping Policies (APE Store Express Dispatch) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Fulfillment, Dispatch SLA & Return Policy
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Handling Time / Dispatch SLA</label>
                    <select
                      value={handlingTimeDays}
                      onChange={(e) => setHandlingTimeDays(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                    >
                      <option value={1}>Same Day Dispatch (Within 24 Hours)</option>
                      <option value={2}>1-2 Business Days</option>
                      <option value={3}>3 Business Days</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Cash On Delivery (COD)</label>
                    <select
                      value={isCodAllowed ? 'YES' : 'NO'}
                      onChange={(e) => setIsCodAllowed(e.target.value === 'YES')}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                    >
                      <option value="YES">Enabled (COD Accepted)</option>
                      <option value="NO">Prepaid Orders Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 font-semibold">Max Order Qty per Customer</label>
                    <input
                      type="number"
                      value={maxOrderQuantity}
                      onChange={(e) => setMaxOrderQuantity(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs text-slate-700 font-semibold">Return & Replacement Policy Window</label>
                  <input
                    type="text"
                    value={returnPolicy}
                    onChange={(e) => setReturnPolicy(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                  />
                  <span className="text-[10px] text-slate-500">
                    Standard Apollo Guarantee: 7-Day Replacement for physical/transit defects + 10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers (rust/corrosion only).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 5: TECHNICAL SPECS, DIMENSIONS & VOLUMETRIC METROLOGY           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeListingTab === 'COMPLIANCE' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              
              {/* Dimensions & Weights (Mandatory for Courier / Volumetric Pricing) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono flex items-center gap-2">
                    <Box className="w-4 h-4" /> Item & Packaging Dimensions (Volumetric Courier Calculator)
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Standard Formula: (L×W×H)/5000
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Item Net Dimensions */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">Item Net Dimensions & Dead Weight</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono">Length (cm)</label>
                        <input
                          type="number"
                          value={itemLength}
                          onChange={(e) => setItemLength(Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono">Width (cm)</label>
                        <input
                          type="number"
                          value={itemWidth}
                          onChange={(e) => setItemWidth(Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono">Height (cm)</label>
                        <input
                          type="number"
                          value={itemHeight}
                          onChange={(e) => setItemHeight(Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs text-center"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono">Net Weight per Unit (Grams)</label>
                      <input
                        type="number"
                        value={itemWeight}
                        onChange={(e) => setItemWeight(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Package Dimensions for Shipping */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">Packaging Box (Courier Volumetric Weight)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono">Pack L (cm)</label>
                        <input
                          type="number"
                          value={packageLength}
                          onChange={(e) => setPackageLength(Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono">Pack W (cm)</label>
                        <input
                          type="number"
                          value={packageWidth}
                          onChange={(e) => setPackageWidth(Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono">Pack H (cm)</label>
                        <input
                          type="number"
                          value={packageHeight}
                          onChange={(e) => setPackageHeight(Number(e.target.value))}
                          className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs text-center"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono">Gross Weight with Packaging (Grams)</label>
                      <input
                        type="number"
                        value={packageWeight}
                        onChange={(e) => setPackageWeight(Number(e.target.value))}
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-Time Courier Volumetric Billable Calculator Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#0054A6]" /> Courier Billable Weight Analysis
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Actual Dead Weight: <strong>{deadWeightKg} Kg</strong> | Volumetric Weight: <strong>{volumetricWeightKg} Kg</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Billable Shipping Weight</span>
                    <strong className="text-base font-black text-emerald-800 font-mono">
                      {billableWeightKg} Kg ({billableWeightKg <= 0.5 ? '0.5 Kg Slab' : billableWeightKg <= 1.0 ? '1.0 Kg Slab' : '2.0 Kg Slab'})
                    </strong>
                  </div>
                </div>

                {/* Included Components */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs text-slate-700 font-semibold">Included Components ("What's in the Box") *</label>
                  <input
                    type="text"
                    value={includedComponents}
                    onChange={(e) => setIncludedComponents(e.target.value)}
                    placeholder="e.g. 50x SS304 Water Drain Clips, 1x Installation Manual, 1x Warranty Card"
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#0054A6]"
                  />
                </div>
              </div>

              {/* APE Store Backend Search Keywords (SEO) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono flex items-center gap-2">
                  <Tag className="w-4 h-4" /> APE Store Backend Search Terms (Hidden SEO Keywords)
                </h3>

                <TagBadgeList
                  items={keywords}
                  onRemove={(idx) => setKeywords(keywords.filter((_, i) => i !== idx))}
                  badgeClassName="bg-amber-50 border-amber-200 text-amber-900"
                  fontMono
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add search keyword (e.g. solar panel cleaning nozzle, water guide clip)..."
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newKeywordInput.trim()) {
                        e.preventDefault();
                        setKeywords([...keywords, newKeywordInput.trim()]);
                        setNewKeywordInput('');
                      }
                    }}
                    className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0054A6]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newKeywordInput.trim()) {
                        setKeywords([...keywords, newKeywordInput.trim()]);
                        setNewKeywordInput('');
                      }
                    }}
                    className="px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 border border-slate-300"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Keyword
                  </button>
                </div>
              </div>

              {/* Legal Metrology & Manufacturer Compliance */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#0054A6] uppercase tracking-wider font-mono">
                  Legal Metrology & Consumer Protection Compliance (India)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Country of Origin *</strong>
                    <input
                      type="text"
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs mt-1"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Manufacturer & Packer Details</strong>
                    <p className="text-slate-600 font-mono text-[11px]">
                      Apollo Engineering, 100 / Gopinath Industrial Landmark, Kathwada GIDC, Ahmedabad, Gujarat - <strong>{ORIGIN_HUB_PINCODE}</strong>
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Customer Care Contact</strong>
                    <p className="text-slate-600 font-mono text-[11px]">
                      Phone: +91 8511626267 | Email: info@apolloengineering.co.in
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">GST Input Tax Credit & HSN</strong>
                    <p className="text-slate-600 font-mono text-[11px]">
                      Automatic B2B GSTR-1 Verified E-Invoice with selected {gstRate}% ITC breakdown.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* WIZARD FOOTER NAVIGATION (STICKY)                                     */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-3">
            <span>
              Step {activeListingTab === 'DETAILS' ? 1 : activeListingTab === 'MEDIA' ? 2 : activeListingTab === 'VARIATIONS' ? 3 : activeListingTab === 'OFFER' ? 4 : 5} of 5:
            </span>
            <span className="font-bold text-slate-800">
              {activeListingTab === 'DETAILS' && 'Vital Info & Product Identity'}
              {activeListingTab === 'MEDIA' && 'Product Media & Image Compliance'}
              {activeListingTab === 'VARIATIONS' && 'APE Store ASIN & Variation Matrix'}
              {activeListingTab === 'OFFER' && 'Offer Pricing & Fulfillment SLA'}
              {activeListingTab === 'COMPLIANCE' && 'Technical Dimensions & Volumetric Metrology'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveListing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" /> Save and Finish Listing
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* 🏷️ MODAL: 1-CLICK PRINTABLE BARCODE & PACKAGING LABEL               */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        {printingBarcodeVariant && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-sm">Print Barcode & Shipping Sticker</h4>
                </div>
                <button 
                  onClick={() => setPrintingBarcodeVariant(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Sticker Box (50mm x 25mm / 2" x 1" Standard Thermal Format) */}
              <div id="printable-barcode-sticker" className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl space-y-2 text-center select-none shadow-sm">
                <div className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">APOLLO ENGINEERING • KATHWADA HUB</div>
                <div className="font-bold text-xs text-slate-900 truncate px-2">{printingBarcodeVariant.title}</div>
                
                {/* CSS Simulated High-Density Code-128 Barcode */}
                <div className="py-2 px-4 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-center gap-[2px] h-12 w-48 overflow-hidden">
                    {[3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 1, 2, 3, 2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2].map((w, idx) => (
                      <div 
                        key={idx} 
                        className={`h-full ${idx % 2 === 0 ? 'bg-black' : 'bg-transparent'}`} 
                        style={{ width: `${w * 1.5}px` }} 
                      />
                    ))}
                  </div>
                  <div className="font-mono text-xs font-bold tracking-widest text-slate-900 mt-1">
                    *{printingBarcodeVariant.barcode || printingBarcodeVariant.sku}*
                  </div>
                </div>

                <div className="grid grid-cols-2 text-[10px] font-mono text-slate-600 pt-1 text-left px-1">
                  <div>SKU: <strong className="text-slate-900">{printingBarcodeVariant.sku}</strong></div>
                  <div className="text-right">FSN: <strong className="text-blue-700">{printingBarcodeVariant.flipkartFsn}</strong></div>
                  <div>Condition: <strong className="text-slate-900">New ({printingBarcodeVariant.unitOfMeasure || 'PCS'})</strong></div>
                  <div className="text-right">MRP: <strong className="text-slate-900">₹{printingBarcodeVariant.mrp}</strong></div>
                  <div>GST: <strong className="text-[#0054A6]">{printingBarcodeVariant.gstRatePercent}%</strong></div>
                  <div className="text-right">UOM: <strong className="text-amber-800">{printingBarcodeVariant.unitOfMeasure || 'PCS'}</strong></div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    showToast('Sent sticker to printer spooler!', 'success');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Sticker (Thermal 2"×1")
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingBarcodeVariant(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* ⚙️ SUB-MODAL: DEEP VARIANT SPECS EDITOR                              */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        {editingVariantIndex !== null && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Edit Deep Variant Details</h4>
                  <span className="text-[10px] text-amber-700 font-mono font-bold">
                    SKU: {variantsList[editingVariantIndex].sku}
                  </span>
                </div>
                <button onClick={() => setEditingVariantIndex(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-semibold">Variant Title</label>
                  <input
                    type="text"
                    value={variantsList[editingVariantIndex].title}
                    onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'title', e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-[#0054A6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[#0054A6] font-bold">GST Rate (%)</label>
                    <select
                      value={variantsList[editingVariantIndex].gstRatePercent !== undefined ? variantsList[editingVariantIndex].gstRatePercent : 18}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'gstRatePercent', Number(e.target.value))}
                      className="w-full h-9 px-3 bg-blue-50 border border-blue-300 rounded-xl text-blue-900 font-mono font-bold text-xs focus:outline-none focus:border-[#0054A6]"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5% (Solar Devices)</option>
                      <option value={12}>12% (Pumps / Kits)</option>
                      <option value={18}>18% (SS304 Hardware)</option>
                      <option value={28}>28% (Machinery)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-amber-800 font-bold">Unit of Measure</label>
                    <select
                      value={variantsList[editingVariantIndex].unitOfMeasure || unitOfMeasure || 'PCS'}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'unitOfMeasure', e.target.value)}
                      className="w-full h-9 px-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="NOS">NOS (Numbers)</option>
                      <option value="SET">SET (Sets)</option>
                      <option value="KG">KG (Kilograms)</option>
                      <option value="LTR">LTR (Litres)</option>
                      <option value="MTR">MTR (Meters)</option>
                      <option value="PAC">PAC (Packs)</option>
                      <option value="BOX">BOX (Boxes)</option>
                      <option value="ROLL">ROLL (Rolls)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-semibold">APE Catalog ASIN</label>
                    <input
                      type="text"
                      value={variantsList[editingVariantIndex].barcode || ''}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'barcode', e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-semibold">Enterprise FSN</label>
                    <input
                      type="text"
                      value={variantsList[editingVariantIndex].flipkartFsn || ''}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'flipkartFsn', e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-semibold">B2C Retail Price (₹)</label>
                    <input
                      type="number"
                      value={variantsList[editingVariantIndex].b2cPrice}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'b2cPrice', Number(e.target.value))}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-emerald-800 font-bold">B2B Wholesale Price (₹)</label>
                    <input
                      type="number"
                      value={variantsList[editingVariantIndex]?.b2bTierPricing?.[0]?.pricePerUnit || Math.round(variantsList[editingVariantIndex]?.b2cPrice * 0.7 || 0)}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'b2bPrice', Number(e.target.value))}
                      className="w-full h-9 px-3 bg-emerald-50/50 border border-emerald-300 rounded-xl text-emerald-800 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-semibold">Live Inventory Units</label>
                    <input
                      type="number"
                      value={variantsList[editingVariantIndex].inventory}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'inventory', Number(e.target.value))}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-semibold">Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      value={variantsList[editingVariantIndex].lowStockThreshold || 50}
                      onChange={(e) => handleUpdateVariantRow(editingVariantIndex, 'lowStockThreshold', Number(e.target.value))}
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-[#0054A6]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setEditingVariantIndex(null)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 📋 APE STORE LISTING SMART AUTO-FILL MODAL                        */}
        {/* ───────────────────────────────────────────────────────────────── */}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 🔗 VARIATION MERGER: SELECT CATALOG PRODUCTS MODAL               */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {isCatalogPickerOpen && (
          <div className="fixed inset-0 z-[250] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-[#0054A6] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Combine Existing Catalog Products (Listing Variation Merger)</h3>
                    <p className="text-xs text-blue-200">
                      Select up to 5 products to merge as child variations into this 1 parent product listing.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCatalogPickerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toolbar with Search and Quick 5 Select */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <input
                    type="text"
                    placeholder="Search catalog products by name, ASIN or SKU..."
                    value={catalogSearchTerm}
                    onChange={(e) => setCatalogSearchTerm(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0054A6]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const first5 = products.slice(0, 5).map(p => p.asin);
                      setSelectedCatalogAsins(first5);
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors"
                  >
                    ⚡ Select First 5 Products
                  </button>
                  {selectedCatalogAsins.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCatalogAsins([])}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Products List */}
              <div className="p-6 space-y-3 overflow-y-auto max-h-[50vh]">
                {products
                  .filter(p => !catalogSearchTerm.trim() || p.title.toLowerCase().includes(catalogSearchTerm.toLowerCase()) || p.asin.toLowerCase().includes(catalogSearchTerm.toLowerCase()))
                  .map((p, pIdx) => {
                    const isChecked = selectedCatalogAsins.includes(p.asin);
                    const thumb = p.variants[0]?.images?.[0] || '/logo.webp';
                    const minPrice = p.variants[0]?.b2cPrice || 20;

                    return (
                      <div
                        key={`${p.asin}-${pIdx}`}
                        onClick={() => {
                          setSelectedCatalogAsins(prev => 
                            isChecked ? prev.filter(id => id !== p.asin) : [...prev, p.asin]
                          );
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked 
                            ? 'bg-blue-50/90 border-[#0054A6] ring-2 ring-[#0054A6]/30 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <input
                            type="checkbox"
                            id={`media-thumb-${p.asin}`}
                            name={`mediaThumb-${p.asin}`}
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 accent-[#0054A6] rounded cursor-pointer"
                          />
                          <img
                            src={thumb}
                            alt={p.title}
                            className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                          />
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{p.title}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ASIN: {p.asin}</span>
                              <span>{p.variants.length} Variant(s)</span>
                              <span>• Category: {p.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-[#0054A6] font-mono">₹{minPrice.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">18% GST incl.</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700 font-mono">
                  Selected: <strong className="text-[#0054A6]">{selectedCatalogAsins.length}</strong> items
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCatalogPickerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCombineSelectedCatalogItems}
                    disabled={selectedCatalogAsins.length === 0}
                    className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                      selectedCatalogAsins.length > 0
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" /> Combine {selectedCatalogAsins.length} Items into Listing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
