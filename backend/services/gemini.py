import asyncio
import httpx
from config import settings

class GeminiClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = httpx.AsyncClient()

    async def _call_gemini(self, payload: dict) -> dict:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set in Settings.")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        response = await self.client.post(url, headers=headers, json=payload, timeout=30.0)
        
        # 429: Rate limit. Sleep 1s and retry once.
        if response.status_code == 429:
            await asyncio.sleep(1.0)
            response = await self.client.post(url, headers=headers, json=payload, timeout=30.0)

        if response.status_code != 200:
            raise ValueError(f"Gemini API error with status {response.status_code}: {response.text}")

        return response.json()

    async def generate(
        self,
        system_prompt: str,
        history: list[dict],
        tool_definitions: list[dict],
        new_user_message: str
    ) -> tuple[str, list[dict]]:
        # Append new user message to history
        history.append({
            "role": "user",
            "parts": [{"text": new_user_message}]
        })

        payload = {
            "contents": history,
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 200}
        }
        if system_prompt:
            payload["system_instruction"] = {"parts": [{"text": system_prompt}]}
        if tool_definitions:
            payload["tools"] = tool_definitions

        res_data = await self._call_gemini(payload)

        try:
            content = res_data["candidates"][0]["content"]
            parts = content.get("parts", [])
            
            # Append model response to history
            history.append({
                "role": "model",
                "parts": parts
            })

            response_text = "".join([p["text"] for p in parts if "text" in p])
            tool_calls = [p["functionCall"] for p in parts if "functionCall" in p]
            return response_text, tool_calls
        except (KeyError, IndexError) as e:
            raise ValueError(f"Failed to parse Gemini response: {e}. Full response: {res_data}")

    async def send_tool_results(
        self,
        system_prompt: str,
        history: list[dict],
        tool_results: list[dict]
    ) -> str:
        # Format function responses and append to history
        parts = [
            {
                "functionResponse": {
                    "name": res["name"],
                    "response": res["response"]
                }
            }
            for res in tool_results
        ]
        history.append({
            "role": "user",
            "parts": parts
        })

        payload = {
            "contents": history,
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 200}
        }
        if system_prompt:
            payload["system_instruction"] = {"parts": [{"text": system_prompt}]}

        res_data = await self._call_gemini(payload)

        try:
            content = res_data["candidates"][0]["content"]
            model_parts = content.get("parts", [])
            
            # Append model response to history
            history.append({
                "role": "model",
                "parts": model_parts
            })

            response_text = "".join([p["text"] for p in model_parts if "text" in p])
            return response_text
        except (KeyError, IndexError) as e:
            raise ValueError(f"Failed to parse Gemini response after tool results: {e}. Full response: {res_data}")

    async def close(self):
        await self.client.aclose()

# Export singleton instance
gemini_client = GeminiClient()
