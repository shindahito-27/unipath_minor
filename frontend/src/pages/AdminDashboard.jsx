import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Bell, CalendarDays, DoorOpen, GraduationCap, Users, BookOpenCheck, Clock3, RefreshCw, MapPin } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../lib/api.js';

const COLORS = ['#526bd7', '#7588e0', '#95a2e8', '#b7c0ef', '#d3d9f7'];
const dateLabel = (value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const timeLabel = (value) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function MetricCard({ label, value, detail, icon: Icon, color, to }) {
  const content = <><div className="analytics-metric-top"><span>{label}</span><i className={`analytics-icon ${color}`}><Icon size={16}/></i></div><strong>{value.toLocaleString()}</strong><small>{detail}</small></>;
  return to ? <Link to={to} className="analytics-metric-card">{content}</Link> : <article className="analytics-metric-card">{content}</article>;
}

function PanelHeader({ eyebrow, title, detail, link }) {
  return <div className="analytics-panel-header"><div><span className="analytics-eyebrow">{eyebrow}</span><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{link && <Link to={link.to} className="analytics-link">{link.label}<ArrowRight size={14}/></Link>}</div>;
}

function EmptyState({ children }) { return <div className="analytics-empty">{children}</div>; }

function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="analytics-tooltip"><strong>{dateLabel(label)}</strong>{payload.map((entry) => <span key={entry.dataKey}><i style={{ background: entry.color }}/>{entry.name}: {entry.value}</span>)}</div>;
}

function UtilizationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const room = payload[0].payload;
  return <div className="analytics-tooltip"><strong>{room.name}</strong><span>{room.isActive ? 'Active room' : 'Inactive room'}</span><span>Seat utilization: {room.utilizationPercent}%</span><span>{room.totalSessions} saved sessions</span><span>{room.studentHours} / {room.capacityHours} seat-hours</span></div>;
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();

  async function load({ quiet = false } = {}) {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try { const { data } = await api.get('/analytics/admin'); setAnalytics(data.data); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not load analytics.'); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const current = analytics?.current;
  const upcoming = analytics?.upcoming;
  const recent = analytics?.recent;
  const chartRooms = analytics?.utilization?.rooms?.slice(0, 10) || [];

  return <div className="dashboard-page analytics-page">
    <div className="page-heading-row analytics-heading"><div><div className="eyebrow">{today} · CAMPUS OVERVIEW</div><h1>Admin dashboard</h1><p className="page-subtitle">A live view of academic operations and campus activity.</p></div><button className="outline-button analytics-refresh" onClick={() => load({ quiet: true })} disabled={loading || refreshing}><RefreshCw size={14} className={refreshing ? 'analytics-spin' : ''}/>{refreshing ? 'Updating…' : 'Refresh data'}</button></div>
    {error && <div className="analytics-error" role="alert"><AlertTriangle size={16}/><span>{error}</span><button onClick={() => load({ quiet: true })}>Retry</button></div>}
    {loading && !analytics ? <div className="analytics-loading"><span className="analytics-spinner"/>Loading live campus data…</div> : analytics && <>
      <section className="analytics-section"><div className="analytics-section-label"><span>01</span><div><strong>Current state</strong><small>Latest records and active campus resources</small></div></div>
        <div className="analytics-kpi-grid">
          <MetricCard label="Total students" value={current.totalStudents} detail="Student accounts" icon={Users} color="blue"/>
          <MetricCard label="Faculty members" value={current.totalFaculty} detail="Faculty directory" icon={GraduationCap} color="violet" to="/admin/faculty"/>
          <MetricCard label="Rooms" value={current.totalRooms} detail={`${current.activeRooms} currently active`} icon={DoorOpen} color="green" to="/admin/rooms"/>
          <MetricCard label="Active events" value={current.activeEvents} detail="Published and not yet ended" icon={CalendarDays} color="orange" to="/admin/events"/>
          <MetricCard label="Timetable conflicts" value={current.timetableConflictCount} detail="Detected in saved timetable" icon={AlertTriangle} color="red" to="/admin/timetable"/>
          <MetricCard label="Upcoming quizzes" value={upcoming.quizCount} detail="Scheduled, not cancelled" icon={BookOpenCheck} color="blue" to="/admin/quizzes"/>
        </div>
      </section>

      <section className="analytics-section"><div className="analytics-section-label"><span>02</span><div><strong>Historical activity &amp; utilization</strong><small>Computed from saved timetable and quiz records</small></div></div>
        <div className="analytics-chart-grid">
          <article className="panel analytics-panel"><PanelHeader eyebrow="ROOM UTILIZATION" title="Seat utilization by room" detail="Seat-hours filled ÷ seat capacity across saved bookings."/><div className="analytics-chart-note">Timetable records are recurring weekly slots; quizzes use saved venue allocations. This measures fill within recorded bookings, not all campus opening hours.</div>
            {chartRooms.length ? <div className="analytics-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRooms} layout="vertical" margin={{ top: 7, right: 24, left: 0, bottom: 4 }}><CartesianGrid stroke="#eef0f4" horizontal={false}/><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#9298a4', fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={62} tick={{ fill: '#7e8592', fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip content={<UtilizationTooltip/>} cursor={{ fill: '#f8f9fc' }}/><Bar dataKey="utilizationPercent" name="Seat utilization" radius={[0, 5, 5, 0]} barSize={15}>{chartRooms.map((room, index) => <Cell key={room.roomId} fill={room.isActive ? COLORS[index % COLORS.length] : '#c5c9d2'}/>)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyState>No rooms are available to chart.</EmptyState>}
            <div className="analytics-legend"><span>Combined saved bookings: timetable and quiz allocations</span><small>Hover a bar to see booking counts.</small></div>
          </article>
          <article className="panel analytics-panel"><PanelHeader eyebrow="LAST 7 DAYS" title="Timetable &amp; quiz activity" detail="Records created or updated each day."/>
            <div className="analytics-chart-legend"><span><i className="legend-dot timetable-dot"/>Timetable</span><span><i className="legend-dot quiz-dot"/>Quizzes</span></div>
            <div className="analytics-chart-wrap analytics-line-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.activity} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}><CartesianGrid stroke="#eef0f4" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })} tick={{ fill: '#9298a4', fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: '#9298a4', fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip content={<ActivityTooltip/>}/><Line type="monotone" dataKey="timetable" name="Timetable" stroke="#526bd7" strokeWidth={2.5} dot={{ r: 3, fill: '#526bd7' }} activeDot={{ r: 5 }}/><Line type="monotone" dataKey="quizzes" name="Quizzes" stroke="#e2a15f" strokeWidth={2.5} dot={{ r: 3, fill: '#e2a15f' }} activeDot={{ r: 5 }}/></LineChart></ResponsiveContainer></div>
          </article>
        </div>
      </section>

      <section className="analytics-section"><div className="analytics-section-label"><span>03</span><div><strong>Upcoming activity</strong><small>Published events and scheduled quizzes</small></div></div>
        <div className="analytics-lists-grid">
          <article className="panel analytics-panel"><PanelHeader eyebrow="CAMPUS CALENDAR" title="Upcoming events" detail={`${upcoming.events.length} shown`} link={{ to: '/admin/events', label: 'Manage events' }}/>
            {upcoming.events.length ? <div className="analytics-record-list">{upcoming.events.map((event) => <div className="analytics-record" key={event._id}><div className="analytics-date-tile"><strong>{new Date(event.date).toLocaleDateString(undefined, { day: '2-digit', timeZone: 'UTC' })}</strong><span>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</span></div><div className="analytics-record-copy"><strong>{event.title}</strong><span>{event.startTime}–{event.endTime} · {event.organizer}</span><small><MapPin size={12}/>{event.venue}</small></div></div>)}</div> : <EmptyState>No upcoming published events.</EmptyState>}
          </article>
          <article className="panel analytics-panel"><PanelHeader eyebrow="ASSESSMENTS" title="Upcoming quizzes" detail={`${upcoming.quizzes.length} shown`} link={{ to: '/admin/quizzes', label: 'Manage quizzes' }}/>
            {upcoming.quizzes.length ? <div className="analytics-record-list">{upcoming.quizzes.map((quiz) => <div className="analytics-record" key={quiz._id}><div className="analytics-date-tile quiz-date-tile"><strong>{new Date(quiz.date).toLocaleDateString(undefined, { day: '2-digit', timeZone: 'UTC' })}</strong><span>{new Date(quiz.date).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</span></div><div className="analytics-record-copy"><strong>{quiz.title}</strong><span>{quiz.subject?.code} · {quiz.section?.name} · {quiz.studentCount} students</span><small><Clock3 size={12}/>{quiz.startTime}–{quiz.endTime}<i className={`analytics-status-dot status-dot-${quiz.status.toLowerCase().replaceAll('_', '-')}`}/>{quiz.status.replaceAll('_', ' ')}</small></div></div>)}</div> : <EmptyState>No upcoming quizzes.</EmptyState>}
          </article>
        </div>
      </section>

      <section className="analytics-section"><div className="analytics-section-label"><span>04</span><div><strong>Recent operations</strong><small>Latest notification deliveries and timetable changes</small></div></div>
        <div className="analytics-lists-grid analytics-recent-grid">
          <article className="panel analytics-panel"><PanelHeader eyebrow="NOTIFICATION ACTIVITY" title="Recent notifications" detail="Grouped by message and delivery minute."/>
            {recent.notifications.length ? <div className="analytics-record-list">{recent.notifications.map((notification, index) => <div className="analytics-notification" key={`${notification.type}-${notification.createdAt}-${index}`}><div className={`analytics-notification-icon notification-${notification.type.toLowerCase()}`}><Bell size={14}/></div><div className="analytics-record-copy"><strong>{notification.title}</strong><span>{notification.message}</span><small>{timeLabel(notification.createdAt)} · {notification.recipients} recipient{notification.recipients === 1 ? '' : 's'}</small></div></div>)}</div> : <EmptyState>No notifications have been recorded.</EmptyState>}
          </article>
          <article className="panel analytics-panel"><PanelHeader eyebrow="TIMETABLE HISTORY" title="Recent timetable changes" detail="Most recently created or edited saved entries." link={{ to: '/admin/timetable', label: 'Open timetable' }}/>
            {recent.timetableChanges.length ? <div className="analytics-record-list">{recent.timetableChanges.map((entry) => <div className="analytics-timetable-change" key={entry._id}><div className="analytics-activity-icon"><Activity size={15}/></div><div className="analytics-record-copy"><strong>{entry.subject?.code} · {entry.section?.name}</strong><span>{entry.day} · {entry.startTime}–{entry.endTime} · {entry.room?.name}</span><small>{entry.createdBy?.name || 'Admin'} · {new Date(entry.updatedAt || entry.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></div></div>)}</div> : <EmptyState>No timetable changes have been recorded.</EmptyState>}
          </article>
        </div>
      </section>
      <div className="analytics-footer"><Activity size={13}/> Data loaded directly from the UniPath database <span>·</span><button onClick={() => load({ quiet: true })} disabled={refreshing}>Refresh now</button></div>
    </>}
  </div>;
}
