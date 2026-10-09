import api from '../lib/api.js';

export async function listQuizzes() {
  const { data } = await api.get('/quizzes');
  return data.data;
}

export async function createQuiz(payload) {
  const { data } = await api.post('/quizzes', payload);
  return data.data;
}

export async function allocateQuiz(id, payload) {
  const { data } = await api.post(`/quizzes/${id}/allocate`, payload);
  return data.data;
}

export async function deleteQuiz(id) {
  const { data } = await api.delete(`/quizzes/${id}`);
  return data.data;
}
