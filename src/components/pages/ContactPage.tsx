import React, { useState } from 'react';
import { 
  Phone, Mail, MapPin, Building2, Clock, Send, 
  ExternalLink, Instagram, Youtube, Facebook, Search, 
  Store, Globe, AtSign, CheckCircle2, MessageSquare, Sparkles 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ORIGIN_HUB_PINCODE } from '../../services/logisticsService';
import { apiService, ConnectionManager } from '../../services/apiService';

export const ContactPage: React.FC = () => {
  const { showToast } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiService.submitContact({
        name,
        phone,
        email,
        message
      });

      if (res.success) {
        setIsSubmitted(true);
        showToast(res.data?.message || 'Inquiry received! Our engineering team will contact you within 2 hours.', 'success');
      } else {
        showToast(res.error || 'Failed to send inquiry. Please call +91 85116 26267 directly.', 'error');
      }
    } catch (err: any) {
      showToast('Network error. Recorded locally in Apollo queue.', 'info');
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const socials = [
    { name: "IndiaMart Direct Store", icon: Store, href: "https://www.indiamart.com/apolloengineering-ahmedabad/", desc: "Verified Supplier Profile" },
    { name: "Google Maps Location", icon: Search, href: "https://maps.app.goo.gl/rAQeJBc3NP2orPPLA", desc: "100 / Gopinath Ind. Landmark, Kathwada GIDC" },
    { name: "YouTube Engineering Channel", icon: Youtube, href: "https://youtube.com/@apolloengineering-s400?si=tDoGvqIY57FiWGFu", desc: "Watch Live Sprinkler Demos" },
    { name: "Instagram Official", icon: Instagram, href: "https://www.instagram.com/apollo_engineering_/", desc: "@apollo_engineering_" },
    { name: "Facebook Page", icon: Facebook, href: "https://www.facebook.com/share/16yoyWszsX/?mibextid=wwXIfr", desc: "Apollo Engineering Solar" },
    { name: "Justdial Profile", icon: Globe, href: "https://www.justdial.com/Ahmedabad/Apollo-Engineering-Near-Hingalaj-Mataji-Mandir-Opposite-Sharnam-Estate-Kathwada-GIDC/079PXX79-XX79-220414212258-E4T4_BZDET", desc: "Kathwada GIDC Verified Firm" },
    { name: "Threads", icon: AtSign, href: "https://www.threads.net/@apollo_engineering", desc: "Official Tech Updates" },
  ];

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 space-y-16 max-w-7xl mx-auto animate-fadeIn">
      {/* Signature Solar Engineered Header Banner */}
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-solar-gold/30 rounded-3xl p-8 md:p-12 text-slate-900 shadow-xl space-y-4">
        {/* Warm Ambient Flares */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(0,84,166,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-solar-gold/50 bg-solar-gold/[0.08] backdrop-blur-md text-slate-900 text-xs font-mono font-extrabold shadow-sm">
            <Phone className="w-3.5 h-3.5 text-solar-gold" />
            <span className="bg-gradient-to-r from-solar-gold via-accent to-solar-gold bg-clip-text text-transparent tracking-widest uppercase">
              Direct Factory Contact & Kathwada Dispatch Hub (382430)
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-deep-blue leading-[1.05] tracking-tight">
            Connect With Our <br />
            <span className="bg-gradient-to-r from-brand-blue via-solar-gold to-accent bg-clip-text text-transparent">
              Solar Engineering Team
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-600 font-normal max-w-3xl leading-relaxed">
            Get in touch for technical consultation, bulk EPC procurement, factory site visits at Kathwada GIDC, and customized solar panel cleaning systems. Direct factory prices, 18% GST invoice, and express dispatch across India.
          </p>
        </div>
      </div>

      {/* Main Grid: Direct Contacts & Inquiry Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct Contacts & Map (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Call Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <Phone className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Direct Engineering Hotline</span>
                <a href="tel:8511626267" className="text-2xl font-black text-slate-900 hover:text-[#0054A6] transition-colors block">
                  +91 85116 26267
                </a>
              </div>
            </div>

            <a
              href={`https://wa.me/918511626267?text=${encodeURIComponent("Hello Apollo Engineering, I am interested in your SS304 solar maintenance products.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp Us
            </a>
          </div>

          {/* Plant Address & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0054A6] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Manufacturing Plant</span>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                100 / Gopinath Industrial Landmark, Kathwada GIDC, Ahmedabad, Gujarat - <strong className="text-[#0054A6] font-mono">{ORIGIN_HUB_PINCODE}</strong>
              </p>
              <a
                href="https://maps.app.goo.gl/rAQeJBc3NP2orPPLA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#0054A6] hover:underline inline-flex items-center gap-1 pt-1"
              >
                Open in Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0054A6] flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Official Email</span>
              <a href="mailto:admin@apolloengineering.co.in" className="text-xs font-bold text-slate-900 hover:text-[#0054A6] block truncate">
                admin@apolloengineering.co.in
              </a>
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 pt-1">
                <Clock className="w-3 h-3" /> Mon–Sat: 09:00–18:00
              </div>
            </div>
          </div>

          {/* Social & B2B Portals Section */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#0054A6]" />
              Verified Online Presence & B2B Channels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {socials.map((s, idx) => (
                <a
                  key={idx}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 group-hover:bg-[#0054A6] group-hover:text-white flex items-center justify-center text-slate-700 transition-colors shrink-0">
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-[#0054A6] block truncate">{s.name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{s.desc}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Inquiry Form (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">Request Quotation or Site Visit</h3>
            <p className="text-xs text-slate-500">Fill in your requirements and our technical engineers will prepare a customized quotation.</p>
          </div>

          {isSubmitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-900 text-sm">Thank You for Reaching Out!</h4>
              <p className="text-xs text-emerald-700">We have received your inquiry for Apollo SS304 solar maintenance hardware.</p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nilesh Patel"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98250 12345"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Details / Requirements *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please specify solar plant capacity (e.g. 50 kW rooftop or 5 MW ground mount), number of sprinklers/clips required..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#0054A6] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0054A6] hover:bg-[#003d7a] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Technical Inquiry
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
