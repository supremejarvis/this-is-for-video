import { motion } from "motion/react";
import { Award, Users, Globe, Building2 } from "lucide-react";

export function AboutUs() {
  const stats = [
    { icon: <Building2 className="w-5 h-5" />, label: "Nature of Business", value: "Manufacturer" },
    { icon: <Users className="w-5 h-5" />, label: "Total Number of Employees", value: "Up to 10 People" },
    { icon: <Award className="w-5 h-5" />, label: "Year of Establishment", value: "2023" },
    { icon: <Globe className="w-5 h-5" />, label: "Legal Status of Firm", value: "Individual - Proprietor" },
  ];

  return (
    <section id="about" className="px-6 py-24 bg-bg-deep/50" aria-labelledby="about-title">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="label-caps mb-4 block text-accent">About Apollo Engineering</span>
            <h2 id="about-title" className="font-display text-5xl md:text-6xl font-black mb-8 text-deep-blue leading-[1.1] tracking-tighter">
              Leading Manufacturer of <br />
              <span className="bg-gradient-to-r from-brand-blue to-accent bg-clip-text text-transparent">Solar Maintenance Hardware</span>
            </h2>
            <p className="text-text-dim text-xl leading-relaxed mb-8 font-light max-w-xl">
              Established in 2023, Apollo Engineering has quickly become a trusted name in the solar industry. Based in Ahmedabad, Gujarat, we specialize in the design and manufacture of high-performance SS304 Solar Sprinklers, Draining Clamps, and specialized mounting hardware.
            </p>
            <p className="text-text-dim text-base leading-relaxed mb-12 font-light max-w-xl opacity-80">
              Our mission is to empower solar plant owners with durable, efficient, and cost-effective maintenance solutions that maximize energy yield and protect long-term investments. We pride ourselves on our precision engineering and commitment to using only the highest quality materials.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12" aria-label="Company Statistics">
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-bg-card/30 border border-border-dim hover:border-accent/30 transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform" aria-hidden="true">
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-text-dim mb-0.5">{stat.label}</div>
                    <div className="text-sm font-display font-medium text-text-main">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-solar-gold/5 border border-solar-gold/20 mb-8">
              <h3 className="label-caps !text-[10px] mb-4 text-solar-gold">Our Quality Commitment</h3>
              <p className="text-sm text-text-dim font-light leading-relaxed">
                At Apollo Engineering, quality is not just a goal; it's our foundation. Every batch of SS304 hardware undergoes rigorous stress and corrosion testing to ensure it meets the demanding standards of the Indian solar sector.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {["GST Compliant", "SS304 Certified", "Made in India", "EPC Trusted"].map((tag) => (
                <div key={tag} className="px-3 py-1.5 rounded-full bg-border-dim border border-border-dim text-[9px] uppercase tracking-widest text-text-dim font-bold">
                  {tag}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl overflow-hidden glass p-2">
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                preload="metadata"
                poster="/solar_sprinkler.webp"
                className="w-full h-full object-cover rounded-2xl opacity-90 transition-all duration-700"
              >
                <source src="/hero.webm" type="video/webm" />
                <track kind="captions" srcLang="en" src="/captions.vtt" label="English" default />
              </video>
            </div>
            {/* Floating Badge */}
            <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-3xl border border-border-dim shadow-2xl">
              <div className="text-3xl md:text-5xl font-display font-black bg-gradient-to-br from-brand-blue to-accent bg-clip-text text-transparent mb-1">100%</div>
              <div className="label-caps !text-[9px] md:!text-[10px] text-brand-blue">Quality Inspected</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
