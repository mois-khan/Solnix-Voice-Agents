import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import uvicorn

from config import settings
from services.sarvam import stt_client, tts_client
from services.gemini import gemini_client
from routers.personas import get_personas, router as personas_router
from routers.sessions import router as sessions_router
from routers.ws import router as ws_router

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Warm the personas cache
    await get_personas()
    logger.info("Solnix Voice Agents backend ready")
    
    yield
    
    # Shutdown: Close all HTTPX async clients
    await stt_client.close()
    await tts_client.close()
    await gemini_client.close()
    logger.info("Solnix Voice Agents backend shutdown")


app = FastAPI(title="Solnix Voice Agents", lifespan=lifespan)

# CORS Middleware Setup
# Allow all origins for the POC to ensure seamless connection from localhost, Vercel production, and Vercel preview domains.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
# Note: personas and sessions routers define their own prefix internally.
app.include_router(sessions_router)
app.include_router(personas_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
