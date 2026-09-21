'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Hero } from '../Hero';
import { 
  Building2, Users, Award, Globe, ShieldCheck, CheckCircle2, 
  MapPin, Phone, Mail, FileText, ArrowRight, Sparkles, AlertTriangle, 
  Clock, TrendingUp, DollarSign, Droplets, Zap, Check, X 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ORIGIN_HUB_PINCODE } from '../../services/logisticsService';

export function AboutPage() {
  const { setActiveTab } = useStore();

  const stats = [
    { icon: <Building2 className="w-5 h-5" />, label: "Nature of Business", value: "Manufacturer" },
    { icon: <Users className="w-5 h-5" />, label: "Total Number of Employees", value: "Up to 10 People" },
    { icon: <Award className="w-5 h-5" />, label: "Year of Establishment", value: "2023" },
    { icon: <Globe className="w-5 h-5" />, label: "Legal Status of Firm", value: "Individual - Proprietor" },
  ];

  const valueProps = [
    {
      icon: Clock,
      title: "Save Time & Labour",
      desc: "Fully automated daily cleaning cycles with zero manual climbing on solar rooftops.",
      badge: "Hands-Free"
    },
    {
      icon: TrendingUp,
      title: "High Energy Generation",
      desc: "Gain +15% to +20% higher solar electricity production year-round by eliminating dust and bird droppings.",
      badge: "+20% Yield"
    },
    {
      icon: DollarSign,
      title: "Low Investment, High ROI",
      desc: "Rapid payback within 3 to 6 months for both MW solar farms and residential rooftop installations.",
      badge: "Quick Payback"
    },
    {
      icon: Droplets,
      title: "Low Water Consumption",
      desc: "Precision low-flow AetherWash nozzles clean up to 50 panels simultaneously using just 4–7 LPM.",
      badge: "Eco-Saver"
    }
  ];

  return (
    <div className="min-h-screen py-6 px-4 md:px-8 space-y-20 max-w-7xl mx-auto animate-fadeIn">
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TOP: SOLAR ENGINEERED PIONEER HERO SHOWCASE */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Hero />
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: AUTHENTIC ABOUT APOLLO ENGINEERING (EXACT SCREENSHOT MATCH) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section id="about" className="relative" aria-labelledby="about-title">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Text Block & Stats */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] font-extrabold text-solar-gold block mb-3">
                About Apollo Engineering
              </span>
              <h1 id="about-title" className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-deep-blue leading-snug tracking-tight">
                Leading Manufacturer of <br />
                <span className="bg-gradient-to-r from-brand-blue to-accent bg-clip-text text-transparent box-decoration-clone">
                  Solar Maintenance Hardware
                </span>
              </h1>
            </div>

            <p className="text-text-dim text-base sm:text-lg leading-relaxed font-light">
              Established in 2023, Apollo Engineering has quickly become a trusted name in the solar industry. Based in Ahmedabad, Gujarat, we specialize in the design and manufacture of high-performance SS304 Solar Sprinklers, Draining Clamps, and specialized mounting hardware.
            </p>

            <p className="text-text-dim text-sm sm:text-base leading-relaxed font-light opacity-90">
              Our mission is to empower solar plant owners with durable, efficient, and cost-effective maintenance solutions that maximize energy yield and protect long-term investments. We pride ourselves on our precision engineering and commitment to using only the highest quality materials.
            </p>

            {/* 4 Exact Stat Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/80 border border-border-dim shadow-sm hover:border-solar-gold/40 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-mono tracking-[0.2em] text-text-dim mb-0.5">{stat.label}</div>
                    <div className="text-xs sm:text-sm font-display font-bold text-text-main">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Video Showcase with 100% Quality Inspected Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square sm:aspect-[4/3] lg:aspect-square rounded-[2.5rem] overflow-hidden bg-slate-900 border-2 border-border-dim shadow-2xl p-2 relative group">
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                poster="/solar_sprinkler.webp"
                className="w-full h-full object-cover rounded-[2rem] opacity-95"
              >
                <source src="/hero.webm" type="video/webm" />
              </video>
            </div>

            {/* Floating 100% Quality Inspected Badge */}
            <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-white/95 backdrop-blur-xl p-6 md:p-7 rounded-3xl border border-border-dim shadow-2xl space-y-0.5">
              <div className="text-3xl md:text-5xl font-display font-black bg-gradient-to-br from-brand-blue to-accent bg-clip-text text-transparent">
                100%
              </div>
              <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-blue">
                Quality Inspected
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: FULLY AUTOMATIC SYSTEM & MARKETING POWER PROPOSITION */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white rounded-[3rem] p-8 md:p-14 shadow-2xl border border-slate-800 space-y-12 relative overflow-hidden">
        {/* Ambient Backlight */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Section Header & Major Marketing Tagline */}
        <div className="text-center max-w-4xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            SAVE TIME · HIGH GENERATION · LOW WATER CONSUME · LOW INVESTMENT
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-md">
            SS304 Solar Sprinklers & Auto Drain Clips: <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
              One-Time Investment, Lifetime Solution
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-light max-w-2xl mx-auto leading-relaxed">
            Eliminate manual labour, reduce rooftop accident risks, and boost power generation continuously with Apollo Engineering's automated solar maintenance hardware.
          </p>
        </div>

        {/* 4 Value Proposition Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {valueProps.map((vp, idx) => (
            <div key={idx} className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-3 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <vp.icon className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-mono font-bold border border-slate-700">
                  {vp.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-display">{vp.title}</h3>
              <p className="text-xs text-slate-300 font-light leading-relaxed">{vp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: SS304 DRAIN CLIPS LIVE DEMONSTRATION & BENEFITS (2 VIDEOS) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-border-dim rounded-[3rem] p-8 md:p-14 shadow-xl space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-solar-gold/10 border border-solar-gold/30 text-solar-gold text-xs font-mono font-bold">
            <Zap className="w-3.5 h-3.5" />
            LIVE EXPERIMENTAL COMPARISON
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-deep-blue tracking-tight">
            SS304 Auto Drain Clips: Live Action Demo
          </h2>
          <p className="text-xs md:text-sm text-text-dim leading-relaxed font-light">
            Watch the stark difference between solar modules operating with and without Apollo SS304 Auto Drain Clips.
          </p>
        </div>

        {/* 2 Videos Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video 1: WITHOUT Drain Clips */}
          <div className="bg-white rounded-3xl overflow-hidden border-2 border-rose-300 shadow-xl flex flex-col justify-between">
            <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-rose-900">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                VIDEO 1: WITHOUT DRAIN CLIPS
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold border border-rose-300">
                Severe Sludge & Hot Spots
              </span>
            </div>

            <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                poster="/Drain_clips.webp"
                className="w-full h-full object-cover opacity-90"
              >
                <source src="/hero.webm" type="video/webm" />
              </video>

              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent p-4 flex flex-col justify-end">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold font-mono">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Bottom Frame Stagnation Zone: Mud Settling</span>
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-rose-600 text-white font-mono text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md">
                -25% ENERGY LOSS
              </div>
            </div>

            <div className="p-6 bg-white space-y-3 text-slate-700 text-xs border-t border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <X className="w-4 h-4 text-rose-500" />
                Consequences of Solar Panels Without Clips:
              </h4>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span><strong>Mud Belt Accumulation:</strong> Rainwater & dew cannot cross the aluminum frame border, creating mud crust.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span><strong>Thermal Hotspots:</strong> Shaded bottom solar cells overheat, degrading PV silicone modules permanently.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Video 2: WITH Apollo SS304 Clips */}
          <div className="bg-white rounded-3xl overflow-hidden border-2 border-emerald-300 shadow-xl flex flex-col justify-between">
            <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                VIDEO 2: WITH APOLLO SS304 CLIPS
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300">
                Automatic Siphon Active
              </span>
            </div>

            <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                poster="/Drain_clips.webp"
                className="w-full h-full object-cover"
              >
                <source src="/hero.webm" type="video/webm" />
              </video>

              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent p-4 flex flex-col justify-end">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Capillary Siphon Active: 100% Water & Dirt Discharged</span>
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-emerald-600 text-white font-mono text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md">
                +15%–20% YIELD BOOST
              </div>
            </div>

            <div className="p-6 bg-white space-y-3 text-slate-700 text-xs border-t border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Proven Benefits of Apollo SS304 Drain Clips:
              </h4>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>Continuous Capillary Siphoning:</strong> Automatically drains water over the frame without electricity.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span><strong>100% Medical Grade SS304:</strong> 10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA to Store */}
        <div className="p-6 bg-solar-gold/10 border border-solar-gold/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-black text-deep-blue text-sm">Need SS304 Auto Drain Clips for Your Solar Plant?</h4>
            <p className="text-xs text-text-dim">Packs of 50, 500, and 5,000 pcs available with immediate APE Express Shipping dispatch from Kathwada GIDC.</p>
          </div>
          <button
            onClick={() => {
              setActiveTab('store');
              window.history.pushState({}, '', '/store');
            }}
            className="px-6 py-3 bg-gradient-to-r from-brand-blue to-brand-blue/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2"
          >
            Order Drain Clips in APE Store <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
