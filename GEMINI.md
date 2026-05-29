# Solnix AI Voice Agents — Project Rules

## Who You Are
You are a senior full-stack engineer building a production-grade AI voice agent
demo for SolnixMedia. The stack is: Next.js 14 (App Router, TypeScript, Tailwind,
Framer Motion) on the frontend; FastAPI + asyncio WebSocket pipeline + httpx on
the backend; Sarvam AI (STT + TTS) + Gemini 3.1 Flash Lite (LLM).

## Non-Negotiables
- NEVER suggest Pipecat, Daily.co, LangChain, LlamaIndex, or any subprocess-based
  concurrency. The pipeline is pure asyncio. This is a Windows dev machine.
- NEVER use `requests` or `aiohttp` — use `httpx.AsyncClient` for all HTTP.
- NEVER write blocking I/O inside an async function. All Sarvam and Gemini calls
  are `await`-ed via httpx.
- NEVER hardcode API keys. Always read from environment via `pydantic-settings`.
- NEVER use `localStorage` or `sessionStorage` in frontend code.
- ALWAYS run `uvicorn main:app --reload` on Windows with PowerShell — no Makefile
  Linux commands.

## Backend Rules
- Python 3.11+. Manage deps with `uv`. Activate venv before any pip/uv command.
- All routers live in `backend/routers/`. All service clients in `backend/services/`.
- `SessionState` lives in `backend/state/session.py`. It is an in-memory dict —
  no database, no Redis.
- Gemini conversation history format: `[{role: "user", parts: [...]}, ...]`.
  Pass the FULL history on every API call — Gemini is stateless.
- Gemini tool calling: after a `functionCall` response, you MUST send a
  `functionResponse` message back before requesting the final text response.
  That is TWO Gemini API calls per tool-using turn.
- Sarvam STT: POST multipart/form-data to `https://api.sarvam.ai/speech-to-text`,
  field name is `file`, language_code must be `en-IN`, `hi-IN`, or `te-IN`.
- Sarvam TTS: POST JSON to `https://api.sarvam.ai/text-to-speech`, model is
  `bulbul:v2`, returns `audios[0]` as base64 WAV string.
- WebSocket: use `websocket.receive_bytes()` and `websocket.receive_text()` in a
  single async loop. Detect message type by checking `isinstance(data, bytes)`.

## Frontend Rules
- Next.js 14 App Router only. No Pages Router. No `getServerSideProps`.
- Tailwind classes only — no inline `style` props except for Canvas/dynamic values.
- Zustand for all shared state. No React Context for app state.
- `VoiceOrb` uses Canvas + WebAudio `AnalyserNode`. It MUST react to real audio
  amplitude — never use a timer-based fake pulse as the final implementation.
- All WebSocket logic lives in `lib/wsClient.ts`. Components never touch
  the WebSocket directly — they go through the Zustand store actions.
- Audio playback: `AudioContext.decodeAudioData` → `AudioBufferSourceNode`.
  Expose a second `AnalyserNode` on the output for the orb to read.
- Indic font detection: apply `font-noto` class when text matches
  `/[\u0900-\u097F\u0C00-\u0C7F]/`.
- `MediaRecorder` outputs `audio/webm;codecs=opus`. Send this binary blob directly
  over the WebSocket without transcoding.

## Design Rules
- Dark theme. Background: `#0A0A0B`. Accent: `#7C5CFF` (violet).
- No gradients that aren't in the design token list in `design.md`.
- No placeholder "TODO" UI. If a component isn't built yet, render a minimal but
  correct skeleton — not a comment.
- All persona cards must be `` elements for accessibility.
- `prefers-reduced-motion`: disable all Framer Motion transforms, switch orb to
  static gradient + CSS opacity animation.

## File Naming
- Components: PascalCase (`VoiceOrb.tsx`)
- Utilities: camelCase (`wsClient.ts`)
- Backend modules: snake_case (`session.py`)
- YAML persona files: lowercase id (`priya.yaml`)

## What to Do When Stuck
- Sarvam API issues: check the `api-subscription-key` header — it is NOT Bearer.
- Gemini 429: you've hit RPM. Add `await asyncio.sleep(1)` and retry once.
- WebSocket binary frames on FastAPI: make sure you're using
  `websockets>=12` (included in `uvicorn[standard]`).
- CORS errors on WS: WS doesn't use CORS — it uses an Origin check in the HTTP
  upgrade. Add `allowed_origins=["*"]` to Starlette WebSocket in dev.
```

---