import { Fragment, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Edit2, Plus, RefreshCw, Trash2, X, Layers3, FlaskConical, GraduationCap, Eraser } from 'lucide-react';
import { useTimetable } from '../../hooks/useTimetable.js';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const PERIOD_STARTS = [8, 9, 10, 11, 12, 14, 15, 16, 17];
const STANDARD_SLOTS = PERIOD_STARTS.map((hour) => ({ startTime: `${String(hour).padStart(2, '0')}:00`, endTime: `${String(hour + 1).padStart(2, '0')}:00` }));

function labelOf(value, primary = 'name') {
  if (!value) return '—';
  return value[primary] || value.code || value.email || String(value);
}

function ManualEntryForm({ workspace, onClose, onSave, editing }) {
  const [form, setForm] = useState(() => ({
    section: editing?.section?._id || '', subject: editing?.subject?._id || '',
    faculty: editing?.faculty?._id || '', room: editing?.room?._id || '',
    day: editing?.day || 'MONDAY', startTime: editing?.startTime || '09:00', endTime: editing?.endTime || '10:00',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState([]);

  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setConflicts([]);
    try {
      const result = await onSave(form, editing?._id);
      if (result.conflicts?.length) {
        setConflicts(result.conflicts);
        return;
      }
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save this timetable entry.');
    } finally {
      setSaving(false);
    }
  }

  const selects = [
    ['section', 'Section', workspace.sections, (item) => `${item.name} · ${item.department} · ${item.studentCount} students`],
    ['subject', 'Subject', workspace.subjects, (item) => `${item.code} · ${item.name}`],
    ['faculty', 'Faculty', workspace.faculty, (item) => `${item.name} · ${item.department}`],
    ['room', 'Room', editing?.room && !workspace.rooms.some((item) => item._id === editing.room._id) ? [...workspace.rooms, editing.room] : workspace.rooms, (item) => `${item.name} · ${item.building} · ${item.capacity} seats · ${item.type}`],
  ];

  return (
    <div className="timetable-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="timetable-modal" role="dialog" aria-modal="true" aria-labelledby="manual-entry-title">
        <div className="timetable-modal-head"><div><span className="eyebrow">TIMETABLE ENTRY</span><h2 id="manual-entry-title">{editing ? 'Edit class' : 'Add a class'}</h2></div><button type="button" className="resource-icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></div>
        <form onSubmit={submit}>
          <div className="timetable-form-grid">
            {selects.map(([key, label, options, display]) => <label className="timetable-field" key={key}><span>{label}</span><select required value={form[key]} onChange={(event) => setField(key, event.target.value)}><option value="" disabled>Select {label.toLowerCase()}</option>{options.map((item) => <option key={item._id} value={item._id}>{display(item)}</option>)}</select></label>)}
            <label className="timetable-field"><span>Day</span><select value={form.day} onChange={(event) => setField('day', event.target.value)}>{DAYS.map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
            <label className="timetable-field"><span>Start time</span><input type="time" required value={form.startTime} onChange={(event) => setField('startTime', event.target.value)}/></label>
            <label className="timetable-field"><span>End time</span><input type="time" required value={form.endTime} onChange={(event) => setField('endTime', event.target.value)}/></label>
          </div>
          {conflicts.length > 0 && <div className="conflict-panel" role="alert"><strong>Resolve these conflicts before saving</strong>{conflicts.map((conflict, index) => <div key={`${conflict.type}-${index}`}><b>{conflict.type.replaceAll('_', ' ')}</b><span>{conflict.message}</span></div>)}</div>}
          {error && <p className="resource-form-error" role="alert">{error}</p>}
          <div className="resource-form-actions"><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Checking…' : editing ? 'Save changes' : 'Check & add class'}</button></div>
        </form>
      </section>
    </div>
  );
}

function GenerationSummary({ result, onDismiss }) {
  if (!result) return null;
  return <section className="generation-summary" aria-live="polite"><div className="generation-summary-head"><div><strong>Constraint-based scheduling complete</strong><span>Valid assignments were saved; no hard-constraint conflicts were added.</span></div><button type="button" className="resource-icon-button" onClick={onDismiss} aria-label="Dismiss summary"><X size={17}/></button></div><div className="generation-metrics"><div><b>{result.assignments}</b><span>Assignments added</span></div><div><b>{result.conflicts}</b><span>Conflicts</span></div><div><b>{result.unassigned}</b><span>Unassigned classes</span></div></div>{result.unassignedAssignments?.length > 0 && <div className="unassigned-list"><strong>Classes needing attention</strong>{result.unassignedAssignments.map((item, index) => <p key={`${item.section?.id}-${item.subject?.id}-${index}`}>{item.section?.name || 'Section'}{item.subject?.code ? ` · ${item.subject.code}` : ''}: {item.reason.replaceAll('_', ' ').toLowerCase()}</p>)}</div>}</section>;
}

function DepartmentGenerationForm({ sections, subjects, faculty, rooms, onGenerate, generating }) {
  const departments = [...new Set(sections.map((item) => item.department))].sort();
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [courseLoads, setCourseLoads] = useState({});
  const departmentSections = sections.filter((section) => section.department === department && String(section.semester) === semester && section.isActive !== false);
  const departmentSubjects = subjects.filter((subject) => subject.department === department);
  const selectedCourses = departmentSubjects.filter((subject) => courseLoads[subject._id]?.selected);
  const semesters = [...new Set(sections.filter((item) => item.department === department && item.isActive !== false).map((item) => String(item.semester)))].sort((a, b) => Number(a) - Number(b));

  function chooseDepartment(value) {
    setDepartment(value);
    const available = sections.filter((item) => item.department === value && item.isActive !== false);
    const nextSemester = [...new Set(available.map((item) => String(item.semester)))].sort((a, b) => Number(a) - Number(b))[0] || '';
    setSemester(nextSemester);
    const availableSubjects = subjects.filter((item) => item.department === value);
    setCourseLoads(Object.fromEntries(availableSubjects.map((item, index) => [item._id, { selected: index < 5, lecturesPerWeek: 3, labsPerWeek: 1, lectureDurationHours: 1, labDurationHours: 2 }])));
  }
  useEffect(() => { if (!department && departments.length) chooseDepartment(departments[0]); }, [sections.length, subjects.length]);
  function updateCourse(subjectId, key, value) { setCourseLoads((current) => ({ ...current, [subjectId]: { ...current[subjectId], [key]: value } })); }

  async function submit(event) {
    event.preventDefault();
    const weeklyLoads = selectedCourses.map((subject) => {
      const { lecturesPerWeek, labsPerWeek, lectureDurationHours, labDurationHours } = courseLoads[subject._id];
      return { subject: subject._id, lecturesPerWeek, labsPerWeek, lectureDurationHours, labDurationHours };
    });
    const durations = [...new Set(weeklyLoads.flatMap(({ lectureDurationHours, labDurationHours }) => [lectureDurationHours, labDurationHours]))];
    const slots = new Map(STANDARD_SLOTS.map((slot) => [`${slot.startTime}-${slot.endTime}`, slot]));
    for (const duration of durations) for (let index = 0; index < PERIOD_STARTS.length; index += 1) {
      const startHour = PERIOD_STARTS[index];
      const endHour = startHour + duration;
      if (endHour <= 13 || (startHour >= 14 && endHour <= 18)) {
        const slot = { startTime: `${String(startHour).padStart(2, '0')}:00`, endTime: `${String(endHour).padStart(2, '0')}:00` };
        slots.set(`${slot.startTime}-${slot.endTime}`, slot);
      }
    }
    await onGenerate({ sections: departmentSections.map((item) => item._id), subjects: selectedCourses.map((item) => item._id), weeklyLoads,
      faculty: faculty.filter((item) => item.department === department).map((item) => item._id), rooms: rooms.map((item) => item._id),
      availableDays: DAYS, timeSlots: [...slots.values()], replaceExisting: true });
  }

  return <section className="panel department-generator"><div className="department-generator-head"><div><span className="eyebrow">DEPARTMENT PLANNER</span><h2>Build a semester timetable</h2><p>Configure each course's weekly lectures, labs, and duration. All active sections in the semester are included.</p></div><span className="generator-mark"><GraduationCap size={19}/></span></div>
    <form onSubmit={submit}><div className="generator-config-grid"><label className="timetable-field"><span>Department</span><select value={department} onChange={(event) => chooseDepartment(event.target.value)}><option value="">Select department</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label className="timetable-field"><span>Semester</span><select value={semester} onChange={(event) => setSemester(event.target.value)}><option value="">Select semester</option>{semesters.map((item) => <option key={item} value={item}>Semester {item}</option>)}</select></label><div className="generator-resource-summary"><strong>{departmentSections.length} sections included</strong><span>{selectedCourses.length} courses ? {faculty.filter((item) => item.department === department).length} faculty ? {rooms.length} rooms</span></div></div>
      <div className="generator-section-summary"><Layers3 size={15}/><span>{departmentSections.filter((item) => item.sectionType !== 'LAB').map((item) => item.name).join(', ') || 'No lecture cohorts'}</span><i/><FlaskConical size={15}/><span>{departmentSections.filter((item) => item.sectionType === 'LAB').map((item) => `${item.name}${item.parentSectionName ? ` ? ${item.parentSectionName}` : ''}`).join(', ') || 'No lab batches'}</span></div>
      <section className="generator-subpanel"><div className="generator-subpanel-head"><CalendarDays size={16}/><div><strong>Courses and weekly workload</strong><small>Lecture and lab counts and durations can be edited independently.</small></div></div><div className="generator-course-list">{departmentSubjects.map((subject) => { const load = courseLoads[subject._id] || { selected: false, lecturesPerWeek: 3, labsPerWeek: 1, lectureDurationHours: 1, labDurationHours: 2 }; return <article className={load.selected ? 'generator-course selected' : 'generator-course'} key={subject._id}><label className="generator-course-title"><input type="checkbox" checked={load.selected} onChange={(event) => updateCourse(subject._id, 'selected', event.target.checked)}/><span><strong>{subject.code} ? {subject.name}</strong><small>{subject.type} ? configure either or both meeting types</small></span></label><div className="generator-course-settings"><label>Lectures<input type="number" min="0" max="20" disabled={!load.selected} value={load.lecturesPerWeek} onChange={(event) => updateCourse(subject._id, 'lecturesPerWeek', Number(event.target.value))}/><small>/ week</small></label><label>Lecture duration<select disabled={!load.selected || !load.lecturesPerWeek} value={load.lectureDurationHours} onChange={(event) => updateCourse(subject._id, 'lectureDurationHours', Number(event.target.value))}>{[1, 2, 3].map((hours) => <option key={hours} value={hours}>{hours} {hours === 1 ? 'hour' : 'hours'}</option>)}</select></label><label>Labs<input type="number" min="0" max="20" disabled={!load.selected} value={load.labsPerWeek} onChange={(event) => updateCourse(subject._id, 'labsPerWeek', Number(event.target.value))}/><small>/ week</small></label><label>Lab duration<select disabled={!load.selected || !load.labsPerWeek} value={load.labDurationHours} onChange={(event) => updateCourse(subject._id, 'labDurationHours', Number(event.target.value))}>{[1, 2, 3, 4].map((hours) => <option key={hours} value={hours}>{hours} {hours === 1 ? 'hour' : 'hours'}</option>)}</select></label></div></article>; })}{departmentSubjects.length === 0 && <span className="generator-empty-note">Add department courses under Admin ? Subjects.</span>}</div></section>
      <div className="department-generator-footer"><span>Lunch is reserved from 13:00?14:00. Courses are distributed across weekdays and all active sections in this semester.</span><button className="primary-button" type="submit" disabled={generating || !department || !semester || !departmentSections.length || !selectedCourses.length || !faculty.some((item) => item.department === department) || !rooms.length}><RefreshCw size={14} className={generating ? 'spinning' : ''}/>{generating ? 'Generating?' : `Generate ${department || 'department'} timetable`}</button></div>
    </form></section>;
}

function BookOpenCheckIcon() { return <CalendarDays size={16}/>; }

export default function TimetablePage() {
  const [filters, setFilters] = useState({ section: '', faculty: '', room: '' });
  const [formEntry, setFormEntry] = useState(undefined);
  const [generation, setGeneration] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [pageNotice, setPageNotice] = useState('');
  const query = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);
  const workspace = useTimetable(query);
  const { entries, sections, subjects, faculty, rooms } = workspace;

  const slots = STANDARD_SLOTS;

  async function generate(payload) {
    setGenerating(true);
    setPageError('');
    try {
      const result = await workspace.generate(payload);
      setGeneration(result);
    } catch (requestError) {
      const validationErrors = requestError.response?.data?.errors?.map((item) => `${item.path || 'request'}: ${item.message}`).join('; ');
      setPageError(validationErrors || requestError.response?.data?.message || 'Timetable generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function clearAll() {
    if (!window.confirm('Clear every saved timetable entry across all departments? Course workload settings will remain.')) return;
    setClearing(true); setPageError(''); setPageNotice(''); setGeneration(null);
    try {
      const result = await workspace.clear();
      setPageNotice(`${result.deletedEntries} timetable entries cleared. The schedule is now empty.`);
    } catch (requestError) {
      setPageError(requestError.response?.data?.message || 'Could not clear the timetable.');
    } finally { setClearing(false); }
  }

  async function removeEntry(entry) {
    if (!window.confirm(`Remove ${labelOf(entry.subject, 'code')} from ${labelOf(entry.section)}?`)) return;
    try { await workspace.remove(entry._id); }
    catch (requestError) { setPageError(requestError.response?.data?.message || 'Unable to remove this class.'); }
  }

  return (
    <div className="dashboard-page timetable-page">
      <div className="page-heading-row"><div><div className="eyebrow">ACADEMIC SCHEDULING</div><h1>Timetable</h1><p className="page-subtitle">Build department schedules from lecture cohorts, lab groups, and weekly course workloads.</p></div><div className="timetable-heading-actions"><button className="outline-button" onClick={() => setFormEntry(null)}><Plus size={15}/> Add class</button><button className="clear-timetable-button" onClick={clearAll} disabled={clearing || workspace.loading}><Eraser size={15}/>{clearing ? 'Clearing…' : 'Clear timetable'}</button></div></div>
      {pageError && <div className="timetable-page-error" role="alert">{pageError}</div>}
      {pageNotice && <div className="timetable-page-notice" role="status">{pageNotice}</div>}
      <GenerationSummary result={generation} onDismiss={() => setGeneration(null)}/>
      <DepartmentGenerationForm sections={sections} subjects={subjects} faculty={faculty} rooms={rooms} onGenerate={generate} generating={generating}/>
      <section className="panel timetable-panel">
        <div className="timetable-toolbar"><div className="timetable-toolbar-title"><CalendarDays size={17}/><strong>Weekly schedule</strong><span>{entries.length} classes</span></div><div className="timetable-filters">
          <select aria-label="Filter by section" value={filters.section} onChange={(event) => setFilters((current) => ({ ...current, section: event.target.value }))}><option value="">All sections</option>{sections.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <select aria-label="Filter by faculty" value={filters.faculty} onChange={(event) => setFilters((current) => ({ ...current, faculty: event.target.value }))}><option value="">All faculty</option>{faculty.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
          <select aria-label="Filter by room" value={filters.room} onChange={(event) => setFilters((current) => ({ ...current, room: event.target.value }))}><option value="">All rooms</option>{rooms.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        </div></div>
        {workspace.error ? <div className="resource-feedback error-feedback">{workspace.error}</div> : workspace.loading ? <div className="resource-feedback">Loading weekly schedule…</div> : entries.length === 0 ? <div className="timetable-empty-state"><span><CalendarDays size={23}/></span><strong>{Object.values(filters).some(Boolean) ? "No classes match these filters" : "Your timetable is empty"}</strong><p>{Object.values(filters).some(Boolean) ? "Clear a filter to see the full schedule." : "Choose a department above, set course workloads, and generate a weekly schedule."}</p>{Object.values(filters).some(Boolean) && <button className="outline-button" onClick={() => setFilters({ section: "", faculty: "", room: "" })}>Clear filters</button>}</div> : <div className="timetable-grid-scroll"><table className="timetable-grid"><colgroup><col className="day-column"/>{slots.slice(0, 5).map((slot) => <col key={`column-${slot.startTime}`}/>)}<col className="lunch-column-track"/>{slots.slice(5).map((slot) => <col key={`column-${slot.startTime}`}/>)}</colgroup><thead><tr><th className="time-column-head">DAY</th>{slots.map((slot, index) => <Fragment key={`${slot.startTime}-${slot.endTime}`}>{index === 5 && <th className="lunch-column">LUNCH<br/>13:00?14:00</th>}<th>{slot.startTime}<span className="timetable-time-end">{slot.endTime}</span></th></Fragment>)}</tr></thead><tbody>{DAYS.map((day) => <tr key={day}><th className="time-cell day-row-label">{day}</th><td className="timetable-day-cell" colSpan={slots.length + 1}><div className="timetable-day-grid"><div className="timetable-hour-guides" aria-hidden="true">{slots.map((slot, index) => <Fragment key={`guide-${slot.startTime}`}>{index === 5 && <span className="lunch-guide"/>}<span className="hour-guide" style={{ gridColumn: index < 5 ? index + 1 : index + 2 }}/></Fragment>)}</div>{entries.filter((entry) => entry.day === day).map((entry) => { const startHour = Number(entry.startTime.slice(0, 2)); const startColumn = startHour - 7; const startMinutes = startHour * 60 + Number(entry.startTime.slice(3, 5)); const endMinutes = Number(entry.endTime.slice(0, 2)) * 60 + Number(entry.endTime.slice(3, 5)); const duration = Math.max(1, Math.ceil((endMinutes - startMinutes) / 60)); return <article className="timetable-class-card" key={entry._id} style={{ gridColumn: `${startColumn} / span ${duration}` }}><div className="timetable-class-top"><strong>{labelOf(entry.subject, 'code')}</strong><div><button type="button" aria-label="Edit class" className="timetable-card-action" onClick={() => setFormEntry(entry)}><Edit2 size={12}/></button><button type="button" aria-label="Delete class" className="timetable-card-action delete-card-action" onClick={() => removeEntry(entry)}><Trash2 size={12}/></button></div></div><span className="timetable-class-name">{labelOf(entry.subject)} ? {labelOf(entry.section)}</span><span>{labelOf(entry.faculty)} ? {labelOf(entry.room)} ? {entry.startTime}?{entry.endTime}</span></article>; })}</div></td></tr>)}</tbody></table></div>}
      </section>
      {formEntry !== undefined && <ManualEntryForm workspace={workspace} editing={formEntry} onClose={() => setFormEntry(undefined)} onSave={workspace.saveEntry}/>}
    </div>
  );
}
