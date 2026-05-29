import os
import sys
import io
import wave
import asyncio
import httpx

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config import settings

def generate_silent_wav() -> bytes:
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)      # 1 channel (mono)
        wav_file.setsampwidth(2)      # 16-bit (2 bytes)
        wav_file.setframerate(44100)  # 44100 Hz
        # 1 second of silence = 44100 frames * 2 bytes = 88200 bytes of zeros
        wav_file.writeframes(b'\x00' * 88200)
    return wav_io.getvalue()

async def main():
    url = "https://api.sarvam.ai/speech-to-text"
    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY
    }
    wav_bytes = generate_silent_wav()

    files = {
        "file": ("audio.wav", wav_bytes, "audio/wav")
    }
    data = {
        "language_code": "en-IN",
        "model": "saaras:v3",
        "mode": "transcribe"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, files=files, data=data, timeout=30.0)
            if response.status_code == 200:
                res_data = response.json()
                transcript = res_data.get("transcript", "")
                print(f"STT OK — transcript: '{transcript}'")
            else:
                print(f"Request failed with status {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
