'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LanguageCode } from '../../types';

const LABELS: Record<LanguageCode, string> = {
  'en-IN': 'EN',
  'hi-IN': 'हि',
  'te-IN': 'తె',
};

const ARIA_LABELS: Record<LanguageCode, string> = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'te-IN': 'Telugu',
};

interface LanguagePillProps {
  code: LanguageCode;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export default function LanguagePill({ code, isActive, isDisabled, onClick }: LanguagePillProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ARIA_LABELS[code]}
      aria-pressed={isActive}
      className={`
        h-7 px-3 text-[12px] font-medium rounded-pill
        border outline-none transition-none
        ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
      animate={{
        backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
        color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
        borderColor: isActive ? 'transparent' : 'var(--color-border-subtle)',
      }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      whileTap={!isDisabled ? { scale: 0.95 } : undefined}
    >
      {LABELS[code]}
    </motion.button>
  );
}
