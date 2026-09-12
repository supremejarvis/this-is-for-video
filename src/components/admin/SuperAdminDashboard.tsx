import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, Plus, DollarSign, Truck, AlertTriangle, 
  CheckCircle2, RefreshCw, Layers, ShieldCheck, ArrowUpRight, TrendingUp, 
  FileText, Download, Edit3, Trash2, Check, X, Printer, Landmark, Star, 
  MessageSquare, ShoppingCart, Lock, KeyRound, Mail, Clock, Search, 
  ChevronRight, Filter, BarChart3, Users, Send, AlertCircle, Sparkles, LogOut, Save, Sliders, Volume2,
  Tag, RotateCcw, Eye, Percent, Calendar, QrCode, Smartphone, Copy, CheckCircle,
  Building2, ExternalLink, CheckSquare, Square
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Product, ProductVariant, Order, OrderStatus, Coupon, CouponType, ReturnRequest, ReturnStatus } from '../../types';
import { ThermalShippingLabel } from '../logistics/ThermalShippingLabel';
import { GstInvoice } from '../logistics/GstInvoice';
import { ORIGIN_HUB_PINCODE, ORIGIN_HUB_NAME } from '../../services/logisticsService';
import { ApeProductListingWizard } from './ApeProductListingWizard';
import { msg91OtpService } from '../../services/msg91OtpService';
import { ceptIndiaPostService } from '../../services/ceptIndiaPostService';
import { MSG91_CONFIG, CEPT_CONFIG } from '../../constants';
import { CouponManagementPanel } from './CouponManagementPanel';
import { ReturnsManagementPanel } from './ReturnsManagementPanel';
import { totpService, APOLLO_ADMIN_TOTP_SECRET } from '../../services/totpService';
import { ComboVariantBuilderModal } from './ComboVariantBuilderModal';
import { AmazonFlipkartDispatchConsole } from './AmazonFlipkartDispatchConsole';
import { 
  filterOrdersByPeriod, 
  filterOrdersByDateRange,
  getGstr1Hsn12Rows, 
  getGstr1Table4Rows, 
  getGstr1Table7Rows,
  generateGstr1MultiSheetExcel,
  generateB2bExcel,
  generateB2cExcel,
  generateB2csExcel,
  generateB2clExcel,
  generateHsn12Excel,
  generateDocIssueExcel,
  generateAllOrdersExcel,
  generateAllDetailsExcel,
  generateShippingLogisticsExcel,
  generateTaxSummaryExcel
} from '../../services/gstr1CsvService';

const MoqEditableInput: React.FC<{
  asin: string;
  sku: string;
  currentMoq: number;
  unit: string;
}> = ({ asin, sku, currentMoq, unit }) => {
  const [val, setVal] = useState<string>(String(currentMoq || 50));
  const { updateProduct, updateVariantDetails, showToast } = useStore();

  useEffect(() => {
    setVal(String(currentMoq || 50));
  }, [currentMoq]);

  const commitVal = () => {
    const parsed = parseInt(val, 10);
    const finalVal = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setVal(String(finalVal));
    if (finalVal !== currentMoq) {
      updateProduct(asin, { b2bMoq: finalVal });
      updateVariantDetails(asin, sku, { b2bMoq: finalVal });
      showToast(`B2B MOQ updated for ${asin} to ${finalVal} ${unit}`, 'success');
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-mono font-bold text-xs shadow-sm hover:border-emerald-500 transition-colors">
      <span className="text-[10px] text-emerald-800 font-sans font-black">MOQ:</span>
      <input
        type="number"
        min="1"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commitVal}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitVal();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-16 h-7 text-center font-mono font-black text-xs bg-white border border-emerald-300 rounded-lg text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        title="Type to edit B2B Wholesale Minimum Order Quantity (press Enter or click away to save)"
      />
      <span className="text-[10px] text-slate-500 font-sans uppercase">{unit}</span>
    </div>
  );
};

const StockEditableInput: React.FC<{
  asin: string;
  sku: string;
  currentStock: number;
  unit: string;
}> = ({ asin, sku, currentStock, unit }) => {
  const [val, setVal] = useState<string>(String(currentStock || 0));
  const { updateProductStock, showToast } = useStore();

  useEffect(() => {
    setVal(String(currentStock || 0));
  }, [currentStock]);

  const commitStock = () => {
    const parsed = parseInt(val, 10);
    const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setVal(String(finalVal));
    if (finalVal !== currentStock) {
      updateProductStock(asin, sku, finalVal);
      showToast(`Stock updated for ${asin} to ${finalVal} ${unit}`, 'success');
    }
  };

  const isLow = currentStock > 0 && currentStock < 100;
  const isZero = currentStock === 0;

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[130px]">
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 border border-slate-300 shadow-sm focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isZero ? 'bg-rose-500' : isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
          }`}
          title={isZero ? 'Out of Stock' : isLow ? 'Low Stock (<100)' : 'In Stock'}
        />
        <input
          type="number"
          min="0"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commitStock}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitStock();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-16 h-7 text-center font-mono font-black text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
          title="Click to edit live fulfillable inventory (press Enter to save)"
        />
        <span className="text-[10px] text-slate-500 font-sans uppercase font-bold">{unit}</span>
      </div>

      <div className="flex items-center gap-1.5" role="group" aria-label="Quick stock adjustments">
        <button
          type="button"
          onClick={() => {
            const next = Math.max(0, currentStock - 10);
            updateProductStock(asin, sku, next);
            showToast(`Stock updated: ${asin} -> ${next} ${unit}`, 'info');
          }}
          className="min-h-[28px] min-w-[32px] px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-700 border border-slate-300 transition-colors shadow-2xs font-mono"
          title="Deduct 10 units"
          aria-label={`Deduct 10 units of stock for ${asin}`}
        >
          -10
        </button>
        <button
          type="button"
          onClick={() => {
            const next = currentStock + 10;
            updateProductStock(asin, sku, next);
            showToast(`Stock updated: ${asin} -> ${next} ${unit}`, 'success');
          }}
          className="min-h-[28px] min-w-[32px] px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 border border-slate-300 transition-colors shadow-2xs font-mono"
          title="Add 10 units"
          aria-label={`Add 10 units of stock for ${asin}`}
        >
          +10
        </button>
        <button
          type="button"
          onClick={() => {
            const next = currentStock + 50;
            updateProductStock(asin, sku, next);
            showToast(`Stock updated: ${asin} -> ${next} ${unit}`, 'success');
          }}
          className="min-h-[28px] min-w-[36px] px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors font-mono shadow-2xs"
          title="Add 50 units (Bulk Master Pack)"
          aria-label={`Add 50 units of stock for ${asin}`}
        >
          +50
        </button>
      </div>
    </div>
  );
};

export const SuperAdminDashboard: React.FC = () => {
  const { 
    products, updateProductStock, updateVariantDetails, 
    addNewVariantToProduct, addNewProduct, updateProduct, deleteProduct,
    combineProductsIntoParentListing,
    orders, updateOrderStatus, redispatchOrder, cart, showToast,
    coupons, addCoupon, updateCoupon, deleteCoupon,
    returnRequests, updateReturnStatus,
    setAppMode, setActiveTab
  } = useStore();

  const navigate = useNavigate();

  // APE Product Listing Multi-Tab Wizard State
  const [productForWizard, setProductForWizard] = useState<Product | null | 'NEW'>(null);

  // Combo Variant Builder Modal State
  const [isComboBuilderOpen, setIsComboBuilderOpen] = useState(false);
  const [comboBuilderProduct, setComboBuilderProduct] = useState<Product | null>(null);

  // CEPT Bulk Manifest State
  const [isBulkManifestOpen, setIsBulkManifestOpen] = useState(false);
  const [bulkManifestResult, setBulkManifestResult] = useState<any>(null);
  const [isGeneratingBulkManifest, setIsGeneratingBulkManifest] = useState(false);

  // GSTR-1 Statutory Period State (Smart Style From Date - To Date)
  const [gstr1Period, setGstr1Period] = useState<'DAY' | 'MONTH' | 'LAST_MONTH' | 'YEAR'>('MONTH');
  const [gstr1SelectedDate, setGstr1SelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [gstr1FromDate, setGstr1FromDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [gstr1ToDate, setGstr1ToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [gstr1DatePreset, setGstr1DatePreset] = useState<'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'FY' | 'CUSTOM'>('THIS_MONTH');
  const [gstr1ActiveTab, setGstr1ActiveTab] = useState<'HSN_12' | 'TABLE_4_B2B' | 'TABLE_7_B2C' | 'LINE_ITEMS'>('HSN_12');

  // ─────────────────────────────────────────────────────────────────────────────
  // 🔐 ADMIN AUTHENTICATION (Apollo Executive Suite: Google Authenticator + Mobile OTP + Password Management)
  // ─────────────────────────────────────────────────────────────────────────────
  const DEFAULT_ADMIN_EMAIL = 'admin@apolloengineering.co.in';
  const DEFAULT_ADMIN_PHONE = '8511626267';
  const getStoredAdminPassword = () => {
    try {
      return localStorage.getItem('apollo_admin_password') || 'NIL@apl321';
    } catch {
      return 'NIL@apl321';
    }
  };
  const saveAdminPassword = (pw: string) => {
    try {
      localStorage.setItem('apollo_admin_password', pw);
    } catch (e) {
      console.warn('Failed to persist admin password:', e);
    }
  };

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);

  const [adminIdInput, setAdminIdInput] = useState('admin@apolloengineering.co.in');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authStage, setAuthStage] = useState<'CREDENTIALS' | 'MOBILE_OTP' | 'GOOGLE_AUTH' | 'FORGOT_PASSWORD'>('CREDENTIALS');
  const [isGoogleAuthConfigured, setIsGoogleAuthConfigured] = useState<boolean>(() => {
    try {
      return localStorage.getItem('apollo_google_auth_configured') === 'true';
    } catch {
      return false;
    }
  });
  const [adminEnteredOtp, setAdminEnteredOtp] = useState('');
  const [googleAuthCode, setGoogleAuthCode] = useState('');
  const [isAdminVerifying, setIsAdminVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [otpResentMsg, setOtpResentMsg] = useState('');

  // Forgot Password State
  const [forgotEmailInput, setForgotEmailInput] = useState('admin@apolloengineering.co.in');
  const [forgot2faMode, setForgot2faMode] = useState<'GOOGLE_AUTH' | 'MOBILE_OTP'>('GOOGLE_AUTH');
  const [forgot2faCode, setForgot2faCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Change Password Modal inside Dashboard
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState('');
  const [changePwNew, setChangePwNew] = useState('');
  const [changePwConfirm, setChangePwConfirm] = useState('');
  const [changePwError, setChangePwError] = useState('');
  const [changePwSuccess, setChangePwSuccess] = useState('');

  // Check existing session on mount
  useEffect(() => {
    let isMounted = true;
    const verifyExistingAdminSession = async () => {
      try {
        const isLocalActive = localStorage.getItem('apollo_admin_session') === 'active';
        if (isLocalActive && isMounted) {
          setIsAdminAuthenticated(true);
          setAdminUser({
            id: 'u_apollo_admin_master',
            email: DEFAULT_ADMIN_EMAIL,
            full_name: 'Apollo Engineering Administrator',
            role: 'SUPER_ADMIN',
            is_superuser: true,
            phone: DEFAULT_ADMIN_PHONE,
          });
          setIsCheckingSession(false);
          return;
        }

        const res = await fetch('/api/v1/auth/me', {
          credentials: 'include',
        });
        if (res.ok && isMounted) {
          const user = await res.json();
          const roles = user.roles || (user.role ? [user.role] : []);
          const isPrivileged = roles.some((r: string) => ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'ORDER_OPERATIONS', 'CATALOG_MANAGER'].includes(r)) || user.is_superuser;
          if (isPrivileged) {
            setIsAdminAuthenticated(true);
            setAdminUser(user);
          } else {
            setIsAdminAuthenticated(false);
          }
        }
      } catch (err) {
        if (isMounted) setIsAdminAuthenticated(false);
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    };

    verifyExistingAdminSession();
    return () => { isMounted = false; };
  }, []);

  const handleAdminCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = adminIdInput.trim().toLowerCase();
    const cleanPass = adminPasswordInput;
    const currentStoredPass = getStoredAdminPassword();

    if (!cleanEmail || !cleanPass) {
      setAuthError('Please provide both administrator email and password.');
      return;
    }

    setIsAdminVerifying(true);
    setAuthError('');

    // 1. Direct verify against authorized administrator credentials
    if (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() && cleanPass === currentStoredPass) {
      setIsAdminVerifying(false);
      // Trigger background OTP dispatch to +91 85116 26267
      msg91OtpService.sendOtp(DEFAULT_ADMIN_PHONE).catch((err) => {
        console.warn('[Admin OTP Dispatch Warning]:', err);
      });
      setAuthStage('MOBILE_OTP');
      showToast(`Credentials verified for ${DEFAULT_ADMIN_EMAIL}. Step 1: Enter Mobile OTP sent to +91 85116 26267.`, 'info');
      return;
    }

    // 2. Fallback attempt to live FastAPI backend /api/v1/auth/login
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass
        })
      });

      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        const roles = user.roles || (user.role ? [user.role] : []);
        const isPrivileged = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || user.is_superuser;

        if (isPrivileged) {
          msg91OtpService.sendOtp(DEFAULT_ADMIN_PHONE).catch(() => {});
          setAuthStage('MOBILE_OTP');
          setAdminUser(user);
          setIsAdminVerifying(false);
          showToast(`Backend credentials verified. Step 1: Enter Mobile OTP sent to +91 85116 26267.`, 'info');
          return;
        }
      }
    } catch {
      // Backend offline or unreachable
    }

    setIsAdminVerifying(false);
    setAuthError('Invalid administrator credentials. Please check your ID and Password.');
    showToast('Authentication failed: Invalid credentials', 'error');
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminVerifying(true);
    setAuthError('');

    const cleanOtp = adminEnteredOtp.trim();
    if (!cleanOtp) {
      setIsAdminVerifying(false);
      setAuthError('Please enter the OTP received on +91 85116 26267.');
      return;
    }

    const verifyRes = await msg91OtpService.verifyOtp(DEFAULT_ADMIN_PHONE, cleanOtp);
    if (verifyRes.isVerified) {
      setIsAdminVerifying(false);
      setAuthError('');
      setAuthStage('GOOGLE_AUTH');
      showToast('Mobile OTP verified! Step 2: Enter Google Authenticator 6-digit code.', 'success');
      return;
    } else {
      setIsAdminVerifying(false);
      setAuthError(verifyRes.message || 'Invalid Mobile OTP. Please retry or click WhatsApp Resend.');
      showToast('Mobile OTP verification failed', 'error');
    }
  };

  const handleVerifyGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminVerifying(true);
    setAuthError('');

    const cleanCode = googleAuthCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setIsAdminVerifying(false);
      setAuthError('Please enter the 6-digit verification code from Google Authenticator.');
      return;
    }

    const isValid = await totpService.verifyTOTP(cleanCode, APOLLO_ADMIN_TOTP_SECRET);
    if (isValid) {
      // Mark Google Authenticator as bound/configured so ID & QR code remain hidden on every future login!
      try {
        localStorage.setItem('apollo_google_auth_configured', 'true');
      } catch {}
      setIsGoogleAuthConfigured(true);
      setShowQrCode(false);
      completeAdminLogin();
      return;
    } else {
      setIsAdminVerifying(false);
      setAuthError('Invalid Google Authenticator code. Please enter the current 6-digit code from your authenticator app.');
      showToast('Google Authenticator verification failed', 'error');
      return;
    }
  };

  const handleResendOtp = async (channel: 'SMS' | 'WHATSAPP') => {
    setOtpResentMsg(`Dispatching OTP via ${channel}...`);
    try {
      if (channel === 'WHATSAPP') {
        await msg91OtpService.retryOtp(DEFAULT_ADMIN_PHONE, 'WHATSAPP');
        setOtpResentMsg('WhatsApp OTP dispatched to +91 85116 26267! Please check WhatsApp.');
        showToast('WhatsApp OTP dispatched to +91 85116 26267', 'success');
      } else {
        await msg91OtpService.retryOtp(DEFAULT_ADMIN_PHONE, 'SMS');
        setOtpResentMsg('SMS OTP dispatched to +91 85116 26267! Please check SMS inbox.');
        showToast('SMS OTP dispatched to +91 85116 26267', 'success');
      }
    } catch {
      setOtpResentMsg('Retry dispatch initiated. Please check your phone.');
    }
  };

  const completeAdminLogin = () => {
    try {
      localStorage.setItem('apollo_admin_session', 'active');
    } catch {}
    setIsAdminAuthenticated(true);
    setAdminUser({
      id: 'u_apollo_admin_master',
      email: DEFAULT_ADMIN_EMAIL,
      full_name: 'Apollo Engineering Administrator',
      role: 'SUPER_ADMIN',
      is_superuser: true,
      phone: DEFAULT_ADMIN_PHONE,
    });
    setIsAdminVerifying(false);
    setAdminPasswordInput('');
    setAdminEnteredOtp('');
    setGoogleAuthCode('');
    setAuthError('');
    setAuthStage('CREDENTIALS');
    showToast('Administrator authenticated successfully with 2-Factor Authentication!', 'success');
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (forgotEmailInput.trim().toLowerCase() !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      setAuthError(`Password reset is restricted to registered administrator (${DEFAULT_ADMIN_EMAIL}).`);
      return;
    }

    if (forgotNewPassword.length < 6) {
      setAuthError('New password must be at least 6 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setAuthError('New password and confirmation do not match.');
      return;
    }

    // Verify 2FA code
    if (forgot2faMode === 'GOOGLE_AUTH') {
      const isValid = await totpService.verifyTOTP(forgot2faCode, APOLLO_ADMIN_TOTP_SECRET);
      if (!isValid) {
        setAuthError('Invalid Google Authenticator code. Please check your 2FA app.');
        return;
      }
    } else {
      const cleanOtp = forgot2faCode.trim();
      const verifyRes = await msg91OtpService.verifyOtp(DEFAULT_ADMIN_PHONE, cleanOtp);
      if (!verifyRes.isVerified) {
        setAuthError('Invalid Mobile OTP. Please verify the code sent to +91 85116 26267.');
        return;
      }
    }

    // Update password
    saveAdminPassword(forgotNewPassword);
    setAuthError('');
    setAuthStage('CREDENTIALS');
    setAdminPasswordInput(forgotNewPassword);
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgot2faCode('');
    showToast('Administrator password updated successfully! Please sign in with your new password.', 'success');
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwError('');
    setChangePwSuccess('');

    const currentStoredPw = getStoredAdminPassword();
    if (changePwCurrent !== currentStoredPw) {
      setChangePwError('Current password is incorrect.');
      return;
    }

    if (changePwNew.length < 6) {
      setChangePwError('New password must be at least 6 characters long.');
      return;
    }

    if (changePwNew !== changePwConfirm) {
      setChangePwError('New password and confirmation do not match.');
      return;
    }

    saveAdminPassword(changePwNew);
    setChangePwSuccess('Password changed successfully!');
    showToast('Administrator password updated successfully!', 'success');
    setTimeout(() => {
      setIsChangePasswordOpen(false);
      setChangePwCurrent('');
      setChangePwNew('');
      setChangePwConfirm('');
      setChangePwSuccess('');
      setChangePwError('');
    }, 1200);
  };

  const handleAdminLogout = async () => {
    try {
      localStorage.removeItem('apollo_admin_session');
      const csrfCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('ape_csrf='))
        ?.split('=')[1];

      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfCookie ? { 'X-CSRF-Token': csrfCookie } : {})
        },
        credentials: 'include'
      });
    } catch (e) {
      // Ignore logout errors
    }
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    setAdminPasswordInput('');
    setAdminEnteredOtp('');
    setGoogleAuthCode('');
    setAuthStage('CREDENTIALS');
    setAuthError('');
    showToast('Admin session terminated securely.', 'info');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 🧭 DASHBOARD NAVIGATION TABS (5 INDUSTRIAL PILLARS)
  // ─────────────────────────────────────────────────────────────────────────────
  const [activeAdminTab, setActiveAdminTab] = useState<'PRODUCTS' | 'ORDERS' | 'SHIPPING' | 'REPORTS' | 'RETURNS'>('PRODUCTS');
  
  // Orders Sub-tab: Dispatch Pipeline vs Final Orders vs Pending Carts
  const [ordersViewMode, setOrdersViewMode] = useState<'DISPATCH_PIPELINE' | 'FINAL_ORDERS' | 'PENDING_CARTS'>('DISPATCH_PIPELINE');

  // Shipping Filter: UNSHIPPED | SHIPPED | DELIVERED | ALL
  const [shippingFilter, setShippingFilter] = useState<'ALL' | 'UNSHIPPED' | 'SHIPPED' | 'DELIVERED'>('ALL');
  
  // Search query in Admin
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Amazon Seller Central Manage All Inventory Tab Filters & Batch Select
  const [catalogTabFilter, setCatalogTabFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'LOW_STOCK' | 'COMBO'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedAsins, setSelectedAsins] = useState<string[]>([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ✏️ PRODUCT EDIT & DELETE STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Edit Form Fields
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editB2cPrice, setEditB2cPrice] = useState<number>(0);
  const [editMrp, setEditMrp] = useState<number>(0);
  const [editB2bPrice, setEditB2bPrice] = useState<number>(0);
  const [editMinB2bQty, setEditMinB2bQty] = useState<number>(10);
  const [editStock, setEditStock] = useState<number>(0);
  const [editHsn, setEditHsn] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    const v = p.variants[0];
    setEditTitle(p.title);
    setEditCategory(p.category);
    setEditDescription(p.description || '');
    setEditB2cPrice(v?.b2cPrice || 220);
    setEditMrp(v?.mrp || 350);
    setEditB2bPrice(v?.b2bTierPricing?.[0]?.pricePerUnit || 185);
    setEditMinB2bQty(v?.b2bTierPricing?.[0]?.minQty || 10);
    setEditStock(v?.inventory || 1000);
    setEditHsn(v?.hsnCode || '84248990');
    setEditImageUrl(v?.images?.[0] || '/logo.webp');
  };

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updatedVariants = editingProduct.variants.map((v, i) => {
      if (i === 0) {
        return {
          ...v,
          b2cPrice: editB2cPrice,
          mrp: editMrp,
          inventory: editStock,
          hsnCode: editHsn,
          images: [editImageUrl, ...(v.images.slice(1))],
          b2bTierPricing: [
            {
              minQty: editMinB2bQty,
              pricePerUnit: editB2bPrice,
              discountPercent: editB2cPrice > 0 ? Math.round(((editB2cPrice - editB2bPrice) / editB2cPrice) * 100) : 0
            }
          ]
        };
      }
      return v;
    });

    updateProduct(editingProduct.asin, {
      title: editTitle,
      category: editCategory,
      description: editDescription,
      variants: updatedVariants
    });

    setEditingProduct(null);
    showToast(`Product "${editTitle}" updated successfully in database!`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.asin);
    setProductToDelete(null);
    showToast(`Product "${productToDelete.title}" deleted from catalog!`, 'info');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 📑 GSTR-1 STATUTORY CSV EXPORT & AUDIT SUITE (Deep Details: HSN + B2B + B2C)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleApplyDatePreset = (preset: 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'FY' | 'ALL') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const year = today.getFullYear();
    const month = today.getMonth();

    if (preset === 'TODAY') {
      setGstr1FromDate(todayStr);
      setGstr1ToDate(todayStr);
      setGstr1DatePreset('TODAY');
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      setGstr1FromDate(start);
      setGstr1ToDate(todayStr);
      setGstr1DatePreset('THIS_MONTH');
    } else if (preset === 'LAST_MONTH') {
      const lastMonthYear = month === 0 ? year - 1 : year;
      const lastMonth = month === 0 ? 11 : month - 1;
      const startOfLast = new Date(lastMonthYear, lastMonth, 1).toISOString().split('T')[0];
      const endOfLast = new Date(lastMonthYear, lastMonth + 1, 0).toISOString().split('T')[0];
      setGstr1FromDate(startOfLast);
      setGstr1ToDate(endOfLast);
      setGstr1DatePreset('LAST_MONTH');
    } else if (preset === 'FY') {
      const fyStart = month >= 3 ? year : year - 1;
      setGstr1FromDate(`${fyStart}-04-01`);
      setGstr1ToDate(`${fyStart + 1}-03-31`);
      setGstr1DatePreset('FY');
    } else if (preset === 'ALL') {
      setGstr1FromDate('2026-01-01');
      setGstr1ToDate(todayStr);
      setGstr1DatePreset('CUSTOM');
    }
  };

  const gstr1PeriodOrders = useMemo(() => {
    return filterOrdersByDateRange(orders, gstr1FromDate, gstr1ToDate);
  }, [orders, gstr1FromDate, gstr1ToDate]);

  const gstr1HsnData = useMemo(() => {
    return getGstr1Hsn12Rows(gstr1PeriodOrders);
  }, [gstr1PeriodOrders]);

  const gstr1B2bRows = useMemo(() => {
    return getGstr1Table4Rows(gstr1PeriodOrders);
  }, [gstr1PeriodOrders]);

  const gstr1B2cRows = useMemo(() => {
    return getGstr1Table7Rows(gstr1PeriodOrders);
  }, [gstr1PeriodOrders]);

  // Multi-Sheet Full GSTR-1 Excel (.xlsx) [Dedicated Sheets: b2b, b2c, hsn, doc_issue, all_details]
  const handleDownloadMultiSheetExcel = () => {
    try {
      const excelBytes = generateGstr1MultiSheetExcel(gstr1PeriodOrders, gstr1FromDate, gstr1ToDate);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Full_18Sheets_Report_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Full GSTR-1 Excel exported (All 18 Sheets: b2b, b2cl, b2cs, hsn, docs, all_orders, all_details, shipping, tax...)!`, 'success');
    } catch (err) {
      showToast('Failed to export Multi-Sheet Excel: ' + String(err), 'error');
    }
  };

  // All Orders Master Ledger Excel (.xlsx) [Sheet: all_orders]
  const handleDownloadAllOrdersExcel = () => {
    try {
      const excelBytes = generateAllOrdersExcel(gstr1PeriodOrders);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_All_Orders_Master_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`All Orders Master Excel exported (Sheet: all_orders)!`, 'success');
    } catch (err) {
      showToast('Failed to export All Orders Excel: ' + String(err), 'error');
    }
  };

  // Speed Post Logistics Register Excel (.xlsx) [Sheet: shipping_logistics]
  const handleDownloadShippingLogisticsExcel = () => {
    try {
      const excelBytes = generateShippingLogisticsExcel(gstr1PeriodOrders);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SpeedPost_Logistics_Kathwada_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Speed Post Logistics Excel exported (Sheet: shipping_logistics)!`, 'success');
    } catch (err) {
      showToast('Failed to export Shipping Logistics Excel: ' + String(err), 'error');
    }
  };

  // Statutory Tax Reconciliation Summary Excel (.xlsx) [Sheet: tax_summary]
  const handleDownloadTaxSummaryExcel = () => {
    try {
      const excelBytes = generateTaxSummaryExcel(gstr1PeriodOrders, gstr1FromDate, gstr1ToDate);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Statutory_Tax_Summary_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Statutory Tax Summary Excel exported (Sheet: tax_summary)!`, 'success');
    } catch (err) {
      showToast('Failed to export Tax Summary Excel: ' + String(err), 'error');
    }
  };

  // All Details Deep Audit Excel (.xlsx) [Sheet: all_details]
  const handleDownloadAllDetailsExcel = () => {
    try {
      const excelBytes = generateAllDetailsExcel(gstr1PeriodOrders, gstr1FromDate, gstr1ToDate);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_All_Details_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`All Details GSTR-1 Excel exported (Sheet: all_details)!`, 'success');
    } catch (err) {
      showToast('Failed to export All Details Excel: ' + String(err), 'error');
    }
  };

  // Official GST Portal Summary For HSN(12) Excel (.xlsx) [Sheet: hsn]
  const handleDownloadHsn12Excel = () => {
    try {
      const excelBytes = generateHsn12Excel(gstr1PeriodOrders);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Table12_HSN_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Table 12 HSN Excel exported (Sheet: hsn)!`, 'success');
    } catch (err) {
      showToast('Failed to export HSN Excel: ' + String(err), 'error');
    }
  };

  // Table 4 B2B Invoices Excel (.xlsx) [Sheet: b2b]
  const handleDownloadB2bExcel = () => {
    try {
      const excelBytes = generateB2bExcel(gstr1PeriodOrders);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Table4_B2B_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Table 4 B2B Excel exported (Sheet: b2b)!`, 'success');
    } catch (err) {
      showToast('Failed to export B2B Excel: ' + String(err), 'error');
    }
  };

  // Table 7 B2C Supplies Excel (.xlsx) [Sheet: b2c]
  const handleDownloadB2cExcel = () => {
    try {
      const excelBytes = generateB2cExcel(gstr1PeriodOrders);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Table7_B2C_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Table 7 B2C Excel exported (Sheet: b2c)!`, 'success');
    } catch (err) {
      showToast('Failed to export B2C Excel: ' + String(err), 'error');
    }
  };

  // Table 13 Documents Issued Excel (.xlsx) [Sheet: doc_issue]
  const handleDownloadDocIssueExcel = () => {
    try {
      const excelBytes = generateDocIssueExcel(gstr1PeriodOrders);
      const blob = new Blob([excelBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_Table13_Docs_ApolloEngineering_${gstr1FromDate}_to_${gstr1ToDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Table 13 Docs Issued Excel exported (Sheet: doc_issue)!`, 'success');
    } catch (err) {
      showToast('Failed to export Docs Issue Excel: ' + String(err), 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ➕ ADD NEW ASIN / PRODUCT STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [isAddingNewAsin, setIsAddingNewAsin] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('SS304 GRADE');
  const [newSku, setNewSku] = useState('');
  const [newPrice, setNewPrice] = useState(250);
  const [newMrp, setNewMrp] = useState(400);
  const [newB2bPrice, setNewB2bPrice] = useState(210);
  const [newStock, setNewStock] = useState(500);
  const [newWeight, setNewWeight] = useState(200);
  const [newHsn, setNewHsn] = useState('84248990');
  const [newImage, setNewImage] = useState('/solar_sprinkler.webp');
  const [newDesc, setNewDesc] = useState('');

  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsin = `AP-${Date.now().toString().slice(-6)}`;
    const skuCode = newSku || `SKU-${newAsin}`;

    const newProd: Product = {
      asin: newAsin,
      title: newTitle,
      brand: 'Apollo Engineering',
      category: newCategory,
      subCategory: 'Solar Cleaning Hardware',
      description: newDesc || `${newTitle} manufactured with medical-grade AISI SS304.`,
      highlights: [
        '100% Guaranteed AISI SS304 Stainless Steel',
        'Direct Kathwada GIDC Factory Dispatch',
        '10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.'
      ],
      rating: 5.0,
      reviewCount: 1,
      variants: [
        {
          sku: skuCode,
          title: newTitle,
          attributes: {
            material: 'SS304',
            size: 'Standard'
          },
          mrp: newMrp,
          b2cPrice: newPrice,
          b2bTierPricing: [
            {
              minQty: 10,
              pricePerUnit: newB2bPrice,
              discountPercent: Math.round(((newPrice - newB2bPrice) / newPrice) * 100)
            }
          ],
          inventory: newStock,
          barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
          images: [newImage],
          weightGrams: newWeight,
          dimensionsCm: { length: 15, width: 10, height: 8 },
          hsnCode: newHsn,
          gstRatePercent: 18
        }
      ],
      selectedVariantSku: skuCode,
      sellerListings: {},
      aPlusContent: [],
      badges: ['PRIME', 'BEST_SELLER'],
      isLive: true,
      createdAt: new Date().toISOString()
    };

    addNewProduct(newProd);
    setIsAddingNewAsin(false);
    // Reset form
    setNewTitle('');
    setNewSku('');
    setNewDesc('');
    showToast(`New Product ASIN ${newAsin} created & published!`, 'success');
  };

  // Modals for Labels & GST Invoices
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<Order | null>(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  // Mock Pending Carts (Active shopper sessions awaiting payment / checkout)
  const [pendingCarts, setPendingCarts] = useState([
    {
      id: 'cart_pend_01',
      shopperName: 'Rajesh Sharma (Solar EPC Contractor)',
      phone: '+91 98250 11223',
      email: 'rajesh@solarepc.in',
      location: 'Ahmedabad (380015)',
      itemCount: 150,
      itemsSummary: 'SS304 Solar Panel Sprinkler (x100), Drain Clips 35mm (x50)',
      totalCartValue: 24750,
      lastActiveMinutesAgo: 14,
      device: 'Mobile (Chrome Android)',
      status: 'CART_ACTIVE'
    },
    {
      id: 'cart_pend_02',
      shopperName: 'Manoj Verma (Rooftop Plant Owner)',
      phone: '+91 97240 88991',
      email: 'm.verma@gmail.com',
      location: 'Surat (395007)',
      itemCount: 20,
      itemsSummary: 'SS304 Solar Auto Drain Clips 30mm (Pack of 20)',
      totalCartValue: 1980,
      lastActiveMinutesAgo: 45,
      device: 'Desktop (Windows)',
      status: 'CHECKOUT_ABANDONED'
    },
    {
      id: 'cart_pend_03',
      shopperName: 'SunPower Renewable Infra Pvt Ltd',
      phone: '+91 99090 33445',
      email: 'procurement@sunpowerinfra.com',
      location: 'Vadodara (390001)',
      itemCount: 500,
      itemsSummary: 'SS304 Solar Sprinklers (x500 Bulk Tier)',
      totalCartValue: 92500,
      lastActiveMinutesAgo: 110,
      device: 'Desktop (MacOS)',
      status: 'AWAITING_PO_APPROVAL'
    }
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 📊 REAL-TIME FINANCIAL & LOGISTICS KPI CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const totalGMV = orders.reduce((sum, o) => sum + o.pricingSummary.grandTotal, 0);
  const totalTaxable = orders.reduce((sum, o) => sum + o.pricingSummary.taxableValue, 0);
  const totalCGST = orders.reduce((sum, o) => sum + o.pricingSummary.cgstAmount, 0);
  const totalSGST = orders.reduce((sum, o) => sum + o.pricingSummary.sgstAmount, 0);
  const totalIGST = orders.reduce((sum, o) => sum + o.pricingSummary.igstAmount, 0);
  const totalTax = orders.reduce((sum, o) => sum + o.pricingSummary.totalTax, 0);

  // Orders count breakdown
  const unshippedCount = orders.filter(o => o.shipments?.[0]?.status === 'CONFIRMED' || o.shipments?.[0]?.status === 'PROCESSING_PICK_PACK').length;
  const shippedCount = orders.filter(o => o.shipments?.[0]?.status === 'IN_TRANSIT' || o.shipments?.[0]?.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter(o => o.shipments?.[0]?.status === 'DELIVERED').length;

  // Filtered Orders for Shipping Console
  const shippingConsoleOrders = orders.filter((o) => {
    const status = o.shipments?.[0]?.status;
    const matchesSearch = 
      adminSearchQuery === '' ||
      o.orderNumber.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      o.customerPhone.includes(adminSearchQuery) ||
      (o.shipments?.[0]?.shippingDetail?.articleNumber || '').toLowerCase().includes(adminSearchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (shippingFilter === 'DELIVERED') return status === 'DELIVERED';
    if (shippingFilter === 'SHIPPED') return status === 'IN_TRANSIT' || status === 'OUT_FOR_DELIVERY';
    if (shippingFilter === 'UNSHIPPED') return status === 'CONFIRMED' || status === 'PROCESSING_PICK_PACK';
    return true;
  });

  // All unique product categories in catalog
  const allProductCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Filtered Products for Catalog (Amazon Seller Central Multi-Filter)
  const filteredProductsList = products.filter(p => {
    const matchesSearch = 
      adminSearchQuery === '' ||
      p.title.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      p.asin.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      p.variants.some(v => v.sku.toLowerCase().includes(adminSearchQuery.toLowerCase()) || (v.hsnCode || '').includes(adminSearchQuery));

    if (!matchesSearch) return false;

    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

    if (catalogTabFilter === 'ACTIVE') return p.isLive;
    if (catalogTabFilter === 'INACTIVE') return !p.isLive;
    if (catalogTabFilter === 'LOW_STOCK') return p.variants.some(v => (v.inventory || 0) < 100);
    if (catalogTabFilter === 'COMBO') return p.isComboBundle;

    return true;
  });

  const totalCatalogInventory = products.reduce((acc, p) => 
    acc + p.variants.reduce((vAcc, v) => vAcc + (v.inventory || 0), 0), 0
  );

  const toggleSelectAllAsins = () => {
    if (selectedAsins.length === filteredProductsList.length && filteredProductsList.length > 0) {
      setSelectedAsins([]);
    } else {
      setSelectedAsins(filteredProductsList.map(p => p.asin));
    }
  };

  const toggleSelectAsin = (asin: string) => {
    setSelectedAsins(prev => 
      prev.includes(asin) ? prev.filter(a => a !== asin) : [...prev, asin]
    );
  };

  const handleBulkAddStock = (amount: number) => {
    selectedAsins.forEach(asin => {
      const prod = products.find(p => p.asin === asin);
      if (prod) {
        prod.variants.forEach(v => {
          updateProductStock(asin, v.sku, (v.inventory || 0) + amount);
        });
      }
    });
    showToast(`Added +${amount} stock to ${selectedAsins.length} selected ASINs`, 'success');
  };

  const handleBulkToggleActive = (active: boolean) => {
    selectedAsins.forEach(asin => {
      updateProduct(asin, { isLive: active });
    });
    showToast(`Set ${selectedAsins.length} products to ${active ? 'Active' : 'Inactive'}`, 'info');
  };

  const handleCombineSelectedListings = () => {
    if (selectedAsins.length < 2) {
      showToast('Please select at least 2 products to combine into 1 listing.', 'info');
      return;
    }
    const combined = combineProductsIntoParentListing(selectedAsins);
    if (combined) {
      setSelectedAsins([]);
      setProductForWizard(combined);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 🔒 RENDER LOGIN / 2FA / FORGOT PASSWORD SCREEN IF NOT AUTHENTICATED
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen py-16 px-4 flex items-center justify-center relative overflow-hidden text-slate-900 bg-slate-50/50">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl space-y-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          {/* STAGE 1: CREDENTIALS */}
          {authStage === 'CREDENTIALS' && (
            <>
              <div className="text-center space-y-1">
                <span className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  Restricted Executive Desk
                </span>
                <h2 className="text-2xl font-black text-slate-900 font-display">
                  Apollo Admin Portal
                </h2>
                <p className="text-xs text-slate-500">
                  Please enter your authorized administrator credentials to access the production management console.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAdminCredentialsSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Admin ID / Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="admin-login-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={adminIdInput}
                      onChange={(e) => setAdminIdInput(e.target.value)}
                      placeholder="admin@apolloengineering.co.in"
                      className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 text-xs shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      Admin Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStage('FORGOT_PASSWORD');
                        setAuthError('');
                        setForgotEmailInput(adminIdInput || DEFAULT_ADMIN_EMAIL);
                      }}
                      className="text-[11px] font-semibold text-[#0054A6] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="admin-login-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 text-xs shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAdminVerifying}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isAdminVerifying ? 'Verifying Credentials...' : 'Sign In as Administrator'}
                </button>
              </form>
            </>
          )}

          {/* STAGE 2 (STEP 1 OF 2FA): MOBILE OTP (SMS & WHATSAPP) */}
          {authStage === 'MOBILE_OTP' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-mono font-bold text-[#0054A6] uppercase tracking-widest flex items-center justify-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#0054A6]" /> Step 1 of 2: Mobile Authorization
                </span>
                <h2 className="text-xl font-black text-slate-900 font-display">
                  Mobile OTP Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Enter verification code sent to your registered admin mobile number.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyMobileOtp} className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs space-y-1.5">
                  <span className="font-bold text-blue-900 block">Registered Admin Mobile Number:</span>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-sm font-black text-blue-950">+91 85116 26267</span>
                    <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-900 text-[10px] font-bold">MSG91 Express</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    OTP sent via SMS & WhatsApp. If carrier network delays SMS, click Resend via WhatsApp.
                  </p>
                </div>

                {otpResentMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    {otpResentMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Enter Verification OTP (SMS / WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={adminEnteredOtp}
                    onChange={(e) => setAdminEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4 or 6 digit code"
                    className="w-full h-11 text-center font-mono font-black text-xl tracking-[0.3em] bg-white border border-slate-300 rounded-xl focus:border-[#0054A6] focus:outline-none shadow-inner text-slate-900"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleResendOtp('WHATSAPP')}
                    className="flex-1 py-2 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>💬 WhatsApp Resend</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResendOtp('SMS')}
                    className="flex-1 py-2 rounded-lg bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>📱 SMS Resend</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isAdminVerifying || !adminEnteredOtp}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>{isAdminVerifying ? 'Verifying Mobile OTP...' : 'Verify Mobile OTP & Continue to Step 2'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setAuthStage('CREDENTIALS'); setAuthError(''); }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 block pt-1"
              >
                ← Back to Password Login
              </button>
            </div>
          )}

          {/* STAGE 3 (STEP 2 OF 2FA): GOOGLE AUTHENTICATOR */}
          {authStage === 'GOOGLE_AUTH' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-widest flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Step 2 of 2: Two-Factor Authentication
                </span>
                <h2 className="text-xl font-black text-slate-900 font-display">
                  Google Authenticator
                </h2>
                <p className="text-xs text-slate-500">
                  Enter the 6-digit security code from your Google Authenticator app.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Already Configured View: ID and QR Code are completely HIDDEN */}
              {isGoogleAuthConfigured ? (
                <form onSubmit={handleVerifyGoogleAuth} className="space-y-4">
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 flex-shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-emerald-950 text-xs block">Google Authenticator Linked & Active</span>
                      <span className="text-[11px] text-emerald-800 font-medium">
                        Device successfully paired with Apollo Admin. Enter the live 6-digit code below.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      Enter 6-Digit Google Authenticator Code *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={googleAuthCode}
                      onChange={(e) => setGoogleAuthCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full h-12 text-center font-mono font-black text-2xl tracking-[0.4em] bg-white border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none shadow-inner text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAdminVerifying || googleAuthCode.length !== 6}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isAdminVerifying ? 'Verifying Code...' : 'Verify & Enter Admin Console'}
                  </button>

                  {/* Optional Re-link toggle (hidden by default) */}
                  <div className="pt-1">
                    {!showQrCode ? (
                      <button
                        type="button"
                        onClick={() => setShowQrCode(true)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline text-center block w-full"
                      >
                        Need to re-scan QR Code on a new phone? Click to reveal
                      </button>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs animate-fadeIn mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">QR Code Re-Pairing:</span>
                          <button
                            type="button"
                            onClick={() => setShowQrCode(false)}
                            className="text-[11px] text-slate-500 hover:text-slate-800"
                          >
                            Hide QR Code
                          </button>
                        </div>
                        <div className="p-2 bg-white border border-slate-200 rounded-xl flex flex-col items-center gap-1.5">
                          <img
                            src={totpService.getQrCodeUrl(totpService.getOtpAuthUrl(DEFAULT_ADMIN_EMAIL, 'Apollo Engineering', APOLLO_ADMIN_TOTP_SECRET), 160)}
                            alt="Google Authenticator QR Code"
                            className="w-32 h-32 border border-slate-100 rounded-lg shadow-sm"
                          />
                          <span className="text-[10px] text-slate-500 font-mono text-center">
                            Scan with Google Authenticator
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Secret Key:</span>
                            <code className="font-mono font-bold text-slate-800 text-xs tracking-wider">
                              {APOLLO_ADMIN_TOTP_SECRET}
                            </code>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(APOLLO_ADMIN_TOTP_SECRET);
                              setCopiedSecret(true);
                              setTimeout(() => setCopiedSecret(false), 2000);
                            }}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-sm"
                          >
                            {copiedSecret ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            {copiedSecret ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                /* First-Time Setup View: ID and QR code are shown for initial binding */
                <form onSubmit={handleVerifyGoogleAuth} className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">First-Time Google Authenticator Setup:</span>
                      <button
                        type="button"
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="text-[11px] font-semibold text-[#0054A6] hover:underline flex items-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {showQrCode ? 'Hide QR Code' : 'Show QR Code'}
                      </button>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col items-center gap-2">
                      <img
                        src={totpService.getQrCodeUrl(totpService.getOtpAuthUrl(DEFAULT_ADMIN_EMAIL, 'Apollo Engineering', APOLLO_ADMIN_TOTP_SECRET), 180)}
                        alt="Google Authenticator QR Code"
                        className="w-36 h-36 border border-slate-100 rounded-lg shadow-sm"
                      />
                      <span className="text-[10px] text-slate-500 font-mono text-center">
                        Scan with Google Authenticator or Microsoft Authenticator
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Secret Key:</span>
                        <code className="font-mono font-bold text-slate-800 text-xs tracking-wider">
                          {APOLLO_ADMIN_TOTP_SECRET}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(APOLLO_ADMIN_TOTP_SECRET);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-sm"
                      >
                        {copiedSecret ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedSecret ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      Enter 6-Digit Google Authenticator Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={googleAuthCode}
                      onChange={(e) => setGoogleAuthCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full h-11 text-center font-mono font-black text-xl tracking-[0.4em] bg-white border border-slate-300 rounded-xl focus:border-amber-500 focus:outline-none shadow-inner text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAdminVerifying || googleAuthCode.length !== 6}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isAdminVerifying ? 'Validating Authenticator...' : 'Verify & Enter Dashboard'}
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => { setAuthStage('MOBILE_OTP'); setAuthError(''); }}
                  className="font-semibold text-slate-500 hover:text-slate-800"
                >
                  ← Back to Mobile OTP
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthStage('CREDENTIALS'); setAuthError(''); }}
                  className="font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: FORGOT / RESET PASSWORD */}
          {authStage === 'FORGOT_PASSWORD' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  Self-Service Password Recovery
                </span>
                <h2 className="text-xl font-black text-slate-900 font-display">
                  Reset Admin Password
                </h2>
                <p className="text-xs text-slate-500">
                  Verify ownership via 2FA to set a new administrator password.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Admin ID / Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={forgotEmailInput}
                    className="w-full h-9 px-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Security Verification Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForgot2faMode('GOOGLE_AUTH')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border ${
                        forgot2faMode === 'GOOGLE_AUTH'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Google Authenticator
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForgot2faMode('MOBILE_OTP');
                        msg91OtpService.sendOtp(DEFAULT_ADMIN_PHONE).catch(() => {});
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border ${
                        forgot2faMode === 'MOBILE_OTP'
                          ? 'bg-blue-100 text-blue-900 border-blue-300 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Mobile OTP (8511626267)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    {forgot2faMode === 'GOOGLE_AUTH' ? 'Google Authenticator 6-Digit Code *' : 'OTP Code sent to +91 85116 26267 *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={forgot2faCode}
                    onChange={(e) => setForgot2faCode(e.target.value.trim())}
                    placeholder={forgot2faMode === 'GOOGLE_AUTH' ? 'Current 6-digit TOTP' : 'Enter received OTP'}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    New Administrator Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all mt-2"
                >
                  Save New Password & Sign In
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setAuthStage('CREDENTIALS'); setAuthError(''); }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 block pt-1"
              >
                ← Back to Administrator Login
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              Kathwada Factory Hub (382430) • 256-Bit Encrypted
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 🖥️ AUTHENTICATED SUPER ADMIN DESK
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-6 px-3 sm:px-6 lg:px-10 space-y-8 animate-fadeIn w-full max-w-[1750px] mx-auto text-slate-900">
      {/* Enterprise Top Header Bar (Amazon Seller Central / Flipkart Seller Hub Style) */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black text-white font-display tracking-tight">
                Apollo Engineering · Seller Central
              </h1>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                Live Manufacturing Dispatch Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
              <span>Admin: <strong className="text-slate-200">{adminUser?.email || 'admin@apolloengineering.co.in'}</strong></span>
              <span>•</span>
              <span className="text-amber-400">Kathwada GIDC Hub ({ORIGIN_HUB_PINCODE})</span>
              <span>•</span>
              <span>GSTIN: <span className="text-slate-200 tracking-wider font-semibold">24AAAPA1234A1Z5</span></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick link to live storefront */}
          <button
            onClick={() => {
              setAppMode('B2C');
              setActiveTab('store');
              navigate('/');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Open customer storefront in shop mode"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>View Live Storefront</span>
          </button>

          <button
            onClick={() => {
              setChangePwCurrent('');
              setChangePwNew('');
              setChangePwConfirm('');
              setChangePwError('');
              setChangePwSuccess('');
              setIsChangePasswordOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Change Admin Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Change Password</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Main 5 Pillars Navigation Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-md">
        {[
          { id: 'PRODUCTS', label: 'Inventory & Catalog', icon: Package, count: `${products.length} Products` },
          { id: 'ORDERS', label: 'Fulfillment & Dispatch', icon: Truck, count: `${orders.length} Orders` },
          { id: 'SHIPPING', label: 'Speed Post CEPT', icon: Landmark, count: `${unshippedCount} Unshipped` },
          { id: 'RETURNS', label: 'Returns & Sizing', icon: RotateCcw, count: `${returnRequests.length} Requests` },
          { id: 'REPORTS', label: 'GSTR-1 & Reports', icon: BarChart3, count: `₹${(totalGMV / 1000).toFixed(1)}k GMV` },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`p-3.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 text-center border ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black border-amber-400 scale-[1.02]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-amber-500'}`} />
                <span className="font-bold">{tab.label}</span>
              </div>
              <span className={`text-[10px] font-mono font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 📦 PILLAR 1: PRODUCT LISTING (APE STORE LIST & VARIANTS) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeAdminTab === 'PRODUCTS' && (
        <div className="space-y-5">
          {/* Top Header & Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                  Amazon Seller Central · Catalog Management
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Kathwada Origin Hub (382430)
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 font-display flex items-center gap-2.5">
                <span>APE Store Product & Variant Matrix</span>
              </h2>
              <p className="text-xs text-slate-500">
                Manage ASINs, live fulfillable inventory, B2B wholesale MOQ tiers, statutory HSN codes, and pricing in real-time.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  const fullKit = products.find(p => p.asin === 'AP-FULLKIT-05') || products[0];
                  setComboBuilderProduct(fullKit);
                  setIsComboBuilderOpen(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 hover:scale-[1.02] transition-transform"
              >
                <Layers className="w-4 h-4 text-amber-300" />
                <span>Build Combo Variant (Kit Bundle)</span>
              </button>

              <button
                onClick={() => setProductForWizard('NEW')}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md border border-amber-500 flex items-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Add New ASIN (APE Wizard)</span>
              </button>
            </div>
          </div>

          {/* Amazon Seller Central Inventory KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300/40 flex items-center justify-center text-amber-700">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Catalog</span>
                <span className="text-lg font-black text-slate-900 font-mono">{products.length} ASINs</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Buy Box</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {products.filter(p => p.isLive).length} Live
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Stock In Hub</span>
                <span className="text-lg font-black text-[#0054A6] font-mono">
                  {totalCatalogInventory.toLocaleString('en-IN')} pcs
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">B2B Wholesale MOQ</span>
                <span className="text-xs font-black text-purple-900">18% GST ITC</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm col-span-2 sm:col-span-4 lg:col-span-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">FBM Origin Hub</span>
                <span className="text-xs font-mono font-bold text-teal-900">Kathwada (382430)</span>
              </div>
            </div>
          </div>

          {/* Amazon Manage All Inventory Toolbar: Filter Tabs + Search + Category Selector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3 shadow-sm">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All Products', count: products.length },
                  { id: 'ACTIVE', label: 'Active', count: products.filter(p => p.isLive).length },
                  { id: 'INACTIVE', label: 'Inactive', count: products.filter(p => !p.isLive).length },
                  { id: 'LOW_STOCK', label: 'Low Stock (<100)', count: products.filter(p => p.variants.some(v => (v.inventory || 0) < 100)).length },
                  { id: 'COMBO', label: 'Combo Kits', count: products.filter(p => p.isComboBundle).length }
                ].map(tab => {
                  const isActive = catalogTabFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCatalogTabFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100/80 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                        isActive ? 'bg-slate-800 text-amber-400' : 'bg-slate-200/80 text-slate-600'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Reset view if filters are applied */}
              {(adminSearchQuery || categoryFilter !== 'ALL' || catalogTabFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setAdminSearchQuery('');
                    setCategoryFilter('ALL');
                    setCatalogTabFilter('ALL');
                  }}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>

            {/* Search and Category Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by ASIN, SKU, Title, or HSN Code..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner"
                  />
                  {adminSearchQuery && (
                    <button
                      onClick={() => setAdminSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="ALL">All Categories ({allProductCategories.length})</option>
                    {allProductCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="h-4 w-px bg-slate-300 hidden sm:block" aria-hidden="true" />

                <div className="text-xs text-slate-500 font-mono whitespace-nowrap pl-1" aria-live="polite">
                  Showing <strong className="text-slate-900 font-bold">{filteredProductsList.length}</strong> of {products.length} ASINs
                </div>
              </div>
            </div>

            {/* Batch Action Floating Ribbon (Amazon Seller Style) */}
            {selectedAsins.length > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono font-black text-[11px]">
                    {selectedAsins.length} Selected
                  </span>
                  <span>Batch Operations</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    onClick={handleCombineSelectedListings}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black transition-all flex items-center gap-1.5 shadow-md hover:scale-105"
                    title="Combine selected products into 1 Amazon-style Parent-Child listing with variations"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-950" />
                    <span>Combine {selectedAsins.length} Items into 1 Listing</span>
                  </button>
                  <button
                    onClick={() => handleBulkAddStock(50)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <span>+50 Stock to Selected</span>
                  </button>
                  <button
                    onClick={() => handleBulkToggleActive(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all"
                  >
                    Mark Active
                  </button>
                  <button
                    onClick={() => handleBulkToggleActive(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all"
                  >
                    Mark Inactive
                  </button>
                  <button
                    onClick={() => setSelectedAsins([])}
                    className="px-2.5 py-1.5 text-slate-400 hover:text-white underline text-xs"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Amazon Seller Central Manage All Inventory Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800 table-auto divide-y divide-slate-200 min-w-[1280px]">
                <thead className="bg-slate-100 text-slate-700 font-mono text-[11px] uppercase border-b border-slate-300 tracking-wider">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllAsins}
                        className="text-slate-600 hover:text-slate-900 p-0.5"
                        title="Select All ASINs"
                      >
                        {selectedAsins.length === filteredProductsList.length && filteredProductsList.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5 w-28">Status</th>
                    <th className="p-3.5 w-16 text-center">Image</th>
                    <th className="p-3.5 min-w-[320px]">Product / ASIN</th>
                    <th className="p-3.5 w-36">Variant Options</th>
                    <th className="p-3.5 w-32 text-right">B2C Retail Price</th>
                    <th className="p-3.5 w-40 text-right">B2B Wholesale Rate</th>
                    <th className="p-3.5 w-44 text-center">Live Stock (Quick +/-)</th>
                    <th className="p-3.5 w-36 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredProductsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500">
                        <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-700">No products matched your search or filters.</div>
                        <div className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredProductsList.map((p) => {
                      const selectedVariant = p.variants.find((v) => v.sku === p.selectedVariantSku) || p.variants[0];
                      const isSelected = selectedAsins.includes(p.asin);
                      const b2cPrice = selectedVariant.b2cPrice || 0;
                      const mrp = selectedVariant.mrp || 0;
                      const b2bPrice = selectedVariant.b2bTierPricing?.[0]?.pricePerUnit || Math.round(b2cPrice * 0.7);
                      const discountPercent = mrp > b2cPrice ? Math.round(((mrp - b2cPrice) / mrp) * 100) : 0;
                      const currentMoq = p.b2bMoq || selectedVariant.b2bMoq || selectedVariant.b2bTierPricing?.[0]?.minQty || 50;
                      const unit = selectedVariant.unitOfMeasure || p.unitOfMeasure || 'PCS';

                      return (
                        <tr
                          key={p.asin}
                          className={`transition-colors ${
                            isSelected ? 'bg-amber-50/50 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* 1. Selection Checkbox */}
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectAsin(p.asin)}
                              className="text-slate-600 hover:text-slate-900 p-0.5"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                              )}
                            </button>
                          </td>

                          {/* 2. Status & Fulfillment Mode */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => {
                                  updateProduct(p.asin, { isLive: !p.isLive });
                                  showToast(`${p.asin} is now ${!p.isLive ? 'Active' : 'Inactive'}`, 'info');
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-black border transition-all ${
                                  p.isLive
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                }`}
                                title="Click to toggle listing status"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${p.isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                <span>{p.isLive ? 'Active' : 'Inactive'}</span>
                              </button>
                              <div className="text-[10px] text-slate-400 font-mono">
                                FBM (382430)
                              </div>
                            </div>
                          </td>

                          {/* 3. Product Thumbnail */}
                          <td className="p-3.5 text-center">
                            <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs overflow-hidden mx-auto">
                              <img
                                src={selectedVariant.images?.[0] || p.aPlusContent?.[0]?.imageUrl || '/logo.webp'}
                                alt={p.title}
                                className="w-full h-full object-contain hover:scale-110 transition-transform duration-200"
                              />
                            </div>
                          </td>

                          {/* 4. Product Name, ASIN, SKU, HSN & Badges */}
                          <td className="p-3.5">
                            <div className="space-y-1.5 max-w-[420px]">
                              {/* Title */}
                              <div
                                onClick={() => setProductForWizard(p)}
                                className="font-bold text-slate-900 text-xs hover:text-amber-700 cursor-pointer leading-snug line-clamp-2 transition-colors"
                                title="Click to edit product in APE Wizard"
                              >
                                {p.title}
                              </div>

                              {/* Primary Identifier & Clean Secondary Metadata (Fix Issue 6) */}
                              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                  ASIN: {p.asin}
                                </span>
                                <span className="text-slate-500 text-[11px]">
                                  SKU: <strong className="text-slate-700 font-semibold">{selectedVariant.sku}</strong>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500 text-[11px]" title={`${selectedVariant.gstRatePercent || 18}% Statutory GST`}>
                                  HSN: {selectedVariant.hsnCode || '84248990'} ({selectedVariant.gstRatePercent || 18}% GST)
                                </span>
                              </div>

                              {/* Category & Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                  {p.category} {p.subCategory ? `• ${p.subCategory}` : ''}
                                </span>
                                {p.isComboBundle && (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 font-bold text-[10px] border border-amber-300 flex items-center gap-1">
                                    <Layers className="w-3 h-3" /> Combo Bundle
                                  </span>
                                )}
                                {p.badges?.includes('PRIME') && (
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#0054A6] text-[10px] font-bold border border-blue-200">
                                    Speed Post Fast
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 5. Variant Options */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 text-xs block">
                                {p.variants.length} Variant{p.variants.length > 1 ? 's' : ''}
                              </span>
                              <div className="text-[10px] text-slate-500 font-mono line-clamp-2 leading-relaxed">
                                {p.variants.map(v => v.title).join(', ')}
                              </div>
                            </div>
                          </td>

                          {/* 6. B2C Retail Price (Your Price) */}
                          <td className="p-3.5 text-right font-mono">
                            <div className="space-y-0.5">
                              <div className="font-black text-sm text-slate-900">
                                ₹{b2cPrice.toLocaleString('en-IN')}
                                <span className="text-[10px] text-slate-500 font-sans font-normal"> /{unit}</span>
                              </div>
                              {mrp > b2cPrice && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  MRP: ₹{mrp.toLocaleString('en-IN')}
                                </div>
                              )}
                              {discountPercent > 0 && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                                  {discountPercent}% OFF
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 7. B2B Wholesale Rate (with MOQ badge) */}
                          <td className="p-3.5 text-right font-mono">
                            <div className="space-y-0.5">
                              <div className="font-black text-sm text-emerald-800">
                                ₹{b2bPrice.toLocaleString('en-IN')}
                                <span className="text-[10px] text-slate-500 font-sans font-normal"> /{unit}</span>
                              </div>
                              <div className="text-[10px] text-emerald-800 font-bold flex items-center justify-end gap-1 font-mono">
                                <span className="bg-emerald-100/90 text-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 font-bold text-[10px]">
                                  MOQ: {currentMoq} {unit}
                                </span>
                              </div>
                              <div className="text-[9px] text-emerald-700 font-bold flex items-center justify-end gap-1 font-sans">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> 18% ITC Eligible
                              </div>
                            </div>
                          </td>

                          {/* 9. Live Stock (Quick +/-) - Available Fulfillable Inventory */}
                          <td className="p-3.5 text-center">
                            <StockEditableInput
                              asin={p.asin}
                              sku={selectedVariant.sku}
                              currentStock={selectedVariant.inventory || 0}
                              unit={unit}
                            />
                          </td>

                          {/* 10. Actions (Clean Secondary Edit + Combo + Delete) */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setProductForWizard(p)}
                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all"
                                title="Edit Product Details & Variations Matrix"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                <span>Edit & Matrix</span>
                              </button>

                              <button
                                onClick={() => {
                                  setComboBuilderProduct(p);
                                  setIsComboBuilderOpen(true);
                                }}
                                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0054A6] border border-blue-200 transition-all hover:scale-105 shadow-xs"
                                title="Build or Edit Combo Variant Bundle for this ASIN"
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setProductToDelete(p)}
                                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all hover:scale-105 shadow-xs"
                                title="Delete Product from Catalog"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 📑 PILLAR 2: ORDERS (LIVE TRACKING, FINAL PLACED ORDERS & PENDING CARTS) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeAdminTab === 'ORDERS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-display flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <span>Orders & Fulfillment Control Hub</span>
              </h2>
              <p className="text-xs text-slate-600">
                Manage sequential pick-up dispatch, customer orders, statutory tax invoices, and pending shopping carts.
              </p>
            </div>

            {/* View Mode Toggle: Amazon/Flipkart Dispatch vs Final Orders vs Pending Carts */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 text-xs font-bold shadow-sm">
              <button
                onClick={() => setOrdersViewMode('DISPATCH_PIPELINE')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  ordersViewMode === 'DISPATCH_PIPELINE'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-3.5 h-3.5" /> Sequential Dispatch Pipeline
              </button>

              <button
                onClick={() => setOrdersViewMode('FINAL_ORDERS')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  ordersViewMode === 'FINAL_ORDERS'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> All Orders ({orders.length})
              </button>

              <button
                onClick={() => setOrdersViewMode('PENDING_CARTS')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  ordersViewMode === 'PENDING_CARTS'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Pending Carts ({pendingCarts.length})
              </button>
            </div>
          </div>

          {/* TAB 2.0: AMAZON / FLIPKART SEQUENTIAL DISPATCH PIPELINE */}
          {ordersViewMode === 'DISPATCH_PIPELINE' && (
            <AmazonFlipkartDispatchConsole />
          )}

          {/* TAB 2.1: FINAL PLACED ORDERS */}
          {ordersViewMode === 'FINAL_ORDERS' && (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div key={ord.id} className="p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 space-y-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{ord.orderNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.shipments[0]?.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : ord.shipments[0]?.status === 'IN_TRANSIT'
                            ? 'bg-blue-50 text-[#0054A6] border border-blue-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-300'
                        }`}>
                          {ord.shipments[0]?.status}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                          {ord.orderType}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Customer: <strong className="text-slate-900">{ord.customerName}</strong> ({ord.customerPhone}) • Destination: {ord.deliveryAddress.city} ({ord.deliveryAddress.pincode})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOrderForLabel(ord)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1.5 border border-amber-300 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" /> Thermal Label
                      </button>
                      <button
                        onClick={() => setSelectedOrderForInvoice(ord)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0054A6] font-bold text-xs flex items-center gap-1.5 border border-blue-200 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" /> Tax Invoice
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-8 space-y-2">
                      {ord.shipments[0]?.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex items-center gap-2.5">
                            <img src={it.imageUrl} alt={it.productTitle} className="w-10 h-10 object-contain rounded-xl bg-white border border-slate-200 p-1" />
                            <div>
                              <div className="font-bold text-slate-900">{it.productTitle}</div>
                              <div className="text-[10px] text-slate-500 font-mono">SKU: {it.sku} • HSN: {it.hsnCode} • Qty: {it.quantity}</div>
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-slate-900">
                            ₹{(it.unitPrice * it.quantity).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="md:col-span-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500 font-mono">
                        <span>APE Article AWB:</span>
                        <strong className="text-amber-700 font-mono font-bold">{ord.shipments[0]?.shippingDetail?.articleNumber || '—'}</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 font-mono">
                        <span>18% GST Amount:</span>
                        <span className="text-slate-800 font-mono">₹{ord.pricingSummary.totalTax.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                        <span>Grand Total:</span>
                        <span className="text-emerald-700 font-mono">₹{ord.pricingSummary.grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2.2: PENDING / ABANDONED CARTS */}
          {ordersViewMode === 'PENDING_CARTS' && (
            <div className="space-y-4">
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-4">Customer / Shopper</th>
                      <th className="p-4">Items in Cart</th>
                      <th className="p-4 text-center">Items Qty</th>
                      <th className="p-4 text-right">Potential Value</th>
                      <th className="p-4 text-center">Last Active</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Recovery Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingCarts.map((cartItem) => (
                      <tr key={cartItem.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{cartItem.shopperName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{cartItem.phone} • {cartItem.location}</div>
                        </td>

                        <td className="p-4">
                          <div className="text-slate-700 truncate max-w-xs">{cartItem.itemsSummary}</div>
                          <div className="text-[10px] text-slate-400">{cartItem.device}</div>
                        </td>

                        <td className="p-4 text-center font-mono font-bold text-amber-700">
                          {cartItem.itemCount} Units
                        </td>

                        <td className="p-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          ₹{cartItem.totalCartValue.toLocaleString('en-IN')}
                        </td>

                        <td className="p-4 text-center text-slate-500 font-mono text-[11px]">
                          {cartItem.lastActiveMinutesAgo} mins ago
                        </td>

                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            cartItem.status === 'CART_ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : cartItem.status === 'CHECKOUT_ABANDONED'
                              ? 'bg-rose-50 text-rose-800 border border-rose-300'
                              : 'bg-blue-50 text-[#0054A6] border border-blue-200'
                          }`}>
                            {cartItem.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              showToast(`WhatsApp reminder dispatched to ${cartItem.phone} with checkout link!`, 'success');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md"
                          >
                            <Send className="w-3.5 h-3.5" /> Send Reminder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 🚚 PILLAR 3: SHIPPING (UNSHIPPED, SHIPPED, SENT -> DELIVERED & PENDING) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeAdminTab === 'SHIPPING' && (
        <div className="space-y-6">
          {/* CEPT Live API Status & Contract Banner */}
          <div className="p-5 rounded-3xl bg-white/95 backdrop-blur-xl border border-blue-200 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6] font-bold shadow-sm">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm font-display">India Post CEPT Official API Gateway</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Active
                  </span>
                </div>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  Origin Hub: <strong className="text-amber-700">{ORIGIN_HUB_PINCODE}</strong> (Kathwada GIDC) • Contract ID: <strong className="text-[#0054A6]">{CEPT_CONFIG.contractId}</strong> • Bulk Customer ID: <strong className="text-[#0054A6]">{CEPT_CONFIG.customerId}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={isGeneratingBulkManifest || orders.length === 0}
                onClick={async () => {
                  setIsGeneratingBulkManifest(true);
                  const articles = orders.map((ord) => {
                    const barcode = ord.shipments[0]?.shippingDetail.articleNumber || `EM${Math.floor(10000000 + Math.random() * 90000000)}IN`;
                    return ceptIndiaPostService.buildCeptArticleItem(
                      ord.deliveryAddress,
                      ord.shipments[0]?.items || [],
                      barcode,
                      ord.orderType === 'B2B'
                    );
                  });

                  const res = await ceptIndiaPostService.processArticlesManifest(undefined, articles);
                  setIsGeneratingBulkManifest(false);
                  setBulkManifestResult({
                    ...res,
                    ordersCount: orders.length,
                    totalTariff: res.summary.total_tariff_amount,
                    generatedAt: new Date().toLocaleString()
                  });
                  setIsBulkManifestOpen(true);
                  showToast(`CEPT Bulk Manifest batch generated for ${orders.length} shipments!`, 'success');
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {isGeneratingBulkManifest ? 'Processing CEPT Batch...' : '📄 Generate CEPT Bulk Manifest'}
              </button>
            </div>
          </div>

          {/* Header Strip & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 font-display">APE Shipping & Dispatch Console</h2>
              <p className="text-xs text-slate-600">
                Manifest packages, print thermal barcodes, and monitor live transit from Kathwada Origin Hub ({ORIGIN_HUB_PINCODE}).
              </p>
            </div>

            {/* Shipping Kanban Filter Pills */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 text-xs font-bold shadow-sm">
              {[
                { id: 'ALL', label: 'All Shipments', count: orders.length },
                { id: 'UNSHIPPED', label: '🟡 Unshipped / Processing', count: unshippedCount },
                { id: 'SHIPPED', label: '🔵 Shipped / In Transit', count: shippedCount },
                { id: 'DELIVERED', label: '🟢 Sent & Delivered', count: deliveredCount },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setShippingFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    shippingFilter === pill.id
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>
          </div>

          {/* Shipping Manifest Table */}
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">APE Tracking AWB / Order</th>
                    <th className="p-4">Destination Hub</th>
                    <th className="p-4">Package Weight</th>
                    <th className="p-4">Tariff & Freight</th>
                    <th className="p-4 text-center">Dispatch Status</th>
                    <th className="p-4 text-right">Logistics Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {shippingConsoleOrders.map((ord) => {
                    const shp = ord.shipments[0];
                    const isUnshipped = shp?.status === 'CONFIRMED' || shp?.status === 'PROCESSING_PICK_PACK';
                    const isInTransit = shp?.status === 'IN_TRANSIT' || shp?.status === 'OUT_FOR_DELIVERY';
                    const isDelivered = shp?.status === 'DELIVERED';

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-mono font-bold text-amber-700 text-sm">
                            {shp?.shippingDetail?.articleNumber || '—'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">Order: {ord.orderNumber}</div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900">{ord.deliveryAddress.postOffice?.name || ord.deliveryAddress.city}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{ord.deliveryAddress.city}, {ord.deliveryAddress.state} ({ord.deliveryAddress.pincode})</div>
                        </td>

                        <td className="p-4 font-mono">
                          <div className="text-slate-900 font-bold">{shp?.shippingDetail?.weightGrams || 0}g</div>
                          <div className="text-[10px] text-slate-500">Volumetric: {shp?.shippingDetail?.chargeableWeightGrams || 0}g</div>
                        </td>

                        <td className="p-4 font-mono">
                          <div className="text-slate-900 font-bold">₹{shp?.shippingDetail?.totalPostage || 0}</div>
                          <div className="text-[10px] text-emerald-700 font-bold">18% GST Incl.</div>
                        </td>

                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : isInTransit
                              ? 'bg-blue-50 text-[#0054A6] border border-blue-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-300'
                          }`}>
                            {shp?.status}
                          </span>
                        </td>

                        <td className="p-4 text-right space-x-2">
                          {isUnshipped && (
                            <button
                              onClick={() => {
                                updateOrderStatus(ord.id, shp.packageId, 'IN_TRANSIT', 'Handed over to India Post Kathwada GIDC S.O. for sorting', 'Kathwada GIDC S.O.');
                                showToast(`Order ${ord.orderNumber} marked as DISPATCHED & IN_TRANSIT!`, 'success');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#0054A6] hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm"
                            >
                              <Truck className="w-3.5 h-3.5" /> Dispatch Package
                            </button>
                          )}

                          {isInTransit && (
                            <>
                              <button
                                onClick={() => {
                                  updateOrderStatus(ord.id, shp.packageId, 'IN_TRANSIT', 'Delivery Attempt 1 Unsuccessful - Customer Unavailable / Doorstep OTP Rescheduled for Next Slot', ord.deliveryAddress.postOffice?.name || ord.deliveryAddress.city);
                                  showToast(`Order ${ord.orderNumber}: Delivery attempt rescheduled.`, 'warning');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs inline-flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Attempt Failed
                              </button>
                              <button
                                onClick={() => {
                                  updateOrderStatus(ord.id, shp.packageId, 'DELIVERED', 'Delivered at recipient address via Doorstep OTP', ord.deliveryAddress.postOffice?.name || ord.deliveryAddress.city);
                                  showToast(`Order ${ord.orderNumber} marked as DELIVERED!`, 'success');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                              </button>
                            </>
                          )}

                          {isDelivered && (
                            <button
                              onClick={() => redispatchOrder(ord.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1 shadow-sm"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Re-Dispatch / New AWB
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrderForLabel(ord)}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-1 border border-slate-300 shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5" /> Label
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 📊 PILLAR 4: ANALYST REPORT & KPIS (GSTR-1, REVENUE, SPEED POST METRICS) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeAdminTab === 'REPORTS' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-black text-slate-900 font-display">Executive Analyst Reports & Business KPIs</h2>
            <p className="text-xs text-slate-600">
              Real-time revenue metrics, GSTR-1 18% tax breakdown, and India Post logistical performance.
            </p>
          </div>

          {/* 4 Core Financial KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 space-y-2 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Gross Merchandise Value (GMV)</span>
              <div className="text-2xl font-black text-amber-700 font-mono">₹{totalGMV.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +28.4% MoM Direct Factory Growth
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 space-y-2 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">18% GST Collected (GSTR-1)</span>
              <div className="text-2xl font-black text-[#0054A6] font-mono">₹{totalTax.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                CGST 9%: ₹{totalCGST} • SGST 9%: ₹{totalSGST}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 space-y-2 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Total Shipped Orders</span>
              <div className="text-2xl font-black text-emerald-700 font-mono">{orders.length} Orders</div>
              <div className="text-[11px] text-slate-500 font-mono">
                {deliveredCount} Delivered • {unshippedCount} In Queue
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 space-y-2 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Speed Post Delivery Success</span>
              <div className="text-2xl font-black text-purple-700 font-mono">98.6%</div>
              <div className="text-[11px] text-slate-500 font-mono">
                Avg. 2.4 Days from Kathwada (382430)
              </div>
            </div>
          </div>

          {/* GSTR-1 Tax Analysis Report Box with Smart Style Date Range & Multi-Table Statutory Views */}
          <div className="p-6 md:p-8 rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/90 space-y-6 shadow-xl">
            
            {/* 🌟 PROFESSIONAL WHITE BACKGROUND SMART DATE RANGE HERO BAR (From Date - To Date) */}
            <div className="p-6 md:p-7 rounded-3xl bg-slate-50/70 border border-slate-200/90 text-slate-900 shadow-sm space-y-6">
              
              {/* Top Banner Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-50 border border-blue-200 text-[#0054A6]">
                      ⚡ SMART STATUTORY FILTER
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                      GST Portal & E-Way Ready
                    </span>
                    <h3 className="font-bold text-slate-900 text-base md:text-lg font-display">
                      GSTR-1 Comprehensive Tax Audit Console
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-sans">
                    Apollo Engineering (Kathwada GIDC - 382430) • GSTIN: <span className="font-mono font-bold text-slate-800">24AABCS1429B1Z1</span> • State Code: 24-Gujarat
                  </p>
                </div>

                {/* Live Order & Revenue Counter Pill */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-slate-200 font-mono text-xs shadow-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{gstr1PeriodOrders.length} Invoices</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="text-slate-900 font-black">
                    ₹{gstr1HsnData.summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Controls Row: From Date -> To Date -> Smart Presets */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                
                {/* From Date (તારીખથી) */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0054A6]" />
                    <span>From Date (તારીખથી)</span>
                  </label>
                  <input
                    type="date"
                    value={gstr1FromDate}
                    onChange={(e) => {
                      setGstr1FromDate(e.target.value);
                      setGstr1DatePreset('CUSTOM');
                    }}
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-[#0054A6] focus:ring-2 focus:ring-[#0054A6]/15 focus:outline-none transition-all"
                  />
                </div>

                {/* Arrow Connector Indicator */}
                <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center pb-3 text-slate-400 font-bold text-base">
                  ➔
                </div>

                {/* To Date (તારીખ સુધી) */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>To Date (તારીખ સુધી)</span>
                  </label>
                  <input
                    type="date"
                    value={gstr1ToDate}
                    onChange={(e) => {
                      setGstr1ToDate(e.target.value);
                      setGstr1DatePreset('CUSTOM');
                    }}
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-mono font-bold text-slate-900 shadow-xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none transition-all"
                  />
                </div>

                {/* Quick Smart Presets (આજે, આ મહિને, ગયા મહિને, નાણાકીય વર્ષ) */}
                <div className="md:col-span-5 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    ઝડપી સમયગાળો (Smart Presets)
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('TODAY')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        gstr1DatePreset === 'TODAY'
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25 font-black'
                          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      ⚡ આજે (Today)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('THIS_MONTH')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        gstr1DatePreset === 'THIS_MONTH'
                          ? 'bg-[#0054A6] text-white shadow-sm shadow-[#0054A6]/25 font-black'
                          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      📆 આ મહિને (This Month)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('LAST_MONTH')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        gstr1DatePreset === 'LAST_MONTH'
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25 font-black'
                          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      ⏪ ગયા મહિને (Last Month)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('FY')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        gstr1DatePreset === 'FY'
                          ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/25 font-black'
                          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      📊 FY 26-27
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('ALL')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        gstr1DatePreset === 'CUSTOM'
                          ? 'bg-slate-900 text-white font-black'
                          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      🌐 બધા (All)
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row - 100% Professional Style White Theme with Explicit Sheet Names */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-200/80">
                {/* Primary Multi-Sheet Excel Export Button (All 18 Sheets: b2b, b2cl, b2cs, hsn, docs, all_orders, all_details, shipping, tax...) */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadMultiSheetExcel}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2.5 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:scale-[1.01] transition-all border border-emerald-500/40"
                    title="Download GSTR-1 Complete Multi-Sheet Excel Workbook with all 18 sheets: b2b, b2c, b2cs, b2cl, hsn, docs, all_orders, all_details, shipping_logistics, tax_summary, cdnr, cdnur, exp, at, atadj, exemp, eco"
                  >
                    <Download className="w-4 h-4 text-emerald-100" />
                    <span>📊 Download Full GSTR-1 Excel (All Sheets: b2b, b2cl, b2cs, hsn, docs, all_orders, all_details, shipping, tax...)</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-800/70 text-emerald-100 text-[10px] font-mono border border-emerald-400/40">
                      .XLSX 18-Sheets Full
                    </span>
                  </button>

                  {/* All Orders Master Excel Export Button */}
                  <button
                    type="button"
                    onClick={handleDownloadAllOrdersExcel}
                    className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-2 border border-slate-300 hover:border-slate-400 shadow-xs hover:shadow-sm hover:scale-[1.01] transition-all"
                    title="Download All Orders Master Ledger Excel with sheet name 'all_orders'"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>📋 All Orders Master</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-mono border border-blue-200">
                      sheet: all_orders
                    </span>
                  </button>

                  {/* All Details / Deep Audit Excel Export Button */}
                  <button
                    type="button"
                    onClick={handleDownloadAllDetailsExcel}
                    className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-2 border border-slate-300 hover:border-slate-400 shadow-xs hover:shadow-sm hover:scale-[1.01] transition-all"
                    title="Download All Details Line-Item Audit Log Excel with sheet name 'all_details'"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>📑 All Details Excel</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-mono border border-emerald-200">
                      sheet: all_details
                    </span>
                  </button>
                </div>

                {/* Individual Excel Sheet Exports & Print */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadShippingLogisticsExcel}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                    title="Download Speed Post Shipping Logistics Register Excel with sheet name 'shipping_logistics'"
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>🚚 Shipping Logistics</span>
                    <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-mono border border-amber-200">
                      sheet: shipping_logistics
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTaxSummaryExcel}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                    title="Download Statutory Tax Summary Excel with sheet name 'tax_summary'"
                  >
                    <Landmark className="w-3.5 h-3.5 text-teal-600" />
                    <span>🏛️ Tax Summary</span>
                    <span className="px-1 py-0.5 rounded bg-teal-50 text-teal-800 text-[9px] font-mono border border-teal-200">
                      sheet: tax_summary
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadHsn12Excel}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                    title="Download Table 12 HSN Summary Excel with sheet name 'hsn'"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>📦 HSN(12) Excel</span>
                    <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-800 text-[9px] font-mono border border-blue-200">
                      sheet: hsn
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadB2bExcel}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                    title="Download GSTR-1 Table 4 B2B Invoices Excel with sheet name 'b2b'"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>🏢 B2B Invoices Excel</span>
                    <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-mono border border-amber-200">
                      sheet: b2b
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadB2cExcel}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                    title="Download GSTR-1 Table 7 B2C Supplies Excel with sheet name 'b2c'"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-purple-600" />
                    <span>🛒 B2C Supplies Excel</span>
                    <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-800 text-[9px] font-mono border border-purple-200">
                      sheet: b2c
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDocIssueExcel}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                    title="Download Table 13 Documents Issued Excel with sheet name 'docs'"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                    <span>📋 Docs Issued Excel</span>
                    <span className="px-1 py-0.5 rounded bg-teal-50 text-teal-800 text-[9px] font-mono border border-teal-200">
                      sheet: docs
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      showToast(`Preparing GSTR-1 statement (${gstr1FromDate} to ${gstr1ToDate}) for print`, 'info');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 shadow-xs transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 📊 Statutory Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">No. of HSN</span>
                <div className="font-mono font-black text-slate-900 text-lg">
                  {gstr1HsnData.summary.noOfHsn} Categories
                </div>
                <div className="text-[10px] text-slate-500">Products Active</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Total Value</span>
                <div className="font-mono font-black text-amber-700 text-lg">
                  ₹{gstr1HsnData.summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500">Gross Outward</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Total Taxable Value</span>
                <div className="font-mono font-black text-slate-900 text-lg">
                  ₹{gstr1HsnData.summary.totalTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500">Net Assessable Base</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Central Tax (CGST 9%)</span>
                <div className="font-mono font-black text-[#0054A6] text-lg">
                  ₹{gstr1HsnData.summary.totalCentralTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500">Intra-state (24-GJ)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">State Tax (SGST 9%)</span>
                <div className="font-mono font-black text-[#0054A6] text-lg">
                  ₹{gstr1HsnData.summary.totalStateUtTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500">Intra-state (24-GJ)</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Integrated Tax (IGST)</span>
                <div className="font-mono font-black text-purple-700 text-lg">
                  ₹{gstr1HsnData.summary.totalIntegratedTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500">Inter-state Outward</div>
              </div>
            </div>

            {/* 🧭 Multi-Section Sub-Tabs (HSN 12, Table 4 B2B, Table 7 B2C, Line Items) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setGstr1ActiveTab('HSN_12')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    gstr1ActiveTab === 'HSN_12'
                      ? 'bg-white text-slate-950 shadow-sm border border-slate-200 font-black'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <span>📦 Table 12: HSN Summary</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-[#0054A6] text-[10px] font-mono">
                    {gstr1HsnData.rows.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGstr1ActiveTab('TABLE_4_B2B')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    gstr1ActiveTab === 'TABLE_4_B2B'
                      ? 'bg-white text-slate-950 shadow-sm border border-slate-200 font-black'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <span>🏢 Table 4: B2B Invoices</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono">
                    {gstr1B2bRows.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGstr1ActiveTab('TABLE_7_B2C')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    gstr1ActiveTab === 'TABLE_7_B2C'
                      ? 'bg-white text-slate-950 shadow-sm border border-slate-200 font-black'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <span>🛒 Table 7: B2C Supplies</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono">
                    {gstr1B2cRows.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGstr1ActiveTab('LINE_ITEMS')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    gstr1ActiveTab === 'LINE_ITEMS'
                      ? 'bg-white text-slate-950 shadow-sm border border-slate-200 font-black'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <span>📑 Deep Line-Item Audit</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                    {gstr1PeriodOrders.length}
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Showing data for: <strong className="text-slate-800">{gstr1FromDate}</strong> to <strong className="text-slate-800">{gstr1ToDate}</strong>
              </div>
            </div>

            {/* 📋 VIEW 1: TABLE 12 - HSN SUMMARY (Official 14-Column Government Format) */}
            {gstr1ActiveTab === 'HSN_12' && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs animate-fadeIn">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Summary For HSN(12) — Statutory Outward Supplies Table
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Standard 14-Column Government Portal Offline Format
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                        <th className="p-3 font-bold">HSN</th>
                        <th className="p-3 font-bold">Description</th>
                        <th className="p-3 font-bold">UQC</th>
                        <th className="p-3 font-bold text-right">Total Quantity</th>
                        <th className="p-3 font-bold text-right">Total Value</th>
                        <th className="p-3 font-bold text-center">Rate %</th>
                        <th className="p-3 font-bold text-right">Taxable Value</th>
                        <th className="p-3 font-bold text-right text-purple-700">Integrated Tax</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">Central Tax</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">State/UT Tax</th>
                        <th className="p-3 font-bold text-center">Cess</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {gstr1HsnData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-black text-slate-900">
                            {row.hsn || <span className="text-slate-400 font-normal italic">—</span>}
                          </td>
                          <td className="p-3 font-sans text-slate-700">
                            {row.hsn === '7326' && 'SS304 Solar Drain Water Clips & Fasteners'}
                            {row.hsn === '8424' && 'SS304 Solar Cleaning Sprinklers & Nozzles'}
                            {row.hsn === '7216' && 'Stainless Steel Sections & Channels'}
                            {row.hsn === '3917' && 'Industrial Plumbing UPVC Pipes'}
                            {row.hsn === '8481' && 'UPVC Tees & Quick Couplers'}
                            {!row.hsn && <span className="text-slate-500 italic">Logistics Freight / Speed Post</span>}
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              row.uqc.includes('NA') 
                                ? 'bg-slate-100 text-slate-600' 
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}>
                              {row.uqc}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {row.totalQuantity.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            ₹{row.totalValue.toFixed(2)}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {row.rate}%
                          </td>
                          <td className="p-3 text-right text-slate-800">
                            ₹{row.taxableValue.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-bold text-purple-700">
                            ₹{row.integratedTaxAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-bold text-[#0054A6]">
                            ₹{row.centralTaxAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-bold text-[#0054A6]">
                            ₹{row.stateUtTaxAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            {row.cessAmount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-[11px]">
                        <td colSpan={3} className="p-3 text-slate-700 font-sans font-black">
                          TOTALS ({gstr1HsnData.summary.noOfHsn} HSN CATEGORIES)
                        </td>
                        <td className="p-3 text-right">
                          {gstr1HsnData.rows.reduce((acc, r) => acc + r.totalQuantity, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-amber-700 font-black">
                          ₹{gstr1HsnData.summary.totalValue.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">—</td>
                        <td className="p-3 text-right">
                          ₹{gstr1HsnData.summary.totalTaxableValue.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-purple-700 font-black">
                          ₹{gstr1HsnData.summary.totalIntegratedTax.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-[#0054A6] font-black">
                          ₹{gstr1HsnData.summary.totalCentralTax.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-[#0054A6] font-black">
                          ₹{gstr1HsnData.summary.totalStateUtTax.toFixed(2)}
                        </td>
                        <td className="p-3 text-center text-slate-400">0</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 🏢 VIEW 2: TABLE 4 - B2B INVOICES */}
            {gstr1ActiveTab === 'TABLE_4_B2B' && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs animate-fadeIn">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Table 4: Taxable Outward Supplies to Registered Persons (B2B)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {gstr1B2bRows.length} Registered GSTIN Invoices
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                        <th className="p-3 font-bold">GSTIN/UIN</th>
                        <th className="p-3 font-bold">Receiver Legal Name</th>
                        <th className="p-3 font-bold">Invoice Number</th>
                        <th className="p-3 font-bold">Date</th>
                        <th className="p-3 font-bold text-right">Invoice Value</th>
                        <th className="p-3 font-bold text-center">POS</th>
                        <th className="p-3 font-bold text-center">Reverse Charge</th>
                        <th className="p-3 font-bold text-center">Rate</th>
                        <th className="p-3 font-bold text-right">Taxable Value</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">CGST</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">SGST</th>
                        <th className="p-3 font-bold text-right text-purple-700">IGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {gstr1B2bRows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-400 font-sans">
                            No B2B registered orders found in selected date range. Click "Download Full GSTR-1 Excel" to export statutory sample or change dates.
                          </td>
                        </tr>
                      ) : (
                        gstr1B2bRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-blue-700">{row.gstin}</td>
                            <td className="p-3 font-sans text-slate-800 font-semibold">{row.receiverName}</td>
                            <td className="p-3 font-bold text-slate-900">{row.invoiceNumber}</td>
                            <td className="p-3 text-slate-600">{row.invoiceDate}</td>
                            <td className="p-3 text-right font-black text-slate-900">₹{row.invoiceValue.toFixed(2)}</td>
                            <td className="p-3 text-center font-bold text-slate-700">{row.placeOfSupply}</td>
                            <td className="p-3 text-center text-slate-500">{row.reverseCharge}</td>
                            <td className="p-3 text-center text-slate-700">{row.rate}</td>
                            <td className="p-3 text-right text-slate-800">₹{row.taxableValue.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-[#0054A6]">₹{row.cgst.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-[#0054A6]">₹{row.sgst.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-purple-700">₹{row.igst.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {gstr1B2bRows.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-[11px]">
                          <td colSpan={4} className="p-3 font-sans font-black">
                            B2B TOTALS ({gstr1B2bRows.length} INVOICES)
                          </td>
                          <td className="p-3 text-right text-amber-700 font-black">
                            ₹{gstr1B2bRows.reduce((acc, r) => acc + r.invoiceValue, 0).toFixed(2)}
                          </td>
                          <td colSpan={3} className="p-3 text-center">—</td>
                          <td className="p-3 text-right">
                            ₹{gstr1B2bRows.reduce((acc, r) => acc + r.taxableValue, 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-[#0054A6] font-black">
                            ₹{gstr1B2bRows.reduce((acc, r) => acc + r.cgst, 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-[#0054A6] font-black">
                            ₹{gstr1B2bRows.reduce((acc, r) => acc + r.sgst, 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-purple-700 font-black">
                            ₹{gstr1B2bRows.reduce((acc, r) => acc + r.igst, 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 🛒 VIEW 3: TABLE 7 - B2C SUPPLIES */}
            {gstr1ActiveTab === 'TABLE_7_B2C' && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs animate-fadeIn">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Table 7: Taxable Outward Supplies to Unregistered Persons (B2C Others)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    State-wise Consolidated Outward Supplies
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                        <th className="p-3 font-bold">Supply Type</th>
                        <th className="p-3 font-bold">Place of Supply (POS)</th>
                        <th className="p-3 font-bold text-center">Applicable %</th>
                        <th className="p-3 font-bold text-center">Rate</th>
                        <th className="p-3 font-bold text-right">Taxable Value</th>
                        <th className="p-3 font-bold text-right text-purple-700">Integrated Tax (IGST)</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">Central Tax (CGST)</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">State/UT Tax (SGST)</th>
                        <th className="p-3 font-bold text-center">Cess</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {gstr1B2cRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-purple-700">{row.type}</td>
                          <td className="p-3 font-bold text-slate-900">{row.placeOfSupply}</td>
                          <td className="p-3 text-center text-slate-600">{row.applicableRatePercent}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{row.rate}</td>
                          <td className="p-3 text-right font-bold text-slate-900">₹{row.taxableValue.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-purple-700">₹{row.integratedTax.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-[#0054A6]">₹{row.centralTax.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-[#0054A6]">₹{row.stateUtTax.toFixed(2)}</td>
                          <td className="p-3 text-center text-slate-400">0.00</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-[11px]">
                        <td colSpan={4} className="p-3 font-sans font-black">
                          B2C TOTALS ({gstr1B2cRows.length} STATES)
                        </td>
                        <td className="p-3 text-right font-black text-amber-700">
                          ₹{gstr1B2cRows.reduce((acc, r) => acc + r.taxableValue, 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-purple-700 font-black">
                          ₹{gstr1B2cRows.reduce((acc, r) => acc + r.integratedTax, 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-[#0054A6] font-black">
                          ₹{gstr1B2cRows.reduce((acc, r) => acc + r.centralTax, 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-[#0054A6] font-black">
                          ₹{gstr1B2cRows.reduce((acc, r) => acc + r.stateUtTax, 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center text-slate-400">0.00</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 📑 VIEW 4: DEEP LINE-ITEM LEVEL AUDIT LOG */}
            {gstr1ActiveTab === 'LINE_ITEMS' && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs animate-fadeIn">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Deep Line-Item Level Tax & Shipment Audit Breakdown
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    All Individual Product SKUs, Quantities, HSN, Tax Base & Postage
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                        <th className="p-3 font-bold">Invoice / Order</th>
                        <th className="p-3 font-bold">Customer & State</th>
                        <th className="p-3 font-bold">GSTIN / Type</th>
                        <th className="p-3 font-bold">HSN Code</th>
                        <th className="p-3 font-bold">Product Item</th>
                        <th className="p-3 font-bold text-right">Qty</th>
                        <th className="p-3 font-bold text-right">Unit Price</th>
                        <th className="p-3 font-bold text-right">Taxable Base</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">CGST</th>
                        <th className="p-3 font-bold text-right text-[#0054A6]">SGST</th>
                        <th className="p-3 font-bold text-right text-purple-700">IGST</th>
                        <th className="p-3 font-bold text-right">Postage</th>
                        <th className="p-3 font-bold text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {gstr1PeriodOrders.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="p-8 text-center text-slate-400 font-sans">
                            No orders found for the chosen date range ({gstr1FromDate} to {gstr1ToDate}).
                          </td>
                        </tr>
                      ) : (
                        gstr1PeriodOrders.map((ord) => {
                          const invNo = ord.invoiceNumber || ord.orderNumber || ord.id;
                          const custName = ord.customerName || ord.deliveryAddress?.fullName || 'Customer';
                          const custGstin = ord.deliveryAddress?.gstin || ord.gstin || 'UNREGISTERED';
                          const state = ord.deliveryAddress?.state || 'Gujarat';
                          const isGujarat = state.toLowerCase().includes('gujarat');
                          const items = ord.shipments?.flatMap(s => s.items) || [];
                          const grandTotal = ord.pricingSummary?.grandTotal || 0;
                          const shippingTotal = ord.pricingSummary?.shippingTotal || 0;

                          if (items.length === 0) {
                            return (
                              <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-bold text-slate-900">{invNo}</td>
                                <td className="p-3 font-sans text-slate-700">{custName} ({state})</td>
                                <td className="p-3 text-slate-500">{custGstin}</td>
                                <td className="p-3 font-bold text-slate-900">7326</td>
                                <td className="p-3 font-sans text-slate-600">Solar Hardware</td>
                                <td className="p-3 text-right">1</td>
                                <td className="p-3 text-right">₹{grandTotal.toFixed(2)}</td>
                                <td className="p-3 text-right">₹{(grandTotal / 1.18).toFixed(2)}</td>
                                <td className="p-3 text-right text-[#0054A6]">₹{isGujarat ? ((grandTotal - (grandTotal / 1.18)) / 2).toFixed(2) : '0.00'}</td>
                                <td className="p-3 text-right text-[#0054A6]">₹{isGujarat ? ((grandTotal - (grandTotal / 1.18)) / 2).toFixed(2) : '0.00'}</td>
                                <td className="p-3 text-right text-purple-700">₹{!isGujarat ? (grandTotal - (grandTotal / 1.18)).toFixed(2) : '0.00'}</td>
                                <td className="p-3 text-right text-slate-500">₹{shippingTotal.toFixed(2)}</td>
                                <td className="p-3 text-right font-black text-slate-900">₹{grandTotal.toFixed(2)}</td>
                              </tr>
                            );
                          }

                          return items.map((item, itemIdx) => {
                            const rawHsn = (item.hsnCode || '').slice(0, 4) || '7326';
                            const lineGross = item.unitPrice * item.quantity;
                            const ratePct = item.gstRate ? (item.gstRate > 1 ? Math.round(item.gstRate) : Math.round(item.gstRate * 100)) : 18;
                            const lineTaxable = lineGross / (1 + (ratePct / 100));
                            const lineTax = lineGross - lineTaxable;
                            const cgst = isGujarat ? lineTax / 2 : 0;
                            const sgst = isGujarat ? lineTax / 2 : 0;
                            const igst = !isGujarat ? lineTax : 0;

                            return (
                              <tr key={`${ord.id}_${itemIdx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-bold text-slate-900">
                                  {itemIdx === 0 ? invNo : <span className="text-slate-300 font-normal">↳ item</span>}
                                </td>
                                <td className="p-3 font-sans text-slate-700">
                                  {itemIdx === 0 ? `${custName} (${state})` : ''}
                                </td>
                                <td className="p-3 text-[10px]">
                                  {itemIdx === 0 ? (
                                    <span className={custGstin !== 'UNREGISTERED' ? 'font-bold text-blue-700' : 'text-slate-400'}>
                                      {custGstin}
                                    </span>
                                  ) : ''}
                                </td>
                                <td className="p-3 font-bold text-slate-900">{rawHsn}</td>
                                <td className="p-3 font-sans text-slate-700 font-medium">
                                  {item.productTitle || item.variantTitle}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900">{item.quantity}</td>
                                <td className="p-3 text-right text-slate-700">₹{item.unitPrice.toFixed(2)}</td>
                                <td className="p-3 text-right text-slate-800">₹{lineTaxable.toFixed(2)}</td>
                                <td className="p-3 text-right text-[#0054A6]">₹{cgst.toFixed(2)}</td>
                                <td className="p-3 text-right text-[#0054A6]">₹{sgst.toFixed(2)}</td>
                                <td className="p-3 text-right text-purple-700">₹{igst.toFixed(2)}</td>
                                <td className="p-3 text-right text-slate-500">
                                  {itemIdx === 0 ? `₹${shippingTotal.toFixed(2)}` : '—'}
                                </td>
                                <td className="p-3 text-right font-black text-slate-900">
                                  {itemIdx === 0 ? `₹${grandTotal.toFixed(2)}` : `₹${lineGross.toFixed(2)}`}
                                </td>
                              </tr>
                            );
                          });
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 🗑️ MODAL: DELETE PRODUCT CONFIRMATION */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {productToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl text-center text-slate-900">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 font-display">Delete Product from Catalog?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">"{productToDelete.title}"</strong> (ASIN: {productToDelete.asin})? This will remove it from the live store catalog immediately.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ➕ MODAL: ADD NEW ASIN / PRODUCT */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {isAddingNewAsin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold">New ASIN Creation</span>
                <h3 className="text-lg font-black text-slate-900 font-display">Publish New Product to Apollo Catalog</h3>
              </div>
              <button onClick={() => setIsAddingNewAsin(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SS304 Solar Panel Sprinkler (180° Degree Uniform)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 text-xs font-medium shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 text-xs shadow-inner"
                  >
                    <option value="SS304 GRADE">SS304 GRADE</option>
                    <option value="GI SERIES">GI SERIES</option>
                    <option value="POLYMER FIT">POLYMER FIT</option>
                    <option value="AUTOMATION">AUTOMATION</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Custom SKU (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AP-SPRINKLER-04"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-amber-500 text-xs shadow-inner"
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] text-amber-700 uppercase font-mono font-bold block">
                  Dual B2C & B2B Pricing Setup
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px]">B2C Selling Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs font-bold shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-500 text-[10px]">MRP (₹) *</label>
                    <input
                      type="number"
                      required
                      value={newMrp}
                      onChange={(e) => setNewMrp(Number(e.target.value))}
                      className="w-full h-9 px-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-mono text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-emerald-700 text-[10px] font-bold">B2B Tier Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={newB2bPrice}
                      onChange={(e) => setNewB2bPrice(Number(e.target.value))}
                      className="w-full h-9 px-2 bg-white border border-emerald-300 rounded-lg text-emerald-700 font-mono text-xs font-bold shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Stock & Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Initial Stock Count *
                  </label>
                  <input
                    type="number"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-amber-700 font-mono font-bold focus:outline-none focus:border-amber-500 text-xs shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    Image Path / URL
                  </label>
                  <input
                    type="text"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-mono focus:outline-none focus:border-amber-500 text-xs shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter high precision manufacturing specs..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 text-xs shadow-inner"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingNewAsin(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Publish Product Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 🖨️ MODALS FOR SHIPPING LABELS & GST INVOICES */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {selectedOrderForLabel && (
        <ThermalShippingLabel 
          order={selectedOrderForLabel} 
          onClose={() => setSelectedOrderForLabel(null)} 
        />
      )}

      {selectedOrderForInvoice && (
        <GstInvoice 
          order={selectedOrderForInvoice} 
          onClose={() => setSelectedOrderForInvoice(null)} 
        />
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 📄 CEPT INDIA POST BULK DISPATCH MANIFEST MODAL */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {isBulkManifestOpen && bulkManifestResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-xs text-slate-900">
            {/* Manifest Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0054A6] font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base font-display">CEPT India Post Bulk Booking Manifest</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold">
                      Batch Processed
                    </span>
                  </div>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Batch ID: <strong className="text-amber-700">{bulkManifestResult.batch_id}</strong> • Correlation: <strong className="text-[#0054A6]">{bulkManifestResult.correlation_id}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBulkManifestOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Manifest Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Sender Hub:</span>
                  <strong className="text-slate-900">Apollo Kathwada ({ORIGIN_HUB_PINCODE})</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Bulk Customer ID:</span>
                  <strong className="text-[#0054A6]">{bulkManifestResult.custom_id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Articles:</span>
                  <strong className="text-amber-700">{bulkManifestResult.total} Packages</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total APE Shipping Postage:</span>
                  <strong className="text-emerald-700">₹{bulkManifestResult.totalTariff || (bulkManifestResult.total * 45)}</strong>
                </div>
              </div>

              {/* Manifest Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">APE Tracking AWB</th>
                      <th className="p-3">Destination Hub & Circle</th>
                      <th className="p-3 text-center">Article Type</th>
                      <th className="p-3 text-right">Tariff Amount</th>
                      <th className="p-3 text-center">CEPT Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {orders.map((ord, idx) => {
                      const shp = ord.shipments[0];
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-amber-700">
                            {shp?.shippingDetail.articleNumber}
                          </td>
                          <td className="p-3">
                            <span className="text-slate-900 block font-sans font-medium">{ord.deliveryAddress.fullName}</span>
                            <span className="text-[10px] text-slate-500">{ord.deliveryAddress.postOffice.name} ({ord.deliveryAddress.pincode})</span>
                          </td>
                          <td className="p-3 text-center text-slate-600">
                            SP_PARCEL ({shp?.shippingDetail.weightGrams || 250}g)
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700">
                            ₹{shp?.shippingDetail.totalPostage || 45}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                              VALID_MANIFESTED
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manifest Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-slate-500 text-[11px] font-mono">
                Official APE Mail & Logistics Booking Protocol • Certified for Priority Dispatch
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 border border-slate-300 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Manifest
                </button>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bulkManifestResult, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `CEPT_Manifest_${bulkManifestResult.batch_id}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast('CEPT JSON manifest exported successfully!', 'success');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export CEPT JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 🔄 PILLAR 4: RETURNS & REFUNDS MANAGEMENT */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeAdminTab === 'RETURNS' && (
        <ReturnsManagementPanel />
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 🚀 APE PRODUCT LISTING MULTI-TAB VARIATION WIZARD */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {productForWizard !== null && (
        <ApeProductListingWizard
          initialProduct={productForWizard === 'NEW' ? null : productForWizard}
          onClose={() => setProductForWizard(null)}
          onSaved={() => {
            setProductForWizard(null);
          }}
        />
      )}



      {/* Combo Variant Builder Modal */}
      {isComboBuilderOpen && (
        <ComboVariantBuilderModal
          isOpen={isComboBuilderOpen}
          onClose={() => {
            setIsComboBuilderOpen(false);
            setComboBuilderProduct(null);
          }}
          targetProduct={comboBuilderProduct}
        />
      )}

      {/* 🔑 Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 font-display">Change Admin Password</h3>
                  <p className="text-[11px] text-slate-500 font-mono">admin@apolloengineering.co.in</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changePwError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{changePwError}</span>
              </div>
            )}

            {changePwSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{changePwSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={changePwCurrent}
                  onChange={(e) => setChangePwCurrent(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={changePwNew}
                  onChange={(e) => setChangePwNew(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={changePwConfirm}
                  onChange={(e) => setChangePwConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
