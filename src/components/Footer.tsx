'use client';

import { useState } from "react";
import { Link, useNavigate } from "../lib/navigation";
import { Mail, Phone, MapPin, Instagram, Youtube, Facebook, Search, Store, Lock } from "lucide-react";
import { useStore } from "../store/useStore";

export function Footer() {
  const [logoError, setLogoError] = useState(false);
  const { setActiveTab, setSelectedProduct } = useStore();
  const navigate = useNavigate();

  const handleNavClick = (tabName: string, path: string) => {
    setActiveTab(tabName);
    setSelectedProduct(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-white text-slate-600 border-t border-slate-200 py-10 px-6 shadow-xs">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Simple Top Row: Logo, Nav, and Socials */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200">
          {/* Logo (Double-click -> Admin Portal Login) */}
          <Link 
            to="/store"
            onClick={() => handleNavClick('store', '/store')}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavClick('admin', '/admin');
              navigate('/admin');
            }}
            title="Apollo Engineering (Double-click to open Admin Portal Login)"
            className="flex items-center cursor-pointer group select-none"
          >
            <img 
              src="/logo.webp" 
              alt="Apollo Engineering Logo" 
              width={180}
              height={40}
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105 pointer-events-none select-none"
              loading="lazy"
              decoding="async"
            />
          </Link>

          {/* Clean Semantic Navigation Links (Issue 19) */}
          <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <Link 
              to="/about" 
              onClick={() => handleNavClick('about', '/about')} 
              className="hover:text-[#0054A6] transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue rounded"
            >
              About
            </Link>
            <Link 
              to="/store" 
              onClick={() => handleNavClick('store', '/store')} 
              className="hover:text-[#0054A6] transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue rounded"
            >
              Products
            </Link>
            <Link 
              to="/installation" 
              onClick={() => handleNavClick('installation', '/installation')} 
              className="hover:text-[#0054A6] transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue rounded"
            >
              Installation
            </Link>
            <Link 
              to="/installation" 
              onClick={() => handleNavClick('installation', '/why-us')} 
              className="hover:text-[#0054A6] transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue rounded"
            >
              Why Us
            </Link>
            <Link 
              to="/contact" 
              onClick={() => handleNavClick('contact', '/contact')} 
              className="hover:text-[#0054A6] transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue rounded"
            >
              Contact
            </Link>
          </nav>

          {/* Social Icons (Issue 9) */}
          <div className="flex items-center gap-2">
            {[
              { icon: Instagram, href: "https://www.instagram.com/apollo_engineering_/", label: "Instagram" },
              { icon: Youtube, href: "https://youtube.com/@apolloengineering-s400?si=tDoGvqIY57FiWGFu", label: "YouTube" },
              { icon: Facebook, href: "https://www.facebook.com/share/16yoyWszsX/?mibextid=wwXIfr", label: "Facebook" },
              { icon: Search, href: "https://maps.app.goo.gl/rAQeJBc3NP2orPPLA", label: "Google Maps" },
              { icon: Store, href: "https://www.indiamart.com/apolloengineering-ahmedabad/", label: "IndiaMart" },
            ].map((social, i) => (
              <a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-[#0054A6] border border-slate-200 hover:border-blue-300 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                title={social.label}
                aria-label={social.label}
              >
                <social.icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>

        {/* Middle Row: Direct Contact Line */}
        <div className="flex flex-wrap items-center justify-center md:justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>100 / Gopinath Ind. Landmark, Kathwada GIDC, Ahmedabad - <strong>382430</strong></span>
          </div>

          <div className="flex items-center gap-6">
            <a href="tel:8511626267" className="flex items-center gap-1.5 hover:text-[#0054A6] transition-colors font-mono">
              <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" /> +91 85116 26267
            </a>
            <a href="mailto:admin@apolloengineering.co.in" className="flex items-center gap-1.5 hover:text-[#0054A6] transition-colors font-mono">
              <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" /> admin@apolloengineering.co.in
            </a>
          </div>
        </div>

        {/* Bottom Row: Copyright, Badges & Discreet Admin Portal Link (Issue 20) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-xs text-slate-500 font-mono border-t border-slate-200">
          <div>
            © {new Date().getFullYear()} Apollo Engineering. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <span>ISO 9001:2015</span>
            <span>•</span>
            <span>SS304 CERTIFIED</span>
            <span>•</span>
            <span>MADE IN INDIA</span>
            <span>•</span>
            <Link
              to="/admin"
              onClick={() => handleNavClick('admin', '/admin')}
              className="text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded px-1"
            >
              <Lock className="w-3 h-3 text-amber-500/80" />
              <span>Staff Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
