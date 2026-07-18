
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from holokai_backend import CivilizationCore

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("holokai.api")

# ----------------------------------------------------------------------
# FastAPI App
# ----------------------------------------------------------------------
app = FastAPI(
    title="HoloKai Civilization Core API",
    description="Multi-agent historical synthesis engine for African civilizations",
    version="2.0.0",
)

# CORS – allow local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single shared core instance
core = CivilizationCore()

# In-memory chat history (last 100 messages)
chat_history: List[Dict[str, Any]] = []
MAX_HISTORY = 100

# Greeting keywords that trigger wave/bow animation
GREETING_KEYWORDS = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "salute", "jambo", "sawubona"]
WAVE_KEYWORDS = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy", "salute"]
BOW_KEYWORDS = ["greetings", "jambo", "sawubona", "respect", "honor"]


# ----------------------------------------------------------------------
# Request / Response Models
# ----------------------------------------------------------------------
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="User query")


class QueryResponse(BaseModel):
    title: str
    query: str
    fragments: list
    summary: str
    confidence: float
    trace_id: str
    active_agents: list
    safety_notes: list
    emotions: dict
    greeting_animation: str | None = None


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    fragments: list = []
    active_agents: list = []
    emotions: dict = {}
    greeting_animation: str | None = None


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def detect_greeting_animation(query: str) -> str | None:
    q = query.lower().strip()
    if any(k in q for k in WAVE_KEYWORDS):
        return "wave"
    if any(k in q for k in BOW_KEYWORDS):
        return "bow"
    if any(k in q for k in GREETING_KEYWORDS):
        return "wave"
    return None


def add_to_history(role: str, content: str, **kwargs):
    msg = {
        "id": f"msg_{len(chat_history)}_{int(datetime.now().timestamp())}",
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat(),
        **kwargs,
    }
    chat_history.append(msg)
    if len(chat_history) > MAX_HISTORY:
        chat_history.pop(0)
    return msg


# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "HoloKai Civilization Core",
        "version": "2.0.0",
    }


@app.post("/api/query", response_model=QueryResponse)
async def process_query(payload: QueryRequest) -> Dict[str, Any]:
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        # Detect greeting animation
        greeting_animation = detect_greeting_animation(query)

        # Store user message
        add_to_history("user", query)

        # Process through multi-agent system
        response = core.process_query(query)
        result = core.to_dict(response)

        # Add greeting animation to response
        result["greeting_animation"] = greeting_animation

        # Store assistant response
        add_to_history(
            "assistant",
            result.get("summary", ""),
            fragments=result.get("fragments", []),
            active_agents=result.get("active_agents", []),
            emotions=result.get("emotions", {}),
            greeting_animation=greeting_animation,
        )

        return result
    except Exception as exc:
        logger.exception("Unhandled error while processing query")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/history")
async def get_history():
    return {"history": chat_history, "count": len(chat_history)}


@app.delete("/api/history")
async def clear_history():
    chat_history.clear()
    return {"status": "cleared", "count": 0}


# ----------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
