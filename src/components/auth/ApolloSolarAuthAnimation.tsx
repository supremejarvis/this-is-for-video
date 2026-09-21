'use client';

import React from 'react';

export type AuthAnimState = 'idle' | 'typing' | 'sending' | 'pending' | 'success' | 'error';

interface ApolloSolarAuthAnimationProps {
  state: AuthAnimState;
  className?: string;
}

export const ApolloSolarAuthAnimation: React.FC<ApolloSolarAuthAnimationProps> = ({
  state,
  className = '',
}) => {
  // Determine brightness and color themes based on auth state
  const isTyping = state === 'typing';
  const isSpraying = state === 'sending';
  const isPending = state === 'pending';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  // Glow intensity
  const sunOpacity = isSuccess ? 0.95 : isTyping ? 0.8 : isPending ? 0.5 : isError ? 0.35 : 0.6;
  const panelGlow = isSuccess
    ? 'drop-shadow(0 0 16px rgba(14, 165, 233, 0.6))'
    : isError
    ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))'
    : isTyping
    ? 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.45))'
    : 'drop-shadow(0 0 4px rgba(0, 84, 166, 0.2))';

  return (
    <div
      aria-hidden="true"
      className={`relative w-full max-w-[280px] h-32 mx-auto flex flex-col items-center justify-center select-none pointer-events-none overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 320 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transition-all duration-500 ease-out motion-reduce:transition-none"
        style={{ filter: panelGlow }}
      >
        <defs>
          {/* Solar Panel Gradient */}
          <linearGradient id="solarCellGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a2540" />
            <stop offset="50%" stopColor="#0054A6" />
            <stop offset="100%" stopColor="#002d5a" />
          </linearGradient>

          {/* Stainless Steel SS304 Frame */}
          <linearGradient id="ss304Frame" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Sun & Light Beam Gradient */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isError ? '#f87171' : '#fbbf24'} stopOpacity="0.9" />
            <stop offset="60%" stopColor={isSuccess ? '#38bdf8' : '#f59e0b'} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0054A6" stopOpacity="0" />
          </radialGradient>

          {/* Water Droplet Gradient */}
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Ambient Sun & Light Rays */}
        <g
          className="transition-opacity duration-700 ease-in-out motion-reduce:transition-none"
          style={{ opacity: sunOpacity }}
        >
          <circle cx="160" cy="24" r="28" fill="url(#sunGlow)" />
          {/* Subtle radiating lines */}
          <line x1="160" y1="2" x2="160" y2="10" stroke={isError ? '#f87171' : '#f59e0b'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="138" y1="10" x2="144" y2="16" stroke={isError ? '#f87171' : '#f59e0b'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="182" y1="10" x2="176" y2="16" stroke={isError ? '#f87171' : '#f59e0b'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="126" y1="24" x2="134" y2="24" stroke={isError ? '#f87171' : '#f59e0b'} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="186" y1="24" x2="194" y2="24" stroke={isError ? '#f87171' : '#f59e0b'} strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Photovoltaic Solar Panel Module */}
        <g transform="translate(60, 52)">
          {/* Outer SS304 Aluminium Anodized Frame */}
          <rect
            x="0"
            y="0"
            width="200"
            height="72"
            rx="4"
            fill="url(#ss304Frame)"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* PV Cell Matrix Background */}
          <rect
            x="4"
            y="4"
            width="192"
            height="64"
            rx="2"
            fill="url(#solarCellGrad)"
          />

          {/* Cell Grid Lines (Busbars and cell divisions) */}
          <g stroke="rgba(255,255,255,0.25)" strokeWidth="0.75">
            {/* Vertical busbars */}
            <line x1="52" y1="4" x2="52" y2="68" />
            <line x1="100" y1="4" x2="100" y2="68" />
            <line x1="148" y1="4" x2="148" y2="68" />

            {/* Horizontal divisions */}
            <line x1="4" y1="25" x2="196" y2="25" />
            <line x1="4" y1="46" x2="196" y2="46" />
          </g>

          {/* High-efficiency solar reflection sheen */}
          <path
            d="M 6 6 L 50 6 L 16 66 L 6 66 Z"
            fill="rgba(255, 255, 255, 0.08)"
          />
        </g>

        {/* Apollo SS304 Solar Sprinkler Head Mounted at Top-Center */}
        <g transform="translate(152, 44)">
          {/* SS304 Pipe mount */}
          <rect x="6" y="0" width="4" height="10" fill="url(#ss304Frame)" stroke="#475569" strokeWidth="0.5" />
          {/* 180-degree spray nozzle body */}
          <path
            d="M 2 10 L 14 10 L 11 15 L 5 15 Z"
            fill={isSpraying ? '#38bdf8' : '#64748b'}
            stroke="#334155"
            strokeWidth="0.75"
          />
        </g>

        {/* Micro-Sprinkler Water Droplets (Active during sending & pending) */}
        {(isSpraying || isPending) && (
          <g className="animate-pulse motion-reduce:animate-none">
            {/* Spray mist arc */}
            <circle cx="140" cy="62" r="1.75" fill="url(#waterGrad)" opacity="0.85" />
            <circle cx="148" cy="68" r="1.5" fill="url(#waterGrad)" opacity="0.9" />
            <circle cx="160" cy="70" r="2" fill="url(#waterGrad)" opacity="0.95" />
            <circle cx="172" cy="68" r="1.5" fill="url(#waterGrad)" opacity="0.9" />
            <circle cx="180" cy="62" r="1.75" fill="url(#waterGrad)" opacity="0.85" />
            <circle cx="132" cy="74" r="1.2" fill="url(#waterGrad)" opacity="0.75" />
            <circle cx="188" cy="74" r="1.2" fill="url(#waterGrad)" opacity="0.75" />
          </g>
        )}

        {/* Success Indicator Flare */}
        {isSuccess && (
          <g>
            <circle cx="160" cy="84" r="12" fill="rgba(14, 165, 233, 0.2)" className="animate-ping motion-reduce:animate-none" />
            <path
              d="M 154 84 L 158 88 L 167 79"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>

      {/* Subtle Apollo Clean Energy Tagline */}
      <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 mt-1">
        {isSuccess
          ? 'Session Authenticated'
          : isError
          ? 'Verification Neutral'
          : isSpraying
          ? 'Dispatching 4-Digit OTP...'
          : isPending
          ? 'Verifying Challenge...'
          : 'Apollo Solar • Kathwada Hub'}
      </span>
    </div>
  );
};
