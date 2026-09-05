// Import files
import './Tasks.css';

// Import dependencies
import { useState, useEffect } from "react";
import type { IconType } from "react-icons";
import { FiUser } from "react-icons/fi";
import { FaPills, FaCar } from "react-icons/fa";
import { getCareRecipientInfo } from "../../Context/CareRecipientContext";
import { getCaregiverInfo } from '../../Context/CaregiverContext';

// Import context

// Task Item
// Could be more complicated, but for demo let's just keep it super simple
interface Task {
  id: string;
  name: string;
  icon: string; // icon name or react icon component
  finishDate: string;   // "YYYY-MM-DD"
  finishBefore: string; // "HH:MM"
  repeat: "never" | "daily" | "weekly";
  assignedTo: string; // caregiver / person name
  overdue: boolean; // the one to highlight in the incomplete section
  completed: boolean;
}

// TODO: move sample data into a json file
// TODO: add task completion functionality
// TODO: add task overdue functionality
// TODO: add task creation agent

// Mock data (MOVE TO JSON PLEASE)
const INITIAL_TASKS: Task[] = [
  {
    id: "t1",
    name: "Morning Meds",
    icon: "pill",
    finishDate: "2024-09-04",
    finishBefore: "09:00",
    repeat: "daily",
    assignedTo: "Elenor Siew",
    overdue: false,
    completed: false,
  },
  {
    id: "t2",
    name: "Night Meds",
    icon: "pill",
    finishDate: "2028-09-04",
    finishBefore: "21:00",
    repeat: "daily",
    assignedTo: "Elenor Siew",
    overdue: false,
    completed: false,
  },
  {
    id: "t3",
    name: "Go to KKH",
    icon: "car",
    finishDate: "2029-09-04",
    finishBefore: "14:00",
    repeat: "never",
    assignedTo: "Tan Wei Jie",
    overdue: false,
    completed: false,
  },
];

const ICON_MAP: Record<string, IconType> = {
  pill: FaPills,
  car: FaCar,
};
 
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
      icon: "pill",
      finishDate,
      finishBefore,
      repeat,
      assignedTo,
      overdue: false,
    });
    setName("");
    setFinishDate(new Date().toISOString().split("T")[0]);
    setFinishBefore("12:00");
    setRepeat("never");
    onClose();
  };
  
  // TODO: add icon button functionality
  // TODO: add delete task button
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

          <button className="taskIconButton" type="button">
            icon
          </button>
        </div>

        <span className="taskPopupLabel">Finish before:</span>
        <div className="taskPopupRow taskPopupLabel">
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

function Tasks() {
  const { careRecipient } = getCareRecipientInfo(); 
  const { caregivers } = getCaregiverInfo();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [isModalOpen, setModalOpen] = useState(false);

  // Recheck every minute so the page updates live without a refresh
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Find the soonest deadline among tasks that aren't done yet
    const upcoming = tasks
      .filter((t) => !t.completed)
      .map((t) => {
        const [h, m] = t.finishBefore.split(":").map(Number);
        const deadline = new Date(); // "today" — swap for finishDate if you added it
        deadline.setHours(h, m, 0, 0);
        return deadline.getTime();
      })
      .filter((ms) => ms > now.getTime());

    if (upcoming.length === 0) return; // nothing left to become overdue

    const nextDeadline = Math.min(...upcoming);
    // +1s buffer so `now` lands just after the deadline, not exactly on it
    const msUntilNext = nextDeadline - now.getTime() + 1000;

    const timeout = setTimeout(() => setNow(new Date()), msUntilNext);
    return () => clearTimeout(timeout);
  }, [tasks, now]);

  // "HH:MM" -> has that time-of-day already passed today?
  const isPastDeadline = (finishDate: string, finishBefore: string) => {
    const [h, m] = finishBefore.split(":").map(Number);
    const deadline = new Date(finishDate);
    deadline.setHours(h, m, 0, 0);
    return now > deadline;
  };

  const effectiveTasks = tasks.map((t) => {
    const overdue = !t.completed && isPastDeadline(t.finishDate, t.finishBefore);
    return { ...t, overdue };
  });

  const incompleteTasks = effectiveTasks.find((t) => t.overdue);
  const otherTasks = effectiveTasks.filter((t) => t !== incompleteTasks);
 
  const assignablePeople = caregivers
    .filter((c) => c.recipientId === careRecipient?.recipientInfo.id) // only people caring for this recipient
    .map((c) => `${c.profile.first_name} ${c.profile.last_name}`);
 
  const handleCreateTask = (newTask: Omit<Task, "id" | "completed">) => {
    setTasks((prev) => [
      ...prev,
      { ...newTask, id: `t${Date.now()}`, completed: false },
    ]);
    // TODO: POST to backend / write to mock JSON via api/ layer
  };

  const toggleTaskCompleted = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    // TODO: persist to backend / mock JSON once that layer exists
  };
 
  return (
    <div className="tasksPage">
      <h1 className="title">Today's Tasks</h1>
 
      {incompleteTasks && (() => {
        const HighlightIcon = ICON_MAP[incompleteTasks.icon];
        return (
          <div
            className="incompleteTaskCard"
            onClick={() => toggleTaskCompleted(incompleteTasks.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTaskCompleted(incompleteTasks.id);
              }
            }}
          >
            <span className="incompleteTaskLabel">Incomplete Tasks:</span>
            <div className="incompleteTaskContainer">
              <span className="taskIcon">
                {HighlightIcon && <HighlightIcon />}
              </span>
              <div>
                <div className="incompleteTaskName">{incompleteTasks.name}</div>
                <div className="incompleteTaskTag">Overdue</div>
              </div>
            </div>
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
            </div>
          );
        })}
      </div>
 
      <button
        className="taskCreateButton"
        type="button"
        onClick={() => setModalOpen(true)}
      >
        Create Task
      </button>
 
      <CreateTaskPopup
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateTask}
        assignablePeople={assignablePeople}
      />
    </div>
  );
}

export default Tasks;