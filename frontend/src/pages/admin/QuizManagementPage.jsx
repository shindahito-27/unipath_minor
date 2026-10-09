import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardCheck, Plus, Search, Users, Trash2, UserRoundCheck, Clock3 } from 'lucide-react';
import api from '../../lib/api.js';
import { allocateQuiz, createQuiz, deleteQuiz, listQuizzes } from '../../services/quizApi.js';

const dateValue = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const displayDate = (date) => new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

function AllocationResult({ result }) {
  if (!result) return null;
  return <section className={`quiz-result ${result.success ? 'quiz-result-success' : 'quiz-result-partial'}`} aria-live="polite">
    <div className="quiz-result-heading"><div className="quiz-result-icon">{result.success ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}</div><div><h2>{result.success ? 'Venue allocation complete' : 'Allocation needs attention'}</h2><p>{result.success ? 'Every student has a seat. Each assigned room is listed below.' : result.reason}</p></div></div>
    <div className="quiz-result-metrics"><div><b>{result.allocatedStudents}<small> / {result.totalStudents}</small></b><span>Students allocated</span></div><div><b>{result.studentsRemaining}</b><span>Students remaining</span></div><div><b>{result.roomsUsed}</b><span>Venues used</span></div></div>
    {result.allocations.length > 0 && <div className="quiz-allocation-table-wrap"><table className="quiz-allocation-table"><thead><tr><th>Venue</th><th>Capacity use</th><th>Roll numbers</th><th>Faculty booking</th></tr></thead><tbody>{result.allocations.map((item) => { const room = item.room; const utilization = Math.round((item.allocatedStudents / room.capacity) * 100); return <tr key={room._id}><td><strong>{room.name}</strong><span>{room.building} · Floor {room.floor} · {room.type.replaceAll('_', ' ')}</span></td><td>{item.allocatedStudents}/{room.capacity} seats · {utilization}%</td><td><span className="quiz-roll-range">{item.rollNumberStart}–{item.rollNumberEnd}</span></td><td>{item.faculty?.map((person) => person.name || person).join(', ') || 'Not requested'}</td></tr>; })}</tbody></table></div>}
    {result.studentsRemaining > 0 && <div className="quiz-failure-note"><strong>{result.studentsRemaining} students remain unassigned.</strong> Check available venue capacity or schedule conflicts, then try again.</div>}
  </section>;
}

export default function QuizManagementPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [roomAvailability, setRoomAvailability] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState([]);
  const [facultySearch, setFacultySearch] = useState('');
  const [form, setForm] = useState({ title: '', subject: '', sections: [], date: dateValue(), startTime: '09:00', endTime: '10:00' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allocating, setAllocating] = useState('');
  const [deleting, setDeleting] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [resultTitle, setResultTitle] = useState('');

  const refresh = useCallback(async () => {
    const [quizData, subjectData, sectionData, roomData, facultyData] = await Promise.all([
      listQuizzes(), api.get('/resources/subjects'), api.get('/resources/sections'), api.get('/resources/rooms'), api.get('/resources/faculty'),
    ]);
    setQuizzes(quizData);
    setSubjects(subjectData.data.data);
    setSections(sectionData.data.data.filter((section) => section.sectionType !== 'LAB'));
    setRooms(roomData.data.data);
    setFaculty(facultyData.data.data);
  }, []);

  useEffect(() => { let active = true; refresh().catch((e) => { if (active) setError(e.response?.data?.message || 'Could not load quiz resources.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [refresh]);

  useEffect(() => {
    if (!form.date || !form.startTime || !form.endTime || form.startTime >= form.endTime) return;
    let active = true;
    api.get('/quizzes/availability', { params: { date: form.date, startTime: form.startTime, endTime: form.endTime } })
      .then(({ data }) => {
        if (!active) return;
        setRoomAvailability(data.data.rooms);
        setSelectedRooms((current) => current.filter((id) => data.data.rooms.some((room) => room._id === id && room.available)));
      })
      .catch((e) => { if (active) setError(e.response?.data?.message || 'Could not check venue availability.'); });
    return () => { active = false; };
  }, [form.date, form.startTime, form.endTime]);

  const visibleQuizzes = useMemo(() => quizzes.filter((quiz) => `${quiz.title} ${quiz.subject?.code || ''} ${(quiz.sections || [quiz.section]).map((section) => section?.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())), [quizzes, search]);
  const selectedSectionRecords = sections.filter((section) => form.sections.includes(section._id));
  const visibleFaculty = faculty.filter((person) => `${person.name} ${person.email} ${person.department}`.toLowerCase().includes(facultySearch.toLowerCase()));
  const studentCount = selectedSectionRecords.reduce((total, section) => total + section.studentCount, 0);

  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleValue(setter, current, id) { setter(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setResult(null);
    try {
      await createQuiz({ title: form.title, subject: form.subject, sections: form.sections, date: form.date, startTime: form.startTime, endTime: form.endTime });
      setForm((current) => ({ ...current, title: '', sections: [] }));
      await refresh();
    } catch (e) { setError(e.response?.data?.message || 'Could not create the quiz.'); }
    finally { setSaving(false); }
  }

  async function runAllocation(quiz) {
    setAllocating(quiz._id); setError(''); setResult(null); setResultTitle(quiz.title);
    try { const allocation = await allocateQuiz(quiz._id, { availableRooms: selectedRooms, facultyIds: selectedFaculty }); setResult(allocation); await refresh(); }
    catch (e) { setError(e.response?.data?.message || 'Could not allocate venues.'); }
    finally { setAllocating(''); }
  }

  async function removeQuiz(quiz) {
    if (!window.confirm(`Delete “${quiz.title}”? Its venue and faculty bookings will be released.`)) return;
    setDeleting(quiz._id); setError('');
    try { await deleteQuiz(quiz._id); await refresh(); }
    catch (e) { setError(e.response?.data?.message || 'Could not delete this quiz.'); }
    finally { setDeleting(''); }
  }

  const estimatedRooms = roomAvailability.filter((room) => room.available && selectedRooms.includes(room._id)).length ? Math.ceil(studentCount / Math.max(1, Math.max(...roomAvailability.filter((room) => room.available && selectedRooms.includes(room._id)).map((room) => room.capacity)))) : 0;

  return <div className="dashboard-page quiz-page">
    <div className="page-heading-row"><div><div className="eyebrow">ASSESSMENT OPERATIONS</div><h1>Quizzes &amp; venues</h1><p className="page-subtitle">Plan multi-section assessments, inspect live room availability, and reserve two faculty per venue.</p></div><div className="quiz-heading-badge"><ClipboardCheck size={17}/><span>{quizzes.length} quizzes</span></div></div>
    {error && <div className="quiz-error" role="alert"><AlertCircle size={16}/>{error}</div>}
    {result && <div className="quiz-result-block"><div className="quiz-result-title"><span>ALLOCATION RESULT · {resultTitle}</span><button type="button" onClick={() => setResult(null)}>Dismiss</button></div><AllocationResult result={result}/></div>}
    <section className="panel quiz-create-panel"><div className="quiz-panel-heading"><div><span className="eyebrow">NEW ASSESSMENT</span><h2>Create quiz</h2><p>Choose one or more sections. Student totals are calculated from section enrollment.</p></div><div className="quiz-heading-icon"><Plus size={18}/></div></div>
      <form onSubmit={submit}><div className="quiz-form-grid">
        <label className="quiz-field quiz-field-wide"><span>Quiz title</span><input required maxLength="160" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Data Structures Midterm"/></label>
        <label className="quiz-field"><span>Course / subject</span><select required value={form.subject} onChange={(e) => setField('subject', e.target.value)}><option value="">Select subject</option>{subjects.map((item) => <option key={item._id} value={item._id}>{item.code} · {item.name}</option>)}</select></label>
        <label className="quiz-field"><span>Date</span><input type="date" required min={dateValue()} value={form.date} onChange={(e) => setField('date', e.target.value)}/></label>
        <label className="quiz-field"><span>Start time</span><input type="time" required value={form.startTime} onChange={(e) => setField('startTime', e.target.value)}/></label>
        <label className="quiz-field"><span>End time</span><input type="time" required value={form.endTime} onChange={(e) => setField('endTime', e.target.value)}/></label>
      </div>
      <div className="quiz-section-picker"><div><strong>Sections attending</strong><span>Student count is based on the selected sections.</span></div><div className="quiz-check-list">{sections.map((section) => <label key={section._id}><input type="checkbox" checked={form.sections.includes(section._id)} onChange={() => toggleValue((value) => setField('sections', value), form.sections, section._id)}/><span>{section.name} · {section.department} · Sem {section.semester}<small>{section.studentCount} students</small></span></label>)}</div><b>{selectedSectionRecords.length} sections · {studentCount} students</b></div>
      <div className="quiz-availability"><div className="quiz-availability-head"><div><strong>Venue availability</strong><span>Live schedule check for {displayDate(form.date)} · {form.startTime}–{form.endTime}</span></div><div className="availability-legend"><span><i className="availability-dot available"/>Available</span><span><i className="availability-dot unavailable"/>Unavailable</span></div></div><div className="venue-status-grid">{roomAvailability.map((item) => <label key={item._id} className={`venue-status-card ${item.available ? 'is-available' : 'is-unavailable'}`}><input type="checkbox" checked={selectedRooms.includes(item._id)} disabled={!item.available} onChange={() => toggleValue(setSelectedRooms, selectedRooms, item._id)}/><span className="venue-status-copy"><strong>{item.name}</strong><small>{item.building} · {item.capacity} seats · {item.type.replaceAll('_', ' ')}</small><em>{item.available ? 'Available' : item.reason || 'Unavailable'}</em></span></label>)}{roomAvailability.length === 0 && <span className="quiz-hint">Checking rooms…</span>}</div><small>{selectedRooms.length} available venues selected for allocation</small></div>
      <div className="quiz-faculty-picker"><div><strong><UserRoundCheck size={15}/> Faculty booking <span className="faculty-per-room-pill">2 per venue</span></strong><span>Choose any number of professors. Each venue gets two who are free at this quiz time.</span></div><label className="faculty-search"><Search size={14}/><input type="search" value={facultySearch} onChange={(event) => setFacultySearch(event.target.value)} placeholder="Search professors or department" aria-label="Search faculty"/></label><div className="faculty-check-grid">{visibleFaculty.map((person) => <label key={person._id} className={selectedFaculty.includes(person._id) ? 'faculty-check-selected' : ''}><input type="checkbox" checked={selectedFaculty.includes(person._id)} onChange={() => toggleValue(setSelectedFaculty, selectedFaculty, person._id)}/><span><strong>{person.name}</strong><small>{person.department}</small></span></label>)}{visibleFaculty.length === 0 && <span className="quiz-hint">No professors match that search.</span>}</div><small>{selectedFaculty.length} professors selected · {estimatedRooms} likely venues require at least {estimatedRooms * 2}; final requirement depends on actual allocation</small></div>
      <div className="quiz-form-footer"><span><Users size={14}/> Venues and faculty availability are checked by the server before booking.</span><button className="primary-button" type="submit" disabled={saving || loading || !form.sections.length || !form.subject}>{saving ? 'Saving…' : 'Create quiz'}</button></div></form>
    </section>
    <section className="panel quiz-list-panel"><div className="quiz-list-toolbar"><div><h2>Scheduled quizzes</h2><span>{visibleQuizzes.length} records</span></div><label className="quiz-search"><Search size={15}/><input placeholder="Search quizzes, subjects, sections" value={search} onChange={(e) => setSearch(e.target.value)}/></label></div>
      {loading ? <div className="quiz-empty">Loading quizzes…</div> : visibleQuizzes.length === 0 ? <div className="quiz-empty"><CalendarDays size={23}/><strong>No quizzes found</strong><span>Create a quiz above to begin room allocation.</span></div> : <div className="quiz-list">{visibleQuizzes.map((quiz) => <article className="quiz-card" key={quiz._id}><div className="quiz-card-main"><div className="quiz-card-icon"><ClipboardCheck size={18}/></div><div className="quiz-card-info"><strong>{quiz.title}</strong><span>{quiz.subject?.code} · {quiz.subject?.name} <i/> {(quiz.sections?.length ? quiz.sections : [quiz.section]).map((section) => section?.name).filter(Boolean).join(', ')}</span><small><CalendarDays size={13}/>{displayDate(quiz.date)} · {quiz.startTime}–{quiz.endTime} <i/> {quiz.studentCount} students <i/> <Clock3 size={12}/> {quiz.allocations?.length || 0} venues booked</small>{quiz.allocations?.length > 0 && <small className="quiz-booking-summary">{quiz.allocations.map((allocation) => `${allocation.room?.name || 'Venue'}${allocation.faculty?.length ? ` · ${allocation.faculty.map((person) => person.name).join(' + ')}` : ''}`).join('  /  ')}</small>}</div></div><div className="quiz-card-side"><span className={`quiz-status status-${quiz.status.toLowerCase().replaceAll('_', '-')}`}>{quiz.status.replaceAll('_', ' ')}</span><button className="outline-button" disabled={allocating === quiz._id || selectedRooms.length === 0} onClick={() => runAllocation(quiz)}>{allocating === quiz._id ? 'Allocating…' : 'Allocate venues & faculty'}</button><button type="button" className="quiz-delete-button" disabled={deleting === quiz._id} onClick={() => removeQuiz(quiz)} aria-label={`Delete ${quiz.title}`} title="Delete quiz and release bookings"><Trash2 size={15}/></button></div></article>)}</div>}
    </section>
  </div>;
}
