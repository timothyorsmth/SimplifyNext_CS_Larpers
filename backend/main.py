from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

from agents.chatBot import ChatResponse, chatPrompt, getChatBotSystemPrompt  # wraps the Bedrock call

import json
from pathlib import Path

# This variable name must match the 'app' in your terminal command
app = FastAPI()

origins = [
    "http://localhost:8000" # for production,, MUST MATCH VITE !!!
]

# Configure CORS for your Vite frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Default Vite port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    promptStr: str

# For chat bot :)
@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        result = chatPrompt(payload.promptStr, getChatBotSystemPrompt())  # change to prompt question in here
        return {"text": result, "actions": None}
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"Hello": "World"}