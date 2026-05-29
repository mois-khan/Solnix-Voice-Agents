---
name: sarvam-api
description: Use when writing or debugging any Sarvam AI API call — STT (speech-to-text) or TTS (text-to-speech). Covers exact endpoints, headers, request shapes, response formats, and error handling.
---

# Sarvam AI API Reference

## Authentication
Header: `api-subscription-key: {SARVAM_API_KEY}`
NOT Bearer. NOT Authorization. Exactly this header name.

## STT — Speech to Text
Endpoint: POST https://api.sarvam.ai/speech-to-text
Content-Type: multipart/form-data

Fields:
  file: audio bytes (filename must end in .webm — browser MediaRecorder output)
  language_code: "en-IN" | "hi-IN" | "te-IN"
  model: "saaras:v2"
  mode: "transcribe"

Response: { "transcript": "string", "language_code": "en-IN" }

httpx example:
  files = {"file": ("audio.webm", audio_bytes, "audio/webm")}
  data = {"language_code": language_code, "model": "saaras:v2", "mode": "transcribe"}
  resp = await client.post(endpoint, headers=headers, files=files, data=data)
  return resp.json()["transcript"]

## TTS — Text to Speech
Endpoint: POST https://api.sarvam.ai/text-to-speech
Content-Type: application/json

Body:
  inputs: ["text to speak"]         ← array, even for single string
  target_language_code: "hi-IN"     ← language of the text
  speaker: "priya"                  ← see voice map below
  model: "bulbul:v2"
  enable_preprocessing: true

Response: { "audios": [""] }
Return: response["audios"][0]

Voice map (persona × language):
  priya  + en-IN → "priya"
  priya  + hi-IN → "priya"
  arjun  + en-IN → "aditya"
  arjun  + hi-IN → "aditya"
  arjun  + te-IN → "aditya"
  meera  + en-IN → "vidya"
  meera  + hi-IN → "vidya"
  meera  + te-IN → "vidya"

## Common Errors
- 401: Wrong header name. Use `api-subscription-key`, not `Authorization`.
- 400 on STT: File field name is wrong. Must be `file`, not `audio` or `data`.
- 400 on TTS: `inputs` must be a JSON array, not a plain string.
- 422: language_code not in the allowed set. Use exact strings above.
```