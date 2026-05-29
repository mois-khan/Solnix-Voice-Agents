'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mic, RotateCcw, X } from 'lucide-react';

interface MicPermissionPromptProps {
  onRetry: () => void;
  onDismiss: () => void;
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Edg')) return 'edge';
  return 'other';
}

const BROWSER_INSTRUCTIONS: Record<string, string> = {
  chrome:  'Click the lock icon (🔒) in the address bar → Site settings → Microphone → Allow',
  edge:    'Click the lock icon (🔒) in the address bar → Site permissions → Microphone → Allow',
  firefox: 'Click the shield icon in the address bar → Allow microphone',
  safari:  'Safari menu → Settings for This Website → Microphone → Allow',
  other:   'Allow microphone access in your browser settings',
};

export default function MicPermissionPrompt({ onRetry, onDismiss }: MicPermissionPromptProps) {
  const browser = useMemo(() => detectBrowser(), []);
  const instruction = BROWSER_INSTRUCTIONS[browser];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-bg-card border border-border-subtle rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg
                     text-text-tertiary hover:text-text-primary hover:bg-bg-elevated
                     transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-accent-dim flex items-center justify-center mb-6">
          <Mic size={24} className="text-accent" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Microphone access needed
        </h2>

        {/* Body */}
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          To talk to the agent, we need your microphone. No audio is stored.
        </p>

        {/* Browser-specific instructions */}
        <div className="bg-bg-elevated rounded-xl p-4 mb-6 border border-border-subtle">
          <p className="text-xs text-text-tertiary uppercase tracking-wide font-medium mb-2">
            How to enable
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {instruction}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 h-11 rounded-xl bg-accent text-white font-medium text-sm
                       flex items-center justify-center gap-2
                       hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            Try again
          </button>
          <button
            onClick={onDismiss}
            className="h-11 px-5 rounded-xl border border-border-subtle text-text-secondary font-medium text-sm
                       hover:text-text-primary hover:bg-bg-elevated transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
