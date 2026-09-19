'use client';

import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  return (
    <motion.a
      href="https://wa.me/918511626267?text=Hello%20Apollo%20Engineering,%20I%20would%20like%20to%20know%20more%20about%20your%20solar%20maintenance%20products."
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, duration: 0.5, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] md:bottom-8 md:right-8 z-[100] flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-[0_10px_20px_rgba(37,211,102,0.3)] hover:shadow-[0_15px_25px_rgba(37,211,102,0.4)] transition-shadow focus:outline-none focus:ring-4 focus:ring-[#25D366]/50 focus-visible:ring-4 focus-visible:ring-[#25D366]/70 group"
      aria-label="Chat with us on WhatsApp"
    >
      <motion.span
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-[#25D366]/30"
      />
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        className="absolute inset-0 rounded-full bg-[#25D366]/15"
      />
      <MessageCircle className="w-7 h-7 relative z-10" />
      
      {/* Tooltip */}
      <span className="absolute right-full mr-4 bg-white text-deep-blue text-xs font-bold px-4 py-2 rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 whitespace-nowrap border border-border-dim">
        Chat with us!
        <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border-r border-t border-border-dim rotate-45" />
      </span>
    </motion.a>
  );
}
