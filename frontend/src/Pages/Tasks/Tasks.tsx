// Import files
import './Tasks.css';

// Import dependencies
import { useState, useEffect } from "react";
import type { IconType } from "react-icons";
import { FiUser, FiZap, FiX } from "react-icons/fi";
import { FaPills, FaCar, FaHospitalAlt } from "react-icons/fa";
import { useCareRecipientInfo } from "../../Context/CareRecipientContext";
import { getCaregiverInfo } from '../../Context/CaregiverContext';
import { useTaskInfo, type Task } from '../../Context/TaskContext';
import { API_BASE } from "../../App";



const ICON_MAP: Record<string, IconType> = {
  pill: FaPills,
  hospital: FaHospitalAlt,
  car: FaCar,
};

// Options shown in the "Create Task" icon dropdown. Kept in sync with
// ICON_MAP above — add an entry here whenever a new icon is added there.
const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "pill", label: "Medication" },
  { value: "hospital", label: "Appointment" },
  { value: "car", label: "Transport" },
];

interface CreateTaskPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Omit<Task, "id" | "completed">) => void;
  assignablePeople: string[];
}

function CreateTaskPopup({
  isOpen,
  onClose,
  onCreate,
  assignablePeople,
}: CreateTaskPopupProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(ICON_OPTIONS[0].value);
  const [repeat, setRepeat] = useState<Task["repeat"]>("never");
  const [assignedTo, setAssignedTo] = useState(assignablePeople[0] ?? "");
  const [finishDate, setFinishDate] = useState(
    () => new Date().toISOString().split("T")[0] // defaults to today, "YYYY-MM-DD"
  );
  const [finishBefore, setFinishBefore] = useState("12:00");

  // Keep the selected assignee valid as the real caregiver list arrives
  // (assignablePeople starts empty while CaregiverContext is still loading)
  useEffect(() => {
    if (!assignablePeople.includes(assignedTo)) {
      setAssignedTo(assignablePeople[0] ?? "");
    }
  }, [assignablePeople]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return; // basic guard, no toast needed for demo
    onCreate({
      name: name.trim(),
      icon,
      finishDate,
      finishBefore,
      repeat,
      assignedTo,
    });
    setName("");
    setIcon(ICON_OPTIONS[0].value);
    setFinishDate(new Date().toISOString().split("T")[0]);
    setFinishBefore("12:00");
    setRepeat("never");
    onClose();
  };

  return (
    <div className="taskPopupOverlay" onClick={onClose}>
      <div className="taskPopup" onClick={(e) => e.stopPropagation()}>
        <div className="taskPopupRow">
          <input
            className="taskInputName"
            type="text"
            placeholder="Enter Task Name.."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="taskIconSelect"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          >
            {ICON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <span className="taskPopupLabel">Finish before:</span>
        <div className="taskPopupRow taskPopupDateRow">
          <div className="taskPopupDateTimeGroup">
            <input
              className="taskPopupDate"
              type="date"
              value={finishDate}
              onChange={(e) => setFinishDate(e.target.value)}
            />
            <input
              className="taskPopupTime"
              type="time"
              value={finishBefore}
              onChange={(e) => setFinishBefore(e.target.value)}
            />
          </div>
        </div>

        <div className="taskPopupSection">
          <span className="taskPopupLabel">Repeat Task</span>
          <div className="taskPopupPillGroup">
            {(["never", "daily", "weekly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={
                  "taskPopupPill" +
                  (repeat === option ? " taskPopupPill--active" : "")
                }
                onClick={() => setRepeat(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="taskPopupSection">
          <span className="taskPopupLabel">Assign Person</span>
          <select
            className="taskPopupAssign"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            {assignablePeople.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
        </div>

        <button
          className="taskPopupCreateButton"
          type="button"
          onClick={handleCreate}
        >
          Create Task
        </button>
      </div>
    </div>
  );
}

// --- Agentic AI task creator ---
// The agent can either finish immediately with a task, or ask a clarifying
// question first (e.g. "who is this for?" / "what time?"). The frontend just
// keeps forwarding the conversation until the backend returns status "done".

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

type ParsedAgentTask = Omit<Task, "id" | "completed" | "overdue">;

interface AgentClarifyResponse {
  status: "clarify";
  question: string;
}

interface AgentDoneResponse {
  status: "done";
  task: ParsedAgentTask;
}

type AgentResponse = AgentClarifyResponse | AgentDoneResponse;

// The FastAPI backend runs on its own origin/port, separate from the Vite
// dev server — that's why main.py has CORSMiddleware at all. A relative
// fetch("/api/tasks/agent") from a page served by Vite would hit Vite
// itself (404), not FastAPI. API_BASE (from App.tsx) is the one place
// the backend's URL is configured — see that file to change it.

async function callTaskAgent(
  messages: AgentMessage[],
  assignablePeople: string[]
): Promise<AgentResponse> {
  const res = await fetch(`${API_BASE}/api/tasks/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      assignablePeople,
      today: new Date().toISOString().split("T")[0],
    }),
  });

  if (!res.ok) {
    throw new Error(`Task agent request failed with status ${res.status}`);
  }

  return res.json();
}

interface AiTaskCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Omit<Task, "id" | "completed">) => void;
  assignablePeople: string[];
}

function AiTaskCreator({
  isOpen,
  onClose,
  onCreate,
  assignablePeople,
}: AiTaskCreatorProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<ParsedAgentTask | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setMessages([]);
    setInput("");
    setError(null);
    setPendingTask(null);
    onClose();
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    const nextMessages: AgentMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);
    setError(null);

    try {
      const response = await callTaskAgent(nextMessages, assignablePeople);

      if (response.status === "clarify") {
        setMessages([
          ...nextMessages,
          { role: "assistant", content: response.question },
        ]);
      } else {
        setPendingTask(response.task);
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: `Got it — ready to create "${response.task.name}".`,
          },
        ]);
      }
    } catch (err) {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleConfirm = () => {
    if (!pendingTask) return;
    onCreate(pendingTask); // no `overdue` — Task doesn't have that field anymore
    resetAndClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="taskPopupOverlay" onClick={resetAndClose}>
      <div className="aiTaskPopup" onClick={(e) => e.stopPropagation()}>
        <span className="taskPopupLabel">Describe the task</span>

        <div className="aiTaskChatLog">
          {messages.length === 0 && (
            <div className="aiTaskChatHint">
              e.g. "Remind Mum to take her meds every morning at 9am"
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                "aiTaskChatBubble" +
                (m.role === "user"
                  ? " aiTaskChatBubble--user"
                  : " aiTaskChatBubble--assistant")
              }
            >
              {m.content}
            </div>
          ))}
          {isThinking && (
            <div className="aiTaskChatBubble aiTaskChatBubble--assistant">
              Thinking…
            </div>
          )}
        </div>

        {error && <div className="aiTaskError">{error}</div>}

        {pendingTask ? (
          <div className="aiTaskPreviewCard">
            <div className="aiTaskPreviewName">{pendingTask.name}</div>
            <div className="aiTaskPreviewMeta">
              Due {pendingTask.finishDate} by {pendingTask.finishBefore} ·{" "}
              {pendingTask.repeat} · {pendingTask.assignedTo}
            </div>
            <div className="aiTaskPreviewActions">
              <button
                type="button"
                className="taskPopupPill"
                onClick={() => setPendingTask(null)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className="taskPopupCreateButton"
                onClick={handleConfirm}
              >
                Confirm &amp; Create
              </button>
            </div>
          </div>
        ) : (
          <div className="taskPopupRow">
            <input
              className="taskInputName"
              type="text"
              placeholder="Type a task in plain English..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isThinking}
            />
            <button
              className="taskPopupCreateButton"
              type="button"
              onClick={handleSend}
              disabled={isThinking || !input.trim()}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Tasks() {
  const { careRecipient } = useCareRecipientInfo();
  const { caregivers } = getCaregiverInfo();
  const { effectiveTasks, createTask, toggleTaskCompleted, deleteTask } = useTaskInfo();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isAiModalOpen, setAiModalOpen] = useState(false);

  const highlightedTask = effectiveTasks.find((t) => t.overdue);
  const otherTasks = effectiveTasks.filter((t) => t !== highlightedTask);

  const assignablePeople = caregivers
    .filter((c) => c.recipientId === careRecipient?.recipientInfo.id)
    .map((c) => `${c.profile.first_name} ${c.profile.last_name}`);

  return (
    <div className="tasksPage">
      <h1 className="title">Today's Tasks</h1>

      {highlightedTask && (() => {
        const HighlightIcon = ICON_MAP[highlightedTask.icon];
        return (
          <div
            className="incompleteTaskCard"
            onClick={() => toggleTaskCompleted(highlightedTask.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTaskCompleted(highlightedTask.id);
              }
            }}
          >
            <span className="incompleteTaskLabel">Incomplete Tasks:</span>
            <div className="incompleteTaskContainer">
              <span className="taskIcon">
                {HighlightIcon && <HighlightIcon />}
              </span>
              <div>
                <div className="incompleteTaskName">{highlightedTask.name}</div>
                <div className="incompleteTaskTag">Overdue</div>
              </div>
            </div>
            <button
              className="taskDeleteButton"
              type="button"
              aria-label={`Delete ${highlightedTask.name}`}
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(highlightedTask.id);
              }}
            >
              <FiX />
            </button>
          </div>
        );
      })()}

      <div className="taskRows">
        {otherTasks.map((task) => {
          const RowIcon = ICON_MAP[task.icon];
          return (
            <div
              key={task.id}
              className={`taskContainer${task.completed ? " taskContainer--completed" : ""}`}
              onClick={() => toggleTaskCompleted(task.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTaskCompleted(task.id);
                }
              }}
            >
              <span className="taskIcon">{RowIcon && <RowIcon />}</span>
              <span className="taskName">{task.name}</span>
              <span className="taskPersonAvatar" title={task.assignedTo}>
                <FiUser />
              </span>
              <button
                className="taskDeleteButton"
                type="button"
                aria-label={`Delete ${task.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(task.id);
                }}
              >
                <FiX />
              </button>
            </div>
          );
        })}
      </div>

      <div className="taskCreateButtonRow">
        <button
          className="taskCreateButton"
          type="button"
          onClick={() => setModalOpen(true)}
        >
          Create Task
        </button>
        <button
          className="taskCreateButton taskCreateButton--ai"
          type="button"
          onClick={() => setAiModalOpen(true)}
        >
          <FiZap /> Create with AI
        </button>
      </div>

      <CreateTaskPopup
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createTask}
        assignablePeople={assignablePeople}
      />

      <AiTaskCreator
        isOpen={isAiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onCreate={createTask}
        assignablePeople={assignablePeople}
      />
    </div>
  );
}

export default Tasks;