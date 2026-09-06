// Import dependencies
import { useState, useEffect, useRef } from "react";

// Import files
import './Chat.css';
import ChatBubble from './ChatBubble';
import type { ChatMessage, ChatAction } from './ChatBubble';
import { FaTrashCan } from "react-icons/fa6";

import { API_BASE } from '../../App'
import { useChat } from "../../Context/ChatContext";
import { useCareRecipientInfo } from "../../Context/CareRecipientContext";
import type { Appointment } from "../../Context/CareRecipientContext";


interface SuggestedActions {
  id: string;
  label: string;
}

// TODO: add functionality to handle suggested actions
const SUGGESTEDACTIONS: SuggestedActions[] = [
  { id: 'generate-report', label: 'Generate Report' },
  { id: 'new-daily-actions', label: 'New Daily Actions' },
];

// Matches agents.chatBot.AgentMessage on the backend.
interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatActionResponse {
  id: string;
  label: string;
  type: string;
  // Present when the action carries structured data the frontend needs to
  // actually perform on approval (e.g. the appointment fields for
  // "create_schedule_item") rather than just re-deriving it from the label.
  payload?: Record<string, unknown> | null;
}

interface ChatApiResponse {
  text: string;
  actions?: ChatActionResponse[];
}


// Function call to send a message to chat bot :)
// Sends the WHOLE conversation so far, not just the latest message — the
// backend agent flattens this into one turn (see _buildChatTranscript in
// chatBot.py) so it can ask a clarifying question and understand the next
// reply in context.
export async function chatResponse(messages: AgentMessage[]) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      today: new Date().toISOString().split("T")[0],
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json();
}

// wrapper function :|
// formats the raw backend response into the shape the UI wants
export async function sendChatMessage(messages: AgentMessage[]): Promise<ChatApiResponse> {
  const raw = await chatResponse(messages);

  return {
    text: raw.text ?? raw.message ?? '',
    actions: raw.actions ?? undefined,
  };
}

function Chat() {
  // states for chat messages
  const { messages, setMessages, clearMessages } = useChat();
  const { addAppointment } = useCareRecipientInfo();
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

    // Build the history to send BEFORE adding the thinking placeholder —
    // that placeholder text ("…") is UI-only and should never be sent to
    // the backend as if it were a real assistant turn.
    const history: AgentMessage[] = [
      ...messages
        .filter((m) => !m.isThinking)
        .map((m): AgentMessage => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      { role: 'user', content: trimmed },
    ];

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInput('');
    setIsSending(true);

    try {
      const aiResponse: ChatApiResponse = await sendChatMessage(history);

      const actions: ChatAction[] | undefined = aiResponse.actions?.map((action) => ({
        id: action.id,
        label: action.label,
        onSelect: () => handleApprove(action.id, action.label, action.type, action.payload),
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

  function handleApprove(
    actionId: string,
    label: string,
    type: string,
    payload?: Record<string, unknown> | null
  ) {
    if (type === 'create_schedule_item' && payload) {
      // Same shared store Schedule.tsx's "+" popup writes into — the
      // appointment shows up on the Schedule page without any extra wiring.
      addAppointment(payload as Omit<Appointment, 'id'>);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'ai', text: `Done — "${label}" has been added to the schedule.` },
      ]);
      return;
    }

    // TODO: wire up create_task / generate_report / confirm_generic once
    // those flows exist. For now they just confirm without doing anything.
    console.log('Approved (not yet wired):', { actionId, type, payload });
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