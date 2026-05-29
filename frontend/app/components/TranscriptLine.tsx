'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TranscriptLine as TranscriptLineType } from '../../types';
import { useStore } from '../../lib/store';

function needsIndicFont(text: string): boolean {
  return /[\u0900-\u097F\u0C00-\u0C7F]/.test(text);
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TranscriptLineProps {
  line: TranscriptLineType;
}

export default function TranscriptLine({ line }: TranscriptLineProps) {
  const selectedPersona = useStore((s) => s.selectedPersona);
  const isAgent = line.speaker === 'agent';
  const speakerLabel = isAgent
    ? selectedPersona?.display_name ?? 'Agent'
    : 'You';

  const indic = needsIndicFont(line.text);

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`
        group relative flex gap-4 items-start py-3 px-4 rounded-xl transition-colors duration-200
        ${isAgent ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]'}
      `}
    >
      {/* Speaker label */}
      <span
        className={`
          w-12 pt-0.5 shrink-0 text-[11px] uppercase tracking-wider font-semibold
          ${isAgent ? 'text-accent-light drop-shadow-sm' : 'text-text-secondary'}
        `}
      >
        {speakerLabel}
      </span>

      {/* Text */}
      <span
        className={`
          flex-1 leading-relaxed tracking-wide
          ${indic ? 'font-noto text-[16px]' : 'font-mono text-[15px]'}
          ${isAgent ? 'text-white' : 'text-text-primary/90'}
        `}
      >
        {line.text}
      </span>

      {/* Timestamp — visible on row hover */}
      <span className="absolute right-4 top-3.5 text-[11px] text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {formatTime(line.timestamp)}
      </span>
    </motion.div>
  );
}
