'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { PersonaConfig, LanguageCode } from '../../types';
import LanguagePill from './LanguagePill';

interface PersonaCardProps {
  persona: PersonaConfig;
  isSelected: boolean;
  isDisabled: boolean;
  selectedLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onTalk: () => void;
}

function AvatarFallback({ name, size }: { name: string; size: number }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center bg-accent text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export default function PersonaCard({
  persona,
  isSelected,
  isDisabled,
  selectedLanguage,
  onLanguageChange,
  onTalk,
}: PersonaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springX = useSpring(rotateX, { stiffness: 300, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalize offset to -1..1
    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);

    // rotateY follows X offset, rotateX follows inverted Y offset
    rotateY.set(offsetX * 8);
    rotateX.set(-offsetY * 8);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springX,
        rotateY: springY,
        transformPerspective: 800,
      }}
      className={`
        relative overflow-hidden flex flex-col items-center gap-4 p-6 rounded-[20px]
        transition-all duration-300 border
        ${isDisabled
          ? 'pointer-events-none opacity-40'
          : ''
        }
        ${isSelected
          ? 'ring-2 ring-accent bg-accent-dim border-accent'
          : 'bg-white/[0.03] backdrop-blur-xl border-white/5 hover:bg-white/[0.08] shadow-lg'
        }
      `}
      whileHover={
        !isDisabled
          ? {
              boxShadow:
                '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 40px rgba(124,92,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
              y: -4
            }
          : undefined
      }
    >
      {/* Glare effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 60%)',
          x: springX,
          y: springY,
        }}
      />
      
      {/* Inner Content needs relative z-10 so it's above glare */}
      <div className="relative z-10 flex flex-col items-center gap-4 w-full">
        {/* Avatar */}
        <AvatarFallback name={persona.display_name} size={80} />

        {/* Name */}
        <h3 className="text-xl font-bold text-text-primary text-center">
          {persona.display_name}
        </h3>

        {/* Role */}
        <span className="text-[11px] font-bold uppercase tracking-widest text-accent-light text-center drop-shadow-sm">
          {persona.role}
        </span>

        {/* Blurb */}
        <p className="text-[14px] text-text-secondary text-center line-clamp-2 leading-relaxed">
          {persona.short_blurb}
        </p>

        {/* Language pills */}
        <div className="flex gap-2 flex-wrap justify-center mt-2">
          {persona.languages.map((lang) => (
            <LanguagePill
              key={lang}
              code={lang}
              isActive={selectedLanguage === lang}
              isDisabled={isDisabled}
              onClick={() => onLanguageChange(lang)}
            />
          ))}
        </div>

        {/* Talk button */}
        <button
          type="button"
          onClick={onTalk}
          disabled={isDisabled}
          className={`
            w-full h-12 mt-2 rounded-xl font-bold text-[15px] text-white
            bg-gradient-to-r from-accent to-accent-light shadow-md
            ${isDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:shadow-lg hover:shadow-accent/20 hover:brightness-110 active:scale-[0.98]'
            }
            transition-all duration-200
          `}
        >
          Talk →
        </button>
      </div>
    </motion.div>
  );
}
