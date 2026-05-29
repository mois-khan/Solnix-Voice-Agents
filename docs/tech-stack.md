# Tech Stack — Decisions & Rationale

> **Platform constraint:** Developer machine is Windows. All backend code must run with `python -m uvicorn` on Windows with no Linux-only dependencies. The pipeline replaces Pipecat + Daily.co with a pure asyncio WebSocket architecture that works identically on Windows, macOS, and Linux.

Each row: **what we picked**, **what else was on the table**, **why we picked this**.

---

## Voice & AI

| Concern | Pick | Alternatives considered | Why this |
|---|---|---|---|
| **Voice orchestration** | **Custom asyncio pipeline** (Python) | Pipecat, LiveKit Agents, Vocode | Pipecat requires Linux (WSL2 at best on Windows — fragile for dev). A 200-line custom pipeline in `routers/ws.py` does exactly what we need: `STT → LLM → TTS`. No framework overhead, no dependency on C extensions that break on Windows, full control over latency optimisation. |
| **Transport layer** | **WebSocket** (`ws://` / `wss://`) | WebRTC via Daily.co or LiveKit | Daily.co requires Pipecat and is optimised for media rooms (overkill for a web demo). WebSocket gives us full-duplex, binary-capable, natively supported in all browsers and by FastAPI (`websockets` via Starlette). Zero additional infrastructure. |
| **STT** | **Sarvam AI — `saarika:v2`** | Deepgram, Google Cloud Speech, Azure, Whisper | Best-in-class for Hindi/Telugu/Indian English. Native code-switching (Hinglish). Generous free tier. Simple REST multipart upload — no SDK required, plays well with httpx async. |
| **TTS** | **Sarvam AI — `bulbul:v2`** | ElevenLabs, Google WaveNet, Azure Neural | Same vendor as STT (one API key, one free tier). High-quality Indic voices. Returns base64 WAV in a single REST call — easy to relay over WebSocket. |
| **LLM** | **Google Gemini 2.0 Flash** | GPT-4o-mini, Claude Sonnet, Groq Llama, Sarvam-M | ~300ms first-token latency, native function calling (`tools` array), strong Hindi/Telugu reasoning, generous free quota for a POC. `gemini-1.5-flash` kept as a config-level fallback. |

---

## Frontend

| Concern | Pick | Why |
|---|---|---|
| **Framework** | **Next.js 14** (App Router, TypeScript) | Vercel-native. Server components for marketing sections; client components for the entire call UI. `next/font` handles Geist + Noto Indic fonts with zero layout shift. |
| **Styling** | **Tailwind CSS v3** + **shadcn/ui** primitives | Design-token-driven (see `design.md`). Tailwind keeps CSS co-located and tree-shaken. shadcn gives us accessible `Button`, `Dialog`, `Tabs`, `Sheet` without a heavy UI library. We extend the Tailwind config with our own color/radius/font scale. |
| **Animation** | **Framer Motion** | Voice orb entrance, persona-card hover tilt, call overlay slide-in, language-pill transitions. All declarative; no imperative animation loops except the Canvas orb itself. |
| **Orb visualiser** | **Custom Canvas + WebAudio API** | The orb is the product's centrepiece. Off-the-shelf waveform libs produce generic results. `AnalyserNode.getByteFrequencyData()` gives us real amplitude data from both the mic stream and the decoded TTS audio. Rendered in `requestAnimationFrame` — smooth at 60fps, zero DOM reflows. |
| **WebSocket client** | **Native browser `WebSocket`** wrapped in `lib/wsClient.ts` | No library needed. A thin wrapper handles reconnect logic, binary frame dispatch, and JSON event routing. Keeps the bundle small. |
| **Audio recording** | **Phase 1:** `MediaRecorder` (push-to-talk, WebM/Opus output). **Phase 2:** `@ricky0123/vad-web` (voice activity detection, hands-free) | `MediaRecorder` is universally supported and gives us Opus-compressed audio with one API. VAD is a progressive enhancement — add it in Phase 2 without touching any other component. |
| **TTS playback** | **`AudioContext.decodeAudioData`** + `AudioBufferSourceNode` | Receive base64 WAV from the backend → decode → play. Also feeds a second `AnalyserNode` so the orb reacts to the bot's voice, not just the user's mic. |
| **State** | **Zustand** | Tiny (~1 kB), no boilerplate. Store: `selectedPersona`, `callState`, `agentState`, `currentLanguage`, `transcript[]`, `sessionId`. Easy to subscribe to slices in any component. |
| **Fonts** | **Geist Sans** (UI) + **Geist Mono** (transcript) + **Noto Sans Devanagari / Telugu** (Indic fallback) | Geist = modern, arrowhead-adjacent feel. Noto covers the full Unicode ranges for Hindi and Telugu without relying on system fonts (which vary wildly on Windows/Android). All loaded via `next/font` for optimal performance. |

---

## Backend

| Concern | Pick | Why |
|---|---|---|
| **Language** | **Python 3.11+** | FastAPI, httpx, asyncio — the entire async ecosystem is Python. No reason to introduce a second language for a POC. Runs fine on Windows with `uvicorn`. |
| **Web framework** | **FastAPI** | Async-native (matches our pipeline). Built-in WebSocket support via Starlette. Auto OpenAPI docs at `/docs`. ~50 LOC for our full endpoint surface. |
| **Async HTTP client** | **httpx** (async) | Used for all Sarvam and Gemini REST calls. A single shared `httpx.AsyncClient` with connection pooling per service class reduces per-request overhead significantly versus `aiohttp` or `requests`. |
| **Concurrency model** | **`asyncio` coroutines** — one coroutine per WebSocket session | No subprocesses, no threads. Pure asyncio concurrency is safe on Windows, handles 5–10 concurrent demo sessions without issue. If we ever need real isolation, graduate to a job queue (Celery + Redis), but that's v2. |
| **Persona config** | **YAML per persona** + `pydantic-settings` for env | Persona designers can edit `personas/*.yaml` without touching Python. Pydantic validates the env on startup so missing keys fail fast with a clear error, not a silent runtime crash. |
| **System prompts** | **Markdown files** (`prompts/*.md`) | Versionable, diffable, editable by non-engineers. The backend reads and interpolates `{{placeholders}}` at session-start using Python's `str.format_map()`. |
| **Mock data** | **JSON files** (`data/loans.json`, `policies.json`, `slots.json`) | Zero infra for a POC. Slots JSON is generated on-the-fly for the next 7 days so the demo never shows stale dates. Swap for SQLite or Postgres in a real v1. |
| **Server** | **Uvicorn** (with `--reload` in dev) | Standard FastAPI server. Works on Windows without Gunicorn (which requires a Unix fork model). In production on Fly.io, run with `--workers 2` for resilience. |

---

## Deployment & Ops

| Concern | Pick | Why |
|---|---|---|
| **Frontend host** | **Vercel** | One-click Next.js, free tier, global CDN, preview deploys per PR. |
| **Backend host** | **Fly.io** (Mumbai `bom` region) | Persistent long-running VMs (WebSocket sessions need them — serverless functions would time out). Mumbai placement = ~80ms RTT for Indian users. Render and Railway are acceptable alternatives with identical latency. |
| **Secrets** | **Fly secrets** (backend) + **Vercel env vars** (frontend — public config only: backend URL) | `SARVAM_API_KEY`, `GEMINI_API_KEY` never reach the browser. The frontend only needs `NEXT_PUBLIC_API_URL`. |
| **CI/CD** | **GitHub Actions** → Vercel + Fly | On push to `main`: lint + typecheck (frontend), pytest (backend), then deploy. |
| **Observability (v1)** | **`structlog`** structured JSON logs | Enough to debug a demo. Every pipeline step logs `session_id`, `stage`, `latency_ms`. Sentry / OpenTelemetry in v2. |
| **CORS** | Locked to the Vercel preview + production domain | Configured in FastAPI `CORSMiddleware`. `localhost:3000` also allowed for dev. |

---

## What We Are NOT Using (and Why)

| Tool | Why we dropped it |
|---|---|
| **Pipecat** | Linux-only C extension dependencies (`grpcio`, native audio libs). Fails or needs WSL2 on Windows — fragile for a solo intern dev environment. Our custom 200-line asyncio pipeline does the same job with zero framework magic. |
| **Daily.co** | Requires Pipecat as the media router for bot-side audio. Without Pipecat, Daily adds complexity with no payoff. WebSocket handles our use case fully. |
| **LangChain / LlamaIndex** | Overkill. Gemini's native `tools` array handles function calling. A plain list of `tool_definitions` in `gemini.py` is simpler and faster to debug. |
| **Vector DB / RAG** | Not needed. All three personas operate on small, structured mock data, not document corpora. |
| **WebRTC / SFU** | No peer-to-peer audio required. Bot audio is synthesised server-side (TTS) and sent as base64 WAV over WebSocket. The browser decodes and plays it via `AudioContext`. |
| **Redis / Celery** | Not needed for ≤ 10 concurrent sessions. In-memory `dict` in `state/session.py` is enough. Add Redis if the demo goes viral. |
| **Auth service** | It's a public demo — no accounts, no sessions to protect beyond the ephemeral `session_id`. |
| **Subprocess per session** | Pipecat's pattern. Unnecessary here — asyncio coroutines are lighter and Windows-safe. |

---

## Dependency Manifest (top-level, not exhaustive)

### Backend — `pyproject.toml`

```toml
[project]
name = "solnix-voice-agents-backend"
requires-python = ">=3.11"

dependencies = [
  "fastapi>=0.111",
  "uvicorn[standard]>=0.29",   # websockets support
  "httpx>=0.27",
  "pydantic>=2.7",
  "pydantic-settings>=2.2",
  "pyyaml>=6.0",
  "python-multipart>=0.0.9",   # for httpx multipart in Sarvam STT
  "structlog>=24.1",
]

[tool.uv.dev-dependencies]
pytest = ">=8.2"
pytest-asyncio = ">=0.23"
httpx = { extras = ["test"] }
```

### Frontend — `package.json` (key deps)

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "framer-motion": "^11",
    "zustand": "^4",
    "@ricky0123/vad-web": "^0.0.19",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "^3",
    "shadcn-ui": "latest",
    "@types/node": "^20",
    "@types/react": "^18"
  }
}
```