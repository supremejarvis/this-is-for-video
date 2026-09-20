'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, ArrowLeft, Phone, Lock, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, verifyOtp, loginAdmin, isLoading, error } = useAuth();

  const [mode, setMode] = useState<'CUSTOMER' | 'ADMIN'>('CUSTOMER');
  const [mobile, setMobile] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Admin state
  const [adminEmail, setAdminEmail] = useState('admin@apolloengineering.co.in');
  const [adminPassword, setAdminPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!mobile || mobile.replace(/\D/g, '').length !== 10) {
      setLocalError('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      const res = await sendOtp(mobile);
      setOtpStep(true);
      if (res?.dev_code) {
        setDevOtp(res.dev_code);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!otp || otp.length < 4) {
      setLocalError('Please enter the 4-digit OTP.');
      return;
    }
    try {
      await verifyOtp(mobile, otp);
      router.push('/store');
    } catch (err: any) {
      setLocalError(err?.message || 'Invalid or expired OTP');
    }
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
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#0054A6] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-[#0054A6]/20">
            A
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Apollo Engineering
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
          Industrial Solar Cleaning Hardware Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
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
              Customer / B2B Login
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
              Admin TOTP
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-medium text-sm">
                      +91
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="98765 43210"
                      className="w-full pl-12 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                    />
                  </div>
                </div>

                <Button type="submit" isLoading={isLoading} className="w-full py-2.5 rounded-xl font-bold">
                  Send 4-Digit OTP <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                <div className="pt-4 text-center">
                  <span className="text-xs text-slate-500">New customer or B2B enterprise? </span>
                  <Link
                    href="/register"
                    className="text-xs font-bold text-[#0054A6] hover:underline"
                  >
                    Register Account
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                  <span>Enter OTP sent to </span>
                  <span className="font-bold">+91 {mobile}</span>
                  {devOtp && (
                    <div className="mt-1 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Dev Testing OTP: {devOtp}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    4-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full text-center text-xl font-mono font-bold tracking-widest py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0054A6] focus:outline-none"
                  />
                </div>

                <Button type="submit" isLoading={isLoading} className="w-full py-2.5 rounded-xl font-bold">
                  Verify & Log In
                </Button>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpStep(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Edit Number
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs font-semibold text-[#0054A6] hover:underline"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Admin Email
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
                  <span className="text-[10px] text-slate-400 font-mono">(Optional if 2FA disabled)</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-xl font-mono font-bold tracking-widest py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                variant="secondary"
                className="w-full py-2.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Access Admin Portal <Lock className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Store
            </Link>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 256-Bit SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
