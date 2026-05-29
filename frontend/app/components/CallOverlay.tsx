'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, AlertCircle } from 'lucide-react';

import { PersonaConfig, LanguageCode } from '../../types';
import { useStore } from '../../lib/store';
import { VoiceWSClient } from '../../lib/wsClient';
import { AudioCapture } from '../../lib/audioCapture';
import { AudioPlayer } from '../../lib/audioPlayer';
import { MicAnalyser } from '../../lib/micAnalyser';

import VoiceOrb from './VoiceOrb';
import LiveIndicator from './LiveIndicator';
import LanguagePill from './LanguagePill';
import TranscriptLine from './TranscriptLine';
import CallControls from './CallControls';
import MicPermissionPrompt from './MicPermissionPrompt';

interface CallOverlayProps {
  persona: PersonaConfig;
  selectedLanguage: LanguageCode;
  onClose: () => void;
}

function needsIndicFont(text: string): boolean {
  return /[\u0900-\u097F\u0C00-\u0C7F]/.test(text);
}

export default function CallOverlay({ persona, selectedLanguage, onClose }: CallOverlayProps) {
  const {
    callState,
    agentState,
    transcript,
    currentLanguage,
    isMuted,
    startCall,
    endCall,
    setAgentState,
    setLanguage,
    appendTranscript,
    clearTranscript,
    setMuted,
  } = useStore();

  const [micDenied, setMicDenied] = useState(false);
  
  // Edge states
  const [isConnecting, setIsConnecting] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  
  const [showThinkingDots, setShowThinkingDots] = useState(false);

  const wsClientRef = useRef<VoiceWSClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const micAnalyserRef = useRef<MicAnalyser | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  
  const reconnectAttemptsRef = useRef(0);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Thinking dots timer
  useEffect(() => {
    if (agentState === 'thinking') {
      thinkingTimerRef.current = setTimeout(() => {
        setShowThinkingDots(true);
      }, 3000);
    } else {
      setShowThinkingDots(false);
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    }
    return () => {
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    };
  }, [agentState]);

  const connectWs = useCallback((sessionId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsBaseUrl = apiUrl.replace('http', 'ws');
    const wsClient = new VoiceWSClient(wsBaseUrl);
    wsClientRef.current = wsClient;

    wsClient.onConnect = () => {
      setIsConnecting(false);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
      
      wsClient.sendJSON({
        type: 'session_config',
        persona: persona.id,
        language: selectedLanguage,
      });
    };

    wsClient.onTranscript = (speaker, text) => {
      if (!text.trim()) return; // Ignore empty transcripts
      appendTranscript({ speaker: speaker as 'user' | 'agent', text, timestamp: new Date() });
    };

    wsClient.onAgentState = (state) => {
      setAgentState(state as any);
    };

    wsClient.onAudioChunk = (base64) => {
      playerRef.current?.play(base64);
    };

    wsClient.onLanguageSwitched = (lang) => {
      setLanguage(lang as LanguageCode);
    };

    wsClient.onDisconnect = () => {
      if (!sessionIdRef.current || connectionLost) return;
      
      if (reconnectAttemptsRef.current < 3) {
        setIsReconnecting(true);
        const backoff = [1000, 2000, 4000][reconnectAttemptsRef.current];
        reconnectAttemptsRef.current += 1;
        setTimeout(() => connectWs(sessionIdRef.current!), backoff);
      } else {
        setConnectionLost(true);
        setIsReconnecting(false);
      }
    };

    wsClient.onError = (code, message) => {
      console.error(`WS Error [${code}]: ${message}`);
    };

    wsClient.connect(sessionId);
  }, [persona.id, selectedLanguage, appendTranscript, setAgentState, setLanguage, connectionLost]);

  const initSession = useCallback(async () => {
    setInitError(null);
    setMicDenied(false);
    setIsConnecting(true);
    setConnectionLost(false);
    reconnectAttemptsRef.current = 0;

    clearTranscript();

    // 1. Request mic
    const capture = new AudioCapture();
    const hasPerm = await capture.requestPermission();
    if (!hasPerm) {
      setMicDenied(true);
      return;
    }
    captureRef.current = capture;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const micAn = new MicAnalyser();
    const stream = capture.getStream();
    if (stream) micAn.attachStream(stream, audioCtx);
    micAnalyserRef.current = micAn;

    const player = new AudioPlayer();
    playerRef.current = player;

    // Set 5s connecting timeout
    connectingTimerRef.current = setTimeout(() => {
      setInitError("Connecting timed out. Please try again.");
    }, 5000);

    // 2. Create session
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: persona.id,
          language: selectedLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create session');
      }

      const sessionData = await res.json();
      const sessionId = sessionData.session_id;
      sessionIdRef.current = sessionId;
      startCall(sessionId);

      // 3. Connect WS
      connectWs(sessionId);
    } catch (e) {
      console.error('Failed to start call', e);
      setInitError("Couldn't start the call. Please try again.");
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
      setTimeout(onClose, 3000);
    }
  }, [persona.id, selectedLanguage, clearTranscript, startCall, connectWs, onClose]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    initSession();

    return () => {
      sessionIdRef.current = null;
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
      micAnalyserRef.current?.detach();
      micAnalyserRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    };
  }, [initSession]);

  const handleClose = useCallback(() => {
    sessionIdRef.current = null;
    wsClientRef.current?.disconnect();
    wsClientRef.current = null;
    endCall();
    onClose();
  }, [endCall, onClose]);

  const handleLanguageSwitch = useCallback((lang: LanguageCode) => {
    if (wsClientRef.current && lang !== currentLanguage) {
      wsClientRef.current.sendJSON({ type: 'language_switch', language: lang });
    }
  }, [currentLanguage]);

  const handleStartSpeaking = useCallback(() => {
    captureRef.current?.startRecording();
  }, []);

  const handleStopSpeaking = useCallback(async () => {
    if (!captureRef.current || !wsClientRef.current) return;
    try {
      const blob = await captureRef.current.stopRecording();
      wsClientRef.current.sendAudio(blob);
    } catch (e) {
      console.error('Error sending audio', e);
    }
  }, []);

  // Determine which analyser the orb should use
  let orbAnalyser: AnalyserNode | null = null;
  let orbSpeaker: 'idle' | 'user' | 'agent' = 'idle';

  if (!isConnecting && !connectionLost && !isReconnecting) {
    if (agentState === 'speaking') {
      orbAnalyser = playerRef.current?.getOutputAnalyser() ?? null;
      orbSpeaker = 'agent';
    } else if (agentState === 'listening') {
      orbAnalyser = micAnalyserRef.current?.getAnalyser() ?? null;
      orbSpeaker = 'user';
    } else if (agentState === 'thinking') {
      // Thinking: idle orb, dim amplitude handled by wrapper opacity
      orbAnalyser = null; 
      orbSpeaker = 'idle';
    }
  }

  // Last agent transcript line
  const lastAgentLine = [...transcript].reverse().find((l) => l.speaker === 'agent');

  return (
    <>
      <AnimatePresence>
        {micDenied && (
          <MicPermissionPrompt onRetry={initSession} onDismiss={onClose} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 bg-bg-base flex flex-col"
      >
        {/* Toast Error */}
        <AnimatePresence>
          {initError && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-danger text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium"
            >
              <AlertCircle size={16} />
              {initError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── HEADER ─── */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border-subtle shrink-0">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{persona.display_name}</span>
              <span className="text-[11px] uppercase tracking-wider text-text-tertiary">
                {persona.role}
              </span>
            </div>
          </div>

          {/* Center */}
          <div className="absolute left-1/2 -translate-x-1/2">
            {!isConnecting && !isReconnecting && !connectionLost && callState === 'active' && <LiveIndicator />}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {persona.languages.map((lang) => (
              <LanguagePill
                key={lang}
                code={lang}
                isActive={currentLanguage === lang}
                isDisabled={isConnecting || isReconnecting || connectionLost}
                onClick={() => handleLanguageSwitch(lang)}
              />
            ))}
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg ml-2 text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ─── CENTER — ORB + SUBTITLE ─── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 relative">
          
          <div className="relative flex items-center justify-center">
            {/* Orb Wrapper to control opacity for thinking state */}
            <motion.div
              animate={{ opacity: agentState === 'thinking' ? 0.6 : 1 }}
              transition={{ duration: 0.5 }}
            >
              <VoiceOrb analyser={orbAnalyser} speaker={orbSpeaker} size={300} />
            </motion.div>

            {/* Reconnecting overlay */}
            <AnimatePresence>
              {isReconnecting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-bg-base/50 rounded-full"
                >
                  <span className="text-sm font-medium text-text-primary bg-bg-elevated px-4 py-2 rounded-pill shadow-lg border border-border-subtle">
                    Reconnecting…
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Connecting State */}
          {isConnecting && !initError && (
            <div className="h-16 flex items-center justify-center">
              <span className="text-sm text-text-secondary animate-pulse">Connecting…</span>
            </div>
          )}

          {/* Connection Lost State */}
          {connectionLost && (
            <div className="h-16 flex flex-col items-center justify-center gap-2">
              <span className="text-sm text-danger font-medium">Connection lost</span>
              <button onClick={() => initSession()} className="text-xs px-4 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-text-primary hover:bg-bg-card cursor-pointer">
                Try again
              </button>
            </div>
          )}

          {/* Subtitle / Agent State */}
          {!isConnecting && !connectionLost && (
            <div className="h-16 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                {agentState === 'thinking' && showThinkingDots ? (
                  <motion.p
                    key="thinking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xl font-medium text-text-tertiary"
                  >
                    …
                  </motion.p>
                ) : lastAgentLine && agentState !== 'thinking' ? (
                  <motion.p
                    key={lastAgentLine.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={`
                      text-2xl font-semibold text-text-primary text-center max-w-2xl leading-relaxed drop-shadow-md
                      ${needsIndicFont(lastAgentLine.text) ? 'font-noto text-3xl tracking-wide' : 'tracking-tight'}
                    `}
                  >
                    {lastAgentLine.text}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ─── FLOATING TRANSCRIPT PANEL ─── */}
        <div className="w-full max-w-2xl mx-auto px-6 mb-[120px] pointer-events-none z-10">
          <div
            className="max-h-[30vh] overflow-y-auto pointer-events-auto glass-panel rounded-2xl p-4 flex flex-col gap-1"
            aria-live="polite"
          >
            {transcript.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-4 font-medium italic">
                Listening...
              </p>
            ) : (
              transcript.map((line) => (
                <TranscriptLine key={line.id} line={line} />
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* ─── CONTROLS ─── */}
        <CallControls
          isMuted={isMuted}
          onToggleMute={() => setMuted(!isMuted)}
          onStartSpeaking={handleStartSpeaking}
          onStopSpeaking={handleStopSpeaking}
          onEndCall={handleClose}
          agentState={agentState}
        />
      </motion.div>
    </>
  );
}
