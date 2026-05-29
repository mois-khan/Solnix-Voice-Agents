'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { MousePointerClick, Mic, Sparkles } from 'lucide-react';

import { PersonaConfig, LanguageCode } from '../types';
import { useStore } from '../lib/store';
import VoiceOrb from './components/VoiceOrb';
import PersonaCard from './components/PersonaCard';
import CallOverlay from './components/CallOverlay';
import BackgroundAurora from './components/BackgroundAurora';

/* ───────────────────────────────────────── NAV ───────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-6 lg:px-12
        transition-colors duration-300
        ${scrolled ? 'backdrop-blur-xl bg-bg-base/60 border-b border-border-subtle' : 'bg-transparent'}
      `}
    >
      <a href="#" className="text-xl font-bold text-accent tracking-tight">
        Solnix
      </a>

      <div className="hidden md:flex items-center gap-8">
        {[
          { label: 'Personas', href: '#personas' },
          { label: 'How it works', href: '#how-it-works' },
          { label: 'Tech', href: '#tech' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {link.label}
          </a>
        ))}
        <a
          href="https://github.com/solnixmedia"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}

/* ───────────────────────────────────────── HERO ──────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-16 px-6 lg:px-12 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20 relative z-10">
        {/* Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center lg:w-1/2 shrink-0"
        >
          <div className="w-[260px] h-[260px] md:w-[320px] md:h-[320px] lg:w-[400px] lg:h-[400px]">
            <VoiceOrb analyser={null} speaker="idle" size={400} />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left gap-6"
        >
          <span className="text-xs uppercase tracking-widest text-text-tertiary font-medium bg-white/[0.05] backdrop-blur-md px-3 py-1 rounded-pill border border-white/10">
            AI Voice Agents · POC by SolnixMedia
          </span>

          <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-bold leading-[1.05] text-text-primary">
            Talk to an AI voice agent.{' '}
            <span className="text-accent drop-shadow-sm">In your language.</span>
          </h1>

          <p className="text-lg text-text-secondary max-w-lg leading-relaxed">
            Three personas. Hindi. Telugu. English.
            <br />
            Powered by Sarvam AI + Gemini.
          </p>

          <a
            href="#personas"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-accent text-white font-medium
                       hover:brightness-110 active:scale-[0.98] shadow-lg shadow-accent/20 transition-all duration-150"
          >
            Start a call ↓
          </a>

          {/* Tech pill strip */}
          <div className="flex flex-wrap gap-2 mt-2">
            {['Sarvam AI', 'Gemini', 'FastAPI'].map((t) => (
              <span
                key={t}
                className="text-[11px] font-medium px-3 py-1 rounded-pill border border-border-subtle bg-bg-card/50 backdrop-blur-sm text-text-tertiary"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────── PERSONA PICKER ─────────────────────────────────── */

function PersonaPicker({
  onSelectPersona,
}: {
  onSelectPersona: (persona: PersonaConfig, lang: LanguageCode) => void;
}) {
  const { personas, setPersonas, callState } = useStore();
  const [langs, setLangs] = useState<Record<string, LanguageCode>>({});

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/personas`);
        if (res.ok) {
          const data: PersonaConfig[] = await res.json();
          setPersonas(data);
          // Initialise per-card language selection
          const initial: Record<string, LanguageCode> = {};
          data.forEach((p) => {
            initial[p.id] = p.default_language;
          });
          setLangs(initial);
        }
      } catch (e) {
        console.error('Failed to fetch personas', e);
      }
    };
    fetchPersonas();
  }, [setPersonas]);

  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="personas" className="py-24 px-6 lg:px-12 relative overflow-hidden backdrop-blur-2xl bg-bg-base/60 border-t border-white/5" ref={sectionRef}>
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-[32px] font-semibold text-text-primary text-center mb-12 drop-shadow-sm"
        >
          Pick someone to talk to
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {personas.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
            >
              <PersonaCard
                persona={p}
                isSelected={false}
                isDisabled={callState === 'active'}
                selectedLanguage={langs[p.id] || p.default_language}
                onLanguageChange={(lang) =>
                  setLangs((prev) => ({ ...prev, [p.id]: lang }))
                }
                onTalk={() => onSelectPersona(p, langs[p.id] || p.default_language)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────── HOW IT WORKS ────────────────────────────────────── */

const STEPS = [
  {
    icon: MousePointerClick,
    title: 'Pick your agent',
    desc: 'Choose a persona that fits your use case — loan recovery, insurance, or appointments.',
  },
  {
    icon: Mic,
    title: 'Speak naturally',
    desc: 'In English, Hindi, or Telugu — or switch mid-call. No typing required.',
  },
  {
    icon: Sparkles,
    title: 'AI responds',
    desc: 'In real time, under 2 seconds. With tool access to look up data and take actions.',
  },
];

function HowItWorks() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="py-24 px-6 lg:px-12 backdrop-blur-3xl bg-bg-base/70 border-t border-white/5"
    >
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-[32px] font-semibold text-text-primary text-center mb-16 drop-shadow-sm"
        >
          How it works
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.15, ease: 'easeOut' }}
                className="flex flex-col items-center text-center gap-4 relative group"
              >
                {/* Glow behind icon */}
                <div className="absolute top-10 w-24 h-24 bg-accent/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Number badge */}
                <span className="w-10 h-10 rounded-full border-2 border-accent text-accent text-sm font-semibold flex items-center justify-center relative z-10 bg-bg-base/50 backdrop-blur-sm">
                  {i + 1}
                </span>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] backdrop-blur-xl flex items-center justify-center relative z-10 ring-1 ring-white/10 group-hover:ring-accent/50 group-hover:bg-white/[0.08] transition-all">
                  <Icon size={24} className="text-accent" />
                </div>

                <h3 className="text-lg font-semibold text-text-primary relative z-10">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed max-w-[260px] relative z-10">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────── BUILT WITH ──────────────────────────────────────── */

const TECH_STACK = [
  { name: 'Sarvam AI', accent: '#06B6D4' },
  { name: 'Gemini', accent: '#A78BFA' },
  { name: 'FastAPI', accent: '#34D399' },
  { name: 'Next.js', accent: '#F5F5F7' },
];

function BuiltWith() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });

  return (
    <section
      id="tech"
      ref={sectionRef}
      className="py-32 px-6 lg:px-12 backdrop-blur-3xl bg-bg-base/80 border-t border-white/5 relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-[32px] font-semibold text-text-primary mb-4 drop-shadow-sm"
        >
          Built with the best infrastructure
          <br />
          for Indian voice AI
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          className="flex flex-wrap justify-center gap-4 mt-12"
        >
          {TECH_STACK.map((tech) => (
            <div
              key={tech.name}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md shadow-lg"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: tech.accent, boxShadow: `0 0 10px ${tech.accent}` }}
              />
              <span className="text-sm font-medium text-text-primary">{tech.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────── FOOTER ──────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border-subtle bg-bg-base text-center relative z-10">
      <p className="text-sm text-text-secondary">
        SolnixMedia · 2026 · Proof of Concept
      </p>
      <p className="text-xs text-text-tertiary mt-2">
        Response times may vary. This is a proof of concept.
      </p>
    </footer>
  );
}

/* ─────────────────────────────────── PAGE ROOT ───────────────────────────────────────── */

export default function Page() {
  const [activeCall, setActiveCall] = useState<{
    persona: PersonaConfig;
    language: LanguageCode;
  } | null>(null);

  const { setPersona, clearTranscript } = useStore();

  const handleSelectPersona = (persona: PersonaConfig, lang: LanguageCode) => {
    setPersona(persona);
    clearTranscript();
    setActiveCall({ persona, language: lang });
  };

  const handleCloseCall = () => {
    setActiveCall(null);
  };

  return (
    <>
      <BackgroundAurora />
      <Nav />
      
      <main className="relative z-10">
        <Hero />
        <PersonaPicker onSelectPersona={handleSelectPersona} />
        <HowItWorks />
        <BuiltWith />
      </main>
      
      <Footer />

      {/* Call Overlay — rendered at root level */}
      <AnimatePresence>
        {activeCall && (
          <CallOverlay
            persona={activeCall.persona}
            selectedLanguage={activeCall.language}
            onClose={handleCloseCall}
          />
        )}
      </AnimatePresence>
    </>
  );
}
