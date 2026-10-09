import { useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { resourceDefinitions } from '../../config/resourceDefinitions.js';
import { getEmptyResourceForm } from '../../services/resourceApi.js';
import { useResources } from '../../hooks/useResources.js';
import api from '../../lib/api.js';

function displayValue(field, value) {
  if (field.key === 'isActive') return <span className={`resource-status ${value ? 'status-active' : 'status-inactive'}`}>{value ? 'Active' : 'Inactive'}</span>;
  if (field.key === 'curriculum') return Array.isArray(value) && value.length ? `${value.length} configured courses · ${value.reduce((sum, item) => sum + (item.lecturesPerWeek || 0) + (item.labsPerWeek || 0), 0)} weekly sessions` : 'No weekly courses set';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not set';
  if (value == null || value === '') return '—';
  return value;
}

function ResourceForm({ resource, definition, initialRecord, onClose, onSave }) {
  const [values, setValues] = useState(() => getEmptyResourceForm(resource, initialRecord));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (resource === 'sections') api.get('/resources/subjects').then(({ data }) => setSubjects(data.data)).catch(() => setSubjects([]));
  }, [resource]);

  function updateField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(values, initialRecord?._id);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.errors?.map((item) => item.message).join(' ') || requestError.response?.data?.message || 'Unable to save this resource.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="resource-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="resource-modal" role="dialog" aria-modal="true" aria-labelledby="resource-form-title">
        <div className="resource-modal-heading"><div><span className="eyebrow">RESOURCE DETAILS</span><h2 id="resource-form-title">{initialRecord ? 'Edit' : 'Add'} {definition.singular}</h2></div><button className="resource-icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
        <form onSubmit={submit}>
          <div className="resource-form-grid">
            {definition.fields.map((field) => (
              <div className={`resource-field${field.type === 'checkbox' ? ' checkbox-field' : ''}`} key={field.key}>
                {field.type === 'checkbox' ? <><input type="checkbox" checked={Boolean(values[field.key])} onChange={(event) => updateField(field.key, event.target.checked)} /><span>{field.label}</span></> : <>
                  <span>{field.label}{field.required && <b> *</b>}</span>
                  {field.type === 'select' ? <select required={field.required} value={values[field.key]} onChange={(event) => updateField(field.key, event.target.value)}><option value="" disabled>Select {field.label.toLowerCase()}</option>{field.options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select> : field.type === 'textarea' ? <textarea rows="4" value={values[field.key]} onChange={(event) => updateField(field.key, event.target.value)} placeholder={field.placeholder}/> : field.type === 'curriculum' ? null : <input type={field.type || 'text'} min={field.min} max={field.max} value={values[field.key]} onChange={(event) => updateField(field.key, event.target.value)} placeholder={field.placeholder} required={field.required} />}
                  {field.type === 'curriculum' && <div className="section-curriculum-editor">{subjects.filter((subject) => !values.department || subject.department.toLowerCase() === String(values.department).toLowerCase()).map((subject) => {
                    const row = values.curriculum.find((entry) => String(entry.subject) === subject._id) || { subject: subject._id, lecturesPerWeek: 0, labsPerWeek: 0 };
                    const active = values.curriculum.some((entry) => String(entry.subject) === subject._id);
                    return <div className="curriculum-row" key={subject._id}><label><input type="checkbox" checked={active} onChange={(event) => updateField('curriculum', event.target.checked ? [...values.curriculum, row] : values.curriculum.filter((entry) => String(entry.subject) !== subject._id))}/><span>{subject.code} · {subject.name}<small>{subject.type}</small></span></label><label>Lectures/week<input type="number" min="0" max="20" disabled={!active || subject.type === 'LAB'} value={row.lecturesPerWeek} onChange={(event) => updateField('curriculum', values.curriculum.map((entry) => String(entry.subject) === subject._id ? { ...entry, lecturesPerWeek: Number(event.target.value) } : entry))}/></label><label>Labs/week<input type="number" min="0" max="20" disabled={!active || subject.type !== 'LAB'} value={row.labsPerWeek} onChange={(event) => updateField('curriculum', values.curriculum.map((entry) => String(entry.subject) === subject._id ? { ...entry, labsPerWeek: Number(event.target.value) } : entry))}/></label></div>;
                  })}{subjects.length === 0 && <small>Add subjects first to configure weekly lecture and lab counts.</small>}<p>Timetable generation creates this many weekly meetings for each selected course.</p></div>}
                </>}
              </div>
            ))}
          </div>
          {error && <p className="resource-form-error" role="alert">{error}</p>}
          <div className="resource-form-actions"><button className="outline-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : initialRecord ? 'Save changes' : 'Add resource'}</button></div>
        </form>
      </section>
    </div>
  );
}

export default function ResourceManagementPage({ resource }) {
  const definition = resourceDefinitions[resource];
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [formRecord, setFormRecord] = useState(undefined);
  const filters = useMemo(() => Object.fromEntries(Object.entries({ search: search.trim(), ...selectedFilters }).filter(([, value]) => value !== '')), [search, selectedFilters]);
  const { records, loading, error, save, remove } = useResources(resource, filters);

  async function deleteRecord(record) {
    if (!window.confirm(`Delete ${definition.singular} “${record.name || record.code}”? This cannot be undone.`)) return;
    try { await remove(record._id); }
    catch (requestError) { window.alert(requestError.response?.data?.message || 'Unable to delete this resource.'); }
  }

  return (
    <div className="dashboard-page resource-page">
      <div className="page-heading-row"><div><div className="eyebrow">CAMPUS RESOURCES</div><h1>{definition.title}</h1><p className="page-subtitle">{definition.description}</p></div><button className="primary-button" onClick={() => setFormRecord(null)}><Plus size={16}/> Add {definition.singular}</button></div>
      <section className="panel resource-table-panel">
        <div className="resource-toolbar">
          <div className="resource-search"><Search size={16}/><input type="search" aria-label={`Search ${definition.title.toLowerCase()}`} placeholder={`Search ${definition.title.toLowerCase()}…`} value={search} onChange={(event) => setSearch(event.target.value)}/></div>
          <div className="resource-filters">{definition.filters.map((filter) => <select key={filter.key} aria-label={filter.label} value={selectedFilters[filter.key] || ''} onChange={(event) => setSelectedFilters((current) => ({ ...current, [filter.key]: event.target.value }))}><option value="">{filter.label}</option>{filter.options.map((rawOption) => {
            const [value, label] = rawOption.includes('|') ? rawOption.split('|') : [rawOption, rawOption.replaceAll('_', ' ')];
            return <option key={value} value={value}>{label}</option>;
          })}</select>)}</div>
          <span className="resource-count">{records.length} {records.length === 1 ? definition.singular : definition.title.toLowerCase()}</span>
        </div>
        {error ? <div className="resource-feedback error-feedback">{error}</div> : loading ? <div className="resource-feedback">Loading {definition.title.toLowerCase()}…</div> : records.length === 0 ? <div className="resource-feedback empty-resource"><span className="empty-resource-icon"><Search size={18}/></span><strong>No {definition.title.toLowerCase()} found</strong><span>Try a different search, or add your first {definition.singular}.</span></div> : (
          <div className="resource-table-scroll"><table className="resource-table"><thead><tr>{definition.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{records.map((record) => <tr key={record._id}>{definition.columns.map((column) => <td key={column.key}>{displayValue(column, record[column.key])}</td>)}<td className="resource-actions"><button type="button" className="resource-icon-button" aria-label={`Edit ${record.name || record.code}`} onClick={() => setFormRecord(record)}><Edit2 size={15}/></button><button type="button" className="resource-icon-button danger-action" aria-label={`Delete ${record.name || record.code}`} onClick={() => deleteRecord(record)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>
        )}
      </section>
      {formRecord !== undefined && <ResourceForm resource={resource} definition={definition} initialRecord={formRecord} onClose={() => setFormRecord(undefined)} onSave={save}/>}
    </div>
  );
}

export function RoomsPage() { return <ResourceManagementPage resource="rooms"/>; }
export function FacultyPage() { return <ResourceManagementPage resource="faculty"/>; }
export function SubjectsPage() { return <ResourceManagementPage resource="subjects"/>; }
export function SectionsPage() { return <ResourceManagementPage resource="sections"/>; }
