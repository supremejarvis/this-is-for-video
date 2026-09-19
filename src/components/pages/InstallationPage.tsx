'use client';

import React from 'react';
import { InstallationGuide } from '../InstallationGuide';
import { ComparisonTable } from '../ComparisonTable';
import { WhyUs } from '../WhyUs';
import { FAQ } from '../FAQ';
import { useStore } from '../../store/useStore';
import { Wrench, Lightbulb, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const InstallationPage: React.FC = () => {
  const { setActiveTab } = useStore();

  const guides = [
    {
      title: "SS304 Auto Drain Clips — Snap-On Installation",
      steps: [
        {
          title: "Position at Lower Panel Edge",
          desc: "Locate the lowest corner/bottom border of the solar module frame where rainwater and dirt accumulate."
        },
        {
          title: "Tool-Free Snap-On Click",
          desc: "Simply press the SS304 clip until it snaps securely over the aluminum frame (compatible with 28mm to 40mm profiles)."
        },
        {
          title: "Capillary Siphon Action",
          desc: "The internal capillary channel automatically siphons standing water and sludge over the panel border continuously."
        }
      ],
      tip: "Install 2 clips per solar panel for optimal drainage of wide 550W+ bifacial modules."
    },
    {
      title: "SS304 Solar Sprinkler & Pipeline Mounting",
      steps: [
        {
          title: "Fix GI Pipe Clamps",
          desc: "Clamp the ½-inch UPVC/CPVC pipeline to the module mounting structure using Apollo heavy-duty GI Clamps without drilling."
        },
        {
          title: "Thread SS304 Sprinkler into Brass Tee",
          desc: "Thread the ½-inch BSP male thread into the reinforced Brass Tee for a 100% leak-proof connection."
        },
        {
          title: "Pressure & Flow Calibration",
          desc: "Connect to the 0.5 HP Submersible Pump and calibrate operating pressure between 2 to 4 Bar for a 180° uniform cleaning curtain."
        }
      ],
      tip: "A single 0.5 HP pump comfortably powers 40 to 50 Apollo Sprinklers simultaneously."
    }
  ];

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 space-y-16 max-w-7xl mx-auto animate-fadeIn">
      {/* Signature Solar Engineered Header Banner */}
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-solar-gold/30 rounded-3xl p-8 md:p-12 text-slate-900 shadow-xl space-y-4">
        {/* Warm Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(0,84,166,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-solar-gold/50 bg-solar-gold/[0.08] backdrop-blur-md text-slate-900 text-xs font-mono font-extrabold shadow-sm">
            <Wrench className="w-3.5 h-3.5 text-solar-gold" />
            <span className="bg-gradient-to-r from-solar-gold via-accent to-solar-gold bg-clip-text text-transparent tracking-widest uppercase">
              Official Technical Manual & DIY SOP
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-deep-blue leading-[1.05] tracking-tight">
            Solar Plant Installation <br />
            <span className="bg-gradient-to-r from-brand-blue via-solar-gold to-accent bg-clip-text text-transparent">
              & Maintenance Blueprint
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-600 font-normal max-w-3xl leading-relaxed">
            Comprehensive step-by-step engineering guides for zero-shading SS304 solar sprinklers, automatic drain clips, and pressure-balanced piping hardware. DIY-friendly, 100% tool-free snap-on mounting engineered for residential rooftops and utility-scale MW solar plants.
          </p>
        </div>
      </div>

      {/* Installation Manual Cards */}
      <div className="space-y-12">
        {guides.map((g, idx) => (
          <InstallationGuide
            key={idx}
            title={g.title}
            steps={g.steps}
            tip={g.tip}
          />
        ))}
      </div>

      {/* Comparison: Apollo SS304 vs Conventional Cleaners */}
      <ComparisonTable />

      {/* Why Choose Apollo Hardware */}
      <WhyUs />

      {/* FAQ Section */}
      <FAQ />

      {/* Bottom CTA to Store */}
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-solar-gold/40 rounded-3xl p-8 md:p-10 text-slate-900 flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="absolute top-0 right-0 w-60 h-60 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold text-solar-gold">
            FACTORY DIRECT PROCUREMENT
          </div>
          <h3 className="font-display text-2xl md:text-3xl font-black text-slate-900">Ready to Automate Your Solar Cleaning?</h3>
          <p className="text-xs text-slate-600">Order individual SS304 components or complete 5–10 kW sets with direct Kathwada Factory Hub dispatch.</p>
        </div>
        <button
          onClick={() => setActiveTab('store')}
          className="relative z-10 px-8 py-3.5 bg-gradient-to-r from-brand-blue to-accent hover:opacity-95 text-white font-display font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-brand-blue/20 transition-all flex items-center gap-2 hover:scale-105"
        >
          <span>Explore APE Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
