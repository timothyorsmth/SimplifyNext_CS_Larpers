from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal

from agents.chatBot import (
    ChatResponse,
    chatPrompt,
    getChatBotSystemPrompt,
    runTaskAgent,
    TaskAgentResponse,
)  # wraps the Bedrock call

# This variable name must match the 'app' in your terminal command
app = FastAPI()

# NOTE: this must match wherever the Vite dev server actually serves the
# frontend from — check your terminal output when you run `npm run dev` /
# `vite`. Vite's default is 5173 (127.0.0.1:5173), NOT 8000 — the previous
# origins list only allowed 8000, which silently blocks every request from
# a default Vite setup with a CORS error in the browser console.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Configure CORS for Vite frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# For chat bot :)
class ChatRequest(BaseModel):
    promptStr: str

@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        result = chatPrompt(payload.promptStr, getChatBotSystemPrompt())  # change to prompt question in here
        return {"text": result, "actions": None}
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# For "Create with AI" on the Tasks page — structured, possibly multi-turn.
class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class TaskAgentRequest(BaseModel):
    messages: list[AgentMessage]
    assignablePeople: list[str] = []
    today: str

@app.post("/api/tasks/agent", response_model=TaskAgentResponse)
def task_agent(payload: TaskAgentRequest):
    try:
        return runTaskAgent(
            [m.model_dump() for m in payload.messages],
            payload.assignablePeople,
            payload.today,
        )
    except ValueError as e:
        # Claude didn't return parseable/valid JSON — surface as a 502
        # (bad response from an upstream we don't fully control) rather
        # than a generic 500.
        print(f"ERROR (task agent parse): {e}")
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Test server get function, does not actually do anything
@app.get("/")
def read_root():
    return {"Hello": "World"}