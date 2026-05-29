'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { VoiceWSClient } from '../lib/wsClient';
import { AudioCapture } from '../lib/audioCapture';
import { AudioPlayer } from '../lib/audioPlayer';
import { PersonaConfig } from '../types';

export default function Page() {
  const {
    personas,
    setPersonas,
    setPersona,
    selectedPersona,
    callState,
    startCall,
    endCall,
    agentState,
    setAgentState,
    appendTranscript,
    transcript,
    setLanguage,
    currentLanguage
  } = useStore();

  const [micError, setMicError] = useState(false);

  // Maintain instances across renders
  const wsClientRef = useRef<VoiceWSClient | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/personas`);
        if (res.ok) {
          const data = await res.json();
          setPersonas(data);
        }
      } catch (e) {
        console.error('Failed to fetch personas', e);
      }
    };
    fetchPersonas();
  }, [setPersonas]);

  const handleStartCall = async (persona: PersonaConfig) => {
    setMicError(false);
    setPersona(persona);

    const capture = new AudioCapture();
    const hasPerm = await capture.requestPermission();
    if (!hasPerm) {
      setMicError(true);
      return;
    }
    captureRef.current = capture;

    const player = new AudioPlayer();
    playerRef.current = player;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: persona.id,
          language: persona.default_language
        })
      });
      
      if (!res.ok) {
        console.error('Failed to create session');
        return;
      }
      
      const sessionData = await res.json();
      startCall(sessionData.session_id);

      const wsBaseUrl = apiUrl.replace('http', 'ws');
      const wsClient = new VoiceWSClient(wsBaseUrl);
      wsClientRef.current = wsClient;

      wsClient.onConnect = () => {
        wsClient.sendJSON({
          type: 'session_config',
          persona: persona.id,
          language: persona.default_language
        });
      };

      wsClient.onTranscript = (speaker, text) => {
        appendTranscript({ speaker: speaker as any, text, timestamp: new Date() });
      };

      wsClient.onAgentState = (state) => {
        setAgentState(state as any);
      };

      wsClient.onAudioChunk = (base64) => {
        player.play(base64);
      };

      wsClient.onLanguageSwitched = (lang) => {
        setLanguage(lang as any);
      };

      wsClient.onDisconnect = () => {
        handleEndCall();
      };

      wsClient.onError = (code, message) => {
        console.error(`WS Error [${code}]: ${message}`);
      };

      wsClient.connect(sessionData.session_id);
    } catch (e) {
      console.error('Failed to start call', e);
    }
  };

  const handleEndCall = () => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
    endCall();
  };

  const handleMouseDown = () => {
    if (captureRef.current) {
      captureRef.current.startRecording();
    }
  };

  const handleMouseUp = async () => {
    if (captureRef.current && wsClientRef.current) {
      try {
        const blob = await captureRef.current.stopRecording();
        wsClientRef.current.sendAudio(blob);
      } catch (e) {
        console.error('Error sending audio', e);
      }
    }
  };

  if (callState === 'idle') {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
        <h1>Test Personas</h1>
        {micError && <p style={{ color: 'red' }}>Mic permission denied. Please allow microphone access.</p>}
        <div style={{ display: 'flex', gap: '10px', marginTop: 20 }}>
          {personas.map(p => (
            <button 
              key={p.id} 
              onClick={() => handleStartCall(p)}
              style={{ padding: '10px 20px', cursor: 'pointer' }}
            >
              Call {p.display_name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Call Active: {selectedPersona?.display_name}</h2>
      <p>State: <strong style={{ color: agentState === 'listening' ? 'green' : agentState === 'speaking' ? 'blue' : 'orange'}}>{agentState}</strong> | Language: <strong>{currentLanguage}</strong></p>
      
      <div style={{ margin: '20px 0', padding: 10, border: '1px solid #ccc', height: 400, overflowY: 'auto' }}>
        {transcript.map((line) => (
          <div key={line.id} style={{ marginBottom: 10 }}>
            <strong style={{ color: line.speaker === 'agent' ? 'blue' : 'green' }}>
              {line.speaker === 'agent' ? selectedPersona?.display_name || 'Agent' : 'You'}:
            </strong> {line.text}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onMouseDown={handleMouseDown} 
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          style={{ padding: '15px 30px', cursor: 'pointer', background: '#e0e0e0', border: '1px solid #999', fontSize: '16px' }}
        >
          Hold to Speak
        </button>
        <button 
          onClick={handleEndCall} 
          style={{ padding: '15px 30px', color: 'white', background: 'red', border: 'none', cursor: 'pointer', fontSize: '16px' }}
        >
          End Call
        </button>
      </div>
    </div>
  );
}
