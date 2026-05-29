# Architecture — Solnix AI Voice Agents POC

> **Stack change from original plan:** Pipecat + Daily.co removed (Linux-only).
> Replaced with a pure WebSocket pipeline fully compatible with Windows dev + any cloud deploy.

---

## 1. System overview

Two environments, three logical layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (visitor's device)                       │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  Next.js 14 App (React / TypeScript / Tailwind / Framer Motion)  │  │
│   │                                                                  │  │
│   │  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐ │  │
│   │  │ Landing page │  │  Call overlay  │  │   VoiceOrb (Canvas)  │ │  │
│   │  │ persona cards│  │ live transcript│  │ WebAudio AnalyserNode│ │  │
│   │  └──────────────┘  └────────────────┘  └──────────────────────┘ │  │
│   │                                                                  │  │
│   │  Audio capture layer                                             │  │
│   │  Phase 1 → MediaRecorder (push-to-talk, manual button)          │  │
│   │  Phase 2 → @ricky0123/vad-web (auto VAD, hands-free)            │  │
│   │                                                                  │  │
│   │  WebSocket client — sends audio binary frames + JSON signals     │  │
│   └───────────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
                     WebSocket  ws(s)://api/ws/{session_id}
                     JSON msgs  ←→  binary audio frames
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│              CLOUD (Fly.io Mumbai / Render — Python backend)             │
│                                   │                                      │
│   ┌───────────────────────────────▼──────────────────────────────────┐  │
│   │                    FastAPI + uvicorn                              │  │
│   │                                                                  │  │
│   │  GET  /personas          → persona catalog JSON                  │  │
│   │  POST /sessions          → create session → return session_id    │  │
│   │  WS   /ws/{session_id}   → full-duplex voice pipeline            │  │
│   │  DELETE /sessions/{id}   → teardown                              │  │
│   │  GET  /health            → liveness                              │  │
│   │                                                                  │  │
│   │  ┌────────────────────────────────────────────────────────────┐ │  │
│   │  │  Session Manager (asyncio — one coroutine per session)     │ │  │
│   │  │                                                            │ │  │
│   │  │  receive audio frame                                       │ │  │
│   │  │      └─▶ SarvamSTTClient.transcribe(audio_bytes)          │ │  │
│   │  │               └─▶ LLMOrchestrator.respond(transcript)      │ │  │
│   │  │                       └─▶ GeminiClient.generate(...)       │ │  │
│   │  │                             └─▶ tool_executor (if needed)  │ │  │
│   │  │                                   └─▶ SarvamTTSClient.synth│ │  │
│   │  │                                         └─▶ send audio WS  │ │  │
│   │  └────────────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                     │               │               │
              ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
              │  Sarvam AI  │ │  Google     │ │  Mock data  │
              │  STT + TTS  │ │  Gemini API │ │  (JSON)     │
              │  REST API   │ │  REST API   │ │             │
              └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 2. WebSocket message protocol

Every message over the WebSocket is either:
- A **JSON frame** (text) — for signals, metadata, transcripts
- A **binary frame** — for raw audio bytes (browser → backend direction only)

### 2.1 Frontend → Backend messages

```jsonc
// Start or reconfigure a session
{ "type": "session_config", "persona": "priya", "language": "en-IN" }

// Switch language mid-session (Phase 2+)
{ "type": "language_switch", "language": "hi-IN" }

// End the session cleanly
{ "type": "session_end" }

// [binary frame] — raw audio bytes (WebM/Opus from MediaRecorder)
// No JSON wrapper. Detected by WebSocket message type == bytes.
```

### 2.2 Backend → Frontend messages

```jsonc
// Session is ready; bot will speak the opening line next
{ "type": "session_ready", "session_id": "abc123", "persona": "priya" }

// Transcript line (both user and agent)
{ "type": "transcript", "speaker": "user" | "agent", "text": "नमस्ते, मैं..." }

// State change — drives the orb animation and UI controls
{ "type": "agent_state", "state": "listening" | "thinking" | "speaking" | "idle" }

// TTS audio for the browser to play (base64-encoded WAV)
{ "type": "audio_chunk", "data": "<base64>", "seq": 1 }

// Language switch acknowledged
{ "type": "language_switched", "language": "hi-IN" }

// Non-fatal warning shown in UI
{ "type": "warning", "message": "..." }

// Fatal error — close the overlay and show retry
{ "type": "error", "code": "stt_failed" | "llm_failed" | "tts_failed", "message": "..." }
```

---

## 3. Backend component breakdown

### 3.1 `main.py` — FastAPI app entry point

```
Responsibilities:
- Mount all routers
- CORS middleware (allow Vercel origin + localhost:3000)
- Lifespan: load persona catalog on startup, close httpx clients on shutdown
- Uvicorn entrypoint
```

### 3.2 `routers/sessions.py`

```
POST /sessions
  - Validate persona_id exists in catalog
  - Generate UUID session_id
  - Initialize SessionState in memory store
  - Return { session_id }

DELETE /sessions/{session_id}
  - Mark session as ended
  - Trigger cleanup coroutine
```

### 3.3 `routers/ws.py` — The pipeline

```
WS /ws/{session_id}
  - Accept WebSocket
  - Await session_config message → load PersonaConfig
  - Boot opening line: LLM → TTS → send audio + transcript
  - Loop:
      if text frame → parse JSON → handle signal (language_switch, session_end)
      if binary frame → pipeline(audio_bytes)

pipeline(audio_bytes):
  1. sarvam_stt.transcribe(audio_bytes, language) → transcript_text
  2. send {"type":"transcript","speaker":"user","text":transcript_text}
  3. send {"type":"agent_state","state":"thinking"}
  4. gemini.generate(context, transcript_text, tools) → (response_text, tool_calls)
  5. if tool_calls: execute_tools(tool_calls) → inject results into context
  6. send {"type":"transcript","speaker":"agent","text":response_text}
  7. send {"type":"agent_state","state":"speaking"}
  8. sarvam_tts.synthesize(response_text, language, voice) → wav_base64
  9. send {"type":"audio_chunk","data":wav_base64,"seq":N}
  10. send {"type":"agent_state","state":"listening"}
```

### 3.4 `services/sarvam.py`

```python
class SarvamSTTClient:
    endpoint = "https://api.sarvam.ai/speech-to-text"
    model    = "saaras:v3"        # latest; use mode="transcribe"
    header   = "api-subscription-key"

    async def transcribe(self, audio_bytes: bytes, language_code: str) -> str:
        # POST multipart/form-data
        # fields: file=audio_bytes (filename="audio.webm"), language_code, model, mode="transcribe"
        # returns: response.json()["transcript"]

class SarvamTTSClient:
    endpoint = "https://api.sarvam.ai/text-to-speech"
    model    = "bulbul:v2"        # use v2; v3 for higher quality if quota allows

    async def synthesize(self, text: str, language_code: str, speaker: str) -> str:
        # POST application/json
        # body: { inputs:[text], target_language_code, speaker, model }
        # returns: response.json()["audios"][0]  ← base64 WAV string
```

**Voice ID map (per persona × language) — use these exact Sarvam v2 speaker IDs:**

```python
VOICE_MAP = {
    ("priya",  "en-IN"): "priya",    # warm professional female
    ("priya",  "hi-IN"): "priya",
    ("arjun",  "en-IN"): "aditya",   # calm trustworthy male
    ("arjun",  "hi-IN"): "aditya",
    ("arjun",  "te-IN"): "aditya",
    ("meera",  "en-IN"): "vidya",    # friendly female receptionist
    ("meera",  "hi-IN"): "vidya",
    ("meera",  "te-IN"): "vidya",
}
```

### 3.5 `services/gemini.py`

```python
class GeminiClient:
    endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    # key passed as ?key= query param

    async def generate(
        self,
        system_prompt: str,
        history: list[dict],          # [{role, parts:[{text}]}]
        user_message: str,
        tools: list[dict] | None,
    ) -> tuple[str, list[ToolCall]]:
        # Build contents list from history + new user message
        # Include system_instruction and tools declarations
        # Parse response: text from candidates[0].content.parts[0].text
        #                 tool calls from candidates[0].content.parts[*].functionCall
        # Return (response_text, tool_calls)
```

**Gemini API body shape:**
```json
{
  "system_instruction": { "parts": [{ "text": "<persona system prompt>" }] },
  "contents": [
    { "role": "user",  "parts": [{ "text": "Hello" }] },
    { "role": "model", "parts": [{ "text": "नमस्ते..." }] },
    { "role": "user",  "parts": [{ "text": "<latest user turn>" }] }
  ],
  "tools": [{ "function_declarations": [ ...tool schemas... ] }],
  "generationConfig": { "temperature": 0.4, "maxOutputTokens": 200 }
}
```

### 3.6 `tools/executor.py`

```
execute_tools(tool_calls: list[ToolCall], session: SessionState) -> list[ToolResult]
  - Dispatch by function name to the right Python function
  - All tool functions are pure sync Python (no external I/O — mock JSON only)
  - Return results as Gemini tool_result parts for the next LLM turn
```

### 3.7 `state/session.py`

```python
@dataclass
class SessionState:
    session_id: str
    persona_id: str
    language: str
    history: list[dict]       # Gemini content turns
    tool_context: dict        # data loaded from mock JSON for this session
    is_active: bool = True
    seq: int = 0              # audio chunk sequence counter

# In-memory store (dict[session_id, SessionState])
# Good enough for POC; swap for Redis in Phase 4 if needed
SESSION_STORE: dict[str, SessionState] = {}
```

---

## 4. Frontend component breakdown

### 4.1 `lib/wsClient.ts` — WebSocket wrapper

```typescript
class VoiceWSClient {
  private ws: WebSocket
  private sessionId: string

  connect(sessionId: string): void
  sendAudio(blob: Blob): void          // sends binary frame
  sendSignal(msg: object): void        // sends JSON text frame
  onMessage(handler: (msg: WSMessage) => void): void
  disconnect(): void
}
```

### 4.2 `lib/audioCapture.ts` — Phase 1: push-to-talk

```typescript
class AudioCapture {
  private stream: MediaStream
  private recorder: MediaRecorder

  async requestMicPermission(): Promise<boolean>
  startRecording(): void               // begins MediaRecorder
  stopRecording(): Promise<Blob>       // stops, returns WebM blob
}
```

### 4.3 `lib/audioPlayer.ts` — plays TTS audio

```typescript
class AudioPlayer {
  private ctx: AudioContext
  private analyser: AnalyserNode       // feeds VoiceOrb during bot speech

  async playBase64Wav(base64: string): Promise<void>
  getAnalyser(): AnalyserNode
  stop(): void
}
```

### 4.4 `lib/micAnalyser.ts` — feeds VoiceOrb during user speech

```typescript
class MicAnalyser {
  private analyser: AnalyserNode

  attachStream(stream: MediaStream): void
  getAnalyser(): AnalyserNode
  detach(): void
}
```

### 4.5 `components/VoiceOrb.tsx`

```typescript
// Canvas-based. Receives:
//   analyser: AnalyserNode | null
//   speaker: 'user' | 'agent' | 'idle'
//
// Gradient changes:
//   idle    → slow ambient pulse, violet (#7C5CFF) base
//   user    → blue-green shift (#06B6D4), reacts to mic amplitude
//   agent   → violet–pink (#A78BFA → #F472B6), reacts to bot audio amplitude
//
// prefers-reduced-motion: drop to static gradient + opacity oscillation
```

### 4.6 Zustand store — `lib/store.ts`

```typescript
interface AppState {
  // Persona & session
  selectedPersona: PersonaConfig | null
  callState: 'idle' | 'connecting' | 'active' | 'ended'
  agentState: 'listening' | 'thinking' | 'speaking'
  sessionId: string | null

  // Language
  currentLanguage: LanguageCode          // 'en-IN' | 'hi-IN' | 'te-IN'
  availableLanguages: LanguageCode[]

  // Transcript
  transcript: TranscriptLine[]

  // Actions
  setPersona(p: PersonaConfig): void
  startCall(): void
  endCall(): void
  setAgentState(s: AgentState): void
  setLanguage(l: LanguageCode): void
  appendTranscript(line: TranscriptLine): void
}
```

---

## 5. Session lifecycle

```
1. User clicks "Talk to Priya (Hindi)"
        │
        ▼
2. [Frontend] POST /sessions → { session_id }
        │
        ▼
3. [Frontend] AudioCapture.requestMicPermission()
   → if denied: show MicPermissionPrompt, stop here
        │
        ▼
4. [Frontend] VoiceWSClient.connect(session_id)
   → WS handshake established
   → send { type: "session_config", persona: "priya", language: "hi-IN" }
        │
        ▼
5. [Backend] Load PersonaConfig (priya.yaml)
   → Build Gemini system prompt with language injection
   → Generate opening line via Gemini ("नमस्ते, मैं प्रिया बोल रही हूँ...")
   → Synthesize via Sarvam TTS
   → send { type: "session_ready" }
   → send { type: "transcript", speaker: "agent", text: "..." }
   → send { type: "audio_chunk", data: "...", seq: 0 }
        │
        ▼
6. [Frontend] Play opening audio → VoiceOrb enters 'agent' gradient + amplitude
   Transcript renders first line.
        │
        ▼
7. User holds mic button → startRecording()
   VoiceOrb shifts to 'user' gradient, MicAnalyser feeds amplitude
        │
        ▼
8. User releases → stopRecording() → audio Blob
   [Frontend] VoiceWSClient.sendAudio(blob) → binary WS frame
        │
        ▼
9. [Backend pipeline — see §3.3]
   → Transcript, thinking state, agent response, TTS audio all streamed back
        │
        ▼
10. Steps 7–9 repeat until user clicks End Call
        │
        ▼
11. [Frontend] send { type: "session_end" } → close WS
    [Frontend] DELETE /sessions/{id}
    [Frontend] callState → 'ended' → overlay fades out
```

---

## 6. Latency budget

Target: **< 1.5s** end-of-user-speech → first audio byte plays back.

| Stage | Budget | Notes |
|---|---|---|
| Audio transfer over WS | ~50ms | LAN/WiFi; negligible for <10s clips |
| Sarvam STT (saaras:v3 REST) | ~300ms | Batch endpoint for <30s clips; streaming in Phase 2 |
| Gemini 2.0 Flash first token | ~300ms | 200-token context, no RAG |
| Sarvam TTS (bulbul:v2 REST) | ~250ms | REST returns full audio; streaming in Phase 2 |
| Network RTT (Mumbai host) | ~150ms | For Indian users |
| FastAPI async overhead | ~50ms | Pure asyncio, no blocking calls |
| **Total (Phase 1)** | **~1.1s** | Within "feels conversational" threshold |

**Phase 2 improvement path:** Switch Sarvam STT to streaming WebSocket mode. Start Gemini inference as soon as VAD detects end-of-utterance. Overlap TTS first chunk with LLM generation. Target: **< 700ms**.

---

## 7. Repository layout

```
solnix-voice-agents/
├── frontend/                         Next.js 14 app
│   ├── app/
│   │   ├── layout.tsx                Root layout, fonts
│   │   ├── page.tsx                  Landing page (marketing sections)
│   │   └── globals.css
│   ├── components/
│   │   ├── VoiceOrb.tsx              Canvas orb — THE centrepiece
│   │   ├── PersonaCard.tsx           Selectable agent card
│   │   ├── CallOverlay.tsx           Full-screen call view
│   │   ├── TranscriptLine.tsx        Single transcript row
│   │   ├── LanguagePill.tsx          EN / हि / తె chip
│   │   ├── CallControls.tsx          Mute + End
│   │   ├── MicPermissionPrompt.tsx   Pre-call modal
│   │   └── LiveIndicator.tsx         Pulsing dot
│   ├── lib/
│   │   ├── wsClient.ts               WebSocket wrapper
│   │   ├── audioCapture.ts           MediaRecorder (push-to-talk)
│   │   ├── vadCapture.ts             vad-web wrapper (Phase 2)
│   │   ├── audioPlayer.ts            TTS playback via AudioContext
│   │   ├── micAnalyser.ts            Mic amplitude for orb
│   │   └── store.ts                  Zustand state
│   ├── types/
│   │   └── index.ts                  Shared TypeScript types
│   ├── public/
│   │   ├── personas/                 Avatar images (priya.png, arjun.png, meera.png)
│   │   └── logos/                    Sarvam, Gemini, Solnix logos
│   ├── tailwind.config.ts            Design tokens (from design.md)
│   ├── next.config.ts
│   └── package.json
│
├── backend/
│   ├── main.py                       FastAPI app + CORS + lifespan
│   ├── routers/
│   │   ├── sessions.py               POST/DELETE /sessions
│   │   ├── personas.py               GET /personas
│   │   └── ws.py                     WS /ws/{session_id} — full pipeline
│   ├── services/
│   │   ├── sarvam.py                 STT + TTS clients (httpx async)
│   │   └── gemini.py                 Gemini client (httpx async)
│   ├── tools/
│   │   ├── executor.py               Dispatch tool calls from Gemini
│   │   ├── loan_tools.py             lookup_loan, record_commitment
│   │   ├── policy_tools.py           lookup_policy, send_renewal_link
│   │   └── booking_tools.py          get_slots, book_slot, lookup/cancel
│   ├── state/
│   │   └── session.py                SessionState dataclass + in-memory store
│   ├── personas/
│   │   ├── priya.yaml
│   │   ├── arjun.yaml
│   │   └── meera.yaml
│   ├── prompts/
│   │   ├── priya.md                  Full system prompt
│   │   ├── arjun.md
│   │   └── meera.md
│   ├── data/
│   │   ├── loans.json
│   │   ├── policies.json
│   │   └── slots.json
│   ├── config.py                     pydantic-settings env loader
│   └── pyproject.toml
│
├── .env.example
├── README.md
└── LESSONS.md                        (fill in after the build)
```

---

## 8. What is intentionally NOT in v1

- No WebRTC / SFU — not needed without Daily.co
- No Pipecat — replaced by the custom asyncio pipeline in `routers/ws.py`
- No subprocess model — asyncio coroutines handle concurrency natively on all OSes
- No authentication — it's a demo
- No real DB — mock JSON only
- No PSTN inbound/outbound — web browser only
- No recording — Daily.co recording no longer applicable
- No multi-tenant — single shared deployment
