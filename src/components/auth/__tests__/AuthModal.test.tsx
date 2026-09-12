import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthModal } from '../AuthModal';
import { useStore } from '../../../store/useStore';
import { msg91OtpService } from '../../../services/msg91OtpService';

describe('APE Store Customer Login Modal Redesign', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      isAuthModalOpen: true,
      currentUser: {
        id: 'usr_test_default',
        name: 'Guest Customer',
        email: 'guest@example.com',
        phone: '+91 9999999999',
        role: 'B2C_CUSTOMER',
        isPrime: true,
        createdAt: new Date().toISOString()
      },
      appMode: 'B2C'
    });
    vi.clearAllMocks();
  });

  it('renders clean Apollo Engineering customer branding and text', () => {
    render(<AuthModal />);

    expect(screen.getByRole('heading', { name: /Welcome to APE Store/i })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to view your orders, invoices and dispatch updates/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Apollo Engineering/i)).toBeInTheDocument();
  });

  it('strictly REMOVES all internal testing and persona profile switchers', () => {
    render(<AuthModal />);

    // Persona switchers and admin testing elements must never be present
    expect(screen.queryByText(/Quick Persona Profile Switcher/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/B2C Customer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/B2B Admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Super Admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/APE Priority Dispatch Onboarding/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kathwada Origin \(382430\)/i)).not.toBeInTheDocument();
  });

  it('displays the mobile number section with fixed +91 prefix and customer security message', () => {
    render(<AuthModal />);

    expect(screen.getByText('+91')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Enter 10-digit mobile number');
    expect(input).toBeInTheDocument();
    expect(screen.getByText(/We’ll send a secure 4-digit OTP to verify your mobile number/i)).toBeInTheDocument();
  });

  it('keeps SEND 4-DIGIT OTP button disabled until exactly 10 numeric digits are entered', () => {
    render(<AuthModal />);

    const sendBtn = screen.getByRole('button', { name: /SEND 4-DIGIT OTP/i });
    expect(sendBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('Enter 10-digit mobile number');

    // Enter incomplete number (9 digits)
    fireEvent.change(input, { target: { value: '982501234' } });
    expect(sendBtn).toBeDisabled();

    // Enter exactly 10 digits
    fireEvent.change(input, { target: { value: '9825012345' } });
    expect(sendBtn).not.toBeDisabled();
  });

  it('shows 3 compact trust indicators and legal links on the customer login form', () => {
    render(<AuthModal />);

    expect(screen.getByText(/Secure OTP Login/i)).toBeInTheDocument();
    expect(screen.getByText(/GST Invoice Available/i)).toBeInTheDocument();
    expect(screen.getByText(/Order & Dispatch Tracking/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Terms & Conditions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Privacy Policy/i })).toBeInTheDocument();
  });

  it('transitions to 4-digit OTP verification screen upon sending OTP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'OTP dispatched successfully'
      })
    } as Response);

    render(<AuthModal />);

    const input = screen.getByPlaceholderText('Enter 10-digit mobile number');
    fireEvent.change(input, { target: { value: '9825012345' } });

    const sendBtn = screen.getByRole('button', { name: /SEND 4-DIGIT OTP/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/auth/otp/send', expect.any(Object));
      expect(screen.getByRole('heading', { name: /Verify Your Mobile Number/i })).toBeInTheDocument();
      expect(screen.getByText(/\+91 XXXXXXX345/i)).toBeInTheDocument();
    });

    // Verify 4 separate OTP input boxes are present
    expect(screen.getByLabelText('Digit 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 4')).toBeInTheDocument();

    // Verify button and navigation
    expect(screen.getByRole('button', { name: /VERIFY & SIGN IN/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Number/i })).toBeInTheDocument();
  });

  it('allows switching to Create Account (Signup) and back to Sign In', () => {
    render(<AuthModal />);

    const createAccountBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(createAccountBtn);

    // Now in Sign Up view
    expect(screen.getByRole('heading', { name: /Create Your Account/i })).toBeInTheDocument();
    expect(screen.getByText(/Full Name \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Email Address \*/i)).toBeInTheDocument();

    // Switch back to Sign In
    const signInBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(signInBtn);

    expect(screen.getByRole('heading', { name: /Welcome to APE Store/i })).toBeInTheDocument();
  });

  it('closes modal when close button (X) is clicked', () => {
    render(<AuthModal />);

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    expect(useStore.getState().isAuthModalOpen).toBe(false);
  });

  it('closes modal when Escape key is pressed', () => {
    render(<AuthModal />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useStore.getState().isAuthModalOpen).toBe(false);
  });
});
