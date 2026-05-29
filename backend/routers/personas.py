import os
import yaml
from fastapi import APIRouter

router = APIRouter(prefix="/personas", tags=["personas"])

PERSONAS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "personas"))
_personas_cache = None

@router.get("")
async def get_personas():
    global _personas_cache
    if _personas_cache is not None:
        return _personas_cache

    personas = []
    if os.path.exists(PERSONAS_DIR):
        for filename in os.listdir(PERSONAS_DIR):
            if filename.endswith(".yaml") or filename.endswith(".yml"):
                file_path = os.path.join(PERSONAS_DIR, filename)
                with open(file_path, "r", encoding="utf-8") as f:
                    try:
                        data = yaml.safe_load(f)
                        if isinstance(data, dict):
                            # Derive supported_languages from languages field
                            data["supported_languages"] = data.get("languages", [])
                            personas.append(data)
                    except yaml.YAMLError:
                        continue

    # Sort personas alphabetically by ID for a consistent order
    personas.sort(key=lambda p: p.get("id", ""))
    _personas_cache = personas
    return _personas_cache
