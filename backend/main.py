from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

from agents.test_ai import testQuestion

import json
from pathlib import Path

# This variable name must match the 'app' in your terminal command
app = FastAPI()

origins = [
    "http://localhost:8000" # for production :)
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

@app.post("/chat")
def chat(req: ChatRequest):
    print("running???")
    try:
        result = testQuestion()  # or however your logic takes the prompt
        return {"response": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"Hello": "World"}