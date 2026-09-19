'use client';

import { motion, useScroll, useTransform } from "motion/react";

export function Background() {
  const { scrollY } = useScroll();
  const lightY = useTransform(scrollY, [0, 1000], [0, 100]);
  const lightX = useTransform(scrollY, [0, 1000], [0, -50]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-bg-deep" aria-hidden="true">
      {/* Animated Precision Engineering Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.04] bg-grid-pattern" />
      
      {/* Solar Flare Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] max-w-full bg-[radial-gradient(circle_at_center,rgba(0,84,166,0.16)_0%,rgba(0,84,166,0.06)_40%,rgba(0,84,166,0.01)_75%,transparent_100%)]" />
      <div className="absolute bottom-[-20%] right-0 w-[60%] h-[60%] max-w-full bg-[radial-gradient(circle_at_center,rgba(245,130,32,0.12)_0%,rgba(245,130,32,0.04)_40%,rgba(245,130,32,0.008)_75%,transparent_100%)]" />
      
      {/* Parallax Light Effect */}
      <motion.div 
        style={{ x: lightX, y: lightY }}
        className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.14)_0%,rgba(212,175,55,0.05)_40%,rgba(212,175,55,0.008)_75%,transparent_100%)]"
      />
      
      {/* Soft Vignette Instead of Deep Darkness */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,15,28,0.02)_100%)] opacity-80" />
    </div>
  );
}
