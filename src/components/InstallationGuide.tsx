import React from "react";
import { motion } from "motion/react";
import { Wrench, Lightbulb } from "lucide-react";

export interface Step {
  title: string;
  desc: string;
}

export interface GuideProps {
  key?: React.Key;
  title?: string;
  steps?: Step[];
  tip?: string;
}

const DEFAULT_STEPS: Step[] = [
  {
    title: "Frame Attachment",
    desc: "Snap the SS304 Auto Drain Clips to the lower edge frame of the solar panel without tools."
  },
  {
    title: "Pipe Mounting",
    desc: "Secure the ½-inch UPVC/CPVC pipeline along the module frame using Apollo GI Pipe Clamps."
  },
  {
    title: "Sprinkler Threading",
    desc: "Thread the SS304 Shadowless Sprinkler into the Brass Tee and connect to the pump line."
  }
];

const DEFAULT_TIP = "Ensure operating water pressure is maintained between 2 to 4 Bar for uniform 180° water curtain coverage across all panels.";

export function InstallationGuide({ 
  title = "Quick 3-Step Solar Sprinkler & Drain Clip Installation", 
  steps = DEFAULT_STEPS, 
  tip = DEFAULT_TIP 
}: Partial<GuideProps>) {
  return (
    <section className="px-6 mb-20" aria-labelledby="installation-title">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white/80 backdrop-blur-xl border border-border-dim rounded-3xl p-10 md:p-16 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" aria-hidden="true" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
              <Wrench className="w-7 h-7 text-brand-blue" aria-hidden="true" />
            </div>
            <div>
              <div className="label-caps !text-[9px] mb-1">Technical Manual</div>
              <h3 id="installation-title" className="font-display text-3xl font-light text-text-main">
                {title}
              </h3>
            </div>
          </div>
          
          <div className="px-4 py-2 rounded-full bg-border-dim border border-border-dim text-[10px] font-mono text-text-dim uppercase tracking-widest">
            Manual ID: AE-2024-INST
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10" aria-label="Installation Steps">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-bg-deep border border-border-dim text-brand-blue font-mono font-bold text-base flex items-center justify-center shrink-0 group-hover:border-brand-blue/40 transition-colors" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h4 className="font-display font-medium text-lg mb-2 text-deep-blue group-hover:text-brand-blue transition-colors">{step.title}</h4>
                  <p className="text-sm text-text-dim leading-relaxed font-light">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 p-6 rounded-2xl bg-bg-deep/50 border border-border-dim flex gap-5 items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05]" aria-hidden="true">
            <Lightbulb className="w-24 h-24 text-brand-blue" />
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0" aria-hidden="true">
            <Lightbulb className="w-5 h-5 text-brand-blue" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-blue mb-1">Expert Recommendation</div>
            <p className="text-sm text-text-dim leading-relaxed font-light">
              {tip}
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
