import { useState } from 'react';
import { useCareRecipientInfo } from '../../Context/CareRecipientContext';
import type { Appointment } from '../../Context/CareRecipientContext';
import { FaPlus, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Schedule.css';

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
    if (!type.trim()) return;

    const combinedDate = `${date}T${time}:00`;

    onCreate({
      type,
      date: combinedDate,
      provider,
      location,
      status: 'upcoming',
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = 56; // px — must match --rowHeight in CSS

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayLabel(d: Date): { month: string; day: string } {
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.getDate().toString(),
  };
}

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

function formatTimeLabel(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const paddedMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${paddedMinute} ${period}`;
}

function splitDateTime(iso: string) {
  const [dateOnly, timePart] = iso.split('T');
  const [hourStr, minuteStr] = (timePart ?? '00:00').split(':');
  return { dateOnly, hour: Number(hourStr), minute: Number(minuteStr) };
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

type ViewMode = 'day' | 'week' | 'month';

export default function Schedule() {
  const { appointments, loading, addAppointment } = useCareRecipientInfo();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayStripStart, setDayStripStart] = useState(new Date());
  const [showPopup, setShowPopup] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  const today = new Date();
  const todayISO = toISODate(today);
  const selectedISO = toISODate(selectedDate);

  function handleCreateAppointment(appointment: Omit<Appointment, 'id'>) {
    addAppointment(appointment);
    setShowPopup(false);
  }

  const visibleDays = Array.from({ length: 4 }, (_, i) => addDays(dayStripStart, i));

  const validAppointments: (Appointment & { date: string })[] = loading
    ? []
    : appointments.filter((a): a is Appointment & { date: string } => a.date !== null);
  
  console.log('appointments:', validAppointments); // temporary debug line

  const dayAppointments = validAppointments
    .filter((a) => splitDateTime(a.date).dateOnly === selectedISO)
    .sort((a, b) => a.date.localeCompare(b.date));

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 50;
    if (delta > SWIPE_THRESHOLD) setDayStripStart((d) => addDays(d, -4));
    else if (delta < -SWIPE_THRESHOLD) setDayStripStart((d) => addDays(d, 4));
    setTouchStartX(null);
  }

  function goToDay(d: Date) {
    setSelectedDate(d);
    const iso = toISODate(d);
    const stripISOs = Array.from({ length: 4 }, (_, i) => toISODate(addDays(dayStripStart, i)));
    if (!stripISOs.includes(iso)) {
      setDayStripStart(d);
    }
    setViewMode('day');
  }

  function goPrevWeek() {
    setSelectedDate((d) => addDays(d, -7));
  }

  function goNextWeek() {
    setSelectedDate((d) => addDays(d, 7));
  }


  if (loading) return <div className="scheduleLoading">Loading schedule…</div>;

  return (
    <div className="schedule">
      <div className="viewToggleRow">
        {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`viewToggleBtn ${viewMode === mode ? 'viewToggleBtnActive' : ''}`}
            onClick={() => setViewMode(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {viewMode === 'day' && (
        <>
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
                <span className="hourLabel">{formatHourLabel(hour)}</span>
                <div className="hourLine" />
              </div>
            ))}

            {dayAppointments.map((appt) => {
              const { hour, minute } = splitDateTime(appt.date);
              const top = hour * ROW_HEIGHT + (minute / 60) * ROW_HEIGHT;

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
        </>
      )}

      {viewMode === 'week' && (
        <WeekView
          selectedDate={selectedDate}
          appointments={validAppointments}
          onSelectDay={goToDay}
          onPrev={goPrevWeek}
          onNext={goNextWeek}
        />
      )}

      {viewMode === 'month' && (
        <MonthView
          selectedDate={selectedDate}
          appointments={validAppointments}
          onOpenDay={goToDay}
        />
      )}

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

// --- Week view: chips now show name + location, not just name ---

interface WeekViewProps {
  selectedDate: Date;
  appointments: (Appointment & { date: string })[];
  onSelectDay: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

function WeekView({ selectedDate, appointments, onSelectDay, onPrev, onNext }: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayISO = toISODate(new Date());

  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <div className="weekView">
      <div className="rangeNavRow">
        <button type="button" className="rangeNavBtn" onClick={onPrev} aria-label="Previous week">
          <FaChevronLeft />
        </button>
        <span className="rangeNavLabel">{rangeLabel}</span>
        <button type="button" className="rangeNavBtn" onClick={onNext} aria-label="Next week">
          <FaChevronRight />
        </button>
      </div>

      {days.map((d) => {
        const iso = toISODate(d);
        const { month, day } = dayLabel(d);
        const isToday = iso === todayISO;
        const dayAppts = appointments
          .filter((a) => splitDateTime(a.date).dateOnly === iso)
          .sort((a, b) => a.date.localeCompare(b.date));

        return (
          <button key={iso} className="weekDayCard" onClick={() => onSelectDay(d)}>
            <div className="weekDayHeader">
              <span className="weekDayMonth">{month}</span>
              <span className={`weekDayNum ${isToday ? 'weekDayNumToday' : ''}`}>{day}</span>
            </div>
            <div className="weekDayEvents">
              {dayAppts.length === 0 && <span className="weekDayEmpty">No events</span>}
              {dayAppts.slice(0, 3).map((a) => {
                const { hour, minute } = splitDateTime(a.date);
                return (
                  <div key={a.id} className="weekDayEventChip">
                    <span className="weekDayEventName">{a.type}</span>
                    <span className="weekDayEventMeta">
                      {formatTimeLabel(hour, minute)}
                      {a.location && ` · ${a.location}`}
                    </span>
                  </div>
                );
              })}
              {dayAppts.length > 3 && (
                <span className="weekDayMore">+{dayAppts.length - 3} more</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// --- Month view: tapping a day shows a summary panel below the grid
// (name, time, location per event) instead of navigating immediately —
// there's no room to show that detail inside a tiny month cell. A
// "View full day" button in the panel jumps into Day view when wanted.

interface MonthViewProps {
  selectedDate: Date;
  appointments: (Appointment & { date: string })[];
  onOpenDay: (d: Date) => void;
}

function MonthView({ selectedDate, appointments, onOpenDay }: MonthViewProps) {
  const [visibleMonth, setVisibleMonth] = useState(selectedDate);
  const [peekedDate, setPeekedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const todayISO = toISODate(new Date());
  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function handlePrev() {
    setVisibleMonth((d) => addMonths(d, -1));
    setPeekedDate(null);
  }

  function handleNext() {
    setVisibleMonth((d) => addMonths(d, 1));
    setPeekedDate(null);
  }

  const peekedAppointments = peekedDate
    ? appointments
        .filter((a) => splitDateTime(a.date).dateOnly === toISODate(peekedDate))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="monthView">
      <div className="rangeNavRow">
        <button type="button" className="rangeNavBtn" onClick={handlePrev} aria-label="Previous month">
          <FaChevronLeft />
        </button>
        <span className="rangeNavLabel">{monthLabel}</span>
        <button type="button" className="rangeNavBtn" onClick={handleNext} aria-label="Next month">
          <FaChevronRight />
        </button>
      </div>
      <div className="monthGrid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
          <div key={i} className="monthWeekdayLabel">{label}</div>
        ))}
        {days.map((d) => {
          const iso = toISODate(d);
          const isToday = iso === todayISO;
          const isCurrentMonth = d.getMonth() === visibleMonth.getMonth();
          const isPeeked = peekedDate !== null && toISODate(peekedDate) === iso;
          const hasEvents = appointments.some((a) => splitDateTime(a.date).dateOnly === iso);

          return (
            <button
              key={iso}
              className={`monthDayCell ${isToday ? 'monthDayCellToday' : ''} ${!isCurrentMonth ? 'monthDayCellMuted' : ''} ${isPeeked ? 'monthDayCellPeeked' : ''}`}
              onClick={() => setPeekedDate(d)}
            >
              <span>{d.getDate()}</span>
              {hasEvents && <span className="monthDayDot" />}
            </button>
          );
        })}
      </div>

      {peekedDate && (
        <div className="monthPeekPanel">
          <div className="monthPeekHeader">
            <span className="monthPeekDate">
              {peekedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <button
              type="button"
              className="monthPeekViewDayBtn"
              onClick={() => onOpenDay(peekedDate)}
            >
              View full day
            </button>
          </div>

          {peekedAppointments.length === 0 && (
            <div className="monthPeekEmpty">No events scheduled.</div>
          )}

          {peekedAppointments.map((a) => {
            const { hour, minute } = splitDateTime(a.date);
            return (
              <div key={a.id} className="monthPeekEvent">
                <div className="monthPeekEventName">{a.type}</div>
                <div className="monthPeekEventMeta">
                  {formatTimeLabel(hour, minute)}
                  {a.location && ` · ${a.location}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}