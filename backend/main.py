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

# Configure CORS for Vite frontend development server
# Not gonna lie i actually dk what this does
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Default Vite port
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

# Test server get function, does not actually do anything
@app.get("/")
def read_root():
    return {"Hello": "World"}