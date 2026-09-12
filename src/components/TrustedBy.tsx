import { motion } from "motion/react";

const clientCategories = [
  { name: "Utility Scale EPC Contractors", count: "100+ Projects" },
  { name: "Solar Farm Developers", count: "50+ Megawatts" },
  { name: "Rooftop Commercial Installers", count: "500+ Rooftops" },
  { name: "Industrial Solar Maintenance", count: "Pan-India" },
  { name: "Government & OEM Suppliers", count: "Certified Quality" }
];

export function TrustedBy() {
  return (
    <section className="px-6 py-12" aria-label="Trusted By">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-text-dim/70">
            Trusted by Leading EPC Contractors &amp; Solar Developers Across India
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-wrap justify-center items-center gap-4 md:gap-6"
        >
          {clientCategories.map((cat, i) => (
            <div
              key={i}
              className="px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-md border border-border-dim shadow-sm flex items-center gap-3 hover:border-brand-blue/30 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-display font-medium text-deep-blue">{cat.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue font-semibold">{cat.count}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          className="h-[1px] bg-gradient-to-r from-transparent via-border-dim to-transparent mt-10"
        />
      </div>
    </section>
  );
}
