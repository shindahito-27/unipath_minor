import api from '../lib/api.js';
import { resourceDefinitions } from '../config/resourceDefinitions.js';

export function getEmptyResourceForm(resource, record = null) {
  const definition = resourceDefinitions[resource];
  return Object.fromEntries(definition.fields.map((field) => {
    const value = record?.[field.key];
    if (field.key === 'availability') return [field.key, Array.isArray(value) ? value.join('\n') : ''];
    if (field.key === 'curriculum') return [field.key, Array.isArray(value) ? value.map((item) => ({ subject: item.subject?._id || item.subject, lecturesPerWeek: item.lecturesPerWeek || 0, labsPerWeek: item.labsPerWeek || 0, labDurationHours: item.labDurationHours || 2 })) : []];
    if (field.type === 'checkbox') return [field.key, value ?? field.defaultValue ?? false];
    return [field.key, value == null ? (field.defaultValue ?? '') : String(value)];
  }));
}

function toApiPayload(resource, values) {
  const definition = resourceDefinitions[resource];
  return Object.fromEntries(definition.fields.map((field) => {
    const value = values[field.key];
    if (field.type === 'number') return [field.key, value === '' && !field.required ? undefined : Number(value)];
    if (field.type === 'checkbox') return [field.key, Boolean(value)];
    if (field.type === 'textarea' && field.key === 'availability') {
      return [field.key, value.split(/\r?\n/).map((slot) => slot.trim()).filter(Boolean)];
    }
    return [field.key, value];
  }));
}

export async function listResources(resource, filters) {
  const { data } = await api.get(`/resources/${resource}`, { params: filters });
  return data;
}

export async function saveResource(resource, values, id) {
  const payload = toApiPayload(resource, values);
  const { data } = id
    ? await api.patch(`/resources/${resource}/${id}`, payload)
    : await api.post(`/resources/${resource}`, payload);
  return data.data;
}

export async function deleteResource(resource, id) {
  const { data } = await api.delete(`/resources/${resource}/${id}`);
  return data.data;
}
