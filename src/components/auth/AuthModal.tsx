'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Phone, ShieldCheck, Building2, 
  CheckCircle2, Lock, ArrowRight, MapPin, 
  CheckSquare, Square, ChevronDown, Clock, AlertCircle, 
  FileText, RefreshCw, MessageCircle, ArrowLeft, Truck, Sparkles
} from 'lucide-react';
import { useStore, saveStored } from '../../store/useStore';
import { UserRole, PostOfficeInfo, UserProfile, AppMode, DeliveryAddress } from '../../types';
import { lookupPincode, ORIGIN_HUB_PINCODE } from '../../services/logisticsService';
import { msg91OtpService } from '../../services/msg91OtpService';
import { authApi } from '../../services/api';

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
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [isReconnecting, setIsReconnecting] = useState(false);
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

    const attemptSend = async (isRetry = false): Promise<boolean> => {
      try {
        const data = await authApi.sendOtp(mobileNumber, otpChannel);
        setIsSendingOtp(false);
        setIsReconnecting(false);

        if (data && (data.success || data.type === 'success')) {
          setOtpStep(true);
          setCountdown(30);
          setOtpDigits(['', '', '', '']);
          setDevOtpCode(data.dev_code || null);
          setErrorMessage(null);
          showToast(
            otpChannel === 'WHATSAPP'
              ? 'Secure 4-digit OTP dispatched to your WhatsApp.'
              : 'Secure 4-digit OTP dispatched to your mobile number.',
            'info'
          );
          return true;
        } else {
          const rawMsg = data?.detail || data?.message || '';
          const cooldownMatch = typeof rawMsg === 'string' && rawMsg.match(/wait\s+(\d+)\s+seconds/i);
          if (cooldownMatch) {
            const remainingSeconds = parseInt(cooldownMatch[1], 10) || 30;
            setOtpStep(true);
            setCountdown(remainingSeconds);
            setOtpDigits(['', '', '', '']);
            setErrorMessage(null);
            showToast(`OTP already dispatched. Please enter 4-digit code (resend in ${remainingSeconds}s).`, 'info');
            return true;
          }
          throw new Error(typeof rawMsg === 'string' ? rawMsg : 'Failed to send OTP');
        }
      } catch (err: any) {
        const rawErr = err?.message || '';
        const cooldownMatch = typeof rawErr === 'string' && rawErr.match(/wait\s+(\d+)\s+seconds/i);
        if (cooldownMatch || err?.statusCode === 429) {
          const remainingSeconds = cooldownMatch ? (parseInt(cooldownMatch[1], 10) || 30) : 30;
          setIsSendingOtp(false);
          setIsReconnecting(false);
          setOtpStep(true);
          setCountdown(remainingSeconds);
          setOtpDigits(['', '', '', '']);
          setErrorMessage(null);
          showToast(`OTP already dispatched. Please enter 4-digit code (resend in ${remainingSeconds}s).`, 'info');
          return true;
        }

        const isConnErr = typeof rawErr === 'string' && (
          rawErr.includes('500') ||
          rawErr.toLowerCase().includes('internal server error') ||
          rawErr.toLowerCase().includes('network failure') ||
          rawErr.toLowerCase().includes('failed to fetch') ||
          rawErr.toLowerCase().includes('timed out')
        );

        if (isConnErr && !isRetry) {
          setIsReconnecting(true);
          await new Promise((r) => setTimeout(r, 1200));
          return await attemptSend(true);
        }

        setIsSendingOtp(false);
        setIsReconnecting(false);
        const userMsg = isConnErr 
          ? 'OTP authentication service is reconnecting. Please retry in a moment.' 
          : (rawErr || 'We couldn’t send the OTP. Please check your connection.');
        setErrorMessage(userMsg);
        showToast(userMsg, 'error');
        return false;
      }
    };

    await attemptSend();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Send OTP (Sign Up Registration)
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendSignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signupMobile || !/^[6-9]\d{9}$/.test(signupMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      showToast('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters).');
      showToast('Please enter your full name.', 'warning');
      return;
    }

    if (!emailId.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId.trim())) {
      setErrorMessage('Please enter a valid email address.');
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    if (accountType === 'B2B' && !companyName.trim()) {
      setErrorMessage('Please enter your company or firm name for B2B registration.');
      showToast('Please enter your company name.', 'warning');
      return;
    }

    if (accountType === 'B2B' && gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase())) {
      setErrorMessage('Invalid GSTIN format. Please enter a valid 15-character GSTIN or leave blank.');
      showToast('Invalid GSTIN format.', 'warning');
      return;
    }

    if (!addressLine1.trim() || !addressLine2.trim()) {
      setErrorMessage('Please enter complete delivery address details.');
      showToast('Please enter complete delivery address.', 'warning');
      return;
    }

    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
      setErrorMessage('Please enter a valid 6-digit postal pincode.');
      showToast('Please enter a valid 6-digit pincode.', 'warning');
      return;
    }

    if (!acceptWarranty || !acceptReturnPolicy || !acceptCancelPolicy || !acceptDeliveryTimeline) {
      setErrorMessage('Please accept all statutory policies and warranty terms.');
      showToast('Please accept all statutory policies.', 'warning');
      return;
    }

    setIsSendingOtp(true);
    try {
      const data = await authApi.sendOtp(signupMobile);
      setIsSendingOtp(false);

      if (data && (data.success || data.type === 'success')) {
        setOtpStep(true);
        setCountdown(30);
        setOtpDigits(['', '', '', '']);
        setDevOtpCode(data.dev_code || null);
        showToast('Secure 4-digit OTP dispatched to your mobile number.', 'info');
      } else {
        const rawMsg = data?.detail || data?.message || '';
        let msg = 'We couldn’t send the OTP. Please try again.';
        if (typeof rawMsg === 'string' && (rawMsg.includes('500') || rawMsg.toLowerCase().includes('internal server error'))) {
          msg = 'OTP authentication service is reconnecting. Please retry in a moment.';
        } else if (rawMsg) {
          msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
        }

        const cooldownMatch = typeof msg === 'string' && msg.match(/wait\s+(\d+)\s+seconds/i);
        if (cooldownMatch) {
          const remainingSeconds = parseInt(cooldownMatch[1], 10) || 30;
          setOtpStep(true);
          setCountdown(remainingSeconds);
          setOtpDigits(['', '', '', '']);
          setErrorMessage(null);
          showToast(`OTP already dispatched. Please enter 4-digit code (resend in ${remainingSeconds}s).`, 'info');
          return;
        }

        setErrorMessage(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      setIsSendingOtp(false);
      const rawErr = err?.message || '';
      let msg = 'We couldn’t send the OTP. Please check your connection.';
      if (typeof rawErr === 'string' && (rawErr.includes('500') || rawErr.toLowerCase().includes('internal server error'))) {
        msg = 'OTP authentication service is reconnecting. Please retry in a moment.';
      } else if (rawErr) {
        msg = rawErr;
      }

      const cooldownMatch = typeof msg === 'string' && msg.match(/wait\s+(\d+)\s+seconds/i);
      if (cooldownMatch) {
        const remainingSeconds = parseInt(cooldownMatch[1], 10) || 30;
        setOtpStep(true);
        setCountdown(remainingSeconds);
        setOtpDigits(['', '', '', '']);
        setErrorMessage(null);
        showToast(`OTP already dispatched. Please enter 4-digit code (resend in ${remainingSeconds}s).`, 'info');
        return;
      }

      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Resend OTP (30s Countdown)
  // ──────────────────────────────────────────────────────────────────────────
  const handleRetryOtp = async (_channel?: string) => {
    if (countdown > 0) return;
    const targetPhone = authMode === 'SIGNUP' ? signupMobile : mobileNumber;
    try {
      const data = await authApi.sendOtp(targetPhone);
      if (data && (data.success || data.type === 'success')) {
        setCountdown(30);
        setErrorMessage(null);
        setDevOtpCode(data.dev_code || null);
        showToast('New 4-digit OTP sent to your mobile', 'info');
      } else {
        setErrorMessage(data?.detail || data?.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend OTP.');
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
      const result = await authApi.verifyOtp(targetPhone, enteredCode);
      setIsVerifyingOtp(false);

      const isSuccess = Boolean(result && (result.is_verified || result.success || result.isVerified));
      if (!isSuccess) {
        const msg = result?.detail || result?.message || 'Incorrect OTP. Please check and enter again.';
        setErrorMessage(msg);
        showToast(msg, 'error');
        return;
      }

      // Backend session verified!
      const user = result.user;
      const cleanPhone10 = targetPhone.replace(/\D/g, '').slice(-10);

      // Check if user exists in allUsers or apollo_users or stored current user
      const savedUsers: UserProfile[] = (typeof window !== 'undefined' && window.localStorage)
        ? JSON.parse(localStorage.getItem('apollo_users') || '[]')
        : [];
      const matchedUser = allUsers.find(u => u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone10))
        || savedUsers.find(u => u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone10));

      const isPrivileged = Boolean(user?.role && ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'INVENTORY_MANAGER', 'ORDER_OPERATIONS', 'FINANCE', 'SUPPORT', 'AUDITOR'].includes(user.role));
      const role: UserRole = (authMode === 'SIGNUP' && accountType === 'B2B')
        ? 'B2B_BUYER'
        : (matchedUser?.role && matchedUser.role.includes('B2B')
          ? 'B2B_BUYER'
          : (isPrivileged ? (user?.role === 'OWNER' ? 'OWNER' : (user?.role === 'SUPPORT' ? 'SUPPORT' : (user?.role === 'AUDITOR' ? 'AUDITOR' : 'SUPER_ADMIN'))) : 'B2C_CUSTOMER'));

      // Authentic Name Resolution (Empty for first-time OTP login so customer enters real name):
      let resolvedName = '';
      if (authMode === 'SIGNUP' && fullName.trim()) {
        resolvedName = fullName.trim();
      } else if (matchedUser?.name && !matchedUser.name.startsWith('Customer ') && matchedUser.name !== 'Valued Customer') {
        resolvedName = matchedUser.name;
      } else if (user?.full_name && !user.full_name.startsWith('Customer ') && user.full_name !== 'Valued Customer') {
        resolvedName = user.full_name;
      } else {
        resolvedName = '';
      }

      let resolvedEmail = '';
      if (authMode === 'SIGNUP' && emailId.trim()) {
        resolvedEmail = emailId.trim();
      } else if (matchedUser?.email && !matchedUser.email.includes('@ape-store.com') && !matchedUser.email.includes('@phone.')) {
        resolvedEmail = matchedUser.email;
      } else if (user?.email && !user.email.includes('@ape-store.com') && !user.email.includes('@phone.')) {
        resolvedEmail = user.email;
      } else {
        resolvedEmail = '';
      }

      const formattedPhone = targetPhone.startsWith('+91') 
        ? targetPhone 
        : `+91 ${cleanPhone10}`;

      const authenticatedUser: UserProfile = {
        id: user?.id || matchedUser?.id || `usr_${Date.now()}`,
        name: resolvedName,
        email: resolvedEmail,
        phone: formattedPhone,
        role: role,
        isPrime: false,
        createdAt: user?.created_at || matchedUser?.createdAt || new Date().toISOString()
      };

      setCurrentUser(authenticatedUser);
      useStore.setState({ authStatus: 'AUTHENTICATED' });

      // If user is B2B, ensure appMode is B2B
      if (role === 'B2B_BUYER') {
        setAppMode('B2B');
      }

      // If resolved authentic name exists and backend still had generic Customer name, sync to PostgreSQL!
      if (resolvedName && !resolvedName.startsWith('Customer ') && user?.full_name?.startsWith('Customer ')) {
        authApi.updateProfile({ full_name: resolvedName }).catch(() => {});
      }

      if (authMode === 'SIGNUP' && accountType === 'B2B') {
        setAppMode('B2B');
        if (companyName.trim()) {
          useStore.getState().updateOrgDetails({
            companyName: companyName.trim(),
            tradeName: companyName.trim(),
            gstin: gstin.trim().toUpperCase(),
            stateCode: stateCode,
          });
        }
      }

      // If user filled registration address during signup
      if (authMode === 'SIGNUP' && pincode) {
        const postOfficeToSave = selectedPostOffice || availablePostOffices[0] || {
          name: `${city} S.O.`,
          branchType: 'Sub Hub Facility',
          deliveryStatus: 'Delivery',
          circle: state,
          district: city,
          state: state,
          facilityId: `PO${pincode}`
        };

        const regAddress: DeliveryAddress = {
          id: `addr_${Date.now()}`,
          userId: authenticatedUser.id,
          fullName: accountType === 'B2B' && companyName.trim() ? `${companyName.trim()} (${fullName.trim()})` : fullName.trim(),
          phone: signupMobile,
          addressType: accountType === 'B2B' ? 'OFFICE' : 'HOME',
          flatBuilding: addressLine1.trim(),
          streetArea: addressLine2.trim(),
          pincode: pincode.trim(),
          postOffice: postOfficeToSave,
          city: city,
          state: state,
          stateCode: stateCode,
          isDefault: true,
          gstin: accountType === 'B2B' && gstin ? gstin.trim().toUpperCase() : undefined
        };

        addAddress(regAddress);
        useStore.setState({ 
          activeAddress: regAddress, 
          shippingAddress: regAddress,
          billingAddress: regAddress,
          destinationPincode: regAddress.pincode
        });
        saveStored('apollo_shipping_address', regAddress);
        saveStored('apollo_billing_address', regAddress);
        saveStored('apollo_addresses', [regAddress, ...useStore.getState().addresses.filter(a => a.id !== regAddress.id)]);

        // Persist to backend PostgreSQL
        authApi.addCustomerAddress({
          address_type: accountType === 'B2B' ? 'OFFICE' : 'SHIPPING',
          full_name: regAddress.fullName,
          phone: regAddress.phone,
          company_name: accountType === 'B2B' ? companyName.trim() : undefined,
          gstin: accountType === 'B2B' && gstin ? gstin.trim().toUpperCase() : undefined,
          flat_building: regAddress.flatBuilding,
          street_area: regAddress.streetArea,
          pincode: regAddress.pincode,
          city: regAddress.city,
          state: regAddress.state,
          state_code: regAddress.stateCode,
          is_default: true,
          is_verified: true,
        }).catch(() => {});
      }

      if (authMode === 'SIGNUP') {
        authApi.updateCustomerProfile({
          full_name: resolvedName,
          email: resolvedEmail && !resolvedEmail.includes('@ape-store.com') ? resolvedEmail : undefined,
          account_type: accountType,
          company_name: accountType === 'B2B' ? companyName.trim() : undefined,
          gstin: accountType === 'B2B' && gstin ? gstin.trim().toUpperCase() : undefined,
          terms_accepted: true,
        }).catch(() => {});
      }

      await useStore.getState().checkAuthSession();

      setIsAuthModalOpen(false);

      // Check destination gate
      const { authDestination, setIsCheckoutOpen, setIsCartDrawerOpen } = useStore.getState();
      if (authDestination === 'CHECKOUT') {
        setIsCheckoutOpen(true);
        showToast('Identity verified. Proceeding to checkout.', 'success');
      } else if (authDestination === 'CART') {
        setIsCartDrawerOpen(true);
        showToast('Signed in successfully! Your cart is ready.', 'success');
      } else {
        showToast(`Welcome! You are now signed in.`, 'success');
      }
      useStore.setState({ authDestination: null });
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
    setDevOtpCode(null);
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
              className="h-9 sm:h-10 w-auto object-contain mx-auto mb-2 pointer-events-none select-none"
            />
            <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-black text-[#0A0F1C] tracking-tight">
              {otpStep 
                ? 'Verify Your Mobile Number' 
                : 'Mobile OTP Instant Sign-In'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {otpStep ? (
                <span>
                  Enter the 4-digit OTP sent to{' '}
                  <strong className="text-slate-800 font-mono font-bold">
                    {getMaskedPhone(activePhoneDigits)}
                  </strong>
                </span>
              ) : (
                'Instant access via 10-digit mobile number. No registration or password required!'
              )}
            </p>
          </div>

          {/* Inline Error Message Banner */}
          {errorMessage && (
            <div 
              role="alert" 
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center justify-between gap-2 animate-fadeIn"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  setErrorMessage(null);
                  handleSendOtp(e);
                }}
                disabled={isSendingOtp || isReconnecting}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shrink-0 flex items-center gap-1 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isSendingOtp || isReconnecting ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
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

              {/* Development Testing Helper (renders only when dev_code is present) */}
              {devOtpCode && (
                <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Dev OTP: <strong className="font-black text-amber-950 text-sm tracking-wider">{devOtpCode}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleOtpPaste(devOtpCode);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

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
                      let clean = e.target.value.replace(/\D/g, '');
                      if (clean.startsWith('91') && clean.length > 10) {
                        clean = clean.slice(2);
                      } else if (clean.startsWith('0') && clean.length > 10) {
                        clean = clean.slice(1);
                      }
                      clean = clean.slice(0, 10);
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

              {/* Delivery Channel Selector: SMS or WhatsApp */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setOtpChannel('SMS')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    otpChannel === 'SMS'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5 text-[#F58220]" />
                  <span>SMS OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOtpChannel('WHATSAPP')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    otpChannel === 'WHATSAPP'
                      ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp OTP</span>
                </button>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={!isMobileValid || isSendingOtp || isReconnecting}
                className="w-full h-12 bg-[#F58220] hover:bg-[#E07218] active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#F58220]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-2"
              >
                {isReconnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>CONNECTING SERVICE (AUTO-RETRY)...</span>
                  </>
                ) : isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>SENDING OTP...</span>
                  </>
                ) : (
                  <>
                    <span>{otpChannel === 'WHATSAPP' ? 'SEND VIA WHATSAPP' : 'SEND 4-DIGIT OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Frictionless Login Notice */}
              <div className="text-center text-xs text-slate-600 pt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <div className="font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>No Upfront Registration Required</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Just enter your mobile to log in. You can add your delivery name, address, and B2B GST details during checkout or in your profile.
                </p>
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
                      onChange={(e) => {
                        let clean = e.target.value.replace(/\D/g, '');
                        if (clean.startsWith('91') && clean.length > 10) {
                          clean = clean.slice(2);
                        } else if (clean.startsWith('0') && clean.length > 10) {
                          clean = clean.slice(1);
                        }
                        clean = clean.slice(0, 10);
                        setSignupMobile(clean);
                      }}
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
                    id="accept-warranty"
                    name="acceptWarranty"
                    checked={acceptWarranty}
                    onChange={(e) => setAcceptWarranty(e.target.checked)}
                    className="mt-0.5 rounded text-[#F58220] focus:ring-[#F58220]"
                  />
                  <span><strong>10-Year Rust-Proof Warranty:</strong> 10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="accept-return-policy"
                    name="acceptReturnPolicy"
                    checked={acceptReturnPolicy}
                    onChange={(e) => setAcceptReturnPolicy(e.target.checked)}
                    className="mt-0.5 rounded text-[#F58220] focus:ring-[#F58220]"
                  />
                  <span><strong>Transit Protection:</strong> Zero-risk full replacement for transit damage.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="accept-cancel-policy"
                    name="acceptCancelPolicy"
                    checked={acceptCancelPolicy}
                    onChange={(e) => setAcceptCancelPolicy(e.target.checked)}
                    className="mt-0.5 rounded text-[#F58220] focus:ring-[#F58220]"
                  />
                  <span><strong>Instant Cancellation:</strong> Full refund before warehouse dispatch.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="accept-delivery-timeline"
                    name="acceptDeliveryTimeline"
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
