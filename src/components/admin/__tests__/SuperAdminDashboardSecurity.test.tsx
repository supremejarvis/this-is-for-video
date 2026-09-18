import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { SuperAdminDashboard } from '../SuperAdminDashboard';

describe('SuperAdminDashboard Security & Backdoor Eradication (P0-002)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    sessionStorage.clear();
    localStorage.clear();
  });

  it('fails closed on mount: sessionStorage alone cannot manufacture authenticated admin state', async () => {
    // Attempt to forge an admin session in browser storage
    sessionStorage.setItem('apollo_admin_session', 'active');

    // Backend returns 401 Unauthorized for /api/v1/auth/me
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Not authenticated' }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });

    render(
      <MemoryRouter>
        <SuperAdminDashboard />
      </MemoryRouter>
    );

    // Must remain on the login form, NOT load the admin dashboard desk
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Apollo Admin Portal/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/APE Store Product & Variant Matrix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Apollo Engineering Administrator/i)).not.toBeInTheDocument();
  });

  it('fails closed on login: network error does not grant offline Super Admin access even with former backdoor password', async () => {
    // Mock /api/v1/auth/me returning 401 on mount, and network error on admin-login
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Not authenticated' }),
        });
      }
      if (url.includes('/api/v1/auth/admin-login')) {
        return Promise.reject(new Error('Failed to fetch (Network offline)'));
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });

    render(
      <MemoryRouter>
        <SuperAdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    });

    // Step 1: Enter email & password and advance to Google Authenticator
    const emailInput = screen.getByPlaceholderText(/admin@apolloengineering\.co\.in/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: 'admin@apolloengineering.co.in' } });
    fireEvent.change(passwordInput, { target: { value: 'NIL@apl321' } });

    const nextBtn = screen.getByRole('button', { name: /Sign In as Administrator/i });
    fireEvent.click(nextBtn);

    // Step 2: Now in GOOGLE_AUTH stage, enter code and attempt to verify
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/000000/i)).toBeInTheDocument();
    });

    const totpInput = screen.getByPlaceholderText(/000000/i);
    fireEvent.change(totpInput, { target: { value: '123456' } });

    const submitBtn = screen.getByRole('button', { name: /Verify & Enter Admin Console/i });
    fireEvent.click(submitBtn);

    // Must display error and NEVER log in
    await waitFor(() => {
      expect(screen.getByText(/Backend authentication service offline/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Apollo Engineering · Operations Center/i)).not.toBeInTheDocument();
  });

  it('authenticates only when backend /api/v1/auth/admin-login returns 200 with verified user profile', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/auth/me')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Not authenticated' }),
        });
      }
      if (url.includes('/api/v1/auth/admin-login')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Super Admin authenticated successfully',
            user: {
              id: 'u_verified_owner_123',
              email: 'admin@apolloengineering.co.in',
              full_name: 'Verified Apollo Owner',
              role: 'OWNER',
              is_superuser: true,
              phone: '8511626267',
            },
          }),
        });
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });

    render(
      <MemoryRouter>
        <SuperAdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/admin@apolloengineering\.co\.in/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: 'admin@apolloengineering.co.in' } });
    fireEvent.change(passwordInput, { target: { value: 'StrongVerifiedPassword#2026' } });

    const nextBtn = screen.getByRole('button', { name: /Sign In as Administrator/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/000000/i)).toBeInTheDocument();
    });

    const totpInput = screen.getByPlaceholderText(/000000/i);
    fireEvent.change(totpInput, { target: { value: '849201' } });

    const submitBtn = screen.getByRole('button', { name: /Verify & Enter Admin Console/i });
    fireEvent.click(submitBtn);

    // Should transition to authenticated dashboard
    await waitFor(() => {
      expect(screen.getByText(/Apollo Engineering · Operations Center/i)).toBeInTheDocument();
    });
  });
});
