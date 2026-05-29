import os
import sys
import asyncio
import base64
import httpx

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config import settings

async def main():
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": ["नमस्ते, यह एक परीक्षण है।"],
        "target_language_code": "hi-IN",
        "speaker": "manisha",
        "model": "bulbul:v2"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code == 200:
                res_data = response.json()
                if "audios" in res_data and len(res_data["audios"]) > 0:
                    audio_b64 = res_data["audios"][0]
                    audio_bytes = base64.b64decode(audio_b64)
                    print(f"TTS OK — audio length: {len(audio_bytes)} bytes")
                else:
                    print(f"Failed to find audios in response: {res_data}")
            else:
                print(f"Request failed with status {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
