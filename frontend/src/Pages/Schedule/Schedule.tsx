import { useState } from 'react';
import { useCareRecipientInfo } from '../../Context/CareRecipientContext';
import { FaPlus } from 'react-icons/fa';
import './Schedule.css';

export interface Appointment {
  id: string;
  type: string;                          // was "title"
  date: string;                          // combined ISO datetime, e.g. "2026-01-11T14:40:00"
  provider: string;
  location: string;
  status: 'upcoming' | 'completed';
  notes: string | null;
}

interface Props {
  defaultDate: string;
  onClose: () => void;
  onCreate: (appointment: Omit<Appointment, 'id'>) => void;
}

function NewEventPopup({ defaultDate, onClose, onCreate }: Props) {
  const [type, setType] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('12:00');
  const [provider, setProvider] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    if (!type.trim()) return; // guard against empty submissions

    // The real schema stores date+time as a single ISO datetime string
    // (e.g. "2026-01-11T14:40:00"), not separate fields — combine them here
    // so the rest of the app only ever deals with one `date` field.
    const combinedDate = `${date}T${time}:00`;

    onCreate({
      type,
      date: combinedDate,
      provider,
      location,
      status: 'upcoming', // new appointments created from the UI are always upcoming
      notes: notes.trim() === '' ? null : notes,
    });
  }

  return (
    <div className="popupOverlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <input
          className="popupInput"
          placeholder="Enter Appointment Name"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <div className="popupRow">
          <input
            type="date"
            className="popupInput popupInputHalf"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="time"
            className="popupInput popupInputHalf"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div className="popupSectionLabel">Provider</div>
        <input
          className="popupInput"
          placeholder="e.g. Dr. Wei Lim"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        />

        <div className="popupSectionLabel">Location</div>
        <input
          className="popupInput"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div className="popupSectionLabel">Notes (optional)</div>
        <input
          className="popupInput"
          placeholder="Any additional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button className="createEventBtn" onClick={handleSubmit}>
          Create Event
        </button>
      </div>
    </div>
  );
}

const HOURS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // display range; extend later if needed
const ROW_HEIGHT = 56; // px — must match --rowHeight in CSS

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function dayLabel(d: Date): { month: string; day: string } {
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.getDate().toString(),
  };
}

// The mock data's `date` field is a single ISO datetime string
// ("2026-01-11T14:40:00"), not separate date/time fields. Split it
// once here so the rest of the component only deals with `dateOnly`
// (for day matching) and `hour`/`minute` (for vertical position).
function splitDateTime(iso: string) {
  const [dateOnly, timePart] = iso.split('T');
  const [hourStr, minuteStr] = (timePart ?? '00:00').split(':');
  return { dateOnly, hour: Number(hourStr), minute: Number(minuteStr) };
}

export default function Schedule() {
    const { appointments, loading } = useCareRecipientInfo();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [strip, setStrip] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    

    const today = new Date();
    const todayISO = toISODate(today);
    const selectedISO = toISODate(selectedDate);
    
    const [localAppointments, setLocalAppointments] = useState<Appointment[]>([]);

    function handleCreateAppointment(appointment: Omit<Appointment, 'id'>) {
        const newAppointment: Appointment = {
            ...appointment,
            id: crypto.randomUUID(), // temporary client-side id; swap for server-assigned id once a real endpoint exists
        };
        setLocalAppointments((prev) => [...prev, newAppointment]);
        setShowPopup(false);
    }

    const visibleDays = Array.from({ length: 4 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + strip + i);
        return d;
    });

    // loading is exposed by the context rather than an early return here —
    // never unmount children conditionally; gate the JSX below instead.

    const dayAppointments: Appointment[] = loading
    ? []
    : [...appointments, ...localAppointments]
        .filter((a): a is Appointment & { date: string } => a.date !== null)
        .filter((a) => splitDateTime(a.date).dateOnly === selectedISO)
        .sort((a, b) => a.date.localeCompare(b.date));

    function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
    }

    function handleTouchEnd(e: React.TouchEvent) {
        if (touchStartX === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX;
        const SWIPE_THRESHOLD = 50;
        if (delta > SWIPE_THRESHOLD) setStrip((s) => s - 4);
        else if (delta < -SWIPE_THRESHOLD) setStrip((s) => s + 4);
        setTouchStartX(null);
    }

    if (loading) return <div className="scheduleLoading">Loading schedule…</div>;

    return (
        <div className="schedule">
        <div
            className="dayStrip"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {visibleDays.map((d) => {
            const iso = toISODate(d);
            const { month, day } = dayLabel(d);
            const isToday = iso === todayISO;
            const isSelected = iso === selectedISO;
            return (
                <button
                key={iso}
                className={`dayCell ${isSelected ? 'dayCellSelected' : ''}`}
                onClick={() => setSelectedDate(d)}
                >
                <span className="dayMonth">{month}</span>
                <span className="dayNum">{day}</span>
                {isToday && <span className="todayDot" />}
                </button>
            );
            })}
        </div>

        <div className="timeline">
            {HOURS.map((hour) => (
            <div key={hour} className="timelineRow" style={{ height: ROW_HEIGHT }}>
                <span className="hourLabel">{hour}</span>
                <div className="hourLine" />
            </div>
            ))}

            {dayAppointments.map((appt) => {
            const { hour, minute } = splitDateTime(appt.date);
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const hourIndex = HOURS.indexOf(displayHour);
            if (hourIndex === -1) return null; // appointment falls outside displayed hour range

            const top = hourIndex * ROW_HEIGHT + (minute / 60) * ROW_HEIGHT;

            return (
                <div
                key={appt.id}
                className={`eventBlock ${appt.status === 'completed' ? 'eventBlockCompleted' : ''}`}
                style={{ top }}
                >
                <strong>{appt.type}</strong>
                <span>{appt.location}</span>
                </div>
            );
            })}
        </div>

        <button className="fab" onClick={() => setShowPopup(true)} aria-label="Add scheduled event">
            <FaPlus />
        </button>

        {showPopup && (
            <NewEventPopup
                defaultDate={selectedISO}
                onClose={() => setShowPopup(false)}
                onCreate={handleCreateAppointment}
            />
        )}
        </div>
    );
}