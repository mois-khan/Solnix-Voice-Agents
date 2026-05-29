'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { AgentState } from '../../types';

interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onStartSpeaking: () => void;
  onStopSpeaking: () => void;
  onEndCall: () => void;
  agentState: AgentState;
}

export default function CallControls({
  isMuted,
  onToggleMute,
  onStartSpeaking,
  onStopSpeaking,
  onEndCall,
  agentState,
}: CallControlsProps) {
  const [isRecording, setIsRecording] = useState(false);

  const handleDown = () => {
    if (isMuted) return;
    setIsRecording(true);
    onStartSpeaking();
  };

  const handleUp = () => {
    if (!isRecording) return;
    setIsRecording(false);
    onStopSpeaking();
  };

  // Determine mic button style
  let micClasses: string;
  let micLabel: string;
  let MicIcon = Mic;

  if (isMuted) {
    micClasses = 'bg-warn/20 border-warn text-warn';
    micLabel = 'Muted';
    MicIcon = MicOff;
  } else if (isRecording) {
    micClasses = 'bg-accent text-white border-transparent scale-105';
    micLabel = 'Release to send';
    MicIcon = Mic;
  } else {
    micClasses = 'bg-bg-card border-border-subtle text-text-primary';
    micLabel = 'Hold to speak';
    MicIcon = Mic;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center gap-4 py-4 pb-8"
      style={{
        background: 'linear-gradient(to bottom, transparent, var(--color-bg-elevated) 40%)',
      }}
    >
      {/* Mic / Push-to-talk button */}
      <button
        type="button"
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onTouchStart={handleDown}
        onTouchEnd={handleUp}
        className={`
          h-14 px-6 rounded-xl border font-medium text-sm
          flex items-center gap-2 select-none
          transition-all duration-150
          ${micClasses}
        `}
      >
        <MicIcon size={18} />
        {micLabel}
      </button>

      {/* End Call button */}
      <button
        type="button"
        onClick={onEndCall}
        className="
          h-14 px-6 rounded-xl border font-medium text-sm
          flex items-center gap-2
          bg-danger/20 border-danger text-danger
          hover:bg-danger hover:text-white
          transition-all duration-150 cursor-pointer
        "
      >
        <Square size={16} />
        End Call
      </button>
    </div>
  );
}
