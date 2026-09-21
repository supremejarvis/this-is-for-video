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

export interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  company_name?: string | null;
  gstin?: string | null;
  pan_number?: string | null;
  account_type: 'B2C' | 'B2B';
  kyc_status: string;
  terms_accepted: boolean;
  terms_accepted_at?: string | null;
  marketing_opt_in: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerAddress {
  id: string;
  customer_profile_id: string;
  address_type: 'BILLING' | 'SHIPPING' | 'SITE' | 'WAREHOUSE' | 'OFFICE';
  full_name: string;
  company_name?: string | null;
  phone: string;
  alternate_phone?: string | null;
  flat_building: string;
  street_area: string;
  landmark?: string | null;
  pincode: string;
  city: string;
  state: string;
  state_code: string;
  gstin?: string | null;
  is_default: boolean;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveSession {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  last_seen_at: string;
  created_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  expires_at?: string | null;
  is_current: boolean;
}

export interface VerifyOtpResponse {
  type: 'success' | 'error';
  message: string;
  isVerified: boolean;
  is_first_time?: boolean;
  user?: AuthUser;
  customer_profile?: CustomerProfile;
  csrf_token?: string;
}

export class AuthApi {
  /**
   * Check active session status without raising 401 on unauthenticated visitors
   */
  public async getSession(): Promise<{
    authenticated: boolean;
    user?: AuthUser | null;
    customer_profile?: CustomerProfile | null;
  }> {
    return apiClient.get<{
      authenticated: boolean;
      user?: AuthUser | null;
      customer_profile?: CustomerProfile | null;
    }>('/auth/session');
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
   * Revoke all active sessions across all devices for authenticated user
   */
  public async logoutAll(): Promise<{ success: boolean; revoked_count: number; message: string }> {
    return apiClient.post<{ success: boolean; revoked_count: number; message: string }>('/auth/logout-all');
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
    phoneOrMobile: string | { phone?: string; mobile?: string; otp: string; challenge_id?: string },
    otp?: string
  ): Promise<any> {
    const payload = typeof phoneOrMobile === 'string'
      ? { phone: phoneOrMobile, mobile: phoneOrMobile, otp }
      : {
          phone: phoneOrMobile.phone || phoneOrMobile.mobile,
          mobile: phoneOrMobile.mobile || phoneOrMobile.phone,
          otp: phoneOrMobile.otp || otp,
          challenge_id: phoneOrMobile.challenge_id,
        };
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

  /**
   * Customer Profile & Address Book Endpoints (Gate 2B/2C)
   */
  public async getCustomerProfile(): Promise<CustomerProfile> {
    return apiClient.get<CustomerProfile>('/customers/me');
  }

  public async updateCustomerProfile(payload: Partial<CustomerProfile>): Promise<CustomerProfile> {
    return apiClient.patch<CustomerProfile>('/customers/me', payload);
  }

  public async getCustomerAddresses(): Promise<CustomerAddress[]> {
    return apiClient.get<CustomerAddress[]>('/customers/me/addresses');
  }

  public async addCustomerAddress(
    payload: Omit<CustomerAddress, 'id' | 'customer_profile_id' | 'created_at' | 'updated_at'>
  ): Promise<CustomerAddress> {
    return apiClient.post<CustomerAddress>('/customers/me/addresses', payload);
  }

  public async updateCustomerAddress(
    addressId: string,
    payload: Partial<CustomerAddress>
  ): Promise<CustomerAddress> {
    return apiClient.put<CustomerAddress>(`/customers/me/addresses/${addressId}`, payload);
  }

  public async deleteCustomerAddress(addressId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/customers/me/addresses/${addressId}`);
  }

  public async getActiveSessions(): Promise<ActiveSession[]> {
    return apiClient.get<ActiveSession[]>('/customers/me/sessions');
  }
}

export const authApi = new AuthApi();
