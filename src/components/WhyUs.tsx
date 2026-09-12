import { motion } from "motion/react";
import { Shield, Zap, Droplets, Factory, Package, BarChart3, TrendingUp, ShieldCheck, Wind } from "lucide-react";
import { cn } from "@/src/lib/utils";

const reasons = [
  {
    icon: <SunIcon />,
    title: "Solar-Optimized Design",
    desc: "Shadow-less sprinkler profiles eliminate shading loss. Every angle of our products is calculated for minimal panel impact."
  },
  {
    icon: <Shield className="w-8 h-8 text-solar-gold" />,
    title: "SS304 Precision",
    desc: "10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only. Not plastic, not zinc — SS304 for extreme outdoor durability."
  },
  {
    icon: <Droplets className="w-8 h-8 text-solar-gold" />,
    title: "AetherWash Technology",
    desc: "Precision 1.5mm 180° cut delivers same-pressure uniform water flow across entire panel surface — no hot spots."
  },
  {
    icon: <Factory className="w-8 h-8 text-solar-gold" />,
    title: "Made in Ahmedabad",
    desc: "Manufactured in Kathwada GIDC. Direct factory pricing with volume discounts — no middlemen, no markup."
  },
  {
    icon: <Package className="w-8 h-8 text-solar-gold" />,
    title: "MOQ Flexibility",
    desc: "Start from MOQ 120 units and scale up to 6000+ with progressive pricing — perfect for projects of any size."
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-solar-gold" />,
    title: "Performance Proven",
    desc: "Consistent 15–20% solar output improvement documented across installations. Clean panels = maximum yield."
  }
];

function SunIcon() {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.35)_0%,transparent_75%)] rounded-full" />
      <Zap className="w-8 h-8 text-solar-gold relative z-10" />
    </div>
  );
}

const stats = [
  { icon: <TrendingUp className="w-6 h-6" />, value: "50,000+", label: "Units Supplied" },
  { icon: <BarChart3 className="w-6 h-6" />, value: "15–20%", label: "Output Gain" },
  { icon: <ShieldCheck className="w-6 h-6" />, value: "30 Yrs", label: "SS304 Durability" },
  { icon: <Wind className="w-6 h-6" />, value: "2800 mm", label: "Cleaning Range" },
];

export function WhyUs() {
  return (
    <section id="why-us" className="px-6 py-24 relative overflow-hidden" aria-labelledby="why-us-title">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.06)_0%,rgba(212,175,55,0.02)_60%,transparent_100%)] pointer-events-none" aria-hidden="true" />

      <div className="text-center mb-20 relative z-10">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-solar-gold/20 bg-solar-gold/5 backdrop-blur-md mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-solar-gold" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-solar-gold">Competitive Edge</span>
        </span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          id="why-us-title"
          className="font-display text-5xl md:text-7xl font-black mb-6 text-deep-blue tracking-tighter"
        >
          Built on Trust &<br />
          <span className="bg-gradient-to-r from-solar-gold to-accent bg-clip-text text-transparent">Solar Expertise</span>
        </motion.h2>
      </div>

      {/* Stats Strip */}
      <div className="max-w-5xl mx-auto relative z-10 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="relative bg-white/80 backdrop-blur-xl border border-border-dim rounded-2xl p-6 text-center group hover:border-solar-gold/30 hover:shadow-lg hover:shadow-solar-gold/5 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-solar-gold/10 flex items-center justify-center mx-auto mb-4 text-solar-gold group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <div className="font-display text-3xl font-black text-deep-blue mb-1">{stat.value}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-dim">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto border border-border-dim rounded-2xl overflow-hidden glass relative z-10">
        {reasons.map((reason, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
            className={cn(
              "p-10 md:p-12 border-border-dim hover:bg-accent/[0.02] transition-colors group border-b border-r",
              "md:border-r-0 last:md:border-r-0",
              i % 3 !== 2 && "lg:border-r",
              i < 3 && "lg:border-b",
              i % 2 !== 1 && "md:border-r",
              i < 4 && "md:border-b"
            )}
          >
            <div className="mb-8 p-4 w-16 h-16 rounded-2xl bg-bg-deep border border-border-dim flex items-center justify-center group-hover:border-solar-gold/40 group-hover:scale-110 transition-all duration-500" aria-hidden="true">
              {reason.icon}
            </div>
            <h3 className="font-display text-xl font-medium mb-4 text-deep-blue group-hover:text-solar-gold transition-colors">{reason.title}</h3>
            <p className="text-sm text-text-dim leading-relaxed font-light">{reason.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
