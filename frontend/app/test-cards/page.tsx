'use client';

import React, { useState } from 'react';
import PersonaCard from '../components/PersonaCard';
import { PersonaConfig, LanguageCode } from '../../types';

const MOCK_PERSONAS: PersonaConfig[] = [
  {
    id: 'priya',
    display_name: 'Priya',
    role: 'Loan Recovery Agent',
    avatar: '',
    short_blurb: 'Handles overdue loan follow-ups with empathy and firm professionalism.',
    languages: ['en-IN', 'hi-IN'] as LanguageCode[],
    default_language: 'en-IN',
  },
  {
    id: 'arjun',
    display_name: 'Arjun',
    role: 'Insurance Renewal Agent',
    avatar: '',
    short_blurb: 'Guides customers through health insurance policy renewals and benefits.',
    languages: ['en-IN', 'hi-IN', 'te-IN'] as LanguageCode[],
    default_language: 'en-IN',
  },
  {
    id: 'meera',
    display_name: 'Meera',
    role: 'Appointment Booking Agent',
    avatar: '',
    short_blurb: 'Books, reschedules, and manages clinic appointments efficiently.',
    languages: ['en-IN', 'hi-IN', 'te-IN'] as LanguageCode[],
    default_language: 'en-IN',
  },
];

export default function TestCardsPage() {
  const [selectedLangs, setSelectedLangs] = useState<Record<string, LanguageCode>>({
    priya: 'en-IN',
    arjun: 'en-IN',
    meera: 'en-IN',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-12 p-8">
      <h1 className="text-2xl font-semibold text-text-primary font-geist">
        PersonaCard + LanguagePill Test
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
        {MOCK_PERSONAS.map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            isSelected={selectedId === p.id}
            isDisabled={false}
            selectedLanguage={selectedLangs[p.id]}
            onLanguageChange={(lang) =>
              setSelectedLangs((prev) => ({ ...prev, [p.id]: lang }))
            }
            onTalk={() => setSelectedId(p.id)}
          />
        ))}
      </div>

      <p className="text-text-tertiary text-sm max-w-lg text-center">
        Click language pills to switch. Click &quot;Talk →&quot; to select a card.
        Hover over cards to see the 3D tilt effect.
      </p>
    </div>
  );
}
