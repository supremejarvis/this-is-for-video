import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Mail, MapPin, Building2, Clock, Send, ArrowRight, CheckCircle, ExternalLink } from "lucide-react";

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <section id="contact" className="px-6 py-20" aria-labelledby="contact-title">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto bg-white/80 backdrop-blur-2xl border border-border-dim rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl shadow-deep-blue/5"
      >
        <div className="absolute -top-10 md:-top-20 -right-10 md:-right-20 pointer-events-none select-none" aria-hidden="true">
          <svg viewBox="0 0 200 200" className="w-[120px] h-[120px] md:w-[300px] md:h-[300px]" fill="#D4AF37" opacity="0.05">
            <circle cx="100" cy="100" r="40" />
            {[0,45,90,135,180,225,270,315].map((angle) => {
              const rad = angle * Math.PI / 180;
              const x1 = 100 + Math.cos(rad) * 48;
              const y1 = 100 + Math.sin(rad) * 48;
              const x2 = 100 + Math.cos(rad) * 72;
              const y2 = 100 + Math.sin(rad) * 72;
              return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D4AF37" strokeWidth="8" strokeLinecap="round" />;
            })}
          </svg>
        </div>
        
        <div className="text-center mb-16 relative z-10">
          <h2 id="contact-title" className="font-display text-5xl md:text-6xl font-black mb-6 text-deep-blue leading-tight tracking-tighter">
            Let's <span className="bg-gradient-to-r from-brand-blue to-accent bg-clip-text text-transparent">Power Your Project</span>
          </h2>
          <p className="text-text-dim text-lg mb-8 font-light max-w-2xl mx-auto">
            Get in touch for technical consultation, bulk industrial orders, and customized solar maintenance solutions.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
          >
            <h3 className="font-display text-2xl font-bold text-deep-blue mb-2">Direct Contacts</h3>
            
            <div className="bg-bg-card border border-border-dim p-6 rounded-2xl hover:border-brand-blue/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" aria-hidden="true">
                <Phone className="w-20 h-20" />
              </div>
              <div className="w-12 h-12 rounded-full bg-accent/10 text-accent mb-6 flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              <div className="label-caps !text-[10px] mb-2 text-brand-blue">Call Us Securely</div>
              <a href="tel:8511626267" className="font-display font-medium text-3xl text-deep-blue hover:text-accent transition-colors">
                +91 85116 26267
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: <Building2 className="w-5 h-5"/>, label: "Corporate Office", value: "Apollo Engineering" },
                { 
                  icon: <MapPin className="w-5 h-5" />, 
                  label: "Manufacturing Address", 
                  value: "100 / Gopinath Industrial Landmark, Kathwada GIDC, Ahmedabad, Gujarat - 382430",
                  isLocation: true,
                  link: "https://maps.app.goo.gl/rAQeJBc3NP2orPPLA"
                },
                { icon: <Mail className="w-5 h-5" />, label: "Official Email", value: "admin@apolloengineering.co.in", isEmail: true },
                { icon: <Clock className="w-5 h-5" />, label: "Hours", value: "Mon–Sat: 09:00–18:00" },
              ].map((item, i) => (
                <div key={i} className="bg-bg-card border border-border-dim p-6 rounded-2xl hover:border-brand-blue/30 transition-all group">
                  <div className="text-brand-blue/60 group-hover:text-brand-blue transition-colors mb-4 flex justify-between items-center" aria-hidden="true">
                    <div>{item.icon}</div>
                    {item.isLocation && (
                      <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-accent group-hover:text-white transition-all">
                        Map <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="label-caps !text-[9px] mb-2 text-brand-blue">{item.label}</div>
                  {item.isLocation ? (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group/loc flex flex-col gap-2 mt-1"
                      title="Open location in Google Maps"
                    >
                      <span className="font-display font-medium text-sm text-deep-blue group-hover/loc:text-accent transition-colors">{item.value}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent group-hover/loc:translate-x-0.5 transition-transform">
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  ) : item.isEmail ? (
                    <a href={`mailto:${item.value}`} className="font-display font-medium text-sm text-deep-blue hover:text-accent break-all transition-colors">{item.value}</a>
                  ) : (
                    <div className="font-display font-medium text-sm text-deep-blue block">{item.value}</div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Inquiry Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-bg-card border border-border-dim rounded-3xl p-8 md:p-10 shadow-lg relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-brand-blue/10 flex items-center justify-center mb-6"
                  >
                    <CheckCircle className="w-10 h-10 text-brand-blue" />
                  </motion.div>
                  <h3 className="font-display text-3xl font-bold text-deep-blue mb-3">Thank You!</h3>
                  <p className="text-text-dim text-sm mb-8 max-w-sm">
                    Your inquiry has been received. Our team will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-8 py-3 rounded-xl bg-brand-blue text-white font-display font-bold text-sm uppercase tracking-widest hover:bg-brand-blue/90 transition-all"
                  >
                    Send Another
                  </button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h3 className="font-display text-2xl font-bold text-deep-blue mb-2">Send an Inquiry</h3>
                  <p className="text-text-dim text-sm mb-8 font-light">Fill out the form below and our team will get back to you within 24 hours.</p>
                  
                  <form className="space-y-5" onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    setErrorMsg("");

                    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "aca2959e-73bb-4608-965d-1d0a92dacd9b";

                    if (!accessKey || accessKey === "YOUR_ACCESS_KEY_HERE") {
                      setErrorMsg("Please configure your Web3Forms Access Key.");
                      setSubmitting(false);
                      return;
                    }

                    try {
                      const fd = new FormData(e.currentTarget);
                      fd.append("access_key", accessKey);
                      fd.append("subject", `New website inquiry from ${fd.get("name")}`);
                      fd.append("from_name", "Apollo Engineering Website");

                      const response = await fetch("https://api.web3forms.com/submit", {
                        method: "POST",
                        body: fd
                      });

                      const result = await response.json();
                      if (result.success) {
                        setSubmitted(true);
                      } else {
                        setErrorMsg(result.message || "Failed to submit. Please check your Access Key.");
                      }
                    } catch (error) {
                      setErrorMsg("Connection error. Please try again later.");
                    } finally {
                      setSubmitting(false);
                    }
                  }}>
                    <div>
                      <label htmlFor="contact-name" className="block text-[10px] font-mono font-bold text-deep-blue uppercase tracking-widest mb-2 ml-1">Your Name</label>
                      <input 
                        id="contact-name"
                        type="text"
                        name="name"
                        required
                        disabled={submitting}
                        autoComplete="name"
                        className="w-full bg-white border border-border-dim rounded-xl px-4 py-3.5 text-deep-blue text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all placeholder:text-text-dim disabled:opacity-50" 
                        placeholder="John Doe" 
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="contact-email" className="block text-[10px] font-mono font-bold text-deep-blue uppercase tracking-widest mb-2 ml-1">Email Address</label>
                      <input 
                        id="contact-email"
                        type="email"
                        name="email"
                        required
                        disabled={submitting}
                        autoComplete="email"
                        className="w-full bg-white border border-border-dim rounded-xl px-4 py-3.5 text-deep-blue text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all placeholder:text-text-dim disabled:opacity-50" 
                        placeholder="john@example.com" 
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-phone" className="block text-[10px] font-mono font-bold text-deep-blue uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                      <input 
                        id="contact-phone"
                        type="tel"
                        name="phone"
                        required
                        disabled={submitting}
                        autoComplete="tel"
                        className="w-full bg-white border border-border-dim rounded-xl px-4 py-3.5 text-deep-blue text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all placeholder:text-text-dim disabled:opacity-50" 
                        placeholder="+91 98765 43210" 
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-[10px] font-mono font-bold text-deep-blue uppercase tracking-widest mb-2 ml-1">Requirement / Details</label>
                      <textarea 
                        id="contact-message"
                        rows={4}
                        name="message"
                        required
                        disabled={submitting}
                        autoComplete="off"
                        className="w-full bg-white border border-border-dim rounded-xl px-4 py-3.5 text-deep-blue text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all resize-none placeholder:text-text-dim disabled:opacity-50" 
                        placeholder="Tell us about your project, quantity required, or ask a question..."
                      ></textarea>
                    </div>

                    {errorMsg && (
                      <p className="text-red-500 text-sm mt-2 text-center font-medium">{errorMsg}</p>
                    )}

                    <motion.button 
                      type="submit"
                      disabled={submitting}
                      whileHover={{ scale: submitting ? 1 : 1.01 }}
                      whileTap={{ scale: submitting ? 1 : 0.98 }}
                      className={`w-full py-4 mt-2 rounded-xl text-white font-display font-medium text-base shadow-lg transition-all flex justify-center items-center gap-2 group ${
                        submitting 
                          ? "bg-brand-blue/70 cursor-not-allowed shadow-none" 
                          : "bg-brand-blue shadow-brand-blue/20 hover:shadow-xl hover:shadow-brand-blue/30 hover:bg-brand-blue/90 hover:-translate-y-0.5 active:translate-y-0"
                      }`}
                    >
                      {submitting ? (
                        <>Sending...</>
                      ) : (
                        <>
                          Submit Request <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
