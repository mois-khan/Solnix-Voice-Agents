import asyncio
import httpx
import websockets
import json
import sys

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

TEST_CASES = [
    {
        "persona": "priya",
        "language": "en-IN",
        "text": "What is my current outstanding balance? My loan ID is L-1042." 
    },
    {
        "persona": "arjun",
        "language": "en-IN",
        "text": "When exactly does my policy expire and what's the renewal cost? My policy ID is P-7781."
    },
    {
        "persona": "meera",
        "language": "en-IN",
        "text": "I need a consultation appointment this week, morning preferred." 
    }
]

async def test_persona(case):
    persona = case["persona"]
    lang = case["language"]
    user_text = case["text"]
    
    print(f"\n{'='*50}\nTesting Persona: {persona.upper()}\n{'='*50}")
    
    # 1. Create Session
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{API_URL}/sessions", json={"persona_id": persona, "language": lang})
        if res.status_code != 200:
            print(f"Failed to create session: {res.text}")
            return
        session_id = res.json()["session_id"]
        print(f"[{persona}] Session Created: {session_id}")
        
    # 2. Connect WebSocket
    try:
        async with websockets.connect(f"{WS_URL}/{session_id}") as ws:
            # 3. Send session_config
            await ws.send(json.dumps({
                "type": "session_config",
                "persona": persona,
                "language": lang
            }))
            
            # 4. Wait for session_ready
            ready = False
            while not ready:
                msg = await ws.recv()
                data = json.loads(msg)
                if data.get("type") == "session_ready":
                    ready = True
                    print(f"[{persona}] Session Ready!")
            
            # 5. Send Text
            print(f"[{persona}] User says: '{user_text}'")
            await ws.send(json.dumps({
                "type": "text_input",
                "text": user_text
            }))
            
            # 6. Wait for response
            tool_called = False
            agent_text = ""
            audio_received = False
            
            while not audio_received:
                msg = await ws.recv()
                data = json.loads(msg)
                
                msg_type = data.get("type")
                if msg_type == "transcript" and data.get("speaker") == "agent":
                    agent_text += data.get("text")
                elif msg_type == "audio_chunk":
                    audio_received = True
                    print(f"[{persona}] Received Audio Chunk! (seq: {data.get('seq')})")
                    
            # 7 & 8. Check Tools and Print
            print(f"[{persona}] Agent response: {agent_text}")
            
            # Heuristic checks for tools based on mock data in the tool handlers
            if persona == "priya" and ("45,000" in agent_text or "45000" in agent_text or "overdue" in agent_text.lower()):
                tool_called = True
            elif persona == "arjun" and ("2026-06-15" in agent_text or "25,000" in agent_text or "25000" in agent_text):
                tool_called = True
            elif persona == "meera" and ("10:00" in agent_text or "appointment" in agent_text.lower() or "slot" in agent_text.lower() or "morning" in agent_text.lower()):
                tool_called = True
                
            print(f"[{persona}] Tool execution detected in response: {tool_called}")
            
            await ws.send(json.dumps({"type": "session_end"}))
            
    except Exception as e:
        print(f"[{persona}] WebSocket error: {e}")

async def main():
    for case in TEST_CASES:
        await test_persona(case)

if __name__ == "__main__":
    asyncio.run(main())
