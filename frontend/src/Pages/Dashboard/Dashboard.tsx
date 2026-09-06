// Import Dependencies
import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import { FaPills, FaCar } from "react-icons/fa";
 
// Import files
import './Dashboard.css';
 
import { getCaregiverInfo } from '../../Context/CaregiverContext';
import { useCareRecipientInfo } from '../../Context/CareRecipientContext';
import { useTaskInfo } from '../../Context/TaskContext';
 
const ICON_MAP: Record<string, IconType> = {
  pill: FaPills,
  car: FaCar,
};
 
// ----------------------------------------------------------------------------
// Small formatting helpers
// ----------------------------------------------------------------------------
function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
 
function formatDateHeader(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
 
function Dashboard() {
  const { activeCaregiver, loading } = getCaregiverInfo();
  const { appointments } = useCareRecipientInfo();
  const { effectiveTasks } = useTaskInfo();
 
  const defaultProfilePic = '/Assets/profile_pic_default.jpg';
  const pictureUrl = (loading ? defaultProfilePic : activeCaregiver?.profile_picture_url) ?? defaultProfilePic;
 
  const profilePictureStyle = {
    backgroundImage: `url(${pictureUrl})`,
  };
 
  // Only appointments that have a real date and are still in the future
  const upcoming = appointments
    .filter((a): a is typeof a & { date: string } => a.date !== null)
    .map((a) => ({ ...a, dateObj: new Date(a.date) }))
    .filter((a) => a.dateObj.getTime() >= Date.now())
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
 
  // Group just the soonest calendar day's appointments together, matching
  // the mockup's single date header over a short list of same-day activities
  const nextDateKey = upcoming[0]?.dateObj.toDateString();
  const todaysUpcoming = upcoming.filter((a) => a.dateObj.toDateString() === nextDateKey);
 
  return (
    <div className="Dashboard">
      {/* Welcome Banner */}
      <div className="WelcomeHeader">
        <div>
          <p>Good morning,</p>
          <h1 className='CaregiverName'>{loading ? '' : `${activeCaregiver?.profile.first_name ?? 'User'}.`}</h1>
        </div>
        <div className="ProfilePicContainer">
          <div className="UserProfilePic" style={profilePictureStyle}></div>
        </div>
      </div>
 
        {/* Upcoming Activities */}
        <Link to="/schedule" className="UpcomingActivitiesCard">
            <div className="UpcomingActivitiesLabel">
            <strong>Upcoming activities:</strong>
            {nextDateKey && <span className="UpcomingActivitiesDate">{formatDateHeader(new Date(nextDateKey))}</span>}
            </div>
            <div className="UpcomingActivitiesList">
            {todaysUpcoming.length === 0 && (
                <div className="UpcomingActivityRow UpcomingActivityRow--empty">No upcoming activities</div>
            )}
            {todaysUpcoming.map((a) => (
                <div key={a.id} className="UpcomingActivityRow">
                <span className="UpcomingActivityTime">{formatTime(a.dateObj)}</span>
                <span className="UpcomingActivityType">{a.type}</span>
                </div>
            ))}
            </div>
        </Link>
 
        {/* Your Tasks */}
        <div className="YourTasksSection">
            <h2 className="SectionTitle">Your Tasks:</h2>
            <div className="YourTasksRow">
            {effectiveTasks.map((task) => {
                const TaskIcon = ICON_MAP[task.icon];
                return (
                <div key={task.id} className={`DashboardTaskCard ${task.overdue ? "DashboardTaskCard--overdue" : "DashboardTaskCard--ontrack"}`}>
                    <span className="DashboardTaskIcon">{TaskIcon && <TaskIcon />}</span>
                    <div>
                    <div className="DashboardTaskName">{task.name}</div>
                    <div className="DashboardTaskStatus">
                        {task.overdue ? "Undone" : `At ${task.finishBefore}`}
                    </div>
                    </div>
                </div>
                );
            })}
            </div>
        </div>
        </div>
    );
}

export default Dashboard;