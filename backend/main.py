from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from agents.chatBot import (
    AgentMessage,
    ChatResponse,
    runChatAgent,
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
    "http://localhost:5000",
    "http://127.0.0.1:5000",
]

# Configure CORS for Vite frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# For chat bot :) -- now takes the full conversation (not just the latest
# message) so the agent can hold a real back-and-forth, e.g. asking "what
# time?" and understanding the caregiver's next reply in context.
class ChatRequest(BaseModel):
    messages: list[AgentMessage]
    today: str

@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        return runChatAgent(
            [m.model_dump() for m in payload.messages],
            payload.today,
        )
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# For "Create with AI" on the Tasks page — structured, possibly multi-turn.
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