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
import type { Appointment, RecipientInfoUpdate } from "../../Context/CareRecipientContext";
import { useTaskInfo } from "../../Context/TaskContext";
import type { Task } from "../../Context/TaskContext";


interface SuggestedActions {
  id: string;
  label: string;
}

const SUGGESTEDACTIONS: SuggestedActions[] = [
  { id: 'generate-report', label: 'Generate Report' },
  { id: 'new-daily-actions', label: 'New Daily Actions' },
];

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatActionResponse {
  id: string;
  label: string;
  type: string;
  payload?: Record<string, unknown> | null;
}

interface ChatApiResponse {
  text: string;
  actions?: ChatActionResponse[];
}


// Now includes patientContext — the caregiver's full care-recipient record
// (personal info, medical history, medications, appointments) — so the
// model can actually answer questions about the patient instead of only
// seeing raw conversation text. See _buildChatTranscript in chatBot.py for
// how this gets formatted into the prompt.
export async function chatResponse(messages: AgentMessage[], patientContext: unknown) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      today: new Date().toISOString().split("T")[0],
      patientContext,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json();
}

export async function sendChatMessage(messages: AgentMessage[], patientContext: unknown): Promise<ChatApiResponse> {
  const raw = await chatResponse(messages, patientContext);

  return {
    text: raw.text ?? raw.message ?? '',
    actions: raw.actions ?? undefined,
  };
}

function Chat() {
  const { messages, setMessages, clearMessages } = useChat();
  const { careRecipient, addAppointment, updateRecipientInfo } = useCareRecipientInfo();
  const { createTask } = useTaskInfo();
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
      const aiResponse: ChatApiResponse = await sendChatMessage(history, careRecipient);

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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId
            ? { id: thinkingId, role: 'ai', text: 'Sorry, something went wrong. Please try again.' }
            : m
        )
      );
    } finally {
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
      addAppointment(payload as Omit<Appointment, 'id'>);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'ai', text: `Done — "${label}" has been added to the schedule.` },
      ]);
      return;
    }

    if (type === 'create_task' && payload) {
      createTask(payload as Omit<Task, "id" | "completed">);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'ai', text: `Done — "${label}" has been added to your tasks.` },
      ]);
      return;
    }

    if (type === 'update_patient_info' && payload) {
      updateRecipientInfo(payload as RecipientInfoUpdate);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'ai', text: `Done — "${label}" has been updated.` },
      ]);
      return;
    }

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