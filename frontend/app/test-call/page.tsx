'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import CallOverlay from '../components/CallOverlay';
import { PersonaConfig, LanguageCode } from '../../types';

const MOCK_PERSONA: PersonaConfig = {
  id: 'priya',
  display_name: 'Priya',
  role: 'Loan Recovery Agent',
  avatar: '',
  short_blurb: 'Handles overdue loan follow-ups with empathy.',
  languages: ['en-IN', 'hi-IN'] as LanguageCode[],
  default_language: 'en-IN',
};

export default function TestCallPage() {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <button
        onClick={() => setShowOverlay(true)}
        className="h-12 px-8 rounded-xl bg-accent text-white font-medium cursor-pointer"
      >
        Open Call Overlay (Priya)
      </button>

      <AnimatePresence>
        {showOverlay && (
          <CallOverlay
            persona={MOCK_PERSONA}
            selectedLanguage="en-IN"
            onClose={() => setShowOverlay(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
