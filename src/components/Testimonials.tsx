import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rakesh Patel",
    role: "Project Head — Vivasvan Solar",
    quote: "Apollo's SS304 sprinklers have completely eliminated our panel cleaning downtime. The 180° coverage is flawless and the build quality is exceptional.",
    rating: 5,
  },
  {
    name: "Amit Singh",
    role: "EPC Contractor — Rajasthan",
    quote: "We installed 600+ Apollo drain clips across a 5 MW site. Zero complaints in 18 months. The capillary action works exactly as promised — no more mud belt issues.",
    rating: 5,
  },
  {
    name: "Sneha Mehta",
    role: "Operations — Gujarat Solar Park",
    quote: "The difference in output was visible within the first week. Clean panels, consistent 15-18% gain. Their AetherWash technology is genuinely innovative.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="px-6 py-24" aria-labelledby="testimonials-title">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-blue/10 bg-brand-blue/5 backdrop-blur-md mb-8">
            <Star className="w-4 h-4 text-brand-blue" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-blue">Testimonials</span>
          </span>
          <h2 id="testimonials-title" className="font-display text-5xl md:text-6xl font-black mb-6 text-deep-blue tracking-tighter">
            Trusted by <span className="bg-gradient-to-r from-brand-blue to-accent bg-clip-text text-transparent">Industry Leaders</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="relative bg-white/80 backdrop-blur-xl border border-border-dim rounded-2xl p-8 hover:border-brand-blue/20 hover:shadow-xl transition-all group"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-brand-blue/5 group-hover:text-brand-blue/10 transition-colors" />
              <div className="flex gap-1 mb-6">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-text-dim text-sm leading-relaxed font-light mb-8">&ldquo;{t.quote}&rdquo;</p>
              <div className="border-t border-border-dim pt-6">
                <div className="font-display font-bold text-deep-blue text-sm">{t.name}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-dim/60 mt-1">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
