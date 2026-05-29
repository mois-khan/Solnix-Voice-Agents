## ═══ PHASE 0 — Setup ═══

### Prompt 0.1 — Scaffold the repo structure

```
I'm building a voice AI demo called Solnix Voice Agents. Create the complete
folder structure for the project, then scaffold both the frontend and backend.

Folder structure to create:
solnix-voice-agents/
├── frontend/     ← Next.js 14 app (TypeScript, Tailwind, App Router)
├── backend/      ← FastAPI + asyncio WebSocket pipeline
├── docs/         ← place all 5 .md files here (I'll add them manually)
├── .env.example
└── README.md

Step 1: Run this in the project root:
  npx create-next-app@14 frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint

Step 2: Create backend/ manually (do NOT use create-next-app for it):
  mkdir backend
  cd backend
  # Create pyproject.toml with these exact dependencies:
  # fastapi>=0.111, uvicorn[standard]>=0.29, httpx>=0.27,
  # pydantic>=2.7, pydantic-settings>=2.2, pyyaml>=6.0,
  # python-multipart>=0.0.9, structlog>=24.1
  # Python version: >=3.11

Step 3: Create the full backend folder structure:
backend/
├── main.py              ← FastAPI app (empty hello-world for now)
├── config.py            ← pydantic-settings env loader
├── routers/
│   ├── __init__.py
│   ├── sessions.py      ← empty file
│   ├── personas.py      ← empty file
│   └── ws.py            ← empty file
├── services/
│   ├── __init__.py
│   ├── sarvam.py        ← empty file
│   └── gemini.py        ← empty file
├── tools/
│   ├── __init__.py
│   ├── executor.py
│   ├── loan_tools.py
│   ├── policy_tools.py
│   └── booking_tools.py
├── state/
│   ├── __init__.py
│   └── session.py
├── personas/
│   ├── priya.yaml
│   ├── arjun.yaml
│   └── meera.yaml
├── prompts/
│   ├── priya.md
│   ├── arjun.md
│   └── meera.md
├── data/
│   ├── loans.json
│   ├── policies.json
│   └── slots.json
└── scripts/
    ├── test_sarvam_tts.py
    ├── test_sarvam_stt.py
    └── test_gemini.py

Step 4: Create .env.example in the project root:
  SARVAM_API_KEY=your_sarvam_key_here
  GEMINI_API_KEY=your_gemini_key_here
  NEXT_PUBLIC_API_URL=http://localhost:8000
  CORS_ORIGIN=http://localhost:3000

Step 5: Create .gitignore that covers .env, __pycache__, .next, node_modules,
  *.pyc, .venv

After creating all files, print the full tree so I can verify.
```

---

### Prompt 0.2 — config.py and smoke test scripts

```
Write the following backend files. Do not modify any other files.

1. backend/config.py
   Use pydantic-settings BaseSettings. Fields:
   - SARVAM_API_KEY: str
   - GEMINI_API_KEY: str
   - CORS_ORIGIN: str = "http://localhost:3000"
   Load from a .env file. Export a singleton: settings = Settings()

2. backend/scripts/test_sarvam_tts.py
   - Load settings from config.py
   - POST to https://api.sarvam.ai/text-to-speech
   - Header: api-subscription-key (not Bearer)
   - Body: inputs=["नमस्ते, यह एक परीक्षण है।"], target_language_code="hi-IN",
     speaker="priya", model="bulbul:v2"
   - Print: "TTS OK — audio length: {len} bytes" if audios[0] exists
   - Print the error body if the request fails

3. backend/scripts/test_sarvam_stt.py
   - Create a 1-second silent WAV in-memory (use Python's wave module,
     44100 Hz, 1 channel, 16-bit, all zeros)
   - POST to https://api.sarvam.ai/speech-to-text as multipart/form-data
   - Header: api-subscription-key
   - Fields: file=(audio.wav, wav_bytes), language_code="en-IN",
     model="saaras:v2", mode="transcribe"
   - Print: "STT OK — transcript: '{transcript}'" (may be empty for silence)
   - Print error body on failure

4. backend/scripts/test_gemini.py
   - Load settings
   - POST to Gemini 2.0 Flash generateContent endpoint with ?key= param
   - Single user message: "Say hello in one sentence."
   - Print: "Gemini OK — response: '{text}'"
   - Print error on failure

All scripts use httpx (not requests). All are standalone — run with
`python backend/scripts/test_sarvam_tts.py` from the project root.
```

---

## ═══ PHASE 1 — Single-Persona WebSocket Call ═══

### Prompt 1.1 — Backend services (Sarvam + Gemini clients)

```
Write backend/services/sarvam.py and backend/services/gemini.py.
Read GEMINI.md and .agent/skills/sarvam-api.md and .agent/skills/gemini-tools.md
before writing any code — the exact API shapes are defined there.

backend/services/sarvam.py:
  Class SarvamSTTClient:
    - __init__: create a shared httpx.AsyncClient with base_url and auth header
    - async transcribe(audio_bytes: bytes, language_code: str) -> str
      POST multipart/form-data. Return transcript string. Raise ValueError on API error.

  Class SarvamTTSClient:
    - __init__: same pattern
    - async synthesize(text: str, language_code: str, speaker: str) -> str
      POST JSON. Return base64 WAV string (audios[0]). Raise ValueError on error.

  VOICE_MAP dict at module level — maps (persona_id, language_code) → speaker string.
  See GEMINI.md for the exact values.

backend/services/gemini.py:
  Class GeminiClient:
    - __init__: store api_key, create httpx.AsyncClient
    - async generate(
        system_prompt: str,
        history: list[dict],
        tool_definitions: list[dict],
        new_user_message: str
      ) -> tuple[str, list[dict]]
      Appends new_user_message to history, calls Gemini.
      Returns (response_text, tool_calls).
      If tool_calls is non-empty, response_text may be empty — that's correct.
      Implement the two-call pattern: if a functionCall is in the response,
      accept tool_results: list[dict] in a second method:

    - async send_tool_results(
        system_prompt: str,
        history: list[dict],
        tool_results: list[dict]
      ) -> str
      Appends functionResponse messages to history, calls Gemini again,
      returns the final text response.

Both clients should close their httpx.AsyncClient gracefully.
Export singleton instances at the bottom of each file using settings from config.py.
```

---

### Prompt 1.2 — Session state and session router

```
Write backend/state/session.py and backend/routers/sessions.py.

backend/state/session.py:
  Dataclass SessionState:
    session_id: str
    persona_id: str           ← "priya" | "arjun" | "meera"
    language: str             ← "en-IN" | "hi-IN" | "te-IN"
    conversation_history: list[dict]   ← Gemini message format
    created_at: datetime
    is_active: bool = True

  Module-level dict: SESSIONS: dict[str, SessionState] = {}
  Functions:
    create_session(persona_id, language) -> SessionState
    get_session(session_id) -> SessionState | None
    end_session(session_id) -> None   ← sets is_active=False, removes from dict

backend/routers/sessions.py:
  FastAPI APIRouter with prefix="/sessions"

  POST /sessions
    Body: {"persona_id": "priya", "language": "en-IN"}
    Validate persona_id is one of ["priya", "arjun", "meera"].
    Validate language is one of ["en-IN", "hi-IN", "te-IN"].
    Create session, return {"session_id": "...", "persona_id": "...", "language": "..."}
    Return 400 with clear error message if validation fails.

  DELETE /sessions/{session_id}
    Call end_session. Return {"ended": true}.
    Return 404 if session not found.
```

---

### Prompt 1.3 — Persona YAML files and loader

```
Write the three persona YAML files and a loader function.

backend/personas/priya.yaml — Loan Recovery Agent:
  id: priya
  display_name: Priya
  role: Loan Recovery Agent
  avatar: /personas/priya.png
  short_blurb: "Polite reminder calls for overdue EMIs."
  languages: [en-IN, hi-IN]
  default_language: en-IN
  llm:
    model: gemini-2.0-flash
    temperature: 0.4
    max_output_tokens: 200
  system_prompt_file: prompts/priya.md
  tools: [lookup_loan, record_commitment]
  default_context:
    customer_name: "Rahul Sharma"
    loan_id: "L-1042"
    loan_type: "personal"
    emi_amount: "12,500"
    days_overdue: "18"

backend/personas/arjun.yaml — Insurance Renewal Agent:
  id: arjun
  display_name: Arjun
  role: Insurance Renewal Agent
  avatar: /personas/arjun.png
  short_blurb: "Friendly reminders before your policy lapses."
  languages: [en-IN, hi-IN, te-IN]
  default_language: en-IN
  llm: (same as priya, temperature 0.3)
  system_prompt_file: prompts/arjun.md
  tools: [lookup_policy, send_renewal_link]
  default_context:
    customer_name: "Ananya Reddy"
    policy_id: "P-7781"
    policy_type: "health"
    expiry_date: "2026-06-15"
    days_to_expiry: "17"
    renewal_premium: "18,400"

backend/personas/meera.yaml — Appointment Booking Agent:
  id: meera
  display_name: Meera
  role: Appointment Booking Agent
  avatar: /personas/meera.png
  short_blurb: "Book, reschedule, or cancel appointments instantly."
  languages: [en-IN, hi-IN, te-IN]
  default_language: en-IN
  llm: (same as priya, temperature 0.5)
  system_prompt_file: prompts/meera.md
  tools: [get_available_slots, book_slot, lookup_booking, cancel_booking]
  default_context:
    business_name: "SolnixCare Clinic, Hyderabad"

Then write backend/routers/personas.py:
  GET /personas — reads all *.yaml files from the personas/ folder,
  returns them as a JSON array. Each item includes all YAML fields plus
  a "supported_languages" list derived from the languages field.
  Cache the result in-memory (read from disk once on first call).
```

---

### Prompt 1.4 — System prompts (markdown files)

```
Write three system prompt files. These are the actual persona instructions
passed to Gemini as the system_instruction field.

backend/prompts/priya.md:
You are Priya, a loan recovery officer at SolnixBank. You are calling
{customer_name} about their {loan_type} loan ({loan_id}). The EMI of
₹{emi_amount} is overdue by {days_overdue} days.

Your job (follow this order):
1. Confirm you are speaking with {customer_name}. If not, politely end the call.
2. State the overdue amount and mention the late fee and credit score impact —
   factually, never threateningly.
3. Ask if there is a financial hardship. Listen actively.
4. Offer exactly one of: pay now via UPI, commit to pay by a specific date,
   or speak with a hardship counsellor.
5. Confirm the commitment and end warmly.

Rules:
- NEVER threaten legal action. NEVER raise your tone.
- NEVER share account details with anyone other than the verified customer.
- Keep EVERY response under 3 sentences — this is a live voice call.
- If the caller is abusive, de-escalate once, then politely end.
- Respond in {language} at all times. You are fluent in Indian English,
  Hindi, and Hinglish code-switching. If the caller switches language, switch too.
- Use the lookup_loan tool if you need to verify the loan details.
- After any commitment, call record_commitment to log it.

backend/prompts/arjun.md:
You are Arjun from SolnixInsure. You are calling {customer_name} because
their {policy_type} insurance policy ({policy_id}) expires on {expiry_date}
— only {days_to_expiry} days from now. The renewal premium is ₹{renewal_premium}.

Your job:
1. Greet warmly and confirm identity.
2. Remind them the policy expires soon. Mention one specific benefit they will
   lose if they don't renew (no-claim bonus, family coverage).
3. Offer to: renew now via a secure link, schedule a callback, or connect to
   an advisor.
4. If they ask comparisons, be honest. Never oversell.

Rules:
- Never quote figures not returned by lookup_policy.
- If asked about a competitor, decline politely and redirect.
- Respond in {language}. You speak Indian English, Hindi, and Telugu.
- Keep every response under 3 sentences.

backend/prompts/meera.md:
You are Meera, the booking assistant for {business_name}. You help callers
book, reschedule, or cancel appointments.

Flow for new bookings:
1. Greet and ask how you can help.
2. Ask: which service (consultation, follow-up, vaccination), preferred
   date range, and morning/afternoon/evening preference.
3. Call get_available_slots and offer 2-3 options conversationally —
   NOT as a numbered list dump.
4. Confirm the chosen slot, ask for name and phone number.
5. Call book_slot and read back the booking code.

Flow for reschedule/cancel: ask for booking code or phone, call lookup_booking,
then proceed.

Rules:
- NEVER invent slots. Only offer what get_available_slots returns.
- Repeat phone numbers and dates back to confirm them.
- Respond in {language}. You speak Indian English, Hindi, and Telugu.
- Keep every response under 3 sentences.
```

---

### Prompt 1.5 — Mock data files

```
Write the three mock data JSON files for the backend.

backend/data/loans.json:
Array with one loan record:
{
  "loan_id": "L-1042",
  "customer_name": "Rahul Sharma",
  "loan_type": "personal",
  "emi_amount": 12500,
  "days_overdue": 18,
  "outstanding_balance": 187000,
  "phone": "+91-9900001042",
  "commitments": []
}

backend/data/policies.json:
Array with one policy:
{
  "policy_id": "P-7781",
  "customer_name": "Ananya Reddy",
  "policy_type": "health",
  "expiry_date": "2026-06-15",
  "renewal_premium": 18400,
  "previous_premium": 17200,
  "no_claim_bonus_pct": 25,
  "family_members_covered": 4,
  "renewal_link_sent": false
}

backend/data/slots.json:
This one is generated programmatically, not static. Instead of a JSON file,
write backend/data/generate_slots.py — a module with a function
generate_slots() that returns a dict:
{
  "business_name": "SolnixCare Clinic, Hyderabad",
  "services": ["consultation", "follow-up", "vaccination"],
  "doctors": ["Dr. Krishnan", "Dr. Patel"],
  "slots": [... 20 slots across the next 7 days, varied services and times ...]
}

Each slot:
{
  "slot_id": "S-2026-{MM}-{DD}-{HHMM}",
  "service": "consultation",
  "doctor": "Dr. Krishnan",
  "datetime": "2026-05-30T10:00:00+05:30",
  "time_of_day": "morning",
  "available": true
}

Call generate_slots() at module import time and store in a module-level
SLOTS_DATA variable. This way the dates are always fresh.
```

---

### Prompt 1.6 — Tool implementations

```
Write all four tool files. These are pure Python functions with no async —
they read from the in-memory data structures.

backend/tools/loan_tools.py:
  Load loans.json into a module-level list on import.

  lookup_loan(loan_id: str) -> dict:
    Find loan by loan_id. Return the full dict.
    If not found: return {"error": f"Loan {loan_id} not found"}.

  record_commitment(loan_id: str, amount: float, payment_date: str) -> dict:
    Append {"amount": amount, "date": payment_date, "recorded_at": now()} to
    loan["commitments"]. Return {"success": True, "message": "Commitment recorded"}.

backend/tools/policy_tools.py:
  Load policies.json into a module-level list on import.

  lookup_policy(policy_id: str) -> dict:
    Find by policy_id. Return full dict. Return error dict if not found.

  send_renewal_link(policy_id: str, channel: str = "sms") -> dict:
    Set renewal_link_sent = True. Return:
    {"sent": True, "channel": channel,
     "mock_link": f"https://renew.solnixinsure.com/{policy_id}"}

backend/tools/booking_tools.py:
  Import SLOTS_DATA from data/generate_slots.

  get_available_slots(service: str, date_from: str, date_to: str,
                      time_of_day: str = None) -> list[dict]:
    Filter slots by service (case-insensitive), available=True,
    datetime between date_from and date_to.
    If time_of_day is provided, filter by time_of_day field.
    Return up to 5 results.

  book_slot(slot_id: str, name: str, phone: str) -> dict:
    Find slot by slot_id. If not available: return error.
    Mark available=False. Add booking: {booked_by: name, phone: phone}.
    Generate booking code: f"BK{slot_id[-8:].replace('-','').upper()}"
    Return {"booking_code": code, "slot": slot, "confirmation": "Booking confirmed"}.

  lookup_booking(identifier: str) -> dict | None:
    Search all slots where available=False and (slot_id contains identifier
    or phone matches). Return the slot dict or None.

  cancel_booking(booking_code: str) -> dict:
    Find slot by booking_code match. Set available=True. Clear booking info.
    Return {"cancelled": True}. Return error if not found.

backend/tools/executor.py:
  TOOL_REGISTRY = {
    "lookup_loan": lookup_loan,
    "record_commitment": record_commitment,
    "lookup_policy": lookup_policy,
    "send_renewal_link": send_renewal_link,
    "get_available_slots": get_available_slots,
    "book_slot": book_slot,
    "lookup_booking": lookup_booking,
    "cancel_booking": cancel_booking,
  }

  def execute_tool(tool_name: str, args: dict) -> dict:
    fn = TOOL_REGISTRY.get(tool_name)
    if not fn: return {"error": f"Unknown tool: {tool_name}"}
    try: return fn(**args)
    except Exception as e: return {"error": str(e)}
```

---

### Prompt 1.7 — WebSocket pipeline (the core)

```
Write backend/routers/ws.py — this is the most important file in the backend.
Read GEMINI.md carefully before writing. Read .agent/skills/sarvam-api.md and
.agent/skills/gemini-tools.md for exact API call shapes.

WS /ws/{session_id}
  Accept WebSocket connection.
  Load session from SESSIONS dict. If not found, close with code 4004.

  Step 1 — Receive session_config message:
    {"type": "session_config", "persona": "priya", "language": "en-IN"}
    Load persona YAML from personas/{persona_id}.yaml.
    Load system prompt from prompts/{persona_id}.md.
    Interpolate the system prompt with default_context values using str.format_map().
    Inject language into the prompt context.
    Update session.language and session.persona_id.

  Step 2 — Generate and send the opening line:
    Call GeminiClient.generate(system_prompt, history=[], tools=[], new_user_message=
      "Start the call. Introduce yourself briefly. Stay under 2 sentences.")
    Send: {"type": "agent_state", "state": "speaking"}
    Synthesize the response text via SarvamTTSClient.
    Send: {"type": "transcript", "speaker": "agent", "text": response_text}
    Send: {"type": "audio_chunk", "data": base64_wav, "seq": 0}
    Send: {"type": "session_ready", "session_id": session_id}
    Send: {"type": "agent_state", "state": "listening"}

  Step 3 — Main loop:
    while True:
      data = await websocket.receive()
      if data is bytes → run pipeline(audio_bytes, session, websocket)
      if data is text → parse JSON:
        "language_switch": update session.language, update speaker,
          inject "[Language switched to X]" system note into history,
          send {"type": "language_switched", "language": new_lang}
        "session_end": break the loop
      On WebSocketDisconnect: break

  pipeline(audio_bytes, session, ws):
    1. STT: transcript = await sarvam_stt.transcribe(audio_bytes, session.language)
       If transcript is empty, send {"type": "agent_state", "state": "listening"} and return.
    2. Send {"type": "transcript", "speaker": "user", "text": transcript}
    3. Send {"type": "agent_state", "state": "thinking"}
    4. Append user message to session.conversation_history
    5. Load tool definitions for this persona (build from tools list in YAML)
    6. response_text, tool_calls = await gemini.generate(
         system_prompt, session.conversation_history, tool_definitions, transcript)
    7. If tool_calls:
       For each tool_call: result = execute_tool(tool_call.name, tool_call.args)
       response_text = await gemini.send_tool_results(
         system_prompt, session.conversation_history, tool_results)
    8. Append model response to session.conversation_history
    9. Send {"type": "transcript", "speaker": "agent", "text": response_text}
    10. Send {"type": "agent_state", "state": "speaking"}
    11. wav_base64 = await sarvam_tts.synthesize(response_text, session.language, speaker)
    12. Send {"type": "audio_chunk", "data": wav_base64, "seq": next_seq}
    13. Send {"type": "agent_state", "state": "listening"}

Wrap the entire pipeline in try/except. On any exception:
  Send {"type": "error", "code": "pipeline_failed", "message": str(e)}
  Send {"type": "agent_state", "state": "idle"}
  Do NOT close the WebSocket — let the user try again.
```

---

### Prompt 1.8 — main.py and verify backend boots

```
Write backend/main.py. Include everything needed to run the server.

- FastAPI app with lifespan context manager:
  On startup: load all persona YAMLs (call personas router cache-warmer),
  log "Solnix Voice Agents backend ready" with structlog.
  On shutdown: close httpx clients on sarvam_stt, sarvam_tts, gemini.

- CORS middleware: allow origins from settings.CORS_ORIGIN (and localhost:3000
  always in dev). Allow all methods and headers. allow_credentials=True.

- Mount routers:
  sessions_router at /sessions
  personas_router at /personas
  ws_router at /ws

- GET /health → {"status": "ok", "timestamp": now()}

- Uvicorn entrypoint at the bottom:
  if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

After writing the file, run:
  cd backend && python main.py

Confirm the server starts without errors. If there are import errors,
fix them before proceeding. Show me the startup log output.
```

---

### Prompt 1.9 — Frontend WebSocket and audio layer

```
Write the frontend library files. These are pure TypeScript utilities —
no React, no JSX. Place them in frontend/lib/.

frontend/lib/wsClient.ts:
  Class VoiceWSClient:
    constructor(baseUrl: string)

    connect(sessionId: string): void
      Open WebSocket to {baseUrl}/ws/{sessionId}
      Set onmessage handler that parses JSON and calls the appropriate callback

    sendJSON(msg: object): void
    sendAudio(blob: Blob): void — sends blob as binary frame

    Callback properties (set these from outside):
      onSessionReady?: (data: any) => void
      onTranscript?: (speaker: string, text: string) => void
      onAgentState?: (state: string) => void
      onAudioChunk?: (base64: string, seq: number) => void
      onLanguageSwitched?: (language: string) => void
      onError?: (code: string, message: string) => void
      onDisconnect?: () => void

    disconnect(): void — send session_end, close WS

frontend/lib/audioCapture.ts:
  Class AudioCapture:
    private stream: MediaStream | null
    private recorder: MediaRecorder | null

    async requestPermission(): Promise<boolean>
      Call getUserMedia({audio: true}). Return true on success, false on denial.

    startRecording(): void
      Create MediaRecorder from stream. On dataavailable: store chunks.

    stopRecording(): Promise<Blob>
      Stop recorder. Return Blob of type audio/webm.

    getStream(): MediaStream | null
      For connecting to MicAnalyser.

frontend/lib/audioPlayer.ts:
  Class AudioPlayer:
    private ctx: AudioContext
    private outputAnalyser: AnalyserNode

    constructor()
      Create AudioContext and AnalyserNode. Connect analyser to destination.

    async play(base64wav: string): Promise<void>
      Decode base64 → ArrayBuffer → AudioContext.decodeAudioData
      Create AudioBufferSourceNode. Connect source → analyser → destination.
      Start immediately.

    getOutputAnalyser(): AnalyserNode
      Returns the analyser so VoiceOrb can read amplitude.

frontend/lib/micAnalyser.ts:
  Class MicAnalyser:
    private analyser: AnalyserNode | null

    attachStream(stream: MediaStream, ctx: AudioContext): void
      Create MediaStreamSource from stream. Create AnalyserNode.
      Connect source → analyser. Store analyser.

    getAnalyser(): AnalyserNode | null
    detach(): void — disconnect and null out

frontend/lib/store.ts:
  Zustand store. Import all types from types/index.ts (create that file too).

  Types needed:
    PersonaConfig: {id, display_name, role, avatar, short_blurb, languages, default_language}
    TranscriptLine: {id: string, speaker: 'user'|'agent', text: string, timestamp: Date}
    CallState: 'idle' | 'connecting' | 'active' | 'ended'
    AgentState: 'listening' | 'thinking' | 'speaking' | 'idle'
    LanguageCode: 'en-IN' | 'hi-IN' | 'te-IN'

  Store shape:
    personas: PersonaConfig[]
    selectedPersona: PersonaConfig | null
    callState: CallState
    agentState: AgentState
    sessionId: string | null
    currentLanguage: LanguageCode
    transcript: TranscriptLine[]
    isMuted: boolean

    setPersonas(p: PersonaConfig[]): void
    setPersona(p: PersonaConfig): void
    startCall(sessionId: string): void
    endCall(): void
    setAgentState(s: AgentState): void
    setLanguage(l: LanguageCode): void
    appendTranscript(line: Omit<TranscriptLine, 'id'>): void
    clearTranscript(): void
    setMuted(m: boolean): void
```

---

### Prompt 1.10 — Minimal working frontend (Phase 1 proof of concept)

```
Write frontend/app/page.tsx as a minimal but functional call test page.
No design polish — just wiring. We will replace this entirely in Phase 3.

The page should:
1. On mount: fetch /personas from the backend and store in Zustand.
2. Show a list of persona buttons (one per persona from the API).
3. When a persona button is clicked:
   a. POST to /sessions with {persona_id, language: persona.default_language}
   b. Create AudioCapture and request mic permission.
   c. If permission denied: show "Mic permission denied" text.
   d. Create VoiceWSClient, connect, send session_config.
   e. Wire all WS callbacks to Zustand store actions.
   f. Wire onAudioChunk to AudioPlayer.play().
4. Show current callState, agentState from the store.
5. Show a "Hold to speak" button:
   - onMouseDown: AudioCapture.startRecording()
   - onMouseUp: AudioCapture.stopRecording() then wsClient.sendAudio(blob)
6. Show the transcript as a simple list.
7. Show an "End Call" button that calls wsClient.disconnect() and endCall().

Use the NEXT_PUBLIC_API_URL env var for all API calls.
The page should be a client component ('use client' at top).
```

---

## ═══ PHASE 2 — Three Personas + Languages + Tools ═══

### Prompt 2.1 — Wire persona picker to language selector

```
The backend already supports all three personas. Now make the frontend
correctly handle multi-language personas.

In frontend/app/page.tsx (temporary UI), add:
1. After selecting a persona, show language pills for the persona's
   supported languages (from persona.languages array).
   Labels: {en-IN: "EN", "hi-IN": "हि", "te-IN": "తె"}
2. Store the selected language in local state (not Zustand — it's temporary UI).
3. Pass the selected language in the POST /sessions body.
4. Add a language switcher that, during an active call, sends:
   {"type": "language_switch", "language": "hi-IN"} over the WebSocket.
   On {"type": "language_switched"}: update Zustand store language.
5. Test that switching Telugu → Hindi mid-call continues the conversation
   in Hindi. Verify in the transcript that the bot's next response is in Hindi.

Do not touch any backend files in this prompt.
```

---

### Prompt 2.2 — Verify all tool calls end-to-end

```
Run a manual test of all three personas and confirm tool calls work.
Do this by writing a backend/scripts/test_pipeline.py script that:

1. Creates a session via POST /sessions for each persona
2. Connects a WebSocket client (use the websockets library)
3. Sends a session_config message
4. Waits for session_ready
5. Sends a text message that will trigger a tool call:
   - Priya: "What is my current outstanding balance?"
   - Arjun: "When exactly does my policy expire and what's the renewal cost?"
   - Meera: "I need a consultation appointment this week, morning preferred."
6. Waits for the full pipeline response (transcript + audio_chunk)
7. Prints whether a tool was called (check transcript for tool-related content)
8. Prints the agent's text response

Note: for this test script, instead of sending real audio bytes,
send a pre-recorded audio file as binary, OR if that's complex,
modify the test to call the pipeline directly as a function (bypassing WS).
Use whichever approach is simpler.

Fix any bugs found. All three personas must complete a tool call successfully.
```

---

## ═══ PHASE 3 — Arrowhead-Grade UI ═══

### Prompt 3.1 — Tailwind design system and globals

```
Set up the complete design system. Read design.md in full before writing.
Do not write any component files yet — only the foundation.

1. frontend/tailwind.config.ts:
   Extend the theme (do not replace defaults) with:
   - colors: all tokens from design.md §2.1 using CSS var() references
   - fontFamily: add "geist" (Geist Sans), "mono" (Geist Mono),
     "noto" (Noto Sans Devanagari + Noto Sans Telugu + sans-serif)
   - borderRadius: add "card" (16px), "pill" (9999px), "orb" (24px)
   - All spacing tokens are Tailwind defaults (4pt grid) — no changes needed

2. frontend/app/globals.css:
   Define ALL CSS custom properties from design.md §2.1.
   Include both the color tokens AND the orb gradient color pairs.
   Do not add any component styles here — only custom properties and
   the Tailwind @layer base body/html rules (background, color, font).

3. frontend/app/layout.tsx:
   Load fonts using next/font:
   - GeistSans from 'geist/font/sans'
   - GeistMono from 'geist/font/mono'
   - Noto_Sans_Devanagari: subsets=['devanagari'], weight=['400','500'],
     variable='--font-noto-devanagari'
   - Noto_Sans_Telugu: subsets=['telugu'], weight=['400','500'],
     variable='--font-noto-telugu'
   Apply all four font variables to the <html> element.
   Set metadata: title="Solnix AI Voice Agents", description from design.md copy.

After writing, run `npm run dev` in frontend/ and confirm the page loads
with the dark background (#0A0A0B). Screenshot or describe what you see.
```

---

### Prompt 3.2 — VoiceOrb component

```
Write frontend/components/VoiceOrb.tsx. This is the most important component.
Read design.md §4 VoiceOrb spec carefully before writing.

Props:
  analyser: AnalyserNode | null
  speaker: 'idle' | 'user' | 'agent'
  size: number  (diameter in px)

Requirements:
1. Canvas element sized to {size}×{size} pixels.
2. requestAnimationFrame loop. On each frame:
   a. If analyser exists: call getByteFrequencyData(). Compute average amplitude
      as a 0–1 float.
   b. If no analyser or amplitude < 0.05: idle mode — use Math.sin(Date.now()
      * 0.001) for oscillation. Amplitude = 0.1 + Math.abs(sin) * 0.1.
   c. Compute radius: base = size * 0.28, r = base + amplitude * (size * 0.18)
   d. Create radial gradient from ctx at canvas center:
      idle:  inner=#7C5CFF, outer=#A78BFA33 (transparent)
      user:  inner=#06B6D4, outer=#3B82F633
      agent: inner=#A78BFA, outer=#F472B633
   e. Draw filled circle with the gradient.
   f. Set ctx.shadowBlur = 20 + amplitude * 60
      ctx.shadowColor = accent color for current speaker state
   g. Draw the circle again for the glow layer.
3. Start the rAF loop on mount. Cancel on unmount (useEffect cleanup).
4. prefers-reduced-motion: use a useReducedMotion hook. If true, skip rAF.
   Instead render a static gradient div with a CSS animation:
   @keyframes orb-breathe { from {opacity:0.6} to {opacity:1.0} }
   animation: orb-breathe 3s ease-in-out infinite alternate
5. Export as default. No external dependencies except React.

After writing, add a test page at frontend/app/test-orb/page.tsx that
renders the orb in all three speaker states side by side so I can verify it.
```

---

### Prompt 3.3 — PersonaCard and LanguagePill components

```
Write frontend/components/PersonaCard.tsx and frontend/components/LanguagePill.tsx.
Read design.md §4 for exact specs. Use Framer Motion for animations.

PersonaCard.tsx:
Props:
  persona: PersonaConfig
  isSelected: boolean
  isDisabled: boolean   ← true when another call is active
  selectedLanguage: LanguageCode
  onLanguageChange: (lang: LanguageCode) => void
  onTalk: () => void

Layout (vertical flex card):
  - Avatar: 80×80 rounded-full image. Use Next.js <Image>. Fallback: SVG
    placeholder with persona initial on accent background.
  - Display name: text-lg font-semibold text-text-primary
  - Role: text-xs uppercase tracking-widest text-text-secondary
  - Short blurb: text-sm text-text-secondary, 2-line clamp
  - LanguagePill row: render one pill per language in persona.languages
  - Talk button: full width, accent background, "Talk →" text.
    Disabled state: opacity-50, cursor-not-allowed.
    On click: call onTalk().

Card container:
  - bg-bg-card, border border-border-subtle, rounded-2xl, p-6
  - Framer Motion whileHover: implement 3D tilt using onMouseMove.
    Calculate tilt from cursor position relative to card center.
    rotateX and rotateY: max ±8 degrees. Use motion.div with style prop.
  - isSelected: add ring-2 ring-accent bg-accent-dim
  - isDisabled: pointer-events-none opacity-40

LanguagePill.tsx:
Props:
  code: LanguageCode
  isActive: boolean
  isDisabled: boolean
  onClick: () => void

Render a <button> with:
  - Label: {en-IN: 'EN', 'hi-IN': 'हि', 'te-IN': 'తె'}[code]
  - Default: bg-bg-elevated text-text-secondary border border-border-subtle
  - Active: bg-accent text-white border-transparent
  - Disabled: opacity-30 cursor-not-allowed
  - Framer Motion animate for background/color transitions (duration 0.15s)
  - aria-label: {en-IN: 'English', 'hi-IN': 'Hindi', 'te-IN': 'Telugu'}
```

---

### Prompt 3.4 — TranscriptLine, CallControls, LiveIndicator

```
Write three small components. Use design.md §4 specs exactly.

frontend/components/TranscriptLine.tsx:
Props: line: TranscriptLine (id, speaker, text, timestamp)

Layout: flex gap-3, items-start, py-2
Left column (w-10 shrink-0):
  Speaker label — text-[11px] uppercase tracking-wide
  'You' → text-text-tertiary
  Persona name → text-accent-light (get persona name from store)
Right column (flex-1):
  Text: text-sm leading-relaxed
  If text matches /[\u0900-\u097F\u0C00-\u0C7F]/ apply font-noto class
  Otherwise: font-mono text-[13px]
  Timestamp: absolute right-2, opacity-0, group-hover:opacity-100,
  text-[11px] text-text-tertiary (show on hover of the whole row)

Entrance animation: Framer Motion initial={{y:8, opacity:0}} animate={{y:0, opacity:1}}
transition: duration 0.25s, ease-out

frontend/components/CallControls.tsx:
Props:
  isMuted: boolean
  onToggleMute: () => void
  onStartSpeaking: () => void   ← mousedown/touchstart
  onStopSpeaking: () => void    ← mouseup/touchend
  onEndCall: () => void
  agentState: AgentState

Layout: fixed bottom-0, full width, flex justify-center gap-4, py-4 pb-8
Background: gradient from transparent to bg-elevated (fade transcript under controls)

Mic button (push-to-talk, hold to record):
  onMouseDown + onTouchStart: onStartSpeaking()
  onMouseUp + onTouchEnd: onStopSpeaking()
  Resting: bg-bg-card border border-border-subtle, icon Mic, label "Hold to speak"
  Active (during recording): bg-accent text-white, scale-105, label "Release to send"
  Muted: bg-warn/20 border-warn text-warn, label "Muted"
  Size: h-14 px-6 rounded-xl

End Call button:
  onClick: onEndCall
  Resting: bg-danger/20 border border-danger text-danger
  Hover: bg-danger text-white
  Size: h-14 px-6 rounded-xl, icon Square, label "End Call"

frontend/components/LiveIndicator.tsx:
A simple inline component: pulsing green dot + "Live" text.
Dot: w-2 h-2 rounded-full bg-success
Pulse: CSS keyframe animation (scale 1→1.5→1, opacity 1→0→1, 1.5s infinite)
Do not use JS for the pulse — pure CSS animation for performance.
```

---

### Prompt 3.5 — CallOverlay component (the full call UI)

```
Write frontend/components/CallOverlay.tsx — the full-screen call view.
This is the UI that appears when a call is active. Read design.md §3.2.

Props:
  persona: PersonaConfig
  onClose: () => void   ← triggers end call

It reads all other state from the Zustand store.
It manages: AudioCapture, AudioPlayer, MicAnalyser, VoiceWSClient internally.
These are instantiated with useRef and initialized in useEffect.

Structure (fixed inset-0 z-50, bg-bg-base, flex flex-col):
  Framer Motion: initial={y: '100%'} animate={y: 0} exit={y: '100%'}
  transition: cubic-bezier(0.16, 1, 0.3, 1), 0.4s

  HEADER (h-16 flex items-center justify-between px-6 border-b border-border-subtle):
    Left: ← back button (calls onClose), persona name · role
    Center: LiveIndicator (show only when callState==='active')
    Right: LanguagePill switcher (one pill per persona.languages),
           × close button

  CENTER (flex-1 flex flex-col items-center justify-center gap-6):
    VoiceOrb: size=300
      analyser: when agentState==='speaking' → audioPlayer.getOutputAnalyser()
                when agentState==='listening' → micAnalyser.getAnalyser()
                otherwise → null
      speaker: map agentState to speaker prop:
        listening → 'user', speaking → 'agent', idle/thinking → 'idle'

    Latest transcript line (large, centered):
      Show the last agent TranscriptLine.
      text-xl font-medium text-text-primary text-center max-w-md
      Apply font-noto if Indic text detected.
      Animate: key={line.id} with fade-in (Framer Motion).

  TRANSCRIPT PANEL (max-h-48 overflow-y-auto px-6 border-t border-border-subtle):
    ScrollArea (or plain div). Auto-scrolls to bottom when transcript updates.
    Renders all TranscriptLine components.
    aria-live="polite" for screen reader accessibility.

  CONTROLS:
    CallControls component wired to AudioCapture and wsClient.

Session lifecycle in this component (useEffect on mount):
  1. POST /sessions → get sessionId
  2. AudioCapture.requestPermission() → if false: show MicPermissionPrompt
  3. VoiceWSClient.connect(sessionId), send session_config
  4. Wire all WS callbacks to store actions
  5. Wire onAudioChunk to audioPlayer.play()
  6. Wire onAgentState to store.setAgentState

On unmount: wsClient.disconnect(), audioCapture.stop(), micAnalyser.detach()
```

---

### Prompt 3.6 — Landing page (full production UI)

```
Write frontend/app/page.tsx — the full marketing landing page.
Replace the temporary Phase 1 page entirely. Read design.md §3.1 carefully.

The page is a server component except for the CallOverlay (client component).
Use Framer Motion with LazyMotion for performance.

Sections in order:

1. NAV (sticky, top-0, z-40):
   Height 64px. Logo (text "Solnix" in accent color) left.
   Links right: "Personas", "How it works", "Tech" (smooth scroll anchors), "GitHub".
   On scroll > 20px: add backdrop-blur-md bg-bg-base/80.

2. HERO (min-h-screen flex):
   Desktop: two columns (orb left 50%, text right 50%).
   Mobile: single column (orb top, text below).
   Left: VoiceOrb at size=400 in idle state (no call active).
   Right:
     Eyebrow: small text "AI Voice Agents · POC by SolnixMedia"
     H1: "Talk to an AI voice agent. In your language." (64px/700)
     Sub: "Three personas. Hindi. Telugu. English. Powered by Sarvam AI + Gemini."
     CTA button: "Start a call ↓" → smooth scroll to #personas
     Tech pill strip: small pills showing "Sarvam AI", "Gemini 2.0", "FastAPI"

3. PERSONA PICKER (id="personas"):
   Section heading: "Pick someone to talk to"
   Fetch personas from /personas on mount (use a client component wrapper).
   Three PersonaCard components in a responsive grid:
     desktop: grid-cols-3, tablet: grid-cols-2, mobile: grid-cols-1
   Each card has its own selectedLanguage state (default: persona.default_language).
   Clicking "Talk →" opens CallOverlay via useState(selectedPersona).

4. HOW IT WORKS (id="how-it-works"):
   Three steps, horizontally on desktop, stacked on mobile.
   Each step: number badge (accent outlined), icon (SVG), title, 2-line description.
   Step 1: "Pick your agent" — Cursor click icon
   Step 2: "Speak naturally" — Mic icon
   Step 3: "AI responds" — Waveform/sparkle icon
   Each step uses Framer Motion useInView with stagger (0, 150ms, 300ms delay).

5. BUILT WITH (id="tech"):
   Centered heading. Logo grid: Sarvam · Gemini · FastAPI · Next.js.
   Use text + styled divs as placeholders — do not use external image URLs.
   Each "logo" is a pill with the tech name styled distinctively.

6. FOOTER:
   "SolnixMedia · 2026 · Proof of Concept"
   Subtle disclaimer: "Response times may vary."

CallOverlay is rendered at the page root level using AnimatePresence.
When selectedPersona is non-null, render <CallOverlay persona={selectedPersona}
  onClose={() => setSelectedPersona(null)} />.
```

---

### Prompt 3.7 — MicPermissionPrompt + edge state UI

```
Write frontend/components/MicPermissionPrompt.tsx and add all edge state
handling to CallOverlay.tsx.

MicPermissionPrompt.tsx:
  Receives: onRetry: () => void, onDismiss: () => void
  Full-screen overlay (z-60, above CallOverlay) or centered modal.
  Title: "Microphone access needed"
  Body: "To talk to the agent, we need your microphone. No audio is stored."
  Browser-specific instructions:
    Detect browser from navigator.userAgent.
    Chrome: 'Click the lock icon (🔒) in the address bar → Microphone → Allow'
    Firefox: 'Click the shield → Allow microphone'
    Safari: 'Safari menu → Settings for This Website → Microphone → Allow'
    Other: 'Allow microphone access in your browser settings'
  Primary button: "Try again" → calls onRetry()
  Secondary: "Cancel" → calls onDismiss()

Edge states to add to CallOverlay.tsx:

1. Connecting state (callState === 'connecting'):
   Show a centered "Connecting…" text below the orb. Orb in idle mode.
   5s timeout: if still connecting after 5s, show error state.

2. Agent thinking (agentState === 'thinking'):
   Orb dims slightly (pass a lower amplitude value). No other change.
   After 3s in thinking state: show a small "…" text below the orb.

3. WebSocket disconnect mid-call:
   Wire wsClient.onDisconnect to show a "Reconnecting…" banner overlaid
   on the orb. Attempt reconnect with 1s, 2s, 4s backoff (3 attempts max).
   After 3 failed attempts: show "Connection lost" with "Try again" button.

4. Empty transcript (bot didn't respond):
   If STT returns empty string, do not add a transcript line. Do not change
   agent state. Just stay in 'listening'. This is not an error.

5. Session creation failure (POST /sessions returns non-200):
   Show a toast at the top: "Couldn't start the call. Please try again."
   Call onClose() after 3 seconds.
```

---

## ═══ PHASE 4 — Deploy ═══

### Prompt 4.1 — Dockerize the backend

```
Write backend/Dockerfile and backend/.dockerignore.
The container must run on Fly.io's Linux environment.

Dockerfile:
  FROM python:3.11-slim
  WORKDIR /app
  RUN pip install uv
  COPY pyproject.toml .
  RUN uv sync --no-dev
  COPY . .
  EXPOSE 8080
  CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0",
       "--port", "8080", "--workers", "2"]

.dockerignore:
  .env, __pycache__, .venv, *.pyc, scripts/, .git

Then write backend/fly.toml:
  app = "solnix-voice-agents-api"
  primary_region = "bom"          ← Mumbai

  [[services]]
  internal_port = 8080
  protocol = "tcp"
  auto_stop_machines = false      ← CRITICAL: WebSocket sessions must not be killed

  [[services.ports]]
  port = 443
  handlers = ["tls", "http"]

  [[services.ports]]
  port = 80
  handlers = ["http"]

  [[services.http_checks]]
  path = "/health"
  interval = "30s"
  timeout = "5s"

  [build]
  dockerfile = "Dockerfile"

Print the exact PowerShell commands to deploy:
  fly auth login
  fly launch --no-deploy --name solnix-voice-agents-api --region bom
  fly secrets set SARVAM_API_KEY=... GEMINI_API_KEY=... CORS_ORIGIN=https://...vercel.app
  fly deploy
```

---

### Prompt 4.2 — Vercel config and final wiring

```
Prepare the frontend for Vercel deployment.

1. Create frontend/.env.production.local (gitignored):
   NEXT_PUBLIC_API_URL=https://solnix-voice-agents-api.fly.dev

2. Update frontend/next.config.ts:
   Add allowedDevOrigins if needed for dev.
   No special configuration needed for Vercel beyond standard Next.js 14 defaults.
   Export the config object properly (not using the old module.exports pattern).

3. Create .github/workflows/deploy.yml:
   On push to main:
     - Job 1: frontend-deploy
       uses: actions/checkout
       Install node, npm ci, npm run build (in frontend/)
       Deploy to Vercel using VERCEL_TOKEN secret
     - Job 2: backend-check
       uses: actions/checkout
       Set up Python 3.11
       pip install uv, uv sync --no-dev
       python -c "import main" (import check only, no server start)
   Keep it simple — no pytest, no lint, just build verification.

4. Update the CORS setting in backend/main.py to accept both:
   - The Vercel production URL
   - The Vercel preview URL pattern (*.vercel.app)
   - localhost:3000
   Read all three from settings (CORS_ORIGIN can be comma-separated).

5. Write docs/DEMO_SCRIPT.md — a 2-minute walkthrough script:
   Section 1: Open the page → point out the hero orb and headline.
   Section 2: Pick Priya → English → ask "What EMI is overdue for me?"
              Switch to Hindi → ask "आप मुझे क्या ऑफर दे सकती हैं?"
   Section 3: End call → pick Arjun → Telugu → ask about policy renewal.
   Section 4: End call → pick Meera → book a morning consultation this week.
   Include expected bot responses so you can rehearse.
```