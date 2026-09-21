'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight, ArrowLeft, Phone, Lock, Sparkles, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { ApolloSolarAuthAnimation, AuthAnimState } from '@/components/auth/ApolloSolarAuthAnimation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl') || searchParams.get('redirect') || '/store';
  // Safe redirect validation against open redirects
  const returnUrl = (rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')) ? rawReturnUrl : '/store';

  const { sendOtp, verifyOtp, loginAdmin, isLoading, error } = useAuth();

  const [mode, setMode] = useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');
  const [mobile, setMobile] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [animState, setAnimState] = useState<AuthAnimState>('idle');
  const [challengeId, setChallengeId] = useState<string | undefined>(undefined);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Admin state
  const [adminEmail, setAdminEmail] = useState('admin@apolloengineering.co.in');
  const [adminPassword, setAdminPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Cooldown countdown timer
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

  // Focus OTP input on step transition
  useEffect(() => {
    if (otpStep) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [otpStep]);

  const handleMobileChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.startsWith('91') && clean.length > 10) {
      clean = clean.slice(2);
    } else if (clean.startsWith('0') && clean.length > 10) {
      clean = clean.slice(1);
    }
    setMobile(clean.slice(0, 10));
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError(null);
    const clean10 = mobile.replace(/\D/g, '').slice(-10);
    if (clean10.length !== 10) {
      setLocalError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      const res = await sendOtp(clean10);
      setOtpStep(true);
      setCooldown(res?.cooldown_seconds || 30);
      if (res?.challenge_id || res?.request_id) {
        setChallengeId(res.challenge_id || res.request_id);
      }
      if (res?.dev_code) {
        setDevOtp(res.dev_code);
      }
    } catch (err: any) {
      const raw = err?.message || '';
      let msg = 'Failed to send verification code. Please check your connection.';
      if (typeof raw === 'string' && (raw.includes('500') || raw.toLowerCase().includes('internal server error'))) {
        msg = 'OTP authentication service is reconnecting. Please retry in a moment.';
      } else if (raw) {
        msg = raw;
      }
      setLocalError(msg);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError(null);
    if (!otp || otp.length < 4) {
      setLocalError('Please enter the complete 4-digit OTP.');
      return;
    }

    try {
      const res = await verifyOtp(mobile, otp, challengeId);
      if (res?.is_first_time) {
        router.push(`/register?phone=${mobile}&verified=true&returnUrl=${encodeURIComponent(returnUrl)}`);
      } else {
        router.push(returnUrl);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Invalid or expired OTP. Please enter again.');
    }
  };

  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setOtp(clean);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!adminEmail || !adminPassword) {
      setLocalError('Please enter admin email and password.');
      return;
    }
    try {
      await loginAdmin(adminEmail, adminPassword, totpCode || undefined);
      router.push('/admin');
    } catch (err: any) {
      setLocalError(err?.message || 'Admin authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-1">
          <div className="w-12 h-12 rounded-2xl bg-[#0054A6] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[#0054A6]/20">
            A
          </div>
        </div>
        <h2 className="mt-2 text-center text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Apollo Engineering
        </h2>
        <p className="mt-0.5 text-center text-xs text-slate-500 uppercase tracking-widest font-semibold font-mono">
          Kathwada GIDC • Industrial Solar Cleaning Hub
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 mt-6">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl sm:px-10">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('CUSTOMER');
                setOtpStep(false);
                setLocalError(null);
              }}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                mode === 'CUSTOMER'
                  ? 'border-[#0054A6] text-[#0054A6]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Customer / B2B Mobile OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('ADMIN');
                setOtpStep(false);
                setLocalError(null);
              }}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                mode === 'ADMIN'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Staff / Admin TOTP
            </button>
          </div>

          {(localError || error) && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 font-medium">
              {localError || error}
            </div>
          )}

          {mode === 'CUSTOMER' ? (
            !otpStep ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="customer-mobile" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                      +91
                    </div>
                    <input
                      id="customer-mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder="98250 12345"
                      className="w-full pl-14 pr-4 py-3 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none transition-all"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    We will send a 4-digit verification code via secure SMS.
                  </p>
                </div>

                <Button
                  type="submit"
                  isLoading={isLoading || animState === 'sending'}
                  className="w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-[#0054A6]/20"
                >
                  Send 4-Digit OTP <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500">First time buying or B2B enterprise? </span>
                  <Link
                    href={`/register?returnUrl=${encodeURIComponent(returnUrl)}`}
                    className="text-xs font-bold text-[#0054A6] hover:underline"
                  >
                    Register Account
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
                        setAnimState('idle');
                      }}
                      className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <ArrowLeft className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  {devOtp && (
                    <div className="mt-1 p-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 rounded font-mono font-bold text-emerald-700 dark:text-emerald-300 text-center">
                      Dev Code: {devOtp}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="otp-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 text-center">
                    Enter 4-Digit Verification Code
                  </label>
                  <input
                    id="otp-input"
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    placeholder="• • • •"
                    className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0054A6] focus:outline-none transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  isLoading={isLoading || animState === 'pending'}
                  className="w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-[#0054A6]/20"
                >
                  Verify & Continue
                </Button>

                <div className="flex justify-between items-center pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setOtp('');
                      setAnimState('idle');
                    }}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  {cooldown > 0 ? (
                    <span className="text-slate-400 font-mono">
                      Resend in {cooldown}s
                    </span>
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
            )
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Staff / Admin Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@apolloengineering.co.in"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    6-Digit Authenticator TOTP
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">(If 2FA enabled)</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-xl font-mono font-bold tracking-widest py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                isLoading={isLoading || animState === 'pending'}
                variant="secondary"
                className="w-full py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
              >
                Access Admin Portal <Lock className="w-4 h-4 ml-1.5" />
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading Apollo Portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
