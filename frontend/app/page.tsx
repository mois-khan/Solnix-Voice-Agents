'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { MousePointerClick, Mic, Sparkles, Menu, X, Bot, Languages, Phone, ArrowRight } from 'lucide-react';

import { PersonaConfig, LanguageCode } from '../types';
import { useStore } from '../lib/store';
import VoiceOrb from './components/VoiceOrb';
import CallOverlay from './components/CallOverlay';
import BackgroundAurora from './components/BackgroundAurora';

/* ───────────────────────────────────────── NAV ───────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
        ${scrolled || isOpen ? 'backdrop-blur-xl bg-bg-base/80 border-b border-border-subtle' : 'bg-transparent'}
      `}
    >
      <a href="#" className="text-xl font-bold text-accent tracking-tight">
        Solnix
      </a>

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-8">
        {[
          { label: 'Agents', href: '#personas' },
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

      {/* Hamburger Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Slide-down Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 left-0 right-0 bg-bg-base/95 backdrop-blur-2xl border-b border-border-subtle flex flex-col p-6 gap-4 md:hidden z-30 shadow-2xl"
          >
            {[
              { label: 'Agents', href: '#personas' },
              { label: 'How it works', href: '#how-it-works' },
              { label: 'Tech', href: '#tech' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-base font-semibold text-text-secondary hover:text-text-primary transition-colors py-2 border-b border-white/[0.03]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/solnixmedia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-text-secondary hover:text-text-primary transition-colors py-2"
            >
              GitHub
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ───────────────────────────────────────── HERO ──────────────────────────────────────── */

function Hero() {
  const [orbSize, setOrbSize] = useState(260);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setOrbSize(400);
      else if (window.innerWidth >= 768) setOrbSize(320);
      else setOrbSize(260);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          <div className="w-[260px] h-[260px] md:w-[320px] md:h-[320px] lg:w-[400px] lg:h-[400px] flex items-center justify-center">
            <VoiceOrb analyser={null} speaker="idle" size={orbSize} />
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

/* ──────────────────────────────────── SCENARIO AGENTS (Tabbed) ─────────────────────────────────── */

const LANG_LABEL: Record<string, string> = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'te-IN': 'Telugu',
};

function ScenarioAgents({
  onSelectPersona,
}: {
  onSelectPersona: (persona: PersonaConfig, lang: LanguageCode) => void;
}) {
  const { personas, setPersonas, callState } = useStore();
  const [langs, setLangs] = useState<Record<string, LanguageCode>>({});
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/personas`);
        if (res.ok) {
          const data: PersonaConfig[] = await res.json();
          setPersonas(data);
          const initial: Record<string, LanguageCode> = {};
          data.forEach((p) => {
            initial[p.id] = p.default_language;
          });
          setLangs(initial);
          const firstScenario = data.find((p) => p.id !== 'open');
          if (firstScenario) setActiveTabId(firstScenario.id);
          return;
        }
      } catch (e) {
        console.error('Failed to fetch personas', e);
      }

      // Fallback
      const fallbackData: PersonaConfig[] = [
        {
          id: 'priya',
          display_name: 'Priya',
          role: 'Loan Recovery Agent',
          avatar: '/personas/priya.png',
          short_blurb: 'Polite reminder calls for overdue EMIs.',
          languages: ['en-IN', 'hi-IN'],
          default_language: 'en-IN',
        },
        {
          id: 'arjun',
          display_name: 'Arjun',
          role: 'Insurance Renewal Agent',
          avatar: '/personas/arjun.png',
          short_blurb: 'Friendly reminders before your policy lapses.',
          languages: ['en-IN', 'hi-IN', 'te-IN'],
          default_language: 'en-IN',
        },
        {
          id: 'meera',
          display_name: 'Meera',
          role: 'Appointment Booking Agent',
          avatar: '/personas/meera.png',
          short_blurb: 'Book, reschedule, or cancel appointments instantly.',
          languages: ['en-IN', 'hi-IN', 'te-IN'],
          default_language: 'en-IN',
        },
        {
          id: 'open',
          display_name: 'Open Agent',
          role: 'General AI Assistant',
          avatar: '/personas/open.png',
          short_blurb: 'A versatile AI agent ready to help you with anything.',
          languages: ['en-IN', 'hi-IN', 'te-IN'],
          default_language: 'en-IN',
        },
      ];
      setPersonas(fallbackData);
      const initial: Record<string, LanguageCode> = {};
      fallbackData.forEach((p) => {
        initial[p.id] = p.default_language;
      });
      setLangs(initial);
      setActiveTabId('priya');
    };
    fetchPersonas();
  }, [setPersonas]);

  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  const scenarioPersonas = personas.filter((p) => p.id !== 'open');
  const activePersona = scenarioPersonas.find((p) => p.id === activeTabId) || scenarioPersonas[0];
  const selectedLang = activePersona ? langs[activePersona.id] || activePersona.default_language : 'en-IN';

  return (
    <section
      id="personas"
      className="py-24 px-6 lg:px-12 relative overflow-hidden border-t border-white/5"
      ref={sectionRef}
    >
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center mb-4"
        >
          <span className="text-accent font-semibold text-lg italic">Try live AI voice calls</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
          className="text-[32px] md:text-[40px] font-bold text-text-primary text-center mb-4"
        >
          Across industries. <span className="text-text-secondary">Across languages.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="text-text-secondary text-center mb-12 max-w-xl mx-auto"
        >
          Pick a scenario agent to test specialized flows — or scroll down for the open agent.
        </motion.p>

        {/* Tab Bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]">
            {scenarioPersonas.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveTabId(p.id)}
                className={`relative px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer ${
                  activeTabId === p.id
                    ? 'text-white'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {activeTabId === p.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl bg-accent/20 border border-accent/40"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{p.role.replace(' Agent', '')}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Active Agent Display */}
        <AnimatePresence mode="wait">
          {activePersona && (
            <motion.div
              key={activePersona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col items-center"
            >
              {/* Stats pill */}
              <div className="inline-flex items-center gap-2 px-5 py-2 mb-10 rounded-pill bg-accent/10 border border-accent/20 backdrop-blur-md">
                <Sparkles size={14} className="text-accent" />
                <span className="text-sm font-medium text-accent">{activePersona.short_blurb}</span>
              </div>

              {/* Central Orb Area */}
              <div className="relative w-[300px] h-[300px] flex items-center justify-center mb-10">
                {/* Outer glow rings */}
                <div className="absolute inset-0 rounded-full border border-accent/10" />
                <div className="absolute inset-4 rounded-full border border-accent/5" />
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-accent/5 blur-xl"
                />

                {/* The clickable orb */}
                <button
                  onClick={() => {
                    if (callState !== 'active' && activePersona) {
                      onSelectPersona(activePersona, selectedLang);
                    }
                  }}
                  disabled={callState === 'active'}
                  className="relative w-[140px] h-[140px] rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 rounded-full bg-accent/20 blur-md group-hover:bg-accent/30 transition-colors" />
                  <Phone size={40} className="text-white relative z-10 drop-shadow-lg" />
                </button>

                {/* Language labels orbiting around */}
                {activePersona.languages.map((lang, i) => {
                  const total = activePersona.languages.length;
                  // Position labels evenly around the bottom semicircle
                  const startAngle = 200; // degrees from top
                  const endAngle = 340;
                  const angle = total === 1 ? 270 : startAngle + (i * (endAngle - startAngle)) / (total - 1);
                  const rad = (angle * Math.PI) / 180;
                  const radius = 155;
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;

                  return (
                    <button
                      key={lang}
                      onClick={() => setLangs((prev) => ({ ...prev, [activePersona.id]: lang }))}
                      className={`absolute text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        selectedLang === lang
                          ? 'text-white scale-110'
                          : 'text-text-tertiary hover:text-text-secondary scale-100'
                      }`}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                    >
                      {LANG_LABEL[lang]}
                    </button>
                  );
                })}

                {/* Extra languages indicator */}
                {activePersona.languages.length > 2 && (
                  <span
                    className="absolute text-xs font-bold text-accent tracking-wide"
                    style={{
                      transform: `translate(${Math.cos((340 * Math.PI) / 180) * 160}px, ${Math.sin((340 * Math.PI) / 180) * 160}px) rotate(25deg)`,
                    }}
                  >
                    +{activePersona.languages.length} languages
                  </span>
                )}
              </div>

              {/* Start Call CTA */}
              <button
                onClick={() => {
                  if (callState !== 'active' && activePersona) {
                    onSelectPersona(activePersona, selectedLang);
                  }
                }}
                disabled={callState === 'active'}
                className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 text-white font-semibold text-base hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Phone size={18} />
                Talk to {activePersona.display_name}
                <ArrowRight size={16} className="text-text-tertiary" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ──────────────────────────────────── OPEN AGENT SECTION ─────────────────────────────────── */

function OpenAgentSection({
  onSelectPersona,
}: {
  onSelectPersona: (persona: PersonaConfig, lang: LanguageCode) => void;
}) {
  const { personas, callState } = useStore();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('en-IN');
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  const openAgent = personas.find((p) => p.id === 'open');
  if (!openAgent) return null;

  return (
    <section
      id="open-agent"
      className="py-24 px-6 lg:px-12 relative overflow-hidden border-t border-white/5"
      ref={sectionRef}
    >
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-[32px] md:text-[40px] font-bold text-text-primary text-center mb-4"
        >
          Open Voice Agent
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="text-text-secondary text-center mb-12 max-w-xl mx-auto"
        >
          Have a free-flowing conversation. Assign roles on the fly or just chat about anything.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="relative group"
        >
          {/* Glow background */}
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-transparent to-accent/20 rounded-3xl blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-700" />

          {/* Card */}
          <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl overflow-hidden">
            {/* Top gradient accent line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />

            <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
              {/* Bot Avatar */}
              <div className="relative shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  className="w-36 h-36 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border-2 border-accent/20 flex items-center justify-center"
                >
                  <Bot className="w-20 h-20 text-accent drop-shadow-lg" />
                </motion.div>
                {/* Orbit ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                  className="absolute inset-[-12px] rounded-full border border-dashed border-accent/15"
                />
              </div>

              {/* Info + Controls */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-text-primary mb-1">{openAgent.display_name}</h3>
                <span className="text-[11px] font-bold uppercase tracking-widest text-accent-light">
                  {openAgent.role}
                </span>
                <p className="text-text-secondary mt-3 mb-6 leading-relaxed">{openAgent.short_blurb}</p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Language pills */}
                  <div className="flex gap-2">
                    {openAgent.languages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLang(lang)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                          selectedLang === lang
                            ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                            : 'bg-white/[0.03] border-white/10 text-text-secondary hover:bg-white/[0.06] hover:border-white/20'
                        }`}
                      >
                        <Languages size={14} className="opacity-80" />
                        {LANG_LABEL[lang]}
                      </button>
                    ))}
                  </div>

                  {/* Talk button */}
                  <button
                    onClick={() => onSelectPersona(openAgent, selectedLang)}
                    disabled={callState === 'active'}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-white font-bold shadow-lg shadow-accent/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Phone size={18} />
                    Talk Now
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
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
        <ScenarioAgents onSelectPersona={handleSelectPersona} />
        <OpenAgentSection onSelectPersona={handleSelectPersona} />
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
