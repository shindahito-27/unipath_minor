import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, BookOpen, CalendarDays, Clock3, MapPin, CheckCheck, ClipboardCheck } from 'lucide-react';
import api from '../lib/api.js';
import { useNotifications } from '../context/NotificationContext.jsx';

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const localDateKey = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dateLabel = (value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

function SectionHeading({ icon: Icon, title, count, action }) {
  return <div className="portal-section-heading"><div className="portal-section-icon"><Icon size={16}/></div><h2>{title}</h2>{count != null && <span>{count}</span>}{action}</div>;
}

export default function StudentDashboard() {
  const [data, setData] = useState({ events: [], timetable: [], quizzes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const today = new Date();
  const todayKey = localDateKey(today);
  const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const todayDay = WEEKDAYS[today.getDay()];

  const refresh = useCallback(async () => {
    const [eventsResponse, timetableResponse, quizResponse] = await Promise.all([
      api.get('/events'), api.get('/timetable'), api.get('/quizzes'),
    ]);
    setData({ events: eventsResponse.data.data, timetable: timetableResponse.data.data, quizzes: quizResponse.data.data });
  }, []);
  useEffect(() => { let live = true; refresh().catch((e) => { if (live) setError(e.response?.data?.message || 'Could not load your student portal.'); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [refresh]);

  const todayClasses = useMemo(() => data.timetable.filter((entry) => entry.day === todayDay).sort((a, b) => a.startTime.localeCompare(b.startTime)), [data.timetable, todayDay]);
  const upcomingEvents = useMemo(() => data.events.filter((event) => {
    const date = new Date(event.date).toISOString().slice(0, 10);
    return event.status === 'PUBLISHED' && (date > todayKey || (date === todayKey && event.endTime >= currentTime));
  }).slice(0, 4), [data.events, todayKey, currentTime]);
  const upcomingQuizzes = useMemo(() => data.quizzes.filter((quiz) => {
    const date = new Date(quiz.date).toISOString().slice(0, 10);
    return quiz.status !== 'CANCELLED' && (date > todayKey || (date === todayKey && quiz.endTime >= currentTime));
  }).slice(0, 4), [data.quizzes, todayKey, currentTime]);
  async function readNotification(notification) {
    if (notification.read) return;
    try { await markRead(notification._id); }
    catch (e) { setError(e.response?.data?.message || 'Could not update notification.'); }
  }
  async function readAll() {
    try { await markAllRead(); }
    catch (e) { setError(e.response?.data?.message || 'Could not update notifications.'); }
  }

  return <div className="dashboard-page student-portal-page">
    <div className="page-heading-row"><div><div className="eyebrow">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div><h1>Your student portal</h1><p className="page-subtitle">Today’s classes, upcoming campus activities, and important updates.</p></div><div className="term-pill"><span className="status-dot"/> Student workspace</div></div>
    {error && <div className="quiz-error" role="alert"><AlertCircle size={15}/>{error}</div>}
    {loading ? <div className="portal-loading">Loading your campus information…</div> : <>
      <section className="portal-overview-grid">
        <article className="panel portal-panel portal-timetable"><SectionHeading icon={Clock3} title="Today's timetable" count={todayClasses.length}/>
          {todayClasses.length ? <div className="portal-schedule-list">{todayClasses.map((entry) => <div className="portal-schedule-row" key={entry._id}><div className="portal-time"><strong>{entry.startTime}</strong><span>{entry.endTime}</span></div><div className="portal-schedule-copy"><strong>{entry.subject?.code} · {entry.subject?.name}</strong><span>{entry.section?.name} · {entry.faculty?.name}</span></div><div className="portal-location"><MapPin size={13}/>{entry.room?.name}</div></div>)}</div> : <div className="portal-empty">No classes are scheduled for today.</div>}
        </article>
        <article className="panel portal-panel portal-notifications"><SectionHeading icon={Bell} title="Notifications" count={unreadCount} action={unreadCount > 0 && <button className="portal-text-action" onClick={readAll}><CheckCheck size={13}/> Mark all read</button>}/>
          {notifications.length ? <div className="portal-notification-list">{notifications.slice(0, 6).map((item) => <button type="button" className={`portal-notification${item.read ? '' : ' unread'}`} key={item._id} onClick={() => readNotification(item)}><span className={`notification-type-dot type-${item.type.toLowerCase()}`}/><span className="portal-notification-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</small></span>{!item.read && <i aria-label="Unread"/>}</button>)}</div> : <div className="portal-empty">You’re all caught up. New campus updates will appear here.</div>}
        </article>
      </section>
      <section className="portal-lower-grid">
        <article className="panel portal-panel"><SectionHeading icon={CalendarDays} title="Upcoming events" count={upcomingEvents.length}/>
          {upcomingEvents.length ? <div className="portal-item-list">{upcomingEvents.map((event) => <div className="portal-event-item" key={event._id}><div className="portal-date-tile"><strong>{new Date(event.date).toLocaleDateString(undefined, { day: '2-digit', timeZone: 'UTC' })}</strong><span>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</span></div><div className="portal-item-copy"><strong>{event.title}</strong><span>{event.startTime}–{event.endTime} · {event.organizer}</span><small><MapPin size={12}/>{event.venue}</small>{event.description && <p>{event.description}</p>}</div></div>)}</div> : <div className="portal-empty">There are no published upcoming events.</div>}
        </article>
        <article className="panel portal-panel"><SectionHeading icon={ClipboardCheck} title="Upcoming quizzes" count={upcomingQuizzes.length}/>
          {upcomingQuizzes.length ? <div className="portal-item-list">{upcomingQuizzes.map((quiz) => <div className="portal-quiz-item" key={quiz._id}><div className="portal-quiz-icon"><BookOpen size={16}/></div><div className="portal-item-copy"><strong>{quiz.title}</strong><span>{quiz.subject?.code} · {quiz.section?.name}</span><small><CalendarDays size={12}/>{dateLabel(quiz.date)} · {quiz.startTime}–{quiz.endTime}</small>{quiz.allocations?.length ? <div className="portal-quiz-rooms">{quiz.allocations.map((allocation) => <span key={allocation._id}><MapPin size={11}/>{allocation.room?.name}: rolls {allocation.rollNumberStart}–{allocation.rollNumberEnd}</span>)}</div> : <small className="portal-pending">Venue allocation pending</small>}</div></div>)}</div> : <div className="portal-empty">There are no upcoming quizzes.</div>}
        </article>
      </section>
    </>}
    <div className="footer-note"><span className="status-dot"/> Student workspace · your academic information is up to date</div>
  </div>;
}
