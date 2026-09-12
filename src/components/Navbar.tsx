import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "motion/react";

const navLinks = [
  { name: "About", href: "#about" },
  { name: "Products", href: "#products" },
  { name: "Installation", href: "#installation" },
  { name: "Why Us", href: "#why-us" },
  { name: "Contact", href: "#contact" },
];

export function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setIsScrolled(latest > 20);

    // Hide header on scroll down (when scrolled past 80px), show on scroll up
    if (latest > 80 && latest > previous) {
      setIsHeaderHidden(true);
    } else {
      setIsHeaderHidden(false);
    }
  });

  return (
    <motion.nav 
      initial={{ y: 0 }}
      animate={{ y: isHeaderHidden && !mobileOpen ? "-100%" : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-[100] w-full transition-all duration-300 px-4 md:px-12 ${
        isScrolled 
          ? "bg-white/70 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/50 shadow-lg shadow-deep-blue/5 py-3" 
          : "bg-white/30 backdrop-blur-md backdrop-saturate-150 border-b border-white/20 py-4 md:py-6 shadow-sm shadow-black/5"
      } flex items-center justify-between`} 
      aria-label="Main Navigation"
    >
      <a href="/" className="relative flex items-center group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep rounded-2xl" aria-label="Apollo Engineering Home">
        <motion.img 
          src="/logo.webp" 
          alt="Apollo Engineering Logo" 
          className="relative z-10 h-10 md:h-16 lg:h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-500"
          width="200"
          height="80"
          fetchPriority="high"
          onError={() => setLogoError(true)}
          style={logoError ? { display: 'none' } : undefined}
        />
        {logoError && (
          <span className="text-brand-blue font-display font-black tracking-tighter text-2xl">APOLLO</span>
        )}
      </a>

      <div className="hidden lg:flex items-center gap-10 ml-auto">
        {navLinks.map((link) => (
          <a 
            key={link.name}
            href={link.href}
            className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-dim hover:text-accent transition-all relative group/link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg-deep rounded-sm"
          >
            {link.name}
            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent group-hover/link:w-full transition-all duration-300" />
          </a>
        ))}
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden w-10 h-10 rounded-xl bg-white/80 backdrop-blur-md border border-border-dim flex items-center justify-center text-deep-blue hover:bg-brand-blue hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-x-0 top-[76px] z-40 lg:hidden"
          >
            <div className="bg-white/95 backdrop-blur-2xl border-b border-border-dim shadow-2xl mx-4 rounded-2xl overflow-hidden">
              <div className="flex flex-col py-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-8 py-5 text-sm font-mono font-bold uppercase tracking-[0.2em] text-text-dim hover:text-accent hover:bg-brand-blue/5 transition-all border-b border-border-dim/50 last:border-0"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mobileOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/10 lg:hidden" 
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </motion.nav>
  );
}
