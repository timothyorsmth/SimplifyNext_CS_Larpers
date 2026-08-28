// Import dependencies
import { useState, useEffect } from "react";

// Import files
import './Chat.css';

const API_BASE = "http://localhost:5000";

export async function chatResponse(promptStr: string) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptStr }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json();
}

function Chat() {
  const [loading, setLoading] = useState(true);
  const [bodyText, setBodyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getResponse() {
      try {
        const result = await chatResponse("");
        console.log(result.response);
        setBodyText(result.response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    getResponse();
  }, []); // empty deps array = runs once when component mounts

  return (
    <div className="Chat">
      <p>Vro: What is bedrock</p>
      <p>Cuh: {loading ? "thinking" : error ?? bodyText}</p>
    </div>
  );
}

export default Chat;