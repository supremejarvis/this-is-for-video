'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, User, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/services/api';
import { AuthAnimState } from '@/components/auth/ApolloSolarAuthAnimation';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl') || '/store';
  const returnUrl = (rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')) ? rawReturnUrl : '/store';

  const initialPhone = searchParams.get('phone') || '';
  const isPreVerified = searchParams.get('verified') === 'true';

  const { checkAuthSession, setAppMode, showToast } = useStore();
  const { sendOtp, verifyOtp, isLoading: authLoading } = useAuth();

  // Registration step: 1 = Phone & OTP (if not pre-verified), 2 = Profile & Address Details
  const [step, setStep] = useState<1 | 2>(isPreVerified ? 2 : 1);
  const [mobile, setMobile] = useState(initialPhone);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [animState, setAnimState] = useState<AuthAnimState>('idle');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Profile fields
  const [accountType, setAccountType] = useState<'B2C' | 'B2B'>('B2C');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Address fields
  const [flatBuilding, setFlatBuilding] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [pincode, setPincode] = useState('382430');
  const [city, setCity] = useState('Ahmedabad');
  const [state, setState] = useState('Gujarat');
  const [stateCode, setStateCode] = useState('24');
  const [postOffices, setPostOffices] = useState<any[]>([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const clean10 = mobile.replace(/\D/g, '').slice(-10);
    if (clean10.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    try {
      const res = await sendOtp(clean10);
      setOtpStep(true);
      setCooldown(res?.cooldown_seconds || 30);
      if (res?.dev_code) {
        setDevOtp(res.dev_code);
      }
    } catch (err: any) {
      const raw = err?.message || '';
      let msg = 'Failed to dispatch verification OTP.';
      if (typeof raw === 'string' && (raw.includes('500') || raw.toLowerCase().includes('internal server error'))) {
        msg = 'OTP authentication service is reconnecting. Please retry in a moment.';
      } else if (raw) {
        msg = raw;
      }
      setError(msg);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!otp || otp.length < 4) {
      setError('Please enter the 4-digit OTP.');
      return;
    }
    try {
      await verifyOtp(mobile, otp);
      setStep(2);
    } catch (err: any) {
      setError(err?.message || 'Invalid verification code. Please try again.');
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full legal name or organization contact.');
      return;
    }

    if (accountType === 'B2B' && !companyName.trim()) {
      setError('Company Name is required for B2B Wholesale accounts.');
      return;
    }

    if (accountType === 'B2B' && gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase())) {
      setError('Please enter a valid 15-character GSTIN (e.g. 24AAACG1111A1Z9).');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the Apollo Engineering Terms & Conditions to proceed.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update customer profile in PostgreSQL
      await authApi.updateCustomerProfile({
        full_name: name.trim(),
        email: email.trim() || undefined,
        account_type: accountType,
        company_name: accountType === 'B2B' ? companyName.trim() : undefined,
        gstin: accountType === 'B2B' && gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        terms_accepted: true,
      });

      // 2. If delivery address details are provided, save to PostgreSQL customer_addresses
      if (flatBuilding.trim() && pincode.trim()) {
        await authApi.addCustomerAddress({
          address_type: accountType === 'B2B' ? 'OFFICE' : 'SHIPPING',
          full_name: name.trim(),
          phone: mobile || initialPhone,
          company_name: accountType === 'B2B' ? companyName.trim() : undefined,
          gstin: accountType === 'B2B' && gstin.trim() ? gstin.trim().toUpperCase() : undefined,
          flat_building: flatBuilding.trim(),
          street_area: streetArea.trim() || city,
          pincode: pincode.trim(),
          city: city.trim(),
          state: state.trim(),
          state_code: stateCode,
          is_default: true,
          is_verified: true,
        }).catch(() => {});
      }

      // 3. Refresh store state from backend
      await checkAuthSession();
      if (accountType === 'B2B') {
        setAppMode('B2B');
      }

      showToast('Profile and verified account created successfully!', 'success');
      router.push(returnUrl);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete profile registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-1">
          <div className="w-12 h-12 rounded-2xl bg-[#0054A6] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[#0054A6]/20">
            A
          </div>
        </div>
        <h2 className="mt-2 text-center text-2xl font-black text-slate-900 tracking-tight">
          Apollo Engineering
        </h2>
        <p className="mt-0.5 text-center text-xs text-slate-500 uppercase tracking-widest font-semibold font-mono">
          Customer & B2B Registration Portal
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0 mt-6">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200/80 rounded-3xl sm:px-10 text-slate-900">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {step === 1 ? (
            /* Step 1: Mobile OTP Verification */
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Step 1: Verify Indian Mobile Number
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                All Apollo accounts are protected with single-consumption 4-digit SMS OTP verification.
              </p>

              {!otpStep ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label htmlFor="reg-mobile" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        +91
                      </div>
                      <input
                        id="reg-mobile"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="98250 12345"
                        className="w-full pl-14 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    isLoading={authLoading || animState === 'sending'}
                    className="w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-[#0054A6]/20"
                  >
                    Send 4-Digit OTP <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>

                  <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">Already registered? </span>
                    <Link
                      href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
                      className="text-xs font-bold text-[#0054A6] hover:underline"
                    >
                      Sign In with Mobile OTP
                    </Link>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span>Code sent to <strong>+91 {mobile}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep(false);
                          setOtp('');
                        }}
                        className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <ArrowLeft className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    {devOtp && (
                      <div className="mt-1 p-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 rounded font-mono font-bold text-emerald-700 dark:text-emerald-300 text-center">
                        Dev Testing OTP: {devOtp}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reg-otp" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 text-center">
                      Enter 4-Digit OTP
                    </label>
                    <input
                      id="reg-otp"
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="• • • •"
                      className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    isLoading={authLoading || animState === 'pending'}
                    className="w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-[#0054A6]/20"
                  >
                    Verify & Continue to Profile
                  </Button>

                  <div className="flex justify-between items-center pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setOtpStep(false)}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Change Number
                    </button>
                    {cooldown > 0 ? (
                      <span className="text-slate-400 font-mono">Resend in {cooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="font-bold text-[#0054A6] hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Step 2: Complete Profile & Address Details */
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 2: Profile & Account Setup
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified Mobile: <strong className="text-slate-800 dark:text-slate-200">+91 {mobile || initialPhone}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Verified
                </div>
              </div>

              {/* Account Type Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('B2C')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      accountType === 'B2C'
                        ? 'border-[#0054A6] bg-blue-50/50 dark:bg-blue-950/30 text-[#0054A6] font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <User className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">B2C Retail</div>
                      <div className="text-[10px] text-slate-500">Individual or Residential Solar</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('B2B')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      accountType === 'B2B'
                        ? 'border-[#0054A6] bg-blue-50/50 dark:bg-blue-950/30 text-[#0054A6] font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Building2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">B2B Wholesale</div>
                      <div className="text-[10px] text-slate-500">Solar EPC / Commercial ITC</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Pravin Patel"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pravin@example.com"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                  />
                </div>
              </div>

              {/* B2B Firm Name & GSTIN */}
              {accountType === 'B2B' && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> B2B Statutory Credentials
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-comp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Company / Firm Name *
                      </label>
                      <input
                        id="reg-comp"
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Surya Solar EPC LLP"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-gstin" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        GSTIN (for 18% ITC)
                      </label>
                      <input
                        id="reg-gstin"
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="24AAACG1111A1Z9"
                        className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Address Details */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Primary Dispatch Address (Optional)
                </div>
                <div>
                  <input
                    type="text"
                    value={flatBuilding}
                    onChange={(e) => setFlatBuilding(e.target.value)}
                    placeholder="Flat / Shed / Building No., Industrial Area"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Pincode (e.g. 382430)"
                      className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City (e.g. Ahmedabad)"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0054A6] focus:ring-[#0054A6]"
                  />
                  <span>
                    I accept Apollo Engineering&apos;s{' '}
                    <span className="font-semibold text-[#0054A6]">10-Year Rust Warranty Policy</span>,{' '}
                    <span className="font-semibold text-[#0054A6]">GST Invoicing Guidelines</span>, and Terms of Service.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                isLoading={isLoading || animState === 'pending'}
                className="w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-[#0054A6]/20 mt-2"
              >
                Complete Profile & Continue Shopping <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Store
            </Link>
            <span className="flex items-center gap-1 text-slate-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Statutory 256-Bit SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading Apollo Registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
