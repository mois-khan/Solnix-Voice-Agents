'use client';

import React, { useState } from 'react';
import TranscriptLine from '../components/TranscriptLine';
import CallControls from '../components/CallControls';
import LiveIndicator from '../components/LiveIndicator';
import { TranscriptLine as TL } from '../../types';

const MOCK_TRANSCRIPT: TL[] = [
  { id: '1', speaker: 'agent', text: 'Hello, this is Priya calling from SolnixFinance regarding your loan account L-1042.', timestamp: new Date() },
  { id: '2', speaker: 'user', text: 'Yes, go ahead.', timestamp: new Date() },
  { id: '3', speaker: 'agent', text: 'आपका EMI ₹12,500 अभी 18 दिन overdue है। क्या आप इस हफ़्ते payment कर सकते हैं?', timestamp: new Date() },
  { id: '4', speaker: 'user', text: 'हाँ, मैं शुक्रवार तक कर दूँगा।', timestamp: new Date() },
  { id: '5', speaker: 'agent', text: 'మీ పాలసీ P-7781 గడువు జూన్ 15న ముగుస్తుంది.', timestamp: new Date() },
];

export default function TestUIPage() {
  const [muted, setMuted] = useState(false);

  return (
    <div className="min-h-screen bg-bg-base p-8 pb-32">
      {/* LiveIndicator */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-xl font-semibold text-text-primary font-geist">
          Component Test — TranscriptLine · CallControls · LiveIndicator
        </h1>
        <LiveIndicator />
      </div>

      {/* Transcript */}
      <div className="max-w-2xl mx-auto bg-bg-card rounded-2xl border border-border-subtle p-4">
        <h2 className="text-sm text-text-secondary font-medium mb-4 uppercase tracking-wide">
          Transcript
        </h2>
        <div className="divide-y divide-border-subtle">
          {MOCK_TRANSCRIPT.map((line) => (
            <TranscriptLine key={line.id} line={line} />
          ))}
        </div>
      </div>

      {/* CallControls */}
      <CallControls
        isMuted={muted}
        onToggleMute={() => setMuted(!muted)}
        onStartSpeaking={() => console.log('Recording started')}
        onStopSpeaking={() => console.log('Recording stopped')}
        onEndCall={() => console.log('Call ended')}
        agentState="listening"
      />
    </div>
  );
}
