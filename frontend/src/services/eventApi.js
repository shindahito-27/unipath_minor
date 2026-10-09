import api from '../lib/api.js';

export async function listEvents() {
  const { data } = await api.get('/events');
  return data.data;
}

export async function saveEvent(payload, id) {
  const { data } = id ? await api.patch(`/events/${id}`, payload) : await api.post('/events', payload);
  return data.data;
}

export async function setEventStatus(id, status) {
  const { data } = await api.patch(`/events/${id}/status`, { status });
  return data.data;
}

export async function deleteEvent(id) {
  const { data } = await api.delete(`/events/${id}`);
  return data.data;
}
