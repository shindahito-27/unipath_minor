import api from '../lib/api.js';
import { listResources } from './resourceApi.js';

export async function loadTimetableWorkspace(filters) {
  const [timetableResponse, sections, subjects, faculty, rooms] = await Promise.all([
    api.get('/timetable', { params: filters }),
    listResources('sections', {}),
    listResources('subjects', {}),
    listResources('faculty', {}),
    listResources('rooms', {}),
  ]);
  return {
    entries: timetableResponse.data.data,
    sections: sections.data,
    subjects: subjects.data,
    faculty: faculty.data,
    rooms: rooms.data.filter((room) => room.isActive),
  };
}

export async function saveManualTimetableEntry(values, id) {
  if (id) {
    try {
      const { data } = await api.patch(`/timetable/${id}`, values);
      return { saved: data.data };
    } catch (error) {
      if (error.response?.status === 409) return { conflicts: error.response.data.conflicts || [] };
      throw error;
    }
  }

  const { data: check } = await api.post('/timetable/check-conflict', values);
  if (check.hasConflict) return { conflicts: check.conflicts };
  try {
    const { data } = await api.post('/timetable', values);
    return { saved: data.data };
  } catch (error) {
    if (error.response?.status === 409) return { conflicts: error.response.data.conflicts || [] };
    throw error;
  }
}

export async function generateTimetable(payload) {
  const { data } = await api.post('/timetable/generate', payload);
  return data;
}

export async function deleteTimetableEntry(id) {
  const { data } = await api.delete(`/timetable/${id}`);
  return data;
}

export async function clearTimetable() {
  const { data } = await api.delete('/timetable');
  return data.data;
}
