import React from "react";
import { motion } from "motion/react";
import { 
  ArrowRight, Phone, Sun, Droplets, ShieldCheck, Sparkles, 
  Mail, ChevronsDown 
} from "lucide-react";
import { useStore } from "@/src/store/useStore";

export function Hero() {
  const { setActiveTab } = useStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] as const }
    }
  };

  const features = [
    {
      icon: Sun,
      title: "Shadowless Design",
      desc: "No more performance loss due to panel shadows."
    },
    {
      icon: Droplets,
      title: "Water Efficient",
      desc: "Maximum cleaning with minimal water consumption."
    },
    {
      icon: ShieldCheck,
      title: "Anti-Blocking",
      desc: "Premium SS304 build ensures zero clogging."
    }
  ];

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 md:px-8 pt-8 pb-16 overflow-hidden" aria-labelledby="hero-title">
      {/* Exact Warm Solar Ambient Lighting */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[25%] w-[35rem] h-[35rem] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.14)_0%,rgba(212,175,55,0.04)_45%,transparent_75%)]" />
        <div className="absolute bottom-[15%] right-[20%] w-[30rem] h-[30rem] bg-[radial-gradient(circle_at_center,rgba(245,130,32,0.10)_0%,rgba(245,130,32,0.03)_45%,transparent_75%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45rem] h-[45rem] bg-[radial-gradient(circle_at_center,rgba(0,84,166,0.08)_0%,rgba(0,84,166,0.02)_50%,transparent_75%)]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
        {/* Pioneered By Badge (Exact Match) */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2.5 px-6 py-2 rounded-full border border-solar-gold/50 bg-gradient-to-r from-solar-gold/15 via-solar-gold/5 to-solar-gold/15 backdrop-blur-md mb-5 shadow-[0_0_20px_rgba(212,175,55,0.25)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-solar-gold" />
          <span className="text-xs md:text-sm font-mono font-bold tracking-wide bg-gradient-to-r from-solar-gold via-accent to-solar-gold bg-clip-text text-transparent">
            Pioneered by Apollo Engineering
          </span>
          <Sparkles className="w-3.5 h-3.5 text-solar-gold" />
        </motion.div>

        {/* First Introduced Pill (Exact Match) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="inline-flex items-center gap-3 px-4 py-1 rounded-full border border-solar-gold/40 bg-solar-gold/[0.08] backdrop-blur-sm mb-6"
        >
          <div className="h-[1px] w-5 bg-gradient-to-r from-transparent to-solar-gold" />
          <span className="text-xs font-mono tracking-wider text-solar-gold font-bold">
            First Introduced · February 2025
          </span>
          <div className="h-[1px] w-5 bg-gradient-to-l from-transparent to-solar-gold" />
        </motion.div>

        {/* Massive SOLAR ENGINEERED Title (Exact Match) */}
        <motion.h1
          id="hero-title"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.1 }}
          className="font-display text-6xl sm:text-8xl md:text-9xl font-black leading-[0.92] tracking-tighter mb-5 text-deep-blue"
        >
          SOLAR<br />
          <span className="bg-gradient-to-r from-brand-blue via-solar-gold to-accent bg-clip-text text-transparent">
            ENGINEERED
          </span>
        </motion.h1>

        {/* Sub-headline (Exact Match) */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-3xl text-xl sm:text-2xl md:text-3xl text-deep-blue font-bold leading-snug mb-3"
        >
          India's First{" "}
          <span className="bg-gradient-to-r from-solar-gold via-accent to-solar-gold bg-clip-text text-transparent underline decoration-solar-gold decoration-2 underline-offset-4">
            Shadowless Solar Sprinklers
          </span>{" "}
          &{" "}
          <span className="bg-gradient-to-r from-solar-gold via-accent to-solar-gold bg-clip-text text-transparent underline decoration-solar-gold decoration-2 underline-offset-4">
            Auto Drain Clips
          </span>.
        </motion.h2>

        {/* In-House Manufacturing Subtitle (Exact Match) */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-xl text-xs sm:text-sm text-text-dim font-light italic leading-relaxed mb-8"
        >
          Designed, Developed, and Manufactured <span className="text-text-main font-medium not-italic">in-house</span> by <span className="text-text-main font-semibold not-italic">Apollo Engineering</span>.
        </motion.p>

        {/* 3 Core Feature Cards (Exact Match) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full mb-10"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="bg-white/80 backdrop-blur-xl border border-border-dim p-5 rounded-2xl shadow-lg hover:shadow-xl hover:border-solar-gold/40 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-solar-gold/20 to-accent/20 border border-solar-gold/30 flex items-center justify-center text-solar-gold mb-3 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base font-bold text-deep-blue mb-1">
                {f.title}
              </h3>
              <p className="text-xs text-text-dim leading-relaxed font-light">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* EPC Trust Divider & Stats (Exact Match) */}
        <div className="w-full max-w-3xl space-y-5 mb-8">
          <div className="flex items-center justify-center gap-4 text-[10px] uppercase font-mono font-bold tracking-[0.25em] text-text-dim/70">
            <div className="h-[1px] w-12 bg-border-dim" />
            <span>TRUSTED BY EPC CONTRACTORS ACROSS INDIA</span>
            <div className="h-[1px] w-12 bg-border-dim" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { value: "10 Yrs", label: "Rust Warranty" },
              { value: "SS304", label: "Premium Grade" },
              { value: "+20%", label: "Output Boost" },
              { value: "6", label: "Products" },
            ].map((st, i) => (
              <div key={i} className="space-y-0.5">
                <div className="font-display text-2xl md:text-3xl font-black text-deep-blue">{st.value}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-dim">{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              setActiveTab('store');
              window.history.pushState({}, '', '/store');
            }}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue/90 hover:from-brand-blue/90 hover:to-brand-blue text-white font-display font-bold text-xs uppercase tracking-wider shadow-xl shadow-brand-blue/20 hover:shadow-2xl transition-all flex items-center gap-2"
          >
            View Products <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveTab('contact');
              window.history.pushState({}, '', '/contact');
            }}
            className="px-7 py-3 rounded-xl bg-white hover:bg-slate-50 border border-border-dim text-deep-blue font-display font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4 text-accent" />
            Get a Quote
          </button>
        </div>
      </div>
    </section>
  );
}
