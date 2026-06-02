'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, MicOff, Mic, AlertCircle, X } from 'lucide-react';

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

interface CallOverlayProps {
  persona: PersonaConfig;
  selectedLanguage: LanguageCode;
  onClose: () => void;
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

  const [callScreenState, setCallScreenState] = useState<'incoming' | 'active' | 'ended'>('incoming');
  const [micDenied, setMicDenied] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [callDuration, setCallDuration] = useState(0);

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

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    if (callScreenState === 'active') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callScreenState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  const handleAcceptCall = () => {
    setCallScreenState('active');
    initSession();
  };

  const handleDeclineCall = () => {
    setCallScreenState('ended');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleEndCall = useCallback(() => {
    setCallScreenState('ended');
    playerRef.current?.stop();
    sessionIdRef.current = null;
    wsClientRef.current?.disconnect();
    wsClientRef.current = null;
    endCall();
    setTimeout(() => {
      onClose();
    }, 1500);
  }, [endCall, onClose]);

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

  const handleLanguageSwitch = useCallback((lang: LanguageCode) => {
    if (wsClientRef.current && lang !== currentLanguage) {
      wsClientRef.current.sendJSON({ type: 'language_switch', language: lang });
    }
  }, [currentLanguage]);

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

  let orbAnalyser: AnalyserNode | null = null;
  let orbSpeaker: 'idle' | 'user' | 'agent' = 'idle';

  if (!isConnecting && !connectionLost && !isReconnecting && callScreenState === 'active') {
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

  return (
    <>
      <AnimatePresence>
        {micDenied && <MicPermissionPrompt onRetry={initSession} onDismiss={onClose} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
      >
        <button
          onClick={handleDeclineCall}
          className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={24} />
        </button>

        <AnimatePresence>
          {initError && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-danger text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium"
            >
              <AlertCircle size={16} />
              {initError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Mobile Mockup */}
        <motion.div
          initial={{ y: 50, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-[400px] h-[800px] max-h-[90vh] bg-[#0A0A0B] rounded-[50px] shadow-2xl overflow-hidden border-[12px] border-zinc-900 flex flex-col"
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255,255,255,0.1)' }}
        >
          {/* Dynamic Island / Notch Mockup */}
          <div className="absolute top-0 inset-x-0 flex justify-center z-50">
            <div className="w-32 h-7 bg-zinc-900 rounded-b-3xl"></div>
          </div>

          <AnimatePresence mode="wait">
            {callScreenState === 'incoming' && (
              <motion.div
                key="incoming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-between py-24 px-6 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-transparent opacity-50" />
                
                <div className="flex flex-col items-center gap-6 relative z-10 mt-10">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl relative">
                    <img src={persona.avatar || '/personas/open.png'} alt={persona.display_name} className="w-full h-full object-cover bg-zinc-800" />
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 rounded-full border-2 border-accent/50"
                    />
                  </div>
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-white tracking-tight">{persona.display_name}</h2>
                    <p className="text-lg text-white/60 mt-2">Incoming Voice Call...</p>
                  </div>
                </div>

                <div className="flex justify-between w-full px-8 relative z-10 mb-10">
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={handleDeclineCall} className="w-16 h-16 rounded-full bg-danger text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer">
                      <PhoneOff size={28} />
                    </button>
                    <span className="text-sm font-medium text-white/80">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={handleAcceptCall} className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(34,197,94,0.4)] cursor-pointer">
                      <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 1 }}>
                        <Phone size={28} />
                      </motion.div>
                    </button>
                    <span className="text-sm font-medium text-white/80">Accept</span>
                  </div>
                </div>
              </motion.div>
            )}

            {callScreenState === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col relative h-full"
              >
                {/* Header info */}
                <div className="pt-16 pb-4 flex flex-col items-center gap-1 z-10 shrink-0">
                  <h2 className="text-xl font-semibold text-white tracking-tight">{persona.display_name}</h2>
                  <div className="text-sm text-white/60 font-mono">
                    {isConnecting ? 'Connecting...' : connectionLost ? 'Connection Lost' : formatDuration(callDuration)}
                  </div>
                  
                  {/* Language Pills */}
                  <div className="flex items-center gap-2 mt-3">
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
                </div>

                {/* Orb */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-[240px] z-10 relative">
                  <motion.div animate={{ opacity: agentState === 'thinking' ? 0.6 : 1 }} transition={{ duration: 0.5 }}>
                    <VoiceOrb analyser={orbAnalyser} speaker={orbSpeaker} size={220} />
                  </motion.div>
                  {isReconnecting && (
                    <div className="absolute bottom-4 bg-bg-elevated px-4 py-2 rounded-pill shadow-lg border border-border-subtle text-sm text-white">
                      Reconnecting…
                    </div>
                  )}
                </div>

                {/* Transcript Overlay */}
                <div className="h-[200px] w-full px-6 relative z-10 flex flex-col justify-end">
                  <style dangerouslySetInnerHTML={{__html: `
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    .mask-vertical-bottom { mask-image: linear-gradient(to top, black 50%, transparent 100%); -webkit-mask-image: linear-gradient(to top, black 50%, transparent 100%); }
                  `}} />
                  <div className="flex-1 overflow-y-auto no-scrollbar mask-vertical-bottom pb-4 space-y-2 flex flex-col justify-end">
                    {transcript.map((line) => (
                      <TranscriptLine key={line.id} line={line} />
                    ))}
                    {agentState === 'thinking' && (
                      <div className="py-2 pl-2 text-xl font-medium text-white/50 animate-pulse">…</div>
                    )}
                    <div ref={transcriptEndRef} className="h-2" />
                  </div>
                </div>

                {/* Call Controls */}
                <div className="pb-12 pt-4 px-8 flex justify-between items-center bg-gradient-to-t from-black via-black/80 to-transparent z-20 shrink-0">
                  <button
                    onClick={() => setMuted(!isMuted)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>

                  <button
                    onMouseDown={handleStartSpeaking}
                    onMouseUp={handleStopSpeaking}
                    onTouchStart={handleStartSpeaking}
                    onTouchEnd={handleStopSpeaking}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isMuted ? 'opacity-50 cursor-not-allowed bg-white/10 text-white/50' : 
                      isRecording ? 'bg-accent text-white scale-110 shadow-[0_0_30px_rgba(124,92,255,0.6)]' : 
                      'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <Mic size={32} />
                  </button>

                  <button
                    onClick={handleEndCall}
                    className="w-14 h-14 rounded-full bg-danger text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <PhoneOff size={24} />
                  </button>
                </div>
              </motion.div>
            )}

            {callScreenState === 'ended' && (
              <motion.div
                key="ended"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <PhoneOff size={32} className="text-white/40" />
                </div>
                <h2 className="text-2xl font-bold text-white">Call Ended</h2>
                <p className="text-white/60 mt-2">{formatDuration(callDuration)}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}
