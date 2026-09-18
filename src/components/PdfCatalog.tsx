import { useState, useRef } from "react";
import { CheckCircle2, Star, ShieldCheck, Sun } from "lucide-react";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT DATA
// ─────────────────────────────────────────────────────────────────────────────
const products = [
  {
    number: "01",
    category: "SS304 GRADE",
    name: "SS304 Solar Panel Sprinkler",
    material: "AetherWash Tech  ·  SS304 Grade",
    tag: "BEST SELLER",
    image: "/solar_sprinkler.webp",
    description:
      "The Apollo SS304 Solar Sprinkler is our flagship product, engineered for maximum cleaning efficiency with zero shading impact. AetherWash technology provides a uniform 180° water curtain that removes dust and bird droppings, ensuring panels operate at peak performance year-round.",
    features: [
      "Shadow-Less Design — Minimizes shading on solar cells",
      "180° Cleaning — 2800 mm range, uniform water spread",
      "Low Water Consumption (4–7 LPM)",
      "+15–20% Output — Proven solar performance boost",
      "10-Year Rust-Proof Warranty on eligible SS304 Drain Clips and Sprinklers. Warranty covers rust/corrosion only.",
    ],
    specs: [
      ["Material", "Stainless Steel 304"],
      ["Range", "2800 mm"],
      ["Thread", '½" BSP Male'],
      ["Pressure", "2–4 Bar"],
      ["Flow Rate", "4–7 LPM"],
    ],
  },
  {
    number: "02",
    category: "SS304 GRADE",
    name: "SS304 Solar Auto Drain Clips",
    material: "Full SS304 Body  ·  Snap-On Tool-Free",
    tag: "UNIVERSAL FIT",
    image: "/Drain_clips.webp",
    description:
      "Eliminate the mud belt and water stagnation with our SS304 Auto Drain Clips. These precision-engineered clips use capillary action to siphon stagnant water and sludge from the bottom edge of solar panels. Stainless steel ensures no UV degradation, ever.",
    features: [
      "Auto Sludge Removal — Siphon drains stagnant water & mud",
      "Tool-Free Snap-On — Quick attach to bottom frame",
      "Full SS304 Body — Not plastic, no corrosion ever",
      "5 Universal Sizes — Fits 28 mm to 40 mm frames",
      "UV Resistant — No degradation in extreme heat or cold",
    ],
    specs: [
      ["Material", "SS304"],
      ["Action", "Capillary Siphon"],
      ["Frame Size", "28–40 mm"],
      ["Warranty", "10 Years"],
      ["Installation", "Snap-On"],
    ],
  },
  {
    number: "03",
    category: "GI SERIES",
    name: "GI Solar Pipe Clamp",
    material: "Galvanized Iron  ·  L-Shape Adjustable",
    tag: "NO-DRILL",
    image: "/gi_pipe_clamp.webp",
    description:
      "Secure your solar maintenance infrastructure with heavy-duty GI Pipe Clamps. Designed for tool-free installation on standard solar frames, these clamps provide a vibration-resistant mount for ½-inch UPVC or CPVC pipelines. Trusted by EPC contractors across India.",
    features: [
      "Corrosion-Resistant GI — Rust-free outdoors for years",
      "Universal Fit — Standard UPVC/CPVC pipe compatible",
      "Adjustable L-Shape — Bolt/U-hook, no drilling needed",
      "Vibration Control — Locks pipe against wind & movement",
      "Frame-Universal — Fits various frame thicknesses",
    ],
    specs: [
      ["Pipe Size", '½" (12.7 mm)'],
      ["Material", "Galvanized Iron"],
      ["Bracket", "L-Shape"],
      ["Mount", "Bolt + U-Hook"],
      ["Tech", "No-Drill"],
    ],
  },
  {
    number: "04",
    category: "FITTING SERIES",
    name: "UPVC / CPVC Threaded Tee",
    material: "High-Grade Polymer  ·  Brass Threads",
    tag: "LEAK-PROOF",
    image: "/cpvc_upvc.webp",
    description:
      "Ensure leak-proof connections for your solar sprinkler system with precision-molded Threaded Tees. Available in UPVC and CPVC variants, these tees feature reinforced brass threads for maximum durability and resistance to cross-threading under high pressure.",
    features: [
      "Brass Reinforced Threads — Prevents stripping and leaks",
      "UV Stabilized Material — Will not become brittle in sun",
      "High Pressure Rating — Tested up to 15 Bar",
      "Universal Compatibility — Fits all standard ½\" pipes",
      "Chemical Resistant — Safe for use with cleaning agents",
    ],
    specs: [
      ["Material", "UPVC / CPVC"],
      ["Thread", '½" BSP Brass'],
      ["Type", "Equal Tee"],
      ["Color", "White / Ivory"],
      ["Standard", "ASTM D2467"],
    ],
  },
  {
    number: "05",
    category: "COMPLETE KIT",
    name: "Solar Cleaning Sprinkler Set",
    material: "Complete Installation Kit",
    tag: "READY KIT",
    image: "/solar_cleaning_fullset.webp",
    description:
      "Our all-in-one Solar Cleaning Sprinkler Set is designed for quick and easy deployment. This comprehensive kit includes everything needed to set up an automated cleaning system for a 5–10 kW solar plant. Scales effortlessly for larger MW installations.",
    features: [
      "Complete Hardware — Sprinklers, Tees & Clamps included",
      "Pre-Matched Components — Guaranteed fit and performance",
      "Scalable Design — Easily add more sets for larger plants",
      "Step-by-Step Guide — DIY-friendly installation",
      "Industrial Quality — Same components used in MW plants",
    ],
    specs: [
      ["Coverage", "5 kW – 10 kW"],
      ["Sprinklers", "10–20 Units"],
      ["Fittings", "Included"],
      ["Clamps", "Included"],
      ["Warranty", "10 Years (Rust)"],
    ],
  },
  {
    number: "06",
    category: "POWER SERIES",
    name: "Submersible Pump (0.5 HP)",
    material: "Stainless Steel Body  ·  Copper Winding",
    tag: "HIGH PRESSURE",
    image: "/pump.webp",
    description:
      "Power your automated cleaning system with our high-efficiency 0.5 HP Submersible Pump. Specifically selected for solar sprinkler applications, this pump provides the ideal balance of pressure and flow rate to operate up to 50 sprinklers simultaneously with reliability.",
    features: [
      "100% Copper Winding — Superior efficiency and service life",
      "SS304 Shell — Maximum protection against water",
      "Thermal Overload Protector — Prevents motor burnout",
      "Low Power Consumption — Ideal for solar-powered sites",
      "High Head Range — Pumps water up to 30 metres height",
    ],
    specs: [
      ["Power", "0.5 HP / 0.37 kW"],
      ["Voltage", "220V AC"],
      ["Max Head", "32 Metres"],
      ["Max Flow", "45 LPM"],
      ["Outlet", "1 Inch"],
    ],
  },
  {
    number: "07",
    category: "CONTROL SERIES",
    name: "Digital Auto Timer",
    material: "Digital Control System",
    tag: "AUTOMATED",
    image: "/auto_timer.webp",
    description:
      "Automate your solar cleaning schedule with our precision Digital Auto Timer. Designed for industrial reliability, this programmable switch allows you to set exact cleaning intervals, ensuring panels are washed at the optimal time of day — completely hands-free.",
    features: [
      "Programmable Intervals — Set daily or weekly cycles",
      "Digital Display — Easy-to-read LCD for precise scheduling",
      "Battery Backup — Retains settings during power outages",
      "Manual Override — Switch to manual mode instantly",
      "High Load Capacity — Supports pumps up to 2 HP directly",
    ],
    specs: [
      ["Type", "Digital Time Switch"],
      ["Voltage", "220–240V AC"],
      ["Display", "LCD Digital"],
      ["Mounting", "DIN Rail"],
      ["Backup", "100+ Hours"],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REACT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function PdfCatalog() {
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!contentRef.current) return;
    setBusy(true);
    setPct(5);
    setErr("");
    
    // Slight pause to allow rendering
    await new Promise((r) => setTimeout(r, 500));

    try {
      const [{ jsPDF }, { toJpeg }] = await Promise.all([
        import("jspdf"),
        import("html-to-image")
      ]);
      const pdf = new jsPDF({ format: "a4", unit: "pt", orientation: "portrait" });
      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const totalPages = products.length + 2; // 1 Cover + products + 1 Contact

      for (let i = 0; i < totalPages; i++) {
        setPct(5 + Math.round((i / totalPages) * 90));
        const element = document.getElementById(`pdf-page-${i}`);
        if (!element) continue;

        // html-to-image capture with pixelRatio 2 for crisp resolution
          const imgData = await toJpeg(element, {
            pixelRatio: 2,
            backgroundColor: "#FFFFFF",
          } as any);

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH, A4_HEIGHT, undefined, "FAST");
      }

      setPct(98);

      // Force .pdf download
      pdf.save("Apollo-Engineering-Product-Catalog-2024.pdf");

      setPct(100);
    } catch (e) {
      console.error("PDF Generation Error:", e);
      setErr(`Generation failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTimeout(() => {
        setBusy(false);
        setPct(0);
        setErr("");
      }, 2500);
    }
  };

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VISIBLE UI BUTTON */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-blue/90 text-white font-display font-bold uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-blue/30 hover:-translate-y-1.5 hover:scale-[1.02] transition-all active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
        >
          {busy ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              <span>{pct}% - Generating UI...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download PDF Brochure</span>
            </>
          )}
        </button>
        {err && (
          <div className="absolute top-full mt-2 left-0 text-red-500 text-xs font-bold">{err}</div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* INVISIBLE HTML-TO-PDF RENDER TARGET (Matches Web UI EXACTLY) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div 
        ref={contentRef} 
        className="pdf-offscreen-target pointer-events-none"
      >
        {/* Load Google Fonts via <link> (CORS-friendly) for html-to-image capture */}
        <link rel="stylesheet" crossOrigin="anonymous" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Outfit:wght@100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" />
        <style dangerouslySetInnerHTML={{ __html: `
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}} />
        {/* PAGE 0: COVER */}
        <div id="pdf-page-0" className="w-[794px] h-[1123px] relative bg-white overflow-hidden flex flex-col items-center justify-center font-sans">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] z-0 pdf-grid-pattern-40" />
          
          {/* Glass / Glow Effects */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-blue/10 blur-[120px] rounded-full z-0" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 blur-[100px] rounded-full z-0" />

          {/* Logo & Header */}
          <div className="z-10 flex flex-col items-center">
            <img src="/logo.webp" alt="Apollo Logo" className="w-72 mb-16 drop-shadow-2xl" />
          </div>

          {/* Huge Main Text mimicking index/hero */}
          <div className="z-10 text-center flex flex-col items-center mb-16">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-brand-blue/20 bg-brand-blue/5 text-brand-blue mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-xs font-mono font-bold uppercase tracking-[0.2em]">India's First Manufacturer</span>
            </div>
            
            <h2 className="font-display text-[90px] leading-[1.05] tracking-tight">
              <span className="font-black block mb-2 text-deep-blue">Solar Panel</span>
              <span className="font-bold bg-gradient-to-r from-brand-blue to-accent bg-clip-text text-transparent">
                Cleaning System
              </span>
            </h2>
            
            <div className="w-32 h-1.5 rounded-full bg-gradient-to-r from-brand-blue to-accent mt-8 mb-6" />
            
            <p className="text-xl text-text-dim max-w-2xl font-light leading-relaxed">
              Pioneering India's first <strong className="font-semibold text-deep-blue">Shadowless Solar Sprinklers</strong> and <strong className="font-semibold text-deep-blue">Auto Drain Clips</strong>. Engineered with 100% premium SS304 stainless steel for zero degradation and maximum energy yield.
            </p>
          </div>

          {/* Glassmorphism Feature Cards */}
          <div className="z-10 w-full px-20 grid grid-cols-2 gap-6 pb-20">
            <div className="bg-white/80 p-8 rounded-2xl border border-border-dim shadow-xl shadow-deep-blue/5 backdrop-blur-xl">
              <Sun className="w-10 h-10 text-accent mb-4" />
              <div className="text-3xl font-display font-bold text-deep-blue mb-1">+20% Output</div>
              <div className="text-sm text-text-dim font-mono tracking-widest uppercase">Increase</div>
            </div>
            <div className="bg-white/80 p-8 rounded-2xl border border-border-dim shadow-xl shadow-deep-blue/5 backdrop-blur-xl">
              <ShieldCheck className="w-10 h-10 text-brand-blue mb-4" />
              <div className="text-3xl font-display font-bold text-deep-blue mb-1">10 Years</div>
              <div className="text-sm text-text-dim font-mono tracking-widest uppercase">Rust Warranty</div>
            </div>
          </div>

          {/* Footer branding */}
          <div className="absolute bottom-12 w-full text-center text-xs text-text-dim font-medium tracking-[0.2em] uppercase z-10">
            Product Catalog 2024-2025 · Made in India
          </div>
        </div>

        {/* PAGES 1-N: PRODUCTS (Mimicking ProductCard) */}
        {products.map((p, idx) => (
          <div key={idx} id={`pdf-page-${idx + 1}`} className="w-[794px] h-[1123px] relative bg-[#f8fafc] overflow-hidden p-12 font-sans flex flex-col justify-center">
            {/* Same Web Glow Effects */}
            <div className="absolute inset-0 opacity-[0.03] pdf-grid-pattern-30" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-blue/5 blur-[100px] rounded-full z-0" />

            <div className="w-full flex-1 relative z-10 bg-white border border-border-dim rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Product Card Top: Image Area */}
              <div className="h-[450px] relative bg-white flex items-center justify-center p-12 border-b border-border-dim/50">
                <div className="absolute top-6 left-8 px-4 py-1.5 rounded-lg bg-accent text-white font-display font-bold text-xs tracking-widest uppercase shadow-lg shadow-accent/20">
                  {p.tag}
                </div>
                {/* Fallback pattern to mimic glass image box */}
                <div className="absolute inset-0 opacity-[0.02] pdf-grid-pattern-20-blue" />
                <img src={p.image} className="w-full h-full object-contain relative z-10 drop-shadow-xl mix-blend-multiply" alt={p.name} />
              </div>

              {/* Product Card Bottom: Info Area */}
              <div className="flex-1 p-12 flex flex-col justify-center relative">
                <Star className="absolute top-8 right-8 w-24 h-24 text-deep-blue opacity-[0.03] pointer-events-none" />

                <div className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-brand-blue mb-3">
                  {p.number}
                </div>
                
                <h2 className="font-display text-4xl font-light tracking-tight text-text-main mb-4">
                  {p.name}
                </h2>
                
                <div className="flex items-center gap-4 text-accent text-sm font-mono font-medium tracking-wider mb-6">
                  <div className="w-12 h-[1px] bg-accent/30" />
                  {p.material}
                </div>

                <p className="text-[15px] leading-relaxed text-text-dim mb-8 font-light max-w-2xl">
                  {p.description}
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                  {p.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-brand-blue" />
                      </div>
                      <span className="text-sm text-text-dim/90 leading-tight font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Specs Pills */}
                <div className="flex flex-wrap gap-2 mt-auto pt-6 border-t border-border-dim/50">
                  {p.specs.map((spec, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-[#f1f5f9] border border-border-dim/50 text-text-dim text-xs font-mono font-bold uppercase tracking-widest">
                      <span className="text-brand-blue opacity-50 mr-2">{spec[0]}</span>
                      <span className="text-text-main">{spec[1]}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pagination Footer */}
            <div className="absolute bottom-6 w-full px-12 flex justify-between items-center text-xs font-mono tracking-widest uppercase text-text-dim/60">
              <span>Apollo Engineering Catalog</span>
              <span>Page {idx + 2} / {products.length + 2}</span>
            </div>
          </div>
        ))}

        {/* PAGE: CONTACT DETAILS */}
        <div id={`pdf-page-${products.length + 1}`} className="w-[794px] h-[1123px] relative bg-white overflow-hidden p-10 font-sans flex flex-col items-center justify-center">
          {/* Background Elements */}
          <div className="absolute inset-0 opacity-[0.03] pdf-grid-pattern-40" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-blue/5 blur-[100px] rounded-full z-0 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 blur-[120px] rounded-full z-0 pointer-events-none" />

          <div className="w-full relative z-10 bg-white/90 backdrop-blur-3xl border border-border-dim rounded-2xl shadow-2xl shadow-deep-blue/5 p-10 flex flex-col items-center text-center">
            <h2 className="font-display text-5xl font-black mb-4 text-deep-blue tracking-tighter">
              Let's <span className="bg-gradient-to-r from-brand-blue to-accent bg-clip-text text-transparent">Power Your Project</span>
            </h2>
            <p className="text-text-dim text-lg mb-8 font-light max-w-xl leading-relaxed">
              Get in touch for technical consultation, bulk industrial orders, and customized solar maintenance solutions.
            </p>

            <div className="grid grid-cols-2 gap-6 w-full mb-8">
              <div className="bg-bg-card border border-border-dim p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg shadow-deep-blue/5">
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-brand-blue mb-2">Call Us Securely</div>
                <div className="font-display font-bold text-2xl text-deep-blue">+91 85116 26267</div>
              </div>

              <div className="bg-bg-card border border-border-dim p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg shadow-deep-blue/5">
                <div className="w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-brand-blue mb-2">Official Email</div>
                <div className="font-display font-bold text-[17px] text-deep-blue break-all">admin@apolloengineering.co.in</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full">
              <div className="bg-bg-card border border-border-dim p-6 rounded-2xl flex items-center gap-4 text-left shadow-md shadow-deep-blue/5">
                <div className="w-10 h-10 rounded-full bg-brand-blue/5 text-brand-blue shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-widest text-text-dim mb-1">Corporate Office</div>
                  <div className="font-sans text-[13px] font-semibold text-deep-blue">Apollo Engineering<br/>100 / Gopinath Industrial Landmark, Kathwada GIDC,<br/>Ahmedabad, Gujarat - 382430</div>
                </div>
              </div>
              <div className="bg-bg-card border border-border-dim p-6 rounded-2xl flex items-center gap-4 text-left shadow-md shadow-deep-blue/5">
                <div className="w-10 h-10 rounded-full bg-brand-blue/5 text-brand-blue shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-widest text-text-dim mb-1">Working Hours</div>
                  <div className="font-sans text-[13px] font-semibold text-deep-blue">Mon–Sat: 09:00 AM – 06:00 PM<br/>Sunday: Closed</div>
                </div>
              </div>
            </div>
            
            {/* Branding badge */}
            <div className="mt-6 flex items-center gap-3 bg-[#f8fafc] px-6 py-2.5 rounded-full border border-border-dim">
                <img src="/logo.webp" className="w-20" alt="Apollo Logo" />
                <div className="w-px h-5 bg-border-dim"></div>
                <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-text-dim">ISO 9001:2015 Certified</div>
            </div>

            {/* Anti-Piracy Warning */}
            <div className="mt-6 bg-red-50/50 border border-red-200/60 rounded-2xl p-6 w-full relative overflow-hidden text-left flex gap-5 items-start">
              <div className="w-12 h-12 rounded-full bg-red-100/80 flex items-center justify-center shrink-0 border border-red-200">
                <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 className="text-red-800 font-display font-black text-lg mb-2 tracking-tight">Beware of Imitations / नक़ली उत्पादों से सावधान</h3>
                <div className="text-xs text-red-900/80 mb-2 font-medium leading-relaxed">
                  Where the effort is original, the quality is original. We proudly say that this product is the result of our own hard work and research. Selling stolen designs is not in our nature. Those who know true value always choose the original.
                </div>
                <div className="text-xs text-red-900/80 mb-3 font-medium leading-relaxed font-sans">
                  जहां मेहनत असली होती है, वहां क्वालिटी भी असली होती है। हमें यह कहते हुए गर्व होता है कि यह उत्पाद हमारी अपनी कड़ी मेहनत और रिसर्च से बना है। दूसरों की डिज़ाइन चुराकर बेचना हमारा स्वभाव नहीं है। असली चीज़ की परख रखने वाले हमेशा ओरिजिनल ही चुनते हैं।
                </div>
                <div className="bg-red-600 text-white px-4 py-2.5 rounded-xl inline-block font-display font-bold text-xs leading-relaxed shadow-lg shadow-red-600/20">
                  "A stolen design might be cheaper, but it will never have the power of Apollo!" <br />
                  "चुराई हुई डिज़ाइन शायद सस्ती मिल जाए, लेकिन उसमें Apollo जैसा दम नहीं मिलेगा!"
                </div>
              </div>
            </div>

          </div>

          {/* Pagination Footer */}
          <div className="absolute bottom-6 w-full px-12 flex justify-between items-center text-xs font-mono tracking-widest uppercase text-text-dim/60">
            <span>Apollo Engineering Catalog</span>
            <span>Page {products.length + 2} / {products.length + 2}</span>
          </div>
        </div>
      </div>
    </>
  );
}
