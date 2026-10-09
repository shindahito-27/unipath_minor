import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit2, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteEvent, listEvents, saveEvent, setEventStatus } from '../../services/eventApi.js';

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const emptyForm = () => ({ title: '', description: '', date: today(), startTime: '10:00', endTime: '11:00', venue: '', organizer: '', status: 'DRAFT' });
const dateLabel = (value) => new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

function EventForm({ event, onClose, onSave }) {
  const [form, setForm] = useState(() => event ? { ...event, date: new Date(event.date).toISOString().slice(0, 10) } : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = Object.fromEntries(['title', 'description', 'date', 'startTime', 'endTime', 'venue', 'organizer', 'status'].map((key) => [key, form[key]]));
      await onSave(payload, event?._id); onClose();
    }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to save this event.'); }
    finally { setSaving(false); }
  }
  return <div className="event-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-form-title">
    <div className="event-modal-head"><div><span className="eyebrow">CAMPUS PROGRAMMING</span><h2 id="event-form-title">{event ? 'Edit event' : 'Create event'}</h2></div><button className="resource-icon-button" type="button" onClick={onClose} aria-label="Close"><X size={18}/></button></div>
    <form onSubmit={submit}><div className="event-form-grid">
      <label className="event-field event-field-wide"><span>Title</span><input required maxLength="160" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Event title"/></label>
      <label className="event-field event-field-wide"><span>Description</span><textarea maxLength="3000" rows="3" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="What should students know?"/></label>
      <label className="event-field"><span>Date</span><input required type="date" value={form.date} onChange={(e) => setField('date', e.target.value)}/></label>
      <label className="event-field"><span>Organizer</span><input required maxLength="160" value={form.organizer} onChange={(e) => setField('organizer', e.target.value)} placeholder="Department or group"/></label>
      <label className="event-field"><span>Start time</span><input required type="time" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)}/></label>
      <label className="event-field"><span>End time</span><input required type="time" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)}/></label>
      <label className="event-field event-field-wide"><span>Venue</span><input required maxLength="160" value={form.venue} onChange={(e) => setField('venue', e.target.value)} placeholder="Building, hall, or campus location"/></label>
      <label className="event-field"><span>Initial status</span><select value={form.status} onChange={(e) => setField('status', e.target.value)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>
    </div>{error && <p className="resource-form-error" role="alert">{error}</p>}<div className="resource-form-actions"><button className="outline-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}</button></div></form>
  </section></div>;
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [eventForm, setEventForm] = useState(undefined);
  const [workingId, setWorkingId] = useState('');
  const refresh = useCallback(async () => setEvents(await listEvents()), []);
  useEffect(() => { let live = true; refresh().catch((e) => { if (live) setError(e.response?.data?.message || 'Could not load events.'); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [refresh]);
  const visible = useMemo(() => events.filter((event) => `${event.title} ${event.organizer} ${event.venue}`.toLowerCase().includes(search.toLowerCase())), [events, search]);
  async function save(values, id) { await saveEvent(values, id); await refresh(); }
  async function toggleStatus(event) { setWorkingId(event._id); setError(''); try { await setEventStatus(event._id, event.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'); await refresh(); } catch (e) { setError(e.response?.data?.message || 'Could not update event status.'); } finally { setWorkingId(''); } }
  async function remove(event) { if (!window.confirm(`Delete “${event.title}”?`)) return; setWorkingId(event._id); setError(''); try { await deleteEvent(event._id); await refresh(); } catch (e) { setError(e.response?.data?.message || 'Could not delete event.'); } finally { setWorkingId(''); } }

  return <div className="dashboard-page event-page"><div className="page-heading-row"><div><div className="eyebrow">CAMPUS PROGRAMMING</div><h1>Events</h1><p className="page-subtitle">Create campus events and publish updates to student portals.</p></div><button className="primary-button" onClick={() => setEventForm(null)}><Plus size={16}/> Create event</button></div>
    {error && <div className="quiz-error" role="alert">{error}</div>}
    <section className="panel event-list-panel"><div className="event-toolbar"><div><h2>Event calendar</h2><span>{visible.length} events</span></div><label className="quiz-search"><Search size={15}/><input placeholder="Search title, organizer, venue" value={search} onChange={(e) => setSearch(e.target.value)}/></label></div>
      {loading ? <div className="quiz-empty">Loading events…</div> : visible.length === 0 ? <div className="quiz-empty"><CalendarDays size={23}/><strong>No events found</strong><span>Create an event draft or publish one for students.</span></div> : <div className="event-list">{visible.map((event) => <article className="event-row" key={event._id}><div className="event-date-block"><strong>{new Date(event.date).toLocaleDateString(undefined, { day: '2-digit', timeZone: 'UTC' })}</strong><span>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }).toUpperCase()}</span></div><div className="event-row-main"><strong>{event.title}</strong><span>{event.startTime}–{event.endTime} · {event.organizer}</span><small><MapPin size={12}/>{event.venue}</small>{event.description && <p>{event.description}</p>}</div><div className="event-row-actions"><span className={`quiz-status ${event.status === 'PUBLISHED' ? 'status-allocated' : 'status-scheduled'}`}>{event.status}</span><button className="event-action-publish" disabled={workingId === event._id} onClick={() => toggleStatus(event)}>{event.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button><button className="resource-icon-button" aria-label="Edit event" disabled={workingId === event._id} onClick={() => setEventForm(event)}><Edit2 size={15}/></button><button className="resource-icon-button danger-action" aria-label="Delete event" disabled={workingId === event._id} onClick={() => remove(event)}><Trash2 size={15}/></button></div></article>)}</div>}
    </section>{eventForm !== undefined && <EventForm event={eventForm} onClose={() => setEventForm(undefined)} onSave={save}/>}
  </div>;
}
