---
name: gemini-tools
description: Use when writing Gemini API calls, especially function calling / tool use. Covers the exact two-call pattern required for tool execution, history format, and error handling.
---

# Gemini 3.1 Flash Lite API Reference (REST)

## Endpoint
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={GEMINI_API_KEY}
Content-Type: application/json

## Conversation History Format
[
  {"role": "user",   "parts": [{"text": "..."}]},
  {"role": "model",  "parts": [{"text": "..."}]},
  ...
]
Pass the FULL history on every call. Gemini has no memory between calls.

## System Prompt
Passed as a top-level field, NOT as a history message:
{
  "system_instruction": {"parts": [{"text": "You are Priya..."}]},
  "contents": [...history...],
  "tools": [...],
  "generationConfig": {"temperature": 0.4, "maxOutputTokens": 200}
}

## Tool Definition Format
{
  "tools": [{
    "function_declarations": [
      {
        "name": "lookup_loan",
        "description": "Look up a loan by ID and return overdue amount, EMI, and customer info.",
        "parameters": {
          "type": "object",
          "properties": {
            "loan_id": {"type": "string", "description": "The loan ID, e.g. L-1042"}
          },
          "required": ["loan_id"]
        }
      }
    ]
  }]
}

## CRITICAL — Two-Call Pattern for Tool Use

### Call 1: User message → Gemini may return a functionCall
response.candidates[0].content.parts may contain:
  {"functionCall": {"name": "lookup_loan", "args": {"loan_id": "L-1042"}}}

### Execute the tool locally:
  result = await execute_tool("lookup_loan", {"loan_id": "L-1042"})

### Call 2: Append functionResponse to history, call Gemini again
Append to history:
  {"role": "model", "parts": [{"functionCall": {"name": "lookup_loan", "args": {...}}}]}
  {"role": "user",  "parts": [{"functionResponse": {"name": "lookup_loan", "response": {"result": result}}}]}

Then call Gemini again → now it returns the final text response.

NEVER skip Call 2. The bot will go silent if you don't send the functionResponse.

## Extracting Response Text
parts = response["candidates"][0]["content"]["parts"]
text_parts = [p["text"] for p in parts if "text" in p]
function_calls = [p["functionCall"] for p in parts if "functionCall" in p]

## Common Errors
- 400 "invalid content": history has wrong role ordering or missing parts field
- 429: Rate limit. Sleep 1s and retry once. Add asyncio.sleep(1) before retry.
- functionCall with no functionResponse causes infinite silence — always complete the loop.
```