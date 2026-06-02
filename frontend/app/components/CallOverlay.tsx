'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, MicOff, Mic, AlertCircle, X, Signal, BatteryFull, Wifi, Bot } from 'lucide-react';

import { PersonaConfig, LanguageCode } from '../../types';
import { useStore } from '../../lib/store';
import { VoiceWSClient } from '../../lib/wsClient';
import { AudioCapture } from '../../lib/audioCapture';
import { AudioPlayer } from '../../lib/audioPlayer';
import { MicAnalyser } from '../../lib/micAnalyser';

import VoiceOrb from './VoiceOrb';
import LanguagePill from './LanguagePill';
import TranscriptLine from './TranscriptLine';
import MicPermissionPrompt from './MicPermissionPrompt';

/* ─────────────────────── Language label map ─────────────────────── */
const LANG_LABELS: Record<LanguageCode, string> = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'te-IN': 'Telugu',
};

/* ─────────────────────── Props ─────────────────────── */
interface CallOverlayProps {
  persona: PersonaConfig;
  selectedLanguage: LanguageCode;
  onClose: () => void;
}

/* ═══════════════════════ COMPONENT ═══════════════════════ */
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

  /* ── Local state ── */
  const [callEnded, setCallEnded] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  /* ── Refs ── */
  const wsClientRef = useRef<VoiceWSClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const micAnalyserRef = useRef<MicAnalyser | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const connectingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Auto-scroll transcript ── */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  /* ── Call duration timer ── */
  useEffect(() => {
    if (!callEnded) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callEnded]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* ── WebSocket connection ── */
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
      if (!text.trim()) return;
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

  /* ── Session initialisation ── */
  const initSession = useCallback(async () => {
    setInitError(null);
    setMicDenied(false);
    setIsConnecting(true);
    setConnectionLost(false);
    reconnectAttemptsRef.current = 0;

    clearTranscript();

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

    connectingTimerRef.current = setTimeout(() => {
      setInitError("Connecting timed out. Please try again.");
    }, 5000);

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

      if (!res.ok) throw new Error('Failed to create session');

      const sessionData = await res.json();
      const sessionId = sessionData.session_id;
      sessionIdRef.current = sessionId;
      startCall(sessionId);

      connectWs(sessionId);
    } catch (e) {
      console.error('Failed to start call', e);
      setInitError("Couldn't start the call. Please try again.");
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
      setTimeout(onClose, 3000);
    }
  }, [persona.id, selectedLanguage, clearTranscript, startCall, connectWs, onClose]);

  /* ── Auto-init on mount ── */
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      initSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── End call ── */
  const handleEndCall = useCallback(() => {
    setCallEnded(true);
    playerRef.current?.stop();
    sessionIdRef.current = null;
    wsClientRef.current?.disconnect();
    wsClientRef.current = null;
    endCall();
    setTimeout(() => {
      onClose();
    }, 1500);
  }, [endCall, onClose]);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      sessionIdRef.current = null;
      wsClientRef.current?.disconnect();
      wsClientRef.current = null;
      micAnalyserRef.current?.detach();
      micAnalyserRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  /* ── Language switch ── */
  const handleLanguageSwitch = useCallback((lang: LanguageCode) => {
    if (wsClientRef.current && lang !== currentLanguage) {
      wsClientRef.current.sendJSON({ type: 'language_switch', language: lang });
    }
  }, [currentLanguage]);

  /* ── PTT handlers ── */
  const handleStartSpeaking = useCallback(() => {
    if (isMuted) return;
    setIsRecording(true);
    playerRef.current?.stop();
    captureRef.current?.startRecording();
  }, [isMuted]);

  const handleStopSpeaking = useCallback(async () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (!captureRef.current || !wsClientRef.current) return;
    try {
      const blob = await captureRef.current.stopRecording();
      wsClientRef.current.sendAudio(blob);
    } catch (e) {
      console.error('Error sending audio', e);
    }
  }, [isRecording]);

  /* ── Orb analyser logic ── */
  let orbAnalyser: AnalyserNode | null = null;
  let orbSpeaker: 'idle' | 'user' | 'agent' = 'idle';

  if (!isConnecting && !connectionLost && !isReconnecting && !callEnded) {
    if (agentState === 'speaking') {
      orbAnalyser = playerRef.current?.getOutputAnalyser() ?? null;
      orbSpeaker = 'agent';
    } else if (agentState === 'listening') {
      orbAnalyser = micAnalyserRef.current?.getAnalyser() ?? null;
      orbSpeaker = 'user';
    } else if (agentState === 'thinking') {
      orbAnalyser = null;
      orbSpeaker = 'idle';
    }
  }

  /* ── Status text ── */
  const statusText = isConnecting
    ? 'Connecting…'
    : connectionLost
    ? 'Connection Lost'
    : isReconnecting
    ? 'Reconnecting…'
    : formatDuration(callDuration);

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <>
      {/* ── Custom scrollbar & mask styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .co-no-scrollbar::-webkit-scrollbar { display: none; }
        .co-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .co-mask-top {
          mask-image: linear-gradient(to bottom, transparent 0%, black 15%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%);
        }
        @keyframes co-thinking-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes co-pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes co-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />

      {/* ── Mic permission modal ── */}
      <AnimatePresence>
        {micDenied && <MicPermissionPrompt onRetry={initSession} onDismiss={onClose} />}
      </AnimatePresence>

      {/* ── Full-screen backdrop ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed inset-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 lg:p-10"
      >
        {/* ── Floating close button ── */}
        <button
          onClick={handleEndCall}
          className="absolute top-5 right-5 z-[70] w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.12] transition-all duration-200 cursor-pointer backdrop-blur-sm"
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* ── Error banner ── */}
        <AnimatePresence>
          {initError && (
            <motion.div
              initial={{ y: -40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-medium border border-red-400/30"
            >
              <AlertCircle size={16} />
              {initError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════ Main layout: Phone + Transcript ══════════ */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col lg:flex-row items-center lg:items-stretch gap-6 lg:gap-8 w-full max-w-[1100px] max-h-[90vh]"
        >
          {/* ═══════════════════════════════════════════════════
              LEFT — iPhone Mockup
              ═══════════════════════════════════════════════════ */}
          <div className="relative flex-shrink-0 w-[280px] sm:w-[300px]">
            {/* Side buttons — Volume up/down (left edge) */}
            <div className="absolute -left-[3px] top-[100px] w-[3px] h-[28px] rounded-l-sm bg-gradient-to-b from-zinc-600 via-zinc-500 to-zinc-600" />
            <div className="absolute -left-[3px] top-[138px] w-[3px] h-[28px] rounded-l-sm bg-gradient-to-b from-zinc-600 via-zinc-500 to-zinc-600" />
            {/* Side button — Power (right edge) */}
            <div className="absolute -right-[3px] top-[125px] w-[3px] h-[40px] rounded-r-sm bg-gradient-to-b from-zinc-600 via-zinc-500 to-zinc-600" />
            {/* Silent toggle (left, smaller) */}
            <div className="absolute -left-[3px] top-[70px] w-[3px] h-[14px] rounded-l-sm bg-gradient-to-b from-zinc-600 via-zinc-500 to-zinc-600" />

            {/* Phone outer frame */}
            <div className="relative rounded-[44px] border-[8px] border-zinc-800 bg-[#0A0A0B] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_80px_rgba(124,92,255,0.06)]">
              {/* Metallic edge highlight */}
              <div className="absolute inset-0 rounded-[36px] pointer-events-none z-[5] border border-white/[0.07]" />

              {/* ── Dynamic Island ── */}
              <div className="absolute top-1.5 inset-x-0 flex justify-center z-50">
                <div className="w-[100px] h-[28px] bg-black rounded-full flex items-center justify-center gap-2 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
                  <div className="w-[8px] h-[8px] rounded-full bg-zinc-900 ring-1 ring-zinc-700/50" />
                  <div className="w-[8px] h-[8px] rounded-full bg-zinc-900 ring-1 ring-zinc-700/50" />
                </div>
              </div>

              {/* ── Phone screen ── */}
              <div className="relative flex flex-col h-[560px] sm:h-[580px] overflow-hidden">
                {/* Subtle radial gradient on screen */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                {/* Inner screen shadow for depth */}
                <div className="absolute inset-0 shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)] pointer-events-none z-[4] rounded-[36px]" />

                {/* ─── Status Bar ─── */}
                <div className="relative z-10 pt-12 pb-2 px-5 flex flex-col items-center gap-0.5">
                  {/* Fake status bar icons */}
                  <div className="absolute top-1.5 left-0 right-0 px-6 flex items-center justify-between text-white/30">
                    <span className="text-[11px] font-medium">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Signal size={11} />
                      <Wifi size={11} />
                      <BatteryFull size={13} />
                    </div>
                  </div>

                  {/* Persona name */}
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    {persona.display_name}
                  </h2>

                  {/* Call status / timer */}
                  <div className="flex items-center gap-2">
                    {!callEnded && !connectionLost && !isConnecting && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                    )}
                    <span className="text-sm text-white/50 font-mono tracking-wider">
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* ─── Language Pills ─── */}
                <div className="relative z-10 flex items-center justify-center gap-1.5 px-3 pb-2">
                  {persona.languages.map((lang) => (
                    <LanguagePill
                      key={lang}
                      code={lang}
                      isActive={currentLanguage === lang}
                      isDisabled={isConnecting || isReconnecting || connectionLost}
                      onClick={() => handleLanguageSwitch(lang)}
                    />
                  ))}
                </div>

                {/* ─── VoiceOrb (centered) ─── */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0">
                  <motion.div
                    animate={{ opacity: agentState === 'thinking' ? 0.6 : 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <VoiceOrb analyser={orbAnalyser} speaker={orbSpeaker} size={150} />
                  </motion.div>

                  {/* Agent state label */}
                  <motion.p
                    key={agentState}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-xs uppercase tracking-[0.2em] font-medium text-white/30"
                  >
                    {isConnecting ? 'Initializing' : agentState === 'listening' ? 'Listening' : agentState === 'thinking' ? 'Thinking' : agentState === 'speaking' ? 'Speaking' : 'Ready'}
                  </motion.p>

                  {/* Reconnecting badge */}
                  {isReconnecting && (
                    <div className="absolute bottom-6 bg-white/[0.06] backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/[0.08] text-xs text-white/70 font-medium">
                      Reconnecting…
                    </div>
                  )}
                </div>

                {/* ─── Call Controls ─── */}
                <div className="relative z-20 pb-6 pt-3 px-5 flex items-center justify-between bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/90 to-transparent">
                  {/* Mute */}
                  <button
                    onClick={() => setMuted(!isMuted)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isMuted
                        ? 'bg-white text-[#0A0A0B] shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                        : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.14] border border-white/[0.06]'
                    }`}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>

                  {/* Push-to-talk */}
                  <div className="relative">
                    {/* Pulse ring when recording */}
                    {isRecording && (
                      <div className="absolute inset-0 -m-2">
                        <div className="absolute inset-0 rounded-full border-2 border-[#7C5CFF]/40" style={{ animation: 'co-pulse-ring 1.5s ease-out infinite' }} />
                      </div>
                    )}
                    <button
                      onMouseDown={handleStartSpeaking}
                      onMouseUp={handleStopSpeaking}
                      onTouchStart={handleStartSpeaking}
                      onTouchEnd={handleStopSpeaking}
                      disabled={isMuted}
                      className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                        isMuted
                          ? 'opacity-30 cursor-not-allowed bg-white/[0.06] text-white/40'
                          : isRecording
                          ? 'bg-[#7C5CFF] text-white scale-105 shadow-[0_0_40px_rgba(124,92,255,0.5)]'
                          : 'bg-white/[0.08] text-white border-2 border-white/[0.12] hover:bg-white/[0.14] hover:border-white/[0.2] active:scale-95'
                      }`}
                      aria-label="Push to talk"
                    >
                      <Mic size={26} />
                    </button>
                  </div>

                  {/* End call */}
                  <button
                    onClick={handleEndCall}
                    className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 active:scale-95 transition-all duration-200 cursor-pointer shadow-[0_0_24px_rgba(239,68,68,0.3)]"
                    aria-label="End call"
                  >
                    <PhoneOff size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              RIGHT — Glassmorphic Transcript Panel
              ═══════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 w-full lg:w-auto max-h-[50vh] lg:max-h-none flex flex-col rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-[0_0_60px_rgba(124,92,255,0.04),0_0_0_1px_rgba(255,255,255,0.03)]">
            {/* ── Panel header ── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                {/* Persona avatar */}
                <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/[0.08] shrink-0 bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                  {persona.id === 'open' ? (
                    <Bot size={20} className="text-accent" />
                  ) : (
                    <img
                      src={persona.avatar}
                      alt={persona.display_name}
                      className="w-full h-full object-cover bg-zinc-800"
                    />
                  )}
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A0A0B]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">
                    {persona.display_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-white/40 bg-white/[0.06] px-2 py-0.5 rounded-full font-medium">
                      {persona.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Language indicator */}
              <div className="flex items-center gap-2 text-xs text-white/30 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]" />
                {LANG_LABELS[currentLanguage]}
              </div>
            </div>

            {/* ── Scrollable transcript area ── */}
            <div className="relative flex-1 min-h-0">
              {/* Top fade mask */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#0A0A0B]/80 to-transparent z-10 pointer-events-none" />

              <div className="h-full overflow-y-auto co-no-scrollbar co-mask-top px-4 py-4 flex flex-col gap-1.5">
                {/* Empty state */}
                {transcript.length === 0 && !callEnded && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Mic size={20} className="text-white/20" />
                    </div>
                    <p className="text-sm text-white/20 text-center max-w-[200px]">
                      {isConnecting ? 'Connecting to agent…' : 'Hold the mic button to speak'}
                    </p>
                  </div>
                )}

                {/* Transcript messages */}
                {transcript.map((line) => {
                  const isAgent = line.speaker === 'agent';
                  return (
                    <motion.div
                      key={line.id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isAgent
                            ? 'bg-[#7C5CFF]/[0.1] border border-[#7C5CFF]/[0.12] text-white/90 rounded-bl-md'
                            : 'bg-white/[0.08] border border-white/[0.06] text-white/80 rounded-br-md'
                        } ${/[\u0900-\u097F\u0C00-\u0C7F]/.test(line.text) ? 'font-noto' : ''}`}
                      >
                        {/* Speaker label */}
                        <span className={`block text-[10px] uppercase tracking-[0.15em] font-semibold mb-1 ${
                          isAgent ? 'text-[#7C5CFF]/70' : 'text-white/30'
                        }`}>
                          {isAgent ? persona.display_name : 'You'}
                        </span>
                        {line.text}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Thinking indicator */}
                {agentState === 'thinking' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-center gap-1.5 bg-[#7C5CFF]/[0.08] border border-[#7C5CFF]/[0.1] px-5 py-3 rounded-2xl rounded-bl-md">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="block w-2 h-2 rounded-full bg-[#7C5CFF]/60"
                          style={{
                            animation: `co-thinking-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                <div ref={transcriptEndRef} className="h-2 shrink-0" />
              </div>
            </div>

            {/* ── Panel footer — recording indicator ── */}
            <div className="shrink-0 border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/25">
                {isRecording ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
                      <span className="relative rounded-full h-2 w-2 bg-red-400" />
                    </span>
                    <span className="text-red-300/70 font-medium">Recording…</span>
                  </>
                ) : (
                  <span className="text-white/20">
                    {transcript.length > 0 ? `${transcript.length} messages` : 'No messages yet'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-white/15 font-mono">{formatDuration(callDuration)}</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              CALL ENDED OVERLAY
              ═══════════════════════════════════════════════════ */}
          <AnimatePresence>
            {callEnded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-50 rounded-3xl bg-[#0A0A0B]/85 backdrop-blur-2xl flex flex-col items-center justify-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                  className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"
                >
                  <PhoneOff size={32} className="text-white/30" />
                </motion.div>
                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-white tracking-tight"
                >
                  Call Ended
                </motion.h2>
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/40 text-sm font-mono tracking-wider"
                >
                  Duration: {formatDuration(callDuration)}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}
