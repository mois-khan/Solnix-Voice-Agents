import json
import os
import yaml
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from state.session import get_session
from services.gemini import gemini_client
from services.sarvam import stt_client, tts_client, VOICE_MAP
from tools.executor import execute_tool

router = APIRouter()

TOOL_SCHEMAS = {
    "lookup_loan": {
        "name": "lookup_loan",
        "description": "Look up a loan by ID and return overdue amount, EMI, and customer info.",
        "parameters": {
            "type": "object",
            "properties": {
                "loan_id": {"type": "string", "description": "The loan ID, e.g. L-1042"}
            },
            "required": ["loan_id"]
        }
    },
    "record_commitment": {
        "name": "record_commitment",
        "description": "Record a customer's commitment to pay an overdue amount by a specific date.",
        "parameters": {
            "type": "object",
            "properties": {
                "loan_id": {"type": "string"},
                "amount": {"type": "number"},
                "payment_date": {"type": "string", "description": "YYYY-MM-DD"}
            },
            "required": ["loan_id", "amount", "payment_date"]
        }
    },
    "lookup_policy": {
        "name": "lookup_policy",
        "description": "Look up an insurance policy by ID to get renewal details.",
        "parameters": {
            "type": "object",
            "properties": {
                "policy_id": {"type": "string", "description": "The policy ID, e.g. P-7781"}
            },
            "required": ["policy_id"]
        }
    },
    "send_renewal_link": {
        "name": "send_renewal_link",
        "description": "Send a policy renewal payment link to the customer.",
        "parameters": {
            "type": "object",
            "properties": {
                "policy_id": {"type": "string"},
                "channel": {"type": "string", "description": "e.g. sms, email"}
            },
            "required": ["policy_id"]
        }
    },
    "get_available_slots": {
        "name": "get_available_slots",
        "description": "Get available clinic appointment slots within a date range.",
        "parameters": {
            "type": "object",
            "properties": {
                "service": {"type": "string", "description": "e.g. consultation, follow-up, vaccination"},
                "date_from": {"type": "string", "description": "YYYY-MM-DD"},
                "date_to": {"type": "string", "description": "YYYY-MM-DD"},
                "time_of_day": {"type": "string", "description": "morning, afternoon, evening"}
            },
            "required": ["service", "date_from", "date_to"]
        }
    },
    "book_slot": {
        "name": "book_slot",
        "description": "Book a specific appointment slot.",
        "parameters": {
            "type": "object",
            "properties": {
                "slot_id": {"type": "string", "description": "e.g. S-2026-05-30-0900"},
                "name": {"type": "string", "description": "Customer name"},
                "phone": {"type": "string", "description": "Customer phone number"}
            },
            "required": ["slot_id", "name", "phone"]
        }
    },
    "lookup_booking": {
        "name": "lookup_booking",
        "description": "Look up an existing appointment booking by phone number or booking code.",
        "parameters": {
            "type": "object",
            "properties": {
                "identifier": {"type": "string", "description": "Phone number or booking code"}
            },
            "required": ["identifier"]
        }
    },
    "cancel_booking": {
        "name": "cancel_booking",
        "description": "Cancel an existing appointment booking using its booking code.",
        "parameters": {
            "type": "object",
            "properties": {
                "booking_code": {"type": "string", "description": "The booking code"}
            },
            "required": ["booking_code"]
        }
    }
}

class SafeDict(dict):
    def __missing__(self, key):
        return '{' + key + '}'

def load_persona_yaml(persona_id: str) -> dict:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    yaml_path = os.path.join(base_dir, "personas", f"{persona_id}.yaml")
    with open(yaml_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def load_system_prompt(persona_id: str, default_context: dict, language: str) -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_dir, "prompts", f"{persona_id}.md")
    with open(prompt_path, "r", encoding="utf-8") as f:
        prompt = f.read()
    
    safe_context = SafeDict(**default_context)
    prompt = prompt.format_map(safe_context)
    prompt += f"\n\n[System Note: The user's language is {language}. Respond in this language.]"
    return prompt

def build_tool_definitions(tool_names: list[str]) -> list[dict]:
    declarations = []
    for t in tool_names:
        if t in TOOL_SCHEMAS:
            declarations.append(TOOL_SCHEMAS[t])
    if not declarations:
        return []
    return [{"function_declarations": declarations}]

async def pipeline(audio_bytes: bytes, session, ws: WebSocket):
    try:
        # 1. STT
        transcript = await stt_client.transcribe(audio_bytes, session.language)
        if not transcript:
            await ws.send_json({"type": "agent_state", "state": "listening"})
            return
            
        await run_pipeline(transcript, session, ws)
    except Exception as e:
        await ws.send_json({"type": "error", "code": "pipeline_failed", "message": str(e)})
        await ws.send_json({"type": "agent_state", "state": "idle"})

async def run_pipeline(transcript: str, session, ws: WebSocket):
    try:
            
        # 2. Send transcript (user)
        await ws.send_json({"type": "transcript", "speaker": "user", "text": transcript})
        
        # 3. Send agent_state thinking
        await ws.send_json({"type": "agent_state", "state": "thinking"})
        
        # 4. Append user message to history is natively handled by gemini.generate!
        # 5. Load tool definitions
        persona_yaml = load_persona_yaml(session.persona_id)
        tool_names = persona_yaml.get("tools", [])
        tool_definitions = build_tool_definitions(tool_names)
        system_prompt = load_system_prompt(session.persona_id, persona_yaml.get("default_context", {}), session.language)
        
        # 6. Call Gemini API
        response_text, tool_calls = await gemini_client.generate(
            system_prompt, session.conversation_history, tool_definitions, transcript
        )
        
        # 7. Execute tools if present
        if tool_calls:
            tool_results = []
            for tc in tool_calls:
                name = tc["name"]
                args = tc.get("args", {})
                result = execute_tool(name, args)
                tool_results.append({"name": name, "response": {"result": result}})
                
            response_text = await gemini_client.send_tool_results(
                system_prompt, session.conversation_history, tool_results
            )
            
        # 8. Append model response to history is natively handled by gemini client!
        
        # 9. Send transcript (agent)
        await ws.send_json({"type": "transcript", "speaker": "agent", "text": response_text})
        
        # 10. Send agent_state speaking
        await ws.send_json({"type": "agent_state", "state": "speaking"})
        
        # 11. Synthesize TTS
        speaker = VOICE_MAP.get((session.persona_id, session.language), "manisha")
        wav_base64 = await tts_client.synthesize(response_text, session.language, speaker)
        
        # 12. Send audio chunk
        session._seq = getattr(session, "_seq", 0) + 1
        await ws.send_json({"type": "audio_chunk", "data": wav_base64, "seq": session._seq})
        
        # 13. Send agent_state listening
        await ws.send_json({"type": "agent_state", "state": "listening"})
        
    except Exception as e:
        await ws.send_json({"type": "error", "code": "pipeline_failed", "message": str(e)})
        await ws.send_json({"type": "agent_state", "state": "idle"})


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    session = get_session(session_id)
    if not session:
        await websocket.close(code=4004)
        return
        
    try:
        # Step 1: Receive session_config
        config_msg = await websocket.receive_json()
        if config_msg.get("type") != "session_config":
            await websocket.close(code=4000)
            return
            
        persona_id = config_msg.get("persona")
        language = config_msg.get("language")
        
        session.persona_id = persona_id
        session.language = language
        
        persona_yaml = load_persona_yaml(persona_id)
        system_prompt = load_system_prompt(persona_id, persona_yaml.get("default_context", {}), language)
        
        # Step 2: Generate opening line
        session.conversation_history = []
        response_text, _ = await gemini_client.generate(
            system_prompt,
            session.conversation_history,
            [],
            "Start the call. Introduce yourself briefly. Stay under 2 sentences."
        )
        
        await websocket.send_json({"type": "agent_state", "state": "speaking"})
        
        speaker = VOICE_MAP.get((persona_id, language), "manisha")
        wav_base64 = await tts_client.synthesize(response_text, language, speaker)
        
        await websocket.send_json({"type": "transcript", "speaker": "agent", "text": response_text})
        
        session._seq = getattr(session, "_seq", 0) + 1
        await websocket.send_json({"type": "audio_chunk", "data": wav_base64, "seq": session._seq})
        await websocket.send_json({"type": "session_ready", "session_id": session_id})
        await websocket.send_json({"type": "agent_state", "state": "listening"})
        
        # Step 3: Main loop
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
                
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                await pipeline(audio_bytes, session, websocket)
                
            elif "text" in message and message["text"]:
                data = json.loads(message["text"])
                msg_type = data.get("type")
                
                if msg_type == "language_switch":
                    new_lang = data.get("language")
                    session.language = new_lang
                    
                    lang_names = {"en-IN": "English", "hi-IN": "Hindi", "te-IN": "Telugu"}
                    lang_name = lang_names.get(new_lang, new_lang)
                    instruction = f"[SYSTEM_ALERT: The user explicitly switched the language to {lang_name}. You MUST respond entirely in {lang_name} going forward.]"
                    
                    if session.conversation_history and session.conversation_history[-1]["role"] == "user":
                        session.conversation_history[-1]["parts"].append({"text": f"\n{instruction}"})
                    else:
                        session.conversation_history.append({"role": "user", "parts": [{"text": instruction}]})
                        
                    await websocket.send_json({"type": "language_switched", "language": new_lang})
                    
                elif msg_type == "session_end":
                    break
                    
                elif msg_type == "text_input":
                    text = data.get("text")
                    if text:
                        await run_pipeline(text, session, websocket)
                    
                    
    except WebSocketDisconnect:
        pass
