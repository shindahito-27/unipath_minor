import * as eventService from '../services/event.service.js';

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export const list = asyncHandler(async (request, response) => {
  const data = await eventService.listEvents(request.user);
  response.json({ success: true, data, count: data.length });
});

export const create = asyncHandler(async (request, response) => {
  const data = await eventService.createEvent(request.body, request.user);
  response.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (request, response) => {
  const data = await eventService.updateEvent(request.params.id, request.body);
  response.json({ success: true, data });
});

export const setStatus = asyncHandler(async (request, response) => {
  const data = await eventService.setEventStatus(request.params.id, request.body.status);
  response.json({ success: true, data });
});

export const remove = asyncHandler(async (request, response) => {
  const data = await eventService.deleteEvent(request.params.id);
  response.json({ success: true, data });
});
