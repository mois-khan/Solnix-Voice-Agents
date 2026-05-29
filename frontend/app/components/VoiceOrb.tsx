'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

type Speaker = 'idle' | 'user' | 'agent';

interface VoiceOrbProps {
  analyser: AnalyserNode | null;
  speaker: Speaker;
  size: number;
}

const GRADIENT_COLORS: Record<Speaker, { inner: string; outer: string; glow: string }> = {
  idle:  { inner: '#7C5CFF', outer: '#A78BFA33', glow: '#7C5CFF' },
  user:  { inner: '#06B6D4', outer: '#3B82F633', glow: '#06B6D4' },
  agent: { inner: '#A78BFA', outer: '#F472B633', glow: '#A78BFA' },
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export default function VoiceOrb({ analyser, speaker, size }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const reducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  // Prepare the frequency data buffer when analyser changes
  useEffect(() => {
    if (analyser) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } else {
      dataArrayRef.current = null;
    }
  }, [analyser]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size;
    const cx = w / 2;
    const cy = h / 2;

    // Set canvas resolution for crisp rendering
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Compute amplitude (0–1)
    let amplitude: number;

    if (analyser && dataArrayRef.current) {
      analyser.getByteFrequencyData(dataArrayRef.current as any);
      const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
      const avg = sum / dataArrayRef.current.length; // 0–255
      amplitude = avg / 255;
    } else {
      amplitude = 0;
    }

    // Idle fallback: sinusoidal oscillation
    if (amplitude < 0.05) {
      const sin = Math.sin(Date.now() * 0.001);
      amplitude = 0.1 + Math.abs(sin) * 0.1;
    }

    // Compute radius
    const base = size * 0.28;
    const r = base + amplitude * (size * 0.18);

    // Clear
    ctx.clearRect(0, 0, w, h);

    const colors = GRADIENT_COLORS[speaker];

    // Radial gradient
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, colors.inner);
    gradient.addColorStop(1, colors.outer);

    // First pass: fill
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Second pass: glow layer (skipped on mobile to fix GPU rendering lag)
    if (!isMobile) {
      ctx.save();
      ctx.shadowBlur = 20 + amplitude * 60;
      ctx.shadowColor = colors.glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [analyser, speaker, size, isMobile]);

  // Start / stop rAF loop
  useEffect(() => {
    if (reducedMotion) return;

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [draw, reducedMotion]);

  // Reduced-motion fallback
  if (reducedMotion) {
    const colors = GRADIENT_COLORS[speaker];
    return (
      <div
        role="img"
        aria-label="Voice activity visualizer"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.inner}, ${colors.outer})`,
          animation: 'orb-breathe 3s ease-in-out infinite alternate',
        }}
      >
        <style>{`
          @keyframes orb-breathe {
            from { opacity: 0.6; }
            to   { opacity: 1.0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Voice activity visualizer"
      style={{ width: size, height: size }}
    />
  );
}
