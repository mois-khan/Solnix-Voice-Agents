import { create } from 'zustand';
import { PersonaConfig, TranscriptLine, CallState, AgentState, LanguageCode } from '../types';

interface StoreState {
  personas: PersonaConfig[];
  selectedPersona: PersonaConfig | null;
  callState: CallState;
  agentState: AgentState;
  sessionId: string | null;
  currentLanguage: LanguageCode;
  transcript: TranscriptLine[];
  isMuted: boolean;

  setPersonas: (p: PersonaConfig[]) => void;
  setPersona: (p: PersonaConfig) => void;
  startCall: (sessionId: string) => void;
  endCall: () => void;
  setAgentState: (s: AgentState) => void;
  setLanguage: (l: LanguageCode) => void;
  appendTranscript: (line: Omit<TranscriptLine, 'id'>) => void;
  clearTranscript: () => void;
  setMuted: (m: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  personas: [],
  selectedPersona: null,
  callState: 'idle',
  agentState: 'idle',
  sessionId: null,
  currentLanguage: 'en-IN',
  transcript: [],
  isMuted: false,

  setPersonas: (p) => set({ personas: p }),
  setPersona: (p) => set({ selectedPersona: p, currentLanguage: p.default_language }),
  startCall: (sessionId) => set({ callState: 'active', sessionId }),
  endCall: () => set({ callState: 'ended', agentState: 'idle', sessionId: null }),
  setAgentState: (s) => set({ agentState: s }),
  setLanguage: (l) => set({ currentLanguage: l }),
  appendTranscript: (line) => set((state) => ({ 
    transcript: [...state.transcript, { ...line, id: Math.random().toString(36).substring(2, 9) }] 
  })),
  clearTranscript: () => set({ transcript: [] }),
  setMuted: (m) => set({ isMuted: m }),
}));
