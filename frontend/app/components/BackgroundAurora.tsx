'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function BackgroundAurora() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  if (isMobile) {
    // Static gradient blobs on mobile to prevent GPU scroll lag from animating high-blur layers
    return (
      <div className="fixed inset-0 z-[-1] overflow-hidden bg-bg-base pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute top-[40%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-500/5 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-bg-base pointer-events-none">
      <motion.div
        animate={{
          x: [0, 100, 50, -50, 0],
          y: [0, 50, 150, 50, 0],
          scale: [1, 1.2, 1, 0.9, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-accent/15 blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -150, -50, 100, 0],
          y: [0, -100, 50, -50, 0],
          scale: [1, 1.1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[140px]"
      />
      <motion.div
        animate={{
          x: [0, 50, -50, 100, 0],
          y: [0, 150, 0, -100, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[40%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-purple-500/10 blur-[130px]"
      />
      {/* Light geometric grid for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />
    </div>
  );
}
