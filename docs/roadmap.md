# Roadmap — Phase-wise Build Plan

> **Stack:** Next.js 14 (frontend) + FastAPI + asyncio WebSocket pipeline (backend) + Sarvam AI (STT/TTS) + Gemini 2.0 Flash (LLM).
> **Dev OS:** Windows — all commands and tooling are Windows-compatible (PowerShell / cmd). No WSL required.
> **Effort baseline:** ~6 h/day of focused work. Adjust to your reality.

---

## Phase 0 — Accounts, Keys, Repo (½ day)

**Goal:** Everything you need to call an API is sitting in `.env`. The repo runs locally.

### Tasks

- [ ] **Sarvam AI** — sign up at [sarvam.ai](https://sarvam.ai), get your `SARVAM_API_KEY`. Run a quick curl to `https://api.sarvam.ai/text-to-speech` to confirm the key works.
- [ ] **Google AI Studio** — get a `GEMINI_API_KEY` at [aistudio.google.com](https://aistudio.google.com). Test with the Gemini playground (one "hello" prompt is enough).
- [ ] **GitHub** — create `solnix-voice-agents` repo, push the `docs/` folder (all five `.md` files from this doc set).
- [ ] **Frontend scaffold:**
  ```powershell
  npx create-next-app@14 frontend --typescript --tailwind --app --src-dir no --import-alias "@/*"
  cd frontend && npm install framer-motion zustand
  ```
- [ ] **Backend scaffold:**
  ```powershell
  mkdir backend && cd backend
  pip install uv        # fast package manager, Windows-native
  uv init --python 3.11
  uv add fastapi "uvicorn[standard]" httpx pydantic pydantic-settings pyyaml python-multipart structlog
  ```
- [ ] **`.env.example`** in repo root:
  ```
  SARVAM_API_KEY=your_key_here
  GEMINI_API_KEY=your_key_here
  NEXT_PUBLIC_API_URL=http://localhost:8000
  ```
- [ ] **Smoke scripts** — create `backend/scripts/` with:
  - `test_sarvam_tts.py` — POST to Sarvam TTS, print `"audios" received: True`
  - `test_sarvam_stt.py` — POST a sample WAV (include a 2s test WAV in `scripts/`), print transcript
  - `test_gemini.py` — POST one user message, print response text

**Exit criteria:** All three scripts print success. `.env` is populated and gitignored.

**Watch-outs:**
- Sarvam may require email verification or a brief review before key activation. Request it on Day 0, not Day 1.
- Gemini free tier has RPM limits. For the demo, `gemini-2.0-flash` is the right model — do not use `gemini-pro` (slower, lower free quota).

---

## Phase 1 — Single-Persona WebSocket Call (2 days)

**Goal:** Open a browser tab, click "Talk to Priya", speak, hear a Hindi/English response. No UI polish. Just proof that the pipeline works end-to-end.

### Backend tasks

- [ ] **`backend/config.py`** — `pydantic-settings` class that reads `.env`. Fields: `SARVAM_API_KEY`, `GEMINI_API_KEY`, `CORS_ORIGIN` (default `http://localhost:3000`).
- [ ] **`backend/services/sarvam.py`** — implement `SarvamSTTClient.transcribe(audio_bytes, language_code)` and `SarvamTTSClient.synthesize(text, language_code, speaker)` using `httpx.AsyncClient`. Both are plain REST calls — see architecture.md §3.4 for exact request shapes.
- [ ] **`backend/services/gemini.py`** — implement `GeminiClient.generate(messages, system_prompt, tools)` with no streaming (full JSON response). Return `(response_text, tool_calls)`. See architecture.md §3.5.
- [ ] **`backend/state/session.py`** — `SessionState` dataclass: `session_id`, `persona_id`, `language`, `conversation_history: list[dict]`, `created_at`. In-memory dict `SESSIONS: dict[str, SessionState]`.
- [ ] **`backend/routers/sessions.py`** — `POST /sessions` creates a `SessionState`, returns `{session_id}`. `DELETE /sessions/{id}` removes it.
- [ ] **`backend/routers/ws.py`** — implement the core pipeline (architecture.md §3.3):
  - Accept WebSocket → await `session_config` JSON → load Priya persona hardcoded for now
  - Generate opening line (Gemini) → TTS → send `audio_chunk` + `transcript` + `agent_state`
  - Loop: binary frame → STT → LLM → TTS → send back
  - On `session_end`: close cleanly
- [ ] **`backend/main.py`** — mount routers, add CORS middleware, run with `uvicorn main:app --reload`.
- [ ] **`backend/personas/priya.yaml`** + **`backend/prompts/priya.md`** — hardcode one persona for Phase 1.

### Frontend tasks

- [ ] **`frontend/lib/wsClient.ts`** — `VoiceWSClient` class: `connect(sessionId)`, `sendAudio(blob)`, `sendJSON(msg)`, event callbacks for each message type.
- [ ] **`frontend/lib/audioCapture.ts`** — `AudioCapture` class: `requestPermission()`, `startRecording()`, `stopRecording() → Blob`.
- [ ] **`frontend/lib/audioPlayer.ts`** — `AudioPlayer` class: `play(base64wav)` using `AudioContext.decodeAudioData`.
- [ ] **`frontend/app/page.tsx`** — dead-simple page: one "Talk to Priya" button. On click: POST `/sessions`, connect WebSocket, send `session_config`. No orb, no styling — just functional.
- [ ] **`frontend/lib/store.ts`** — Zustand store with `callState`, `agentState`, `transcript[]`, `sessionId`.

**Exit criteria:** Click button → grant mic → hold a button → speak → release → hear Priya's response within ~1.5 seconds. Console shows all WebSocket message events. End call cleanly.

**Watch-outs:**
- `MediaRecorder` on Chrome outputs `audio/webm;codecs=opus`. Sarvam STT expects this format — pass `language_code` but do **not** transcode. Test this first before wiring up the full loop.
- Sarvam TTS returns base64 WAV. Decode with `atob()` + `Uint8Array` before passing to `AudioContext.decodeAudioData`. WAV headers must be intact — do not strip.
- FastAPI WebSocket: use `websocket.receive_bytes()` and `websocket.receive_text()` in an async loop. A single `while True` with a try/except for `WebSocketDisconnect` is the correct pattern.
- CORS applies to HTTP endpoints (`/sessions`), not to WebSocket. The WS handshake uses an `Origin` check — add `allowed_origins` to the Starlette `WebSocket` if needed, or just allow all for dev.
- Gemini conversation history: maintain `conversation_history` in `SessionState` as `[{role: "user", parts: [...]}, {role: "model", parts: [...]}]`. Pass the full list on every call — Gemini is stateless.

---

## Phase 2 — Three Personas, Three Languages, Tools (3 days)

**Goal:** Feature-complete bot layer. All three personas work. Language switching works mid-call. Tool calls work.

### Backend tasks

- [ ] **`backend/personas/arjun.yaml`** + `backend/prompts/arjun.md` — Insurance renewal persona.
- [ ] **`backend/personas/meera.yaml`** + `backend/prompts/meera.md` — Appointment booking persona.
- [ ] **`backend/routers/personas.py`** — `GET /personas` reads all `*.yaml` files from the `personas/` folder and returns the catalog as JSON. Frontend uses this — never hardcode persona list client-side.
- [ ] **Persona loader in `ws.py`** — replace hardcoded Priya with `load_persona(persona_id)` that reads YAML and the corresponding prompt markdown. Inject `language_code` and default context into the prompt with `str.format_map()`.
- [ ] **Language switching** — on `language_switch` JSON message: update `SessionState.language`, update the Sarvam voice ID using `VOICE_MAP`, inject a `[User switched to X]` system note into the conversation history so Gemini stays coherent. Send `language_switched` acknowledgement.
- [ ] **`backend/tools/`** — implement all tool functions:
  - `loan_tools.py`: `lookup_loan(loan_id)`, `record_commitment(loan_id, amount, date)`
  - `policy_tools.py`: `lookup_policy(policy_id)`, `send_renewal_link(policy_id, channel)`
  - `booking_tools.py`: `get_available_slots(service, date_from, date_to, time_of_day)`, `book_slot(slot_id, name, phone)`, `lookup_booking(booking_code_or_phone)`, `cancel_booking(booking_code)`
  - `executor.py`: `execute_tool(tool_name, args) -> dict` — dispatches to the correct function
- [ ] **Gemini tool definitions** — each persona's YAML lists which tools it has access to. Build the `tools` array dynamically per persona before passing to Gemini.
- [ ] **`backend/data/slots.json`** — generate on server startup (not statically). A helper `generate_slots()` creates realistic slots for the next 7 days so the demo never shows stale dates.

### Frontend tasks

- [ ] **`frontend/lib/store.ts`** — add `availableLanguages`, `setLanguage()` action that sends `language_switch` over WebSocket.
- [ ] **`frontend/components/LanguagePill.tsx`** — `EN` / `हि` / `తె` chips. Active state has accent fill. Disabled for languages the selected persona doesn't support (e.g. Priya has no Telugu).
- [ ] **Wire language picker** — clicking a pill triggers `store.setLanguage()` which sends the WS message. On `language_switched` response: update store, animate the pill transition.

**Exit criteria:** Have a Telugu conversation with Arjun about a fake insurance policy. Switch to Hindi mid-call and continue seamlessly. Meera can book a slot and read back a booking code. All tool calls complete in < 300ms.

**Watch-outs:**
- Gemini tool call response: the `response.candidates[0].content.parts` array may contain a mix of `text` and `functionCall` parts. Always iterate over all parts — don't assume the first part is text.
- After a tool call, you must send a `functionResponse` role message back to Gemini with the tool result before asking it to continue generating. The full flow: `user turn → Gemini responds with functionCall → you call the tool → you send functionResponse → Gemini generates the final text response`. Two Gemini API calls per tool-using turn.
- Sarvam Telugu voice: verify `aditya` and `vidya` support `te-IN` language code. If a voice doesn't support a language, Sarvam returns an error — test all `(persona, language)` combinations in your smoke scripts before Phase 3.
- `str.format_map()` will raise `KeyError` if a placeholder in the prompt markdown is missing from the context dict. Use a `defaultdict(str)` or explicitly supply all keys.

---

## Phase 3 — Arrowhead-Grade UI (4 days)

**Goal:** The page you'd put in a pitch deck. Stakeholders say "this looks like a real product".

### Day 1 — Design system + Landing skeleton

- [ ] **`frontend/tailwind.config.ts`** — implement all design tokens from `design.md`: color palette (dark theme), typography scale, spacing scale, border-radius tokens, `fontFamily` with Geist + Noto Indic fallback chain.
- [ ] **`frontend/app/globals.css`** — CSS custom properties for all colors (so the Canvas orb and Framer Motion can reference them). Import Geist via `next/font/google`. Import Noto Sans Devanagari and Noto Sans Telugu via `next/font/google` with `subsets`.
- [ ] **`frontend/app/layout.tsx`** — root layout: dark background, font class application, global meta tags.
- [ ] **`frontend/components/Section.tsx`** — marketing section wrapper with consistent vertical rhythm and scroll-triggered entrance animation (Framer Motion `useInView`).
- [ ] **Landing nav** — `Logo | Personas | How it works | Tech | GitHub`. Sticky, blurred backdrop on scroll.
- [ ] **Hero section** — full viewport height. Left: orb (idle ambient pulse). Right: headline + sub-headline + "Start a call ↓" CTA. On desktop side-by-side; on mobile orb above text. Headline font 64px desktop / 40px mobile.

### Day 2 — VoiceOrb + Persona Picker

- [ ] **`frontend/components/VoiceOrb.tsx`** — this is the flagship component. Requirements:
  - Canvas element, `requestAnimationFrame` loop.
  - Receives `analyser: AnalyserNode | null` and `speaker: 'idle' | 'user' | 'agent'`.
  - `getByteFrequencyData()` → average amplitude → drive radius and blur.
  - Idle: slow ambient pulse, violet `#7C5CFF` base, 60s sinusoidal size oscillation.
  - User speaking: shifts to blue-green `#06B6D4`, amplitude reacts to mic input, faster pulsing.
  - Agent speaking: violet-to-pink gradient `#A78BFA → #F472B6`, amplitude reacts to TTS audio output.
  - `prefers-reduced-motion`: static gradient with subtle opacity oscillation — no `requestAnimationFrame`.
  - The orb must look impressive at 400px (landing hero) and at 300px (call overlay). Use a `size` prop.
- [ ] **`frontend/lib/micAnalyser.ts`** — `MicAnalyser`: attach a `MediaStream` to a `WebAudio AnalyserNode`, expose `getAnalyser()`.
- [ ] **`frontend/lib/audioPlayer.ts`** — update: expose a second `AnalyserNode` on the output so the orb can react to TTS audio.
- [ ] **`frontend/components/PersonaCard.tsx`** — agent selection card:
  - Avatar image (placeholder SVG for now; swap for illustrations later).
  - Display name + role + short blurb.
  - Language pills (static, showing which languages are supported).
  - "Talk" CTA button.
  - Framer Motion `whileHover`: 1.5° tilt + inner glow (use `box-shadow` with `Accent glow` color).
  - Selected state: elevated border + accent ring.
- [ ] **Persona picker section** — "Pick someone to talk to" heading. Three cards in a row (desktop), stacked (mobile).

### Day 3 — Call Overlay + Transcript

- [ ] **`frontend/components/CallOverlay.tsx`** — full-screen overlay (not a new route — `fixed inset-0`). Framer Motion `AnimatePresence` for enter/exit.
  - Header: back arrow + persona name + role + LiveIndicator + language pill switcher + close (X).
  - Centre: VoiceOrb (large, wired to real amplitude).
  - Below orb: latest transcript line in large type (the "currently speaking" text). Indic font applied.
  - Bottom: collapsible transcript panel + `CallControls`.
- [ ] **`frontend/components/TranscriptLine.tsx`** — speaker label (You / Priya / Arjun / Meera) + text + timestamp on hover. Indic-aware: apply `font-family: 'Noto Sans Devanagari', 'Noto Sans Telugu', sans-serif` when the text contains Devanagari or Telugu Unicode ranges.
- [ ] **`frontend/components/CallControls.tsx`** — mute toggle (warn-yellow when muted) + end call (danger-red, larger). Fixed at the bottom of the overlay.
- [ ] **`frontend/components/LiveIndicator.tsx`** — pulsing dot + "Live" text. Pulse driven by CSS animation (not JS) for performance.
- [ ] **`frontend/components/MicPermissionPrompt.tsx`** — friendly modal when mic is denied. Browser-specific instructions (detect Chrome vs Firefox vs Safari via `navigator.userAgent`).
- [ ] **Full session wiring** — clicking a persona card opens the overlay, triggers the session lifecycle from architecture.md §5 end-to-end with real UI.

### Day 4 — Marketing sections + Polish + Edge states

- [ ] **"How it works" section** — 3-step animated diagram:
  1. Pick your agent
  2. Speak in your language
  3. AI responds in real time
  Use Framer Motion `useInView` to animate each step in on scroll. Simple SVG icons, not stock art.
- [ ] **"Built with" section** — logo strip: Sarvam · Gemini · FastAPI · Next.js. Use vendor SVG logos (from their brand kits).
- [ ] **Footer** — SolnixMedia · POC · contact link. Simple, not cluttered.
- [ ] **Edge states:**
  - Mic denied → `MicPermissionPrompt` modal (browser-specific copy).
  - Session fails to start (backend unreachable, 5s timeout) → "Something went wrong" toast with "Try again".
  - WebSocket drops mid-call → "Reconnecting…" state on the orb for 5s, then graceful failure.
  - Agent takes > 3s to respond → subtle "thinking" animation on orb, no spinner.
  - Bot audio fails to decode → skip that chunk silently, log to console, continue.
- [ ] **Indic text validation** — render long Hindi sentences ("नमस्ते, मैं प्रिया बोल रही हूँ, आपको SolnixBank की तरफ से कॉल कर रही हूँ") in all text containers. Fix any width overflow or line-height issues. Telugu script is wider than Devanagari — test both.
- [ ] **Responsive pass** — test desktop / tablet / mobile as specified in `design.md §7`. Use Chrome DevTools device toolbar. Fix anything that breaks.

**Exit criteria:** Stakeholder demo on your laptop. Demo all 3 personas, switch language mid-call on Arjun (Telugu → Hindi). The orb visibly reacts to audio. The page feels premium, not like a hackathon project.

**Watch-outs:**
- The orb is the single biggest visual lever. If it doesn't react to *actual* audio amplitude — if it's just a timer-based pulse — it will look fake. Wire it to real data before anything else in Day 2.
- Indic text in `TranscriptLine` must use the Noto fallback chain, not Geist, or it will render as boxes on devices without system Indic fonts.
- The call overlay must trap focus (keyboard accessibility) when open. Use a `focus-trap` utility or shadcn `Dialog` as the primitive.
- Framer Motion `AnimatePresence` requires the animated child to have a stable `key`. Use `sessionId` as the key.

---

## Phase 4 — Deploy & Polish (2 days)

**Goal:** A shareable URL that works for anyone in 10 seconds.

### Day 1 — Backend deploy (Fly.io)

- [ ] **`backend/Dockerfile`**:
  ```dockerfile
  FROM python:3.11-slim
  WORKDIR /app
  COPY pyproject.toml uv.lock* ./
  RUN pip install uv && uv sync --no-dev
  COPY . .
  CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
  ```
- [ ] **`backend/fly.toml`** — app name `solnix-voice-agents-api`, region `bom` (Mumbai), `internal_port = 8080`, `auto_stop_machines = false` (WebSocket sessions must not be interrupted).
- [ ] **Fly secrets:**
  ```powershell
  fly secrets set SARVAM_API_KEY=... GEMINI_API_KEY=... CORS_ORIGIN=https://your-app.vercel.app
  ```
- [ ] **Health check** — `GET /health` returns `{"status": "ok"}`. Configure in `fly.toml` as the health check endpoint.
- [ ] **WebSocket proxy config** — Fly's HTTP handler supports WebSocket upgrades by default. Verify with `wscat -c wss://your-app.fly.dev/ws/test` from your laptop.

### Day 2 — Frontend deploy (Vercel) + smoke test

- [ ] **Vercel env vars** — set `NEXT_PUBLIC_API_URL=https://your-app.fly.dev` in the Vercel project settings. Do not commit this to `.env`.
- [ ] **`next.config.ts`** — no special config needed for Vercel unless you add image optimisation for the persona avatars (recommended: `images.remotePatterns` for any external avatar URLs).
- [ ] **CORS final check** — set `CORS_ORIGIN` in Fly secrets to the exact Vercel production URL (and the preview URL pattern if you want PR previews to work).
- [ ] **Full smoke test** — from a different machine (not your dev laptop): test all 3 personas × all supported languages. Confirm the WebSocket connects over `wss://` (TLS). Confirm TTS audio plays.
- [ ] **Demo script** — write a 2-minute walkthrough in `docs/DEMO_SCRIPT.md`:
  - Open the page, point out the hero and orb.
  - Pick Priya → English → talk about a loan. Switch to Hindi mid-sentence.
  - End call → pick Arjun → Telugu → switch to Hindi.
  - End call → pick Meera → book a slot → get a booking code.
- [ ] **Cost guardrails** — set monthly spending caps in Sarvam console and Google AI Studio. Target: $0 (both have free tiers sufficient for ≤ 100 demo sessions/month).
- [ ] **README** — update with live URL, "How to run locally" (PowerShell commands), and "How to demo it" section.

**Exit criteria:** Paste the Vercel URL in any browser → working demo within 10 seconds of page load. WebSocket connects over `wss://`. Audio plays. Language switching works.

---

## Phase 5 — Optional v1.1 (if time allows)

These make the demo better but are not required for the POC sign-off:

- **VAD (Voice Activity Detection)** — replace push-to-talk with `@ricky0123/vad-web`. Hands-free experience. Add to `lib/vadCapture.ts` as a drop-in replacement for `audioCapture.ts`.
- **Streaming TTS** — Sarvam supports chunked audio streaming. Relay chunks over WebSocket as they arrive to reduce TTS latency from ~250ms to ~80ms first-byte.
- **Save transcript** — "Download" button that exports the `transcript[]` array as a PDF using `jsPDF` (client-side, no server needed).
- **Demo mode banner** — toggle that shows fake "12 calls happening right now" live activity.
- **Light theme** — toggle in the nav. Tailwind `dark:` utilities make this straightforward once the dark tokens are in place.
- **Analytics** — Plausible (privacy-friendly, self-hosted option) or PostHog. Track which personas/languages get the most engagement.
- **Open Graph image** — auto-generated OG image using Next.js `opengraph-image.tsx` with the orb on a dark background.

---

## Total Estimate

| Phase | Effort |
|---|---|
| 0 — Setup | 0.5 day |
| 1 — Single-persona WebSocket call | 2 days |
| 2 — Three personas + languages + tools | 3 days |
| 3 — UI build | 4 days |
| 4 — Deploy | 2 days |
| **Total (MVP)** | **~11.5 working days (~2.5 weeks)** |
| 5 — Optional polish | +2–3 days |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Sarvam access/quota issues | Medium | Request key in Phase 0 and run smoke tests immediately. Have Deepgram (STT) + ElevenLabs (TTS) as a documented English-only fallback — both work with the same REST + httpx pattern. |
| Gemini latency too high for India | Low–Med | Measure in Phase 1. Fallback: `gpt-4o-mini` via OpenAI (Mumbai endpoint available). The pipeline abstraction in `gemini.py` makes this a 10-line swap. |
| Sarvam voice not available for a language | Medium | Test all `(persona, language, voice)` combos in Phase 0 smoke scripts before building the UI. Map to the nearest available voice as fallback. |
| WebSocket drops in production (Fly cold start) | Low | `auto_stop_machines = false` in `fly.toml` keeps the VM warm. Add a 5-second reconnect with backoff in `wsClient.ts`. |
| Gemini function calling hallucination | Low–Med | Always validate tool args in `executor.py` before calling the function. Return a structured error to Gemini if args are invalid — it will self-correct. |
| Indic font rendering on Windows/Android | Low | Use `next/font/google` with `Noto Sans Devanagari` and `Noto Sans Telugu` — they load from Google Fonts CDN and are not dependent on the OS font stack. |
| Concurrent demo load | Low (for POC) | Two Fly workers handle ~5–10 concurrent WebSocket sessions. If the demo gets shared widely, scale to `--workers 4` or add a second Fly machine. |

---

## Hand-off Checklist (before showing your manager)

- [ ] README has the live URL and a "How to demo" section.
- [ ] Recorded a 2-min Loom: one full call per persona.
- [ ] Cost dashboard screenshots (Sarvam + Gemini + Fly + Vercel) — all free tiers.
- [ ] `LESSONS.md` filled in — what you'd do differently. Interns who reflect on their work get noticed.
- [ ] `docs/DEMO_SCRIPT.md` written and rehearsed.