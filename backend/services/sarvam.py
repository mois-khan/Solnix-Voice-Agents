import base64
import httpx
from config import settings

VOICE_MAP = {
    ("priya", "en-IN"): "manisha",
    ("priya", "hi-IN"): "manisha",
    ("arjun", "en-IN"): "abhilash",
    ("arjun", "hi-IN"): "abhilash",
    ("arjun", "te-IN"): "abhilash",
    ("meera", "en-IN"): "vidya",
    ("meera", "hi-IN"): "vidya",
    ("meera", "te-IN"): "vidya",
}

class SarvamSTTClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.client = httpx.AsyncClient(
            base_url="https://api.sarvam.ai",
            headers={"api-subscription-key": self.api_key}
        )

    async def transcribe(self, audio_bytes: bytes, language_code: str) -> str:
        files = {"file": ("audio.webm", audio_bytes, "audio/webm")}
        data = {
            "language_code": language_code,
            "model": "saaras:v3",
            "mode": "transcribe"
        }
        response = await self.client.post("/speech-to-text", files=files, data=data, timeout=30.0)
        if response.status_code != 200:
            raise ValueError(f"Sarvam STT failed with status {response.status_code}: {response.text}")
        return response.json().get("transcript", "")

    async def close(self):
        await self.client.aclose()

class SarvamTTSClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.client = httpx.AsyncClient(
            base_url="https://api.sarvam.ai",
            headers={"api-subscription-key": self.api_key}
        )

    async def synthesize(self, text: str, language_code: str, speaker: str) -> str:
        payload = {
            "inputs": [text],
            "target_language_code": language_code,
            "speaker": speaker,
            "model": "bulbul:v2",
            "enable_preprocessing": True
        }
        response = await self.client.post("/text-to-speech", json=payload, timeout=30.0)
        if response.status_code != 200:
            raise ValueError(f"Sarvam TTS failed with status {response.status_code}: {response.text}")
        res_data = response.json()
        if "audios" in res_data and len(res_data["audios"]) > 0:
            return res_data["audios"][0]
        raise ValueError("No audio returned in Sarvam TTS response")

    async def close(self):
        await self.client.aclose()

# Export singleton instances
stt_client = SarvamSTTClient()
tts_client = SarvamTTSClient()
