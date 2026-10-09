import * as quizService from '../services/venueAllocator.service.js';

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export const list = asyncHandler(async (request, response) => {
  const data = await quizService.listQuizzes(request.user);
  response.json({ success: true, data, count: data.length });
});

export const create = asyncHandler(async (request, response) => {
  const data = await quizService.createQuiz(request.body, request.user);
  response.status(201).json({ success: true, data });
});

export const allocate = asyncHandler(async (request, response) => {
  const data = await quizService.allocateQuizVenues(request.params.id, request.body);
  response.json({ ...data, data });
});

export const availability = asyncHandler(async (request, response) => {
  const data = await quizService.checkQuizAvailability(request.validatedQuery);
  response.json({ success: true, data });
});

export const remove = asyncHandler(async (request, response) => {
  const data = await quizService.deleteQuiz(request.params.id);
  response.json({ success: true, data });
});
