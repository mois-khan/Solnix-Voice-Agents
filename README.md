# Solnix AI Voice Agents

A production-grade AI voice assistant application built with modern web technologies and asyncio-based backend architecture. Experience intelligent, real-time voice conversations powered by Sarvam AI, Gemini 3.1 Flash Lite, and a fully asynchronous FastAPI backend.

## Tech Stack

### Frontend
- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- **Web Audio API** for real-time audio processing
- **Canvas** for the VoiceOrb visualization

### Backend
- **FastAPI** with asyncio WebSocket pipeline
- **httpx** for async HTTP requests
- **Pydantic** for settings and validation
- **Python 3.11+**

### AI Services
- **Sarvam AI** — Speech-to-Text (STT) and Text-to-Speech (TTS)
- **Google Gemini 3.1 Flash Lite** — Large Language Model (LLM)

## Architecture

```
frontend/ (Next.js 14, TypeScript, Tailwind)
  ├── app/
  ├── components/
  ├── lib/
  │   └── wsClient.ts (WebSocket client)
  └── public/

backend/ (FastAPI + asyncio)
  ├── main.py
  ├── routers/
  ├── services/
  │   ├── sarvam_client.py (STT/TTS)
  │   └── gemini_client.py (LLM)
  ├── state/
  │   └── session.py (SessionState)
  └── personas/
      └── *.yaml (persona definitions)
```

### Key Design Principles

- **Pure Asyncio Pipeline**: No subprocess-based concurrency. All I/O is non-blocking via httpx.
- **WebSocket-First Communication**: Binary audio frames and text messages over a single WebSocket connection.
- **Stateless LLM Calls**: Full conversation history is passed on every Gemini API call.
- **In-Memory Session State**: No database or Redis — sessions live in memory during runtime.
- **Real-Time Audio Visualization**: Canvas-based VoiceOrb reacts to live audio amplitude from the Web Audio API.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Sarvam AI API key
- Google Gemini API key

### Backend Setup

```bash
cd backend
python -m venv venv
# Windows PowerShell
venv\Scripts\Activate.ps1
# macOS/Linux
source venv/bin/activate

uv pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
SARVAM_API_KEY=your_sarvam_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Run the backend:
```bash
uvicorn main:app --reload
```

The backend will start on `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`.

## API Documentation

### WebSocket Endpoint
- **URL**: `ws://localhost:8000/ws`
- **Binary Messages**: Raw audio frames (WebM Opus codec)
- **Text Messages**: JSON payloads for control and responses

### Message Format

**Client → Server (Audio)**
```
[binary audio data]
```

**Client → Server (Control)**
```json
{
  "type": "session_init",
  "persona_id": "priya"
}
```

**Server → Client (Response)**
```json
{
  "type": "agent_response",
  "text": "Response text",
  "audio_base64": "encoded WAV audio"
}
```

## Design

### Dark Theme
- **Background**: `#0A0A0B`
- **Accent**: `#7C5CFF` (Violet)
- Font: Noto Sans (with automatic Indic script detection)

### Accessibility
- All persona cards use semantic `<button>` elements
- Respects `prefers-reduced-motion` for animations
- Indic script detection via regex: `/[\u0900-\u097F\u0C00-\u0C7F]/`

## Development Rules

### What NOT to Do
- ❌ Do not use `requests` or `aiohttp` — use `httpx.AsyncClient` only
- ❌ Do not hardcode API keys — always read from environment via Pydantic
- ❌ Do not use blocking I/O in async functions
- ❌ Do not use `localStorage` or `sessionStorage` in the frontend
- ❌ Do not use subprocess-based concurrency (Pipecat, Daily.co, etc.)

### Backend Conventions
- All routers live in `backend/routers/`
- All service clients live in `backend/services/`
- SessionState is an in-memory dict in `backend/state/session.py`
- Gemini tool calling requires TWO API calls per tool-using turn: first to get the `functionCall`, then to send the `functionResponse`
- Sarvam STT: POST multipart/form-data with field name `file`, language code must be `en-IN`, `hi-IN`, or `te-IN`
- Sarvam TTS: POST JSON, model is `bulbul:v2`, returns base64 WAV in `audios[0]`

### Frontend Conventions
- Next.js 14 App Router only — no Pages Router
- Zustand for all shared state — no React Context for app state
- All WebSocket logic in `lib/wsClient.ts` — components use Zustand actions
- `VoiceOrb` must react to real audio amplitude, not a timer-based fake pulse
- Audio playback: `AudioContext.decodeAudioData` → `AudioBufferSourceNode` with a second `AnalyserNode` for the orb
- Tailwind classes only — no inline `style` props (except Canvas/dynamic values)

## Troubleshooting

### Sarvam API Issues
- Verify the `api-subscription-key` header (it is NOT Bearer)
- Check that language codes are valid: `en-IN`, `hi-IN`, or `te-IN`

### Gemini 429 Error
- You've hit the rate limit. Add `await asyncio.sleep(1)` and retry once.

### WebSocket Binary Frame Issues
- Ensure `websockets>=12` is installed (included in `uvicorn[standard]`)
- Verify message type detection: `isinstance(data, bytes)`

### CORS Issues
- WebSocket doesn't use CORS — it uses Origin checks in the HTTP upgrade
- In dev, use `allowed_origins=["*"]` in Starlette WebSocket configuration

## File Naming Conventions
- **Components**: PascalCase (`VoiceOrb.tsx`)
- **Utilities**: camelCase (`wsClient.ts`)
- **Backend modules**: snake_case (`session.py`)
- **YAML personas**: lowercase id (`priya.yaml`)

## Project Status

This is a **production-grade demo** showcasing:
- Real-time bidirectional audio streaming
- Intelligent conversation with context awareness
- Multi-persona support with YAML-based configuration
- Responsive design with real-time visualization
- Full asyncio pipeline for maximum performance

## License

[Your License Here]

## Contributing

Contributions are welcome. Please ensure all changes follow the established patterns and conventions outlined above.
