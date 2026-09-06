// Import files
import './Tasks.css';

// Import dependencies
import { useState, useEffect } from "react";
import type { IconType } from "react-icons";
import { FiUser } from "react-icons/fi";
import { FaPills, FaCar } from "react-icons/fa";
import { useCareRecipientInfo } from "../../Context/CareRecipientContext";
import { getCaregiverInfo } from '../../Context/CaregiverContext';
import { useTaskInfo, type Task } from '../../Context/TaskContext';

// TODO: add task creation agent

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
  const { careRecipient } = useCareRecipientInfo();
  const { caregivers } = getCaregiverInfo();
  const { effectiveTasks, createTask, toggleTaskCompleted } = useTaskInfo();
  const [isModalOpen, setModalOpen] = useState(false);

  const incompleteTasks = effectiveTasks.find((t) => t.overdue);
  const otherTasks = effectiveTasks.filter((t) => t !== incompleteTasks);

  const assignablePeople = caregivers
    .filter((c) => c.recipientId === careRecipient?.recipientInfo.id) // only people caring for this recipient
    .map((c) => `${c.profile.first_name} ${c.profile.last_name}`);

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
        onCreate={createTask}
        assignablePeople={assignablePeople}
      />
    </div>
  );
}

export default Tasks;