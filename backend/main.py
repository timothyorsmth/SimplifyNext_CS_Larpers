from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

import json
from pathlib import Path

# This variable name must match the 'app' in your terminal command
app = FastAPI()

origins = [
    "https://localhost:8000" # for production :)
]

# Configure CORS for your Vite frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Default Vite port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}