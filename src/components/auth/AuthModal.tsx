import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Phone, ShieldCheck, Building2, 
  CheckCircle2, Lock, ArrowRight, MapPin, 
  CheckSquare, Square, ChevronDown, Clock, AlertCircle, 
  FileText, RefreshCw, MessageCircle, ArrowLeft, Truck
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UserRole, PostOfficeInfo, UserProfile, AppMode, DeliveryAddress } from '../../types';
import { lookupPincode, ORIGIN_HUB_PINCODE } from '../../services/logisticsService';
import { msg91OtpService } from '../../services/msg91OtpService';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, setIsAuthModalOpen, 
    allUsers, setCurrentUser, setAppMode, addAddress, showToast, setActiveTab 
  } = useStore();

  // Screen modes: 'SIGNIN' (default) vs 'SIGNUP'
  const [authMode, setAuthMode] = useState<'SIGNIN' | 'SIGNUP'>('SIGNIN');

  // Customer Sign In State
  const [mobileNumber, setMobileNumber] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification State (4-Digit)
  const [otpStep, setOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [attempts, setAttempts] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Policy Modals View
  const [activePolicyModal, setActivePolicyModal] = useState<'terms' | 'privacy' | null>(null);

  // Registration Form State (Sign Up)
  const [accountType, setAccountType] = useState<'B2C' | 'B2B'>('B2C');
  const [fullName, setFullName] = useState('');
  const [signupMobile, setSignupMobile] = useState('');
  const [emailId, setEmailId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');

  // Address State for Sign Up
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [pincode, setPincode] = useState('382430');
  const [availablePostOffices, setAvailablePostOffices] = useState<PostOfficeInfo[]>([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState<PostOfficeInfo | null>(null);
  const [city, setCity] = useState('Ahmedabad');
  const [state, setState] = useState('Gujarat');
  const [stateCode, setStateCode] = useState('24');
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);

  // Mandatory Policies Checkboxes for Sign Up
  const [acceptWarranty, setAcceptWarranty] = useState(true);
  const [acceptReturnPolicy, setAcceptReturnPolicy] = useState(true);
  const [acceptCancelPolicy, setAcceptCancelPolicy] = useState(true);
  const [acceptDeliveryTimeline, setAcceptDeliveryTimeline] = useState(true);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePolicyModal) {
          setActivePolicyModal(null);
        } else {
          setIsAuthModalOpen(false);
        }
      }
    };
    if (isAuthModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, setIsAuthModalOpen, activePolicyModal]);

  // Focus the first OTP box when entering OTP verification step
  useEffect(() => {
    if (otpStep) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [otpStep]);

  // 30-Second Active OTP Resend Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (otpStep && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpStep, countdown]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Automatic India Post Pincode Lookup for Signup
  useEffect(() => {
    if (authMode === 'SIGNUP' && pincode.trim().length === 6) {
      handlePincodeLookup(pincode.trim());
    }
  }, [pincode, authMode]);

  const handlePincodeLookup = async (pin: string) => {
    setIsLoadingPincode(true);
    try {
      const res = await lookupPincode(pin);
      if (!isMountedRef.current) return;
      setIsLoadingPincode(false);

      if (res && res.postOffices.length > 0) {
        setAvailablePostOffices(res.postOffices);
        setSelectedPostOffice(res.postOffices[0]);
        setCity(res.district);
        setState(res.state);
        setStateCode(res.stateCode);
      } else {
        setAvailablePostOffices([]);
        setSelectedPostOffice(null);
      }
    } catch {
      if (isMountedRef.current) {
        setIsLoadingPincode(false);
      }
    }
  };

  if (!isAuthModalOpen) return null;

  // Active target phone depending on auth mode
  const activePhoneDigits = authMode === 'SIGNUP' ? signupMobile : mobileNumber;
  const isMobileValid = activePhoneDigits.length === 10;

  // Mask phone for customer security: +91 XXXXXXX123
  const getMaskedPhone = (num: string) => {
    if (num.length >= 10) {
      return `+91 XXXXXXX${num.slice(-3)}`;
    }
    return `+91 ${num}`;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Send OTP (Sign In)
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendSignInOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMobileValid) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      showToast('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    if (attempts >= 5) {
      setErrorMessage('Too many attempts. Please try again later.');
      showToast('Too many attempts. Please try again later.', 'error');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobileNumber }),
      });
      const data = await res.json();
      setIsSendingOtp(false);

      if (res.ok && data.success) {
        setOtpStep(true);
        setCountdown(30);
        setOtpDigits(['', '', '', '']);
        showToast('Secure 4-digit OTP dispatched to your mobile number.', 'info');
      } else {
        const msg = data.detail || data.message || 'We couldn’t send the OTP. Please try again.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      }
    } catch {
      setIsSendingOtp(false);
      setErrorMessage('We couldn’t send the OTP. Please check your connection.');
      showToast('We couldn’t send the OTP. Please check your connection.', 'error');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Send OTP (Sign Up Registration)
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendSignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMobileValid) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      showToast('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    if (!acceptWarranty || !acceptReturnPolicy || !acceptCancelPolicy || !acceptDeliveryTimeline) {
      setErrorMessage('Please accept all mandatory Terms & Conditions to proceed.');
      showToast('Please accept all mandatory Terms & Conditions to proceed.', 'warning');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: signupMobile }),
      });
      const data = await res.json();
      setIsSendingOtp(false);

      if (res.ok && data.success) {
        setOtpStep(true);
        setCountdown(30);
        setOtpDigits(['', '', '', '']);
        showToast('Secure 4-digit OTP dispatched to your mobile number.', 'info');
      } else {
        const msg = data.detail || data.message || 'We couldn’t send the OTP. Please try again.';
        setErrorMessage(msg);
        showToast(msg, 'error');
      }
    } catch {
      setIsSendingOtp(false);
      setErrorMessage('We couldn’t send the OTP. Please check your connection.');
      showToast('We couldn’t send the OTP. Please check your connection.', 'error');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Resend OTP (30s Countdown)
  // ──────────────────────────────────────────────────────────────────────────
  const handleRetryOtp = async (_channel?: string) => {
    if (countdown > 0) return;
    const targetPhone = authMode === 'SIGNUP' ? signupMobile : mobileNumber;
    try {
      const res = await fetch('/api/v1/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCountdown(30);
        setErrorMessage(null);
        showToast('New 4-digit OTP sent to your mobile', 'info');
      } else {
        setErrorMessage(data.detail || data.message || 'Failed to resend OTP.');
      }
    } catch {
      setErrorMessage('Failed to resend OTP.');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Verify 4-Digit OTP & Complete Backend Session Login
  // ──────────────────────────────────────────────────────────────────────────
  const triggerVerifyOtp = async (enteredCode: string) => {
    const targetPhone = authMode === 'SIGNUP' ? signupMobile : mobileNumber;
    setErrorMessage(null);

    if (enteredCode.length !== 4) {
      setErrorMessage('Please enter the complete 4-digit OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    setAttempts((prev) => prev + 1);

    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: targetPhone, otp: enteredCode }),
      });

      const result = await res.json();
      setIsVerifyingOtp(false);

      if (!res.ok || !result.is_verified) {
        const msg = result.detail || result.message || 'Incorrect OTP. Please check and enter again.';
        setErrorMessage(msg);
        showToast(msg, 'error');
        return;
      }

      // Backend session verified!
      const user = result.user;
      const role: UserRole = user?.role === 'ADMIN' ? 'SUPER_ADMIN' : 'B2C_CUSTOMER';
      const authenticatedUser: UserProfile = {
        id: user?.id || `usr_${Date.now()}`,
        name: user?.full_name || fullName || (targetPhone ? `Customer (${targetPhone.slice(-4)})` : 'Valued Customer'),
        email: user?.email || emailId || '',
        phone: targetPhone,
        role: role,
        isPrime: false,
        createdAt: user?.created_at || new Date().toISOString()
      };

      setCurrentUser(authenticatedUser);
      useStore.setState({ authStatus: 'AUTHENTICATED' });

      // If user filled registration address during signup
      if (authMode === 'SIGNUP' && pincode) {
        const postOfficeToSave = selectedPostOffice || availablePostOffices[0] || {
          name: 'KATHWADA GIDC S.O.',
          branchType: 'Sub Hub Facility',
          deliveryStatus: 'Delivery',
          circle: 'Gujarat',
          district: 'Ahmedabad',
          state: 'Gujarat',
          facilityId: 'PO382430'
        };

        const regAddress: DeliveryAddress = {
          id: `addr_${Date.now()}`,
          userId: authenticatedUser.id,
          fullName: accountType === 'B2B' && companyName ? `${companyName} (${fullName})` : fullName,
          phone: signupMobile,
          addressType: accountType === 'B2B' ? 'OFFICE' : 'HOME',
          flatBuilding: addressLine1,
          streetArea: addressLine2,
          pincode: pincode,
          postOffice: postOfficeToSave,
          city: city,
          state: state,
          stateCode: stateCode,
          isDefault: true,
          gstin: accountType === 'B2B' ? gstin : undefined
        };

        addAddress(regAddress);
        useStore.setState({ activeAddress: regAddress, shippingAddress: regAddress });
      }

      setIsAuthModalOpen(false);

      // Check destination gate
      const { authDestination, setIsCheckoutOpen } = useStore.getState();
      if (authDestination === 'CHECKOUT') {
        setIsCheckoutOpen(true);
        showToast('Identity verified. Proceeding to checkout.', 'success');
      } else {
        showToast(`Welcome! You are now signed in.`, 'success');
      }
    } catch {
      setIsVerifyingOtp(false);
      setErrorMessage('Verification failed. Please check network connection.');
      showToast('Verification failed. Please check network connection.', 'error');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Digit Input Key Handling & Auto-Focus Navigation
  // ──────────────────────────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    if (clean.length > 1) {
      handleOtpPaste(clean);
      return;
    }

    const updated = [...otpDigits];
    updated[index] = clean[0];
    setOtpDigits(updated);
    setErrorMessage(null);

    // Auto advance focus to next input
    if (index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    } else {
      const fullOtp = updated.join('');
      if (fullOtp.length === 4) {
        triggerVerifyOtp(fullOtp);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
        const updated = [...otpDigits];
        updated[index - 1] = '';
        setOtpDigits(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (pastedText: string) => {
    const digits = pastedText.replace(/\D/g, '').slice(0, 4);
    if (!digits) return;
    const updated = ['', '', '', ''];
    for (let i = 0; i < digits.length; i++) {
      updated[i] = digits[i];
    }
    setOtpDigits(updated);
    setErrorMessage(null);

    const focusIdx = Math.min(digits.length, 3);
    otpInputRefs.current[focusIdx]?.focus();

    if (digits.length === 4) {
      triggerVerifyOtp(digits);
    }
  };

  const handleChangePhone = () => {
    setOtpStep(false);
    setOtpDigits(['', '', '', '']);
    setErrorMessage(null);
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-[#0A0F1C]/70 backdrop-blur-md animate-fadeIn select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsAuthModalOpen(false);
      }}
    >
      {/* Centered Modal Card Container */}
      <div 
        className={`bg-white border border-slate-200/90 rounded-3xl w-full ${
          authMode === 'SIGNUP' && !otpStep ? 'max-w-[480px] max-h-[90vh]' : 'max-w-[440px]'
        } overflow-hidden shadow-2xl shadow-slate-900/15 flex flex-col relative transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        <button 
          onClick={() => setIsAuthModalOpen(false)}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-5">
          {/* Top Apollo Engineering Branding */}
          <div className="text-center pt-1">
            <img 
              src="/logo.webp" 
              alt="Apollo Engineering" 
              className="h-9 sm:h-10 w-auto object-contain mx-auto mb-3 pointer-events-none select-none"
            />
            <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-black text-[#0A0F1C] tracking-tight">
              {otpStep 
                ? 'Verify Your Mobile Number' 
                : authMode === 'SIGNUP' 
                  ? 'Create Your Account' 
                  : 'Welcome to APE Store'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {otpStep ? (
                <span>
                  Enter the 4-digit OTP sent to{' '}
                  <strong className="text-slate-800 font-mono font-bold">
                    {getMaskedPhone(activePhoneDigits)}
                  </strong>
                </span>
              ) : authMode === 'SIGNUP' ? (
                'Register to access retail & commercial solar hardware.'
              ) : (
                'Sign in to view your orders, invoices and dispatch updates.'
              )}
            </p>
          </div>

          {/* Inline Error Message Banner */}
          {errorMessage && (
            <div 
              role="alert" 
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 1: 4-DIGIT OTP VERIFICATION SCREEN                       */}
          {/* ───────────────────────────────────────────────────────────── */}
          {otpStep ? (
            <form onSubmit={(e) => { e.preventDefault(); triggerVerifyOtp(otpDigits.join('')); }} className="space-y-5">
              {/* 4 Separate OTP Input Boxes */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 my-3">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={(e) => {
                      e.preventDefault();
                      handleOtpPaste(e.clipboardData.getData('text'));
                    }}
                    aria-label={`Digit ${idx + 1}`}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-2xl font-mono font-black text-center text-[#0A0F1C] bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-[#F58220] focus:ring-4 focus:ring-[#F58220]/20 focus:bg-white focus:outline-none transition-all shadow-inner"
                  />
                ))}
              </div>

              {/* Primary Action Button: VERIFY & SIGN IN */}
              <button
                type="submit"
                disabled={otpDigits.join('').length !== 4 || isVerifyingOtp}
                className="w-full h-12 bg-[#F58220] hover:bg-[#E07218] active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#F58220]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isVerifyingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>VERIFYING...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>VERIFY & SIGN IN</span>
                  </>
                )}
              </button>

              {/* Resend OTP & Change Mobile Number Controls */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                {countdown > 0 ? (
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Resend OTP in <strong className="font-mono text-[#0A0F1C]">{countdown}s</strong>
                  </span>
                ) : (
                  <div className="flex items-center gap-2 font-bold">
                    <button
                      type="button"
                      onClick={() => handleRetryOtp('SMS')}
                      className="text-[#0054A6] hover:underline cursor-pointer"
                    >
                      Resend SMS
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleRetryOtp('WHATSAPP')}
                      className="text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleChangePhone}
                  className="text-slate-600 hover:text-[#0A0F1C] font-semibold underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Number
                </button>
              </div>
            </form>
          ) : authMode === 'SIGNIN' ? (
            /* ───────────────────────────────────────────────────────────── */
            /* VIEW 2: CUSTOMER SIGN IN SCREEN (MOBILE + OTP)                */
            /* ───────────────────────────────────────────────────────────── */
            <form onSubmit={handleSendSignInOtp} className="space-y-4">
              {/* Mobile Number Input with Fixed +91 Prefix */}
              <div>
                <label htmlFor="signin-mobile" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex items-center rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-[#F58220] focus-within:border-[#F58220] transition-all">
                  <div className="flex items-center gap-1 px-3.5 py-3 bg-slate-100 border-r border-slate-300 text-xs font-bold text-slate-700 select-none">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>+91</span>
                  </div>
                  <input
                    id="signin-mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoFocus
                    required
                    value={mobileNumber}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setMobileNumber(clean);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className="flex-1 h-11 px-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-mono"
                  />
                </div>

                {/* Security message */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>We’ll send a secure 4-digit OTP to verify your mobile number.</span>
                </div>
              </div>

              {/* Primary Action Button: SEND 4-DIGIT OTP */}
              <button
                type="submit"
                disabled={!isMobileValid || isSendingOtp}
                className="w-full h-12 bg-[#F58220] hover:bg-[#E07218] active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#F58220]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>SENDING OTP...</span>
                  </>
                ) : (
                  <>
                    <span>SEND 4-DIGIT OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Customer Signup Link */}
              <div className="text-center text-xs text-slate-600 pt-2">
                New to APE Store?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('SIGNUP');
                    setErrorMessage(null);
                  }}
                  className="text-[#0054A6] hover:text-[#003d7a] font-bold underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Create Account
                </button>
              </div>

              {/* Compact Trust Indicators */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-[10px] text-slate-600 font-medium text-center">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-[#0054A6]" />
                  <span>Secure OTP Login</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <FileText className="w-4 h-4 text-[#0054A6]" />
                  <span>GST Invoice Available</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <Truck className="w-4 h-4 text-[#0054A6]" />
                  <span>Order & Dispatch Tracking</span>
                </div>
              </div>

              {/* Footer Legal Links */}
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
                <button 
                  type="button" 
                  onClick={() => setActivePolicyModal('terms')} 
                  className="hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
                <span>•</span>
                <button 
                  type="button" 
                  onClick={() => setActivePolicyModal('privacy')} 
                  className="hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </div>
            </form>
          ) : (
            /* ───────────────────────────────────────────────────────────── */
            /* VIEW 3: STREAMLINED CUSTOMER SIGN UP / REGISTRATION           */
            /* ───────────────────────────────────────────────────────────── */
            <form onSubmit={handleSendSignUpOtp} className="space-y-4 text-xs">
              {/* Account Type Selector: B2C vs B2B */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('B2C')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      accountType === 'B2C'
                        ? 'bg-amber-50 border-[#F58220] text-slate-900 shadow-sm font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {accountType === 'B2C' ? (
                      <CheckSquare className="w-4 h-4 text-[#F58220]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="font-bold text-xs">🛒 B2C Retail</div>
                      <div className="text-[10px] text-slate-500">Rooftop systems</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('B2B')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      accountType === 'B2B'
                        ? 'bg-blue-50 border-[#0054A6] text-slate-900 shadow-sm font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {accountType === 'B2B' ? (
                      <CheckSquare className="w-4 h-4 text-[#0054A6]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="font-bold text-xs">🏢 B2B Wholesale</div>
                      <div className="text-[10px] text-slate-500">EPC & Contractors</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* B2B Specific Fields */}
              {accountType === 'B2B' && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company / Firm Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Solar Solutions Pvt Ltd"
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0054A6]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (Optional for ITC)</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 24ABCDE1234F1Z5"
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#0054A6]"
                    />
                  </div>
                </div>
              )}

              {/* Personal Details: Name, Mobile, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#F58220]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-1 focus-within:ring-[#F58220]">
                    <span className="px-2 py-2 bg-slate-100 border-r border-slate-300 text-slate-600 font-bold text-[11px] select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      className="w-full h-9 px-2 font-mono text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  placeholder="e.g. contact@example.com"
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#F58220]"
                />
              </div>

              {/* Address Fields */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F58220]" />
                    Delivery Address
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
                    APE Priority Shipping
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="House / Flat / Shed No. *"
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Area / Street / GIDC *"
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-4 relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="Pincode *"
                      className="w-full h-8 px-2.5 bg-white border border-[#0054A6] rounded-lg text-[#0054A6] font-mono font-bold focus:outline-none"
                    />
                    {isLoadingPincode && (
                      <RefreshCw className="w-3 h-3 text-[#0054A6] animate-spin absolute right-2.5 top-2.5" />
                    )}
                  </div>

                  <div className="sm:col-span-8 relative">
                    <select
                      value={selectedPostOffice?.facilityId || (availablePostOffices[0]?.facilityId || '')}
                      onChange={(e) => {
                        const found = availablePostOffices.find((po) => po.facilityId === e.target.value);
                        if (found) setSelectedPostOffice(found);
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:outline-none appearance-none cursor-pointer pr-6"
                    >
                      {availablePostOffices.length > 0 ? (
                        availablePostOffices.map((po) => (
                          <option key={po.facilityId} value={po.facilityId}>
                            {po.name} ({po.branchType})
                          </option>
                        ))
                      ) : (
                        <option value="">Enter 6-digit PIN</option>
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Auto-populated City & State */}
                <div className="text-[11px] text-slate-500 font-mono">
                  Verified Destination: <strong className="text-slate-800">{city}, {state} (Code {stateCode})</strong>
                </div>
              </div>

              {/* Mandatory Policy Agreement Checkboxes */}
              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptWarranty}
                    onChange={(e) => setAcceptWarranty(e.target.checked)}
                    className="mt-0.5 rounded text-[#F58220] focus:ring-[#F58220]"
                  />
                  <span><strong>10-Year Rust-Proof Warranty:</strong> 10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptReturnPolicy}
                    onChange={(e) => setAcceptReturnPolicy(e.target.checked)}
                    className="mt-0.5 rounded text-[#F58220] focus:ring-[#F58220]"
                  />
                  <span><strong>Transit Protection:</strong> Zero-risk full replacement for transit damage.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptCancelPolicy}
                    onChange={(e) => setAcceptCancelPolicy(e.target.checked)}
                    className="mt-0.5 rounded text-[#F58220] focus:ring-[#F58220]"
                  />
                  <span><strong>Instant Cancellation:</strong> Full refund before warehouse dispatch.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptDeliveryTimeline}
                    onChange={(e) => setAcceptDeliveryTimeline(e.target.checked)}
                    className="mt-0.5 rounded text-[#F58220] focus:ring-[#F58220]"
                  />
                  <span><strong>APE Direct Dispatch:</strong> Dispatched from Kathwada Factory ({ORIGIN_HUB_PINCODE}).</span>
                </label>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={!isMobileValid || isSendingOtp}
                className="w-full h-12 bg-[#F58220] hover:bg-[#E07218] active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#F58220]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>SENDING OTP...</span>
                  </>
                ) : (
                  <>
                    <span>SEND 4-DIGIT OTP & CREATE ACCOUNT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Switch back to Sign In */}
              <div className="text-center text-xs text-slate-600 pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('SIGNIN');
                    setErrorMessage(null);
                  }}
                  className="text-[#0054A6] hover:text-[#003d7a] font-bold underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEWABLE POLICY MODALS (TERMS & CONDITIONS / PRIVACY POLICY)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activePolicyModal && (
        <div 
          className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setActivePolicyModal(null)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {activePolicyModal === 'terms' ? 'Terms & Conditions' : 'Privacy & Security Policy'}
              </h3>
              <button 
                onClick={() => setActivePolicyModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activePolicyModal === 'terms' ? (
              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900">1. 10-Year Rust-Proof Warranty</h4>
                  <p>10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">2. Transit & Replacement Policy</h4>
                  <p>Every shipment is dispatched via Priority Express transit from Kathwada Factory Hub (382430). Any damage during transit is replaced at zero cost upon verification within 7 days of delivery.</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">3. Cancellation & Refunds</h4>
                  <p>Orders can be cancelled at any time before shipment barcoding for a 100% instant refund.</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900">1. OTP & Mobile Authentication</h4>
                  <p>We use temporary 4-digit One-Time Passwords (OTPs) dispatched via official MSG91 telecom gateways to verify your identity. Your OTP is never shared, exposed, or stored in plaintext.</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">2. Data Privacy & GST Security</h4>
                  <p>Your business and contact information is used strictly to fulfill your purchase orders, generate statutory GST tax invoices, and provide live parcel tracking.</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">3. 24-Hour Verified Session</h4>
                  <p>Upon successful OTP verification, your active session remains authorized for 24 hours on your current device.</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActivePolicyModal(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
