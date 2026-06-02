from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from state.session import create_session, end_session, get_session

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    persona_id: str
    language: str

@router.post("")
async def post_sessions(payload: SessionCreate):
    valid_personas = ["priya", "arjun", "meera", "open"]
    valid_languages = ["en-IN", "hi-IN", "te-IN"]

    if payload.persona_id not in valid_personas:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid persona_id: '{payload.persona_id}'. Must be one of {valid_personas}."
        )

    if payload.language not in valid_languages:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid language: '{payload.language}'. Must be one of {valid_languages}."
        )

    session = create_session(payload.persona_id, payload.language)
    return {
        "session_id": session.session_id,
        "persona_id": session.persona_id,
        "language": session.language
    }

@router.delete("/{session_id}")
async def delete_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found."
        )
    end_session(session_id)
    return {"ended": True}
