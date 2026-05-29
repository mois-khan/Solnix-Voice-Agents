'use client';

import React from 'react';
import VoiceOrb from '../components/VoiceOrb';

export default function TestOrbPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-12 p-8">
      <h1 className="text-2xl font-semibold text-text-primary font-geist">
        VoiceOrb — Speaker States
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-16">
        {/* Idle state */}
        <div className="flex flex-col items-center gap-4">
          <VoiceOrb analyser={null} speaker="idle" size={300} />
          <span className="text-sm text-text-secondary font-mono uppercase tracking-wider">
            Idle
          </span>
        </div>

        {/* User state */}
        <div className="flex flex-col items-center gap-4">
          <VoiceOrb analyser={null} speaker="user" size={300} />
          <span className="text-sm text-text-secondary font-mono uppercase tracking-wider">
            User
          </span>
        </div>

        {/* Agent state */}
        <div className="flex flex-col items-center gap-4">
          <VoiceOrb analyser={null} speaker="agent" size={300} />
          <span className="text-sm text-text-secondary font-mono uppercase tracking-wider">
            Agent
          </span>
        </div>
      </div>

      <p className="text-text-tertiary text-sm max-w-md text-center">
        All three orbs above are in idle fallback mode (no AnalyserNode attached).
        They animate with a sinusoidal pulse at ~6.3s period.
      </p>
    </div>
  );
}
