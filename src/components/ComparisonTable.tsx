import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";

const products = [
  {
    name: "Solar Sprinkler",
    material: "SS304 Stainless Steel",
    warranty: "10 Years (Rust/Corrosion)",
    keyBenefit: "15-20% Output Boost",
    installation: "Threaded (1/2\" BSP)",
    maintenance: "Auto-Cleaning",
    durability: "Extreme (Medical Grade)",
  },
  {
    name: "Auto Drain Clips",
    material: "SS304 Stainless Steel",
    warranty: "10 Years",
    keyBenefit: "Prevents Mud Belts",
    installation: "Snap-On (Tool-Free)",
    maintenance: "Passive Siphon",
    durability: "High (UV Resistant)",
  },
  {
    name: "GI Pipe Clamp",
    material: "Galvanized Iron",
    warranty: "N/A",
    keyBenefit: "Vibration Control",
    installation: "Bolt & U-Hook",
    maintenance: "Zero Maintenance",
    durability: "High (Industrial)",
  }
];

const features = [
  { label: "Material", key: "material" },
  { label: "Warranty", key: "warranty" },
  { label: "Primary Benefit", key: "keyBenefit" },
  { label: "Installation Type", key: "installation" },
  { label: "Maintenance", key: "maintenance" },
  { label: "Durability", key: "durability" },
];

export function ComparisonTable() {
  return (
    <section className="px-6 py-20 overflow-hidden">
      <div className="text-center mb-16">
        <span className="label-caps mb-4 block">Side-by-Side</span>
        <h2 className="font-display text-4xl md:text-5xl font-light mb-6 text-text-main">
          Product <span className="text-accent">Comparison</span>
        </h2>
        <div className="w-20 h-[1px] bg-accent mx-auto rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="overflow-x-auto pb-8">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid grid-cols-[200px_1fr_1fr_1fr] border-b border-border-dim pb-6">
              <div />
              {products.map((p, i) => (
                <div key={i} className="px-6 text-center">
                  <div className="label-caps !text-[10px] !tracking-[2px] mb-2 opacity-50">Product 0{i+1}</div>
                  <div className="font-display text-xl font-bold text-text-main">{p.name}</div>
                </div>
              ))}
            </div>

            {/* Rows */}
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="grid grid-cols-[200px_1fr_1fr_1fr] border-b border-border-dim/50 py-6 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center text-xs font-bold uppercase tracking-widest text-text-dim group-hover:text-accent transition-colors">
                  {feature.label}
                </div>
                {products.map((p, i) => (
                  <div key={i} className="px-6 text-center flex items-center justify-center text-sm text-text-main/80 font-mono">
                    {p[feature.key as keyof typeof p]}
                  </div>
                ))}
              </motion.div>
            ))}

            {/* Icons Row */}
            <div className="grid grid-cols-[200px_1fr_1fr_1fr] py-8">
              <div className="flex items-center text-xs font-bold uppercase tracking-widest text-text-dim">
                SS304 Grade
              </div>
              <div className="flex justify-center"><Check className="text-accent w-5 h-5" /></div>
              <div className="flex justify-center"><Check className="text-accent w-5 h-5" /></div>
              <div className="flex justify-center"><Minus className="text-text-dim w-5 h-5 opacity-30" /></div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-6 rounded-2xl bg-bg-card border border-border-dim text-center">
          <p className="text-sm text-text-dim italic">
            * All products are manufactured in Kathwada GIDC, Ahmedabad and undergo rigorous quality testing for solar environments.
          </p>
        </div>
      </div>
    </section>
  );
}
