// Import dependencies
import { useState, useEffect, useRef } from "react";

// Import files
import './Chat.css';
import ChatBubble from './ChatBubble';
import type { ChatMessage, ChatAction } from './ChatBubble';
import { FaTrashCan } from "react-icons/fa6";

import { API_BASE } from '../../App'
import { useChat } from "../../Context/ChatContext";


interface SuggestedActions {
  id: string;
  label: string;
}

const SUGGESTEDACTIONS: SuggestedActions[] = [
  { id: 'generate-report', label: 'Generate Report' },
  { id: 'new-daily-actions', label: 'New Daily Actions' },
];

interface ChatActionResponse {
  id: string;
  label: string;
  type: string;
}

interface ChatApiResponse {
  text: string;
  actions?: ChatActionResponse[];
}


// Function call to send a message to chat bot :)
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

// wrapper function :|
// formats the raw backend response into the shape the UI wants
export async function sendChatMessage(promptStr: string): Promise<ChatApiResponse> {
  const raw = await chatResponse(promptStr);

  return {
    text: raw.text ?? raw.message ?? '',
    actions: raw.actions ?? undefined,
  };
}

function Chat() {
  // states for chat messages
  const { messages, setMessages, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    const thinkingId = crypto.randomUUID();
    const thinkingMessage: ChatMessage = { id: thinkingId, role: 'ai', text: '…', isThinking: true };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput('');
    setIsSending(true);

    try {
      const aiResponse: ChatApiResponse = await sendChatMessage(trimmed);

      const actions: ChatAction[] | undefined = aiResponse.actions?.map((action) => ({
        id: action.id,
        label: action.label,
        onSelect: () => handleApprove(action.id, action.label, action.type),
      }));

      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { id: thinkingId, role: 'ai', text: aiResponse.text, actions }
            : m
        )
      );
    } catch {
      // Send error message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { id: thinkingId, role: 'ai', text: 'Sorry, something went wrong. Please try again.' }
            : m
        )
      );
    } finally {
      // Post AI stuff here
      setIsSending(false);
    }
  }

  function handleApprove(actionId: string, label: string, type: string) {
    // TODO: wire to real task/schedule creation once backend endpoint exists
    // TODO: change the finish task message :|
    console.log('Approved:', { actionId, type });
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'ai', text: `Done — "${label}" has been added.` },
    ]);
  }

  const showWelcome = messages.length == 0;

  return (
    <div className="Chatbot">
      <div className="chatScrollBehaviour" ref={scrollRef}>
        {showWelcome && (
          <div className="chatRow aiMsgFormat">
            <div className="chatBubble aiChatBubble">
              <p className="chatText">
                Hello, I'm here to help. What can I do for you today?
              </p>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
      </div>

      <div className="chatInputArea">
        {messages.length === 0 && (
          <>
            <p className="chatSuggestionsLabel">Some things we can help you with:</p>
            <div className="chatSuggestions">
              {SUGGESTEDACTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="chatSuggestionButton"
                  onClick={() => handleSend(s.label)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        <form
          className="chatInputRow"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <input
            className="chatInput"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="How can we help?"
          />
          <button type="submit" className="chatSend" disabled={isSending || !input.trim()}>
            Send
          </button>
          <button type="button" className="clearMessages" onClick={clearMessages}>
            <FaTrashCan />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;