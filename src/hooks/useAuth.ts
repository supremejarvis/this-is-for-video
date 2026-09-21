'use client';

import { useStore } from '../store/useStore';
import { authApi } from '../services/api/authApi';
import { useState } from 'react';

export function useAuth() {
  const {
    currentUser,
    customerProfile,
    authStatus,
    checkAuthSession,
    setCurrentUser,
    logout: storeLogout,
    logoutAll: storeLogoutAll,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = authStatus === 'AUTHENTICATED' && Boolean(currentUser?.id && currentUser.id !== 'usr_guest');
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

  const verifyOtp = async (mobile: string, otp: string, challengeId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp({ mobile, otp, challenge_id: challengeId });
      // Recheck authoritative session to populate profile and backend state
      await checkAuthSession();
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
      await checkAuthSession();
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
      await storeLogout();
    } catch {
      // ignore
    }
  };

  const logoutAll = async () => {
    try {
      await storeLogoutAll();
    } catch {
      // ignore
    }
  };

  return {
    currentUser,
    customerProfile,
    authStatus,
    isAuthenticated,
    isAdmin,
    isB2B,
    isLoading,
    error,
    sendOtp,
    verifyOtp,
    loginAdmin,
    logout,
    logoutAll,
    checkAuthSession,
    isAuthModalOpen,
    openAuthModal: () => setIsAuthModalOpen(true),
    closeAuthModal: () => setIsAuthModalOpen(false),
  };
}
