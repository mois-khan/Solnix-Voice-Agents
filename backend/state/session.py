# SessionState lives in backend/state/session.py
# It is an in-memory dict — no database, no Redis

session_store: dict = {}
