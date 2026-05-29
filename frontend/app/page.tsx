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
  const [selectedPreCallPersona, setSelectedPreCallPersona] = useState<PersonaConfig | null>(null);
  const [preCallLanguage, setPreCallLanguage] = useState<string | null>(null);

  const LABELS = { 'en-IN': 'EN', 'hi-IN': 'हि', 'te-IN': 'తె' };

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

  const handleStartCall = async (persona: PersonaConfig, lang: string) => {
    setMicError(false);
    setPersona(persona);
    setLanguage(lang as any);

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
          language: lang
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
          language: lang
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
        <div style={{ display: 'flex', gap: '20px', marginTop: 20, flexWrap: 'wrap' }}>
          {personas.map(p => (
            <div key={p.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
              <h3>{p.display_name}</h3>
              <p style={{ fontSize: '14px', color: '#666' }}>{p.role}</p>
              
              <div style={{ marginTop: '10px', marginBottom: '10px', display: 'flex', gap: '5px' }}>
                {p.languages.map(lang => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedPreCallPersona(p);
                      setPreCallLanguage(lang);
                    }}
                    style={{
                      padding: '5px 10px',
                      cursor: 'pointer',
                      background: selectedPreCallPersona?.id === p.id && preCallLanguage === lang ? '#7C5CFF' : '#eee',
                      color: selectedPreCallPersona?.id === p.id && preCallLanguage === lang ? 'white' : 'black',
                      border: 'none',
                      borderRadius: '15px'
                    }}
                  >
                    {LABELS[lang as keyof typeof LABELS] || lang}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => handleStartCall(p, selectedPreCallPersona?.id === p.id && preCallLanguage ? preCallLanguage : p.default_language)}
                style={{ padding: '8px 16px', cursor: 'pointer', background: '#34D399', border: 'none', borderRadius: '4px' }}
              >
                Start Call
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Call Active: {selectedPersona?.display_name}</h2>
      <p>State: <strong style={{ color: agentState === 'listening' ? 'green' : agentState === 'speaking' ? 'blue' : 'orange'}}>{agentState}</strong> | Language: <strong>{currentLanguage}</strong></p>
      
      <div style={{ marginTop: 10 }}>
        <strong>Switch Language: </strong>
        {selectedPersona?.languages.map(lang => (
          <button
            key={lang}
            onClick={() => {
              if (wsClientRef.current) {
                wsClientRef.current.sendJSON({ type: 'language_switch', language: lang });
              }
            }}
            disabled={lang === currentLanguage}
            style={{
              padding: '5px 10px', marginLeft: 5, cursor: lang === currentLanguage ? 'not-allowed' : 'pointer',
              background: lang === currentLanguage ? '#7C5CFF' : '#eee',
              color: lang === currentLanguage ? 'white' : 'black',
              border: 'none', borderRadius: '15px'
            }}
          >
            {LABELS[lang as keyof typeof LABELS] || lang}
          </button>
        ))}
      </div>

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
