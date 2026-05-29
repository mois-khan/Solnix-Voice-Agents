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
      className="group relative flex gap-3 items-start py-2"
    >
      {/* Speaker label */}
      <span
        className={`
          w-10 shrink-0 text-[11px] uppercase tracking-wide font-medium
          ${isAgent ? 'text-accent-light' : 'text-text-tertiary'}
        `}
      >
        {speakerLabel}
      </span>

      {/* Text */}
      <span
        className={`
          flex-1 leading-relaxed
          ${indic ? 'font-noto text-sm' : 'font-mono text-[13px]'}
        `}
      >
        {line.text}
      </span>

      {/* Timestamp — visible on row hover */}
      <span className="absolute right-2 top-2 text-[11px] text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {formatTime(line.timestamp)}
      </span>
    </motion.div>
  );
}
