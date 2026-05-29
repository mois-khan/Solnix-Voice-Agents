export type LanguageCode = 'en-IN' | 'hi-IN' | 'te-IN';

export interface PersonaConfig {
  id: string;
  display_name: string;
  role: string;
  avatar: string;
  short_blurb: string;
  languages: LanguageCode[];
  default_language: LanguageCode;
}

export interface TranscriptLine {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export type CallState = 'idle' | 'connecting' | 'active' | 'ended';

export type AgentState = 'listening' | 'thinking' | 'speaking' | 'idle';
