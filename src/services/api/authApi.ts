/**
 * Apollo Engineering Auth & OTP Micro API Service
 * 
 * Endpoints:
 * - GET  /api/v1/auth/me          -> Fetch active authenticated user profile
 * - POST /api/v1/auth/login       -> Regular customer login with session cookie
 * - POST /api/v1/auth/admin-login -> Secure RBAC administrator login with TOTP
 * - POST /api/v1/auth/logout      -> Revoke session and clear cookies
 * - POST /api/v1/auth/otp/send    -> Send 4-digit mobile OTP via MSG91
 * - POST /api/v1/auth/otp/verify  -> Verify OTP and log in customer
 * - POST /api/v1/auth/otp/retry   -> Retry OTP dispatch via SMS/Voice
 */

import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  role: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
}

export interface LoginResponse {
  user: AuthUser;
  csrf_token?: string;
  message?: string;
}

export interface AdminLoginRequest {
  email: string;
  password?: string;
  totp_code?: string;
  totpCode?: string;
}

export interface SendOtpRequest {
  mobile: string;
  channel?: 'SMS' | 'WHATSAPP' | 'VOICE';
}

export interface SendOtpResponse {
  type: 'success' | 'error';
  message: string;
  request_id?: string;
  channel?: string;
  masked_phone?: string;
  cooldown_seconds?: number;
  dev_code?: string;
}

export interface VerifyOtpRequest {
  mobile: string;
  otp: string;
}

export interface VerifyOtpResponse {
  type: 'success' | 'error';
  message: string;
  isVerified: boolean;
  user?: AuthUser;
  csrf_token?: string;
}

export class AuthApi {
  /**
   * Check active session status without raising 401 on unauthenticated visitors
   */
  public async getSession(): Promise<{ authenticated: boolean; user?: AuthUser | null }> {
    return apiClient.get<{ authenticated: boolean; user?: AuthUser | null }>('/auth/session');
  }

  /**
   * Fetch current authenticated session user profile
   */
  public async getCurrentUser(): Promise<AuthUser> {
    return apiClient.get<AuthUser>('/auth/me');
  }

  /**
   * Customer Password/Direct Login
   */
  public async login(payload: { email: string; password?: string }): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', payload);
  }

  /**
   * RBAC Admin Login with mandatory TOTP MFA
   */
  public async adminLogin(payload: AdminLoginRequest): Promise<LoginResponse> {
    const cleanPayload = {
      email: payload.email,
      password: payload.password || '',
      totp_code: payload.totp_code || payload.totpCode || '',
    };
    return apiClient.post<LoginResponse>('/auth/admin-login', cleanPayload);
  }

  /**
   * End session and invalidate cookies
   */
  public async logout(): Promise<{ success: boolean; message?: string }> {
    return apiClient.post<{ success: boolean; message?: string }>('/auth/logout');
  }

  /**
   * Dispatch 4-digit OTP to user mobile
   */
  public async sendOtp(
    phoneOrMobile: string | ({ phone?: string; mobile?: string; channel?: string } & Record<string, any>),
    channel: 'SMS' | 'WHATSAPP' | 'VOICE' = 'SMS'
  ): Promise<any> {
    const payload = typeof phoneOrMobile === 'string'
      ? { phone: phoneOrMobile, mobile: phoneOrMobile, channel }
      : { phone: phoneOrMobile.phone || phoneOrMobile.mobile, mobile: phoneOrMobile.mobile || phoneOrMobile.phone, ...phoneOrMobile };
    return apiClient.post('/auth/otp/send', payload);
  }

  /**
   * Verify mobile OTP
   */
  public async verifyOtp(
    phoneOrMobile: string | { phone?: string; mobile?: string; otp: string },
    otp?: string
  ): Promise<any> {
    const payload = typeof phoneOrMobile === 'string'
      ? { phone: phoneOrMobile, mobile: phoneOrMobile, otp }
      : { phone: phoneOrMobile.phone || phoneOrMobile.mobile, mobile: phoneOrMobile.mobile || phoneOrMobile.phone, otp: phoneOrMobile.otp || otp };
    return apiClient.post('/auth/otp/verify', payload);
  }

  /**
   * Retry OTP dispatch
   */
  public async retryOtp(
    phoneOrMobile: string | ({ phone?: string; mobile?: string; channel?: string } & Record<string, any>),
    channel: 'SMS' | 'WHATSAPP' | 'VOICE' = 'SMS'
  ): Promise<any> {
    const payload = typeof phoneOrMobile === 'string'
      ? { phone: phoneOrMobile, mobile: phoneOrMobile, channel }
      : { phone: phoneOrMobile.phone || phoneOrMobile.mobile, mobile: phoneOrMobile.mobile || phoneOrMobile.phone, ...phoneOrMobile };
    return apiClient.post('/auth/otp/retry', payload);
  }

  /**
   * Update authenticated user's own profile (full_name and/or email)
   */
  public async updateProfile(payload: { full_name?: string; email?: string }): Promise<any> {
    return apiClient.patch('/auth/me', payload);
  }
}

export const authApi = new AuthApi();
