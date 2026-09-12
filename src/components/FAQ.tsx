import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Why should we use SS304 instead of plastic sprinklers?",
    answer: "Plastic degrades quickly under continuous UV exposure on solar rooftops, leading to cracks, leaks, and uneven cleaning. Our medical-grade SS304 sprinklers offer a 10-Year Rust-Proof Warranty (covers rust/corrosion only), handling high water pressure and extreme temperatures without fail."
  },
  {
    question: "What is the recommended water pressure for Apollo Sprinklers?",
    answer: "For optimal 180-degree AetherWash coverage, we recommend maintaining a water pressure between 2 to 4 Bar. This ensures a healthy flow rate of 4 to 7 Liters Per Minute (LPM) per sprinkler, efficiently washing the panels without wasting water."
  },
  {
    question: "How many Auto Drain Clips do I need per panel?",
    answer: "We recommend installing 2 Auto Drain Clips per solar panel on the bottom edge (lowest point) to ensure maximum capillary action and complete removal of stagnant muddy water."
  },
  {
    question: "Do you supply pan-India and what is the MOQ?",
    answer: "Yes, we supply to EPC contractors and solar parks across the entirety of India. Our standard Minimum Order Quantity (MOQ) starts at 120 units, and we scale up to 6000+ units for utility-scale projects with attractive progressive pricing."
  }
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer
    }
  }))
};

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faqs" className="px-6 py-24 relative overflow-hidden" aria-labelledby="faq-title">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-border-dim to-transparent" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-blue/10 bg-brand-blue/5 mb-6">
            <HelpCircle className="w-4 h-4 text-brand-blue" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-blue">Knowledge Base</span>
          </span>
          <h2 id="faq-title" className="font-display text-4xl md:text-5xl font-black text-deep-blue tracking-tighter mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-text-dim text-lg font-light max-w-2xl mx-auto">
            Everything you need to know about our products and services.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`bg-white border transition-all duration-300 rounded-2xl overflow-hidden ${
                openIndex === index ? 'border-brand-blue/30 shadow-lg shadow-brand-blue/5' : 'border-border-dim hover:border-brand-blue/20 hover:shadow-md'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-6 flex items-center justify-between text-left focus:outline-none group"
              >
                <span className={`font-display font-medium text-lg pr-8 transition-colors ${openIndex === index ? 'text-brand-blue' : 'text-deep-blue group-hover:text-brand-blue'}`}>
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${openIndex === index ? 'bg-brand-blue text-white' : 'bg-bg-card text-brand-blue group-hover:bg-brand-blue/10'}`}
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  openIndex === index ? 'grid-rows-1' : 'grid-rows-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-6 pt-2 text-text-dim leading-relaxed font-light">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
