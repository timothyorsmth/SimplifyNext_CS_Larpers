import { createContext, useContext, useState, useEffect } from 'react';
 
// Task Item
// Could be more complicated, but for demo let's just keep it super simple
export interface Task {
    id: string;
    name: string;
    icon: string; // icon name — actual react-icons component lookup stays in each UI file
    finishDate: string;   // "YYYY-MM-DD"
    finishBefore: string; // "HH:MM"
    repeat: "never" | "daily" | "weekly";
    assignedTo: string; // caregiver / person name
    completed: boolean;
}
 
// Same Task shape, plus the derived `overdue` flag computed below —
// consumers (Tasks.tsx, Dashboard.tsx) should read THIS, not `tasks`
// directly, unless they specifically need the raw un-derived list.
export type EffectiveTask = Task & { overdue: boolean };
 
// TODO: move sample data into a json file
const INITIAL_TASKS: Task[] = [
    {
        id: "t1",
        name: "Morning Meds",
        icon: "pill",
        finishDate: "2024-09-04",
        finishBefore: "09:00",
        repeat: "daily",
        assignedTo: "Elenor Siew",
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
        completed: false,
    },
];
 
type TaskContextValue = {
    tasks: Task[]; // raw state, rarely needed directly
    effectiveTasks: EffectiveTask[]; // tasks + derived `overdue`, use this for rendering
    createTask: (task: Omit<Task, "id" | "completed">) => void;
    toggleTaskCompleted: (id: string) => void;
    deleteTask: (id: string) => void;
};
 
const TaskContext = createContext<TaskContextValue | null>(null);
 
export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
    
    // Recheck at the exact moment the next task is due, rather than polling
    // on a fixed interval — see isPastDeadline below for the actual check.
    const [now, setNow] = useState(() => new Date());
    
    useEffect(() => {
        const upcoming = tasks
        .filter((t) => !t.completed)
        .map((t) => {
            const [h, m] = t.finishBefore.split(":").map(Number);
            const deadline = new Date(t.finishDate);
            deadline.setHours(h, m, 0, 0);
            return deadline.getTime();
        })
        .filter((ms) => ms > now.getTime());
    
        if (upcoming.length === 0) return; // nothing left to become overdue
    
        const nextDeadline = Math.min(...upcoming);
        const msUntilNext = nextDeadline - now.getTime() + 1000; // +1s buffer
    
        const timeout = setTimeout(() => setNow(new Date()), msUntilNext);
        return () => clearTimeout(timeout);
    }, [tasks, now]);
    
    const isPastDeadline = (finishDate: string, finishBefore: string) => {
        const [h, m] = finishBefore.split(":").map(Number);
        const deadline = new Date(finishDate);
        deadline.setHours(h, m, 0, 0);
        return now > deadline;
    };
    
    const effectiveTasks: EffectiveTask[] = tasks.map((t) => ({
        ...t,
        overdue: !t.completed && isPastDeadline(t.finishDate, t.finishBefore),
    }));
    
    const createTask = (newTask: Omit<Task, "id" | "completed">) => {
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

    const deleteTask = (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        // TODO: DELETE to backend / mock JSON once that layer exists
    };
 
    const value: TaskContextValue = {
        tasks,
        effectiveTasks,
        createTask,
        toggleTaskCompleted,
        deleteTask,
    };
 
    return (
        <TaskContext.Provider value={value}>
        {children}
        </TaskContext.Provider>
    );
}
 
export function useTaskInfo() {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTaskInfo must be used within a TaskProvider');
    }
    return context;
}