import os
import sys
import asyncio
import httpx

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from config import settings

async def main():
    if not settings.GEMINI_API_KEY:
        print("Error: GEMINI_API_KEY is not configured in settings.")
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={settings.GEMINI_API_KEY}"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": "Say hello in one sentence."
                    }
                ]
            }
        ]
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code == 200:
                res_data = response.json()
                try:
                    text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    print(f"Gemini OK — response: '{text}'")
                except (KeyError, IndexError) as parse_err:
                    print(f"Failed to parse response candidate: {parse_err}")
                    print(f"Response: {res_data}")
            else:
                print(f"Request failed with status {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
