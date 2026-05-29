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
        flex flex-col items-center gap-4 p-6 rounded-2xl border
        transition-shadow duration-200
        ${isDisabled
          ? 'pointer-events-none opacity-40'
          : ''
        }
        ${isSelected
          ? 'ring-2 ring-accent bg-accent-dim border-accent'
          : 'bg-bg-card border-border-subtle hover:bg-bg-card-hover'
        }
      `}
      whileHover={
        !isDisabled
          ? {
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.4), 0 4px 24px rgba(124,92,255,0.15), inset 0 0 0 1px rgba(124,92,255,0.2)',
            }
          : undefined
      }
    >
      {/* Avatar */}
      <AvatarFallback name={persona.display_name} size={80} />

      {/* Name */}
      <h3 className="text-lg font-semibold text-text-primary text-center">
        {persona.display_name}
      </h3>

      {/* Role */}
      <span className="text-xs uppercase tracking-widest text-text-secondary text-center">
        {persona.role}
      </span>

      {/* Blurb */}
      <p className="text-sm text-text-secondary text-center line-clamp-2">
        {persona.short_blurb}
      </p>

      {/* Language pills */}
      <div className="flex gap-2 flex-wrap justify-center">
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
          w-full h-11 rounded-xl font-medium text-sm text-white
          bg-accent
          ${isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:brightness-110 active:scale-[0.98]'
          }
          transition-all duration-150
        `}
      >
        Talk →
      </button>
    </motion.div>
  );
}
