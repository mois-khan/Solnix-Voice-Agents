from fastapi import FastAPI

app = FastAPI(title="Solnix Voice Agents API")

@app.get("/")
async def root():
    return {"message": "Hello World - Solnix Voice Agents API"}
