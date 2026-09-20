'use client';

import { useStore } from '../store/useStore';
import { authApi } from '../services/api/authApi';
import { useState } from 'react';

export function useAuth() {
  const {
    currentUser,
    setCurrentUser,
    logout: storeLogout,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(currentUser);
  const isAdmin = Boolean(
    currentUser?.role &&
    (currentUser.role.includes('ADMIN') || currentUser.role === 'OWNER' || currentUser.role === 'SUPER_ADMIN')
  );
  const isB2B = Boolean(currentUser?.role && currentUser.role.includes('B2B'));

  const sendOtp = async (mobile: string, channel: 'SMS' | 'WHATSAPP' | 'VOICE' = 'SMS') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.sendOtp({ mobile, channel });
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Failed to send OTP';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (mobile: string, otp: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp({ mobile, otp });
      if (res.user) {
        setCurrentUser({
          id: res.user.id,
          name: res.user.name || 'Customer',
          email: res.user.email || '',
          phone: res.user.phone || mobile,
          role: (res.user.role as any) || 'B2C_CUSTOMER',
          isPrime: false,
          createdAt: res.user.created_at || new Date().toISOString(),
        });
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired OTP';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string, totpCode?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.adminLogin({
        email,
        password,
        totp_code: totpCode,
        totpCode,
      });
      if (res.user) {
        setCurrentUser({
          id: res.user.id,
          name: res.user.name || (res.user as any).full_name || 'Administrator',
          email: res.user.email || email,
          phone: res.user.phone || '',
          role: 'SUPER_ADMIN',
          isPrime: true,
          createdAt: res.user.created_at || new Date().toISOString(),
        });
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Admin authentication failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network logout failures
    } finally {
      storeLogout();
    }
  };

  return {
    currentUser,
    isAuthenticated,
    isAdmin,
    isB2B,
    isLoading,
    error,
    sendOtp,
    verifyOtp,
    loginAdmin,
    logout,
    isAuthModalOpen,
    openAuthModal: () => setIsAuthModalOpen(true),
    closeAuthModal: () => setIsAuthModalOpen(false),
  };
}
