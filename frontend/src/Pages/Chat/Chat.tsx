// Import dependencies
import { useState } from "react";

// Import files
import './Chat.css';


// Test chat feature :|
export async function chatResponse(promptStr: string) {
  const response = await fetch(`http://localhost:8000/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptStr }),
  });

  if (!response.ok) {
    throw new Error(`Report generation failed: ${response.status}`);
  }

  console.log(response);
  return response.json();
}



function Chat(){
    const [loading, setLoading] = useState(true);
    var bodyText = "";

    async function getResponse() {
        try {
            const result = await chatResponse("");
            bodyText = result.response;
        } catch (err) {
        } finally {
            setLoading(false);
        }
    }

    getResponse();

    return(
        <div className="Chat">
            <p>Vro: What is bedrock</p>
            <p>Cuh: {loading ? "thinking" : bodyText}</p>
        </div>
    );
}

export default Chat;