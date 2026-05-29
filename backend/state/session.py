import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

@dataclass
class SessionState:
    session_id: str
    persona_id: str
    language: str
    conversation_history: list[dict] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

SESSIONS: dict[str, SessionState] = {}

def create_session(persona_id: str, language: str) -> SessionState:
    session_id = str(uuid.uuid4())
    session = SessionState(
        session_id=session_id,
        persona_id=persona_id,
        language=language,
        conversation_history=[]
    )
    SESSIONS[session_id] = session
    return session

def get_session(session_id: str) -> Optional[SessionState]:
    return SESSIONS.get(session_id)

def end_session(session_id: str) -> None:
    session = SESSIONS.get(session_id)
    if session:
        session.is_active = False
        del SESSIONS[session_id]
