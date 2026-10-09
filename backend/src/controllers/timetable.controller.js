import * as timetableService from '../services/timetable.service.js';

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response)).catch(next);
}

export const list = asyncHandler(async (request, response) => {
  const result = await timetableService.listTimetable(request.user, request.validatedQuery);
  response.json({ success: true, ...result });
});

export const get = asyncHandler(async (request, response) => {
  const data = await timetableService.getTimetableEntry(request.params.id, request.user);
  response.json({ success: true, data });
});

export const create = asyncHandler(async (request, response) => {
  const data = await timetableService.createTimetableEntry(request.body, request.user);
  response.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (request, response) => {
  const data = await timetableService.updateTimetableEntry(request.params.id, request.body);
  response.json({ success: true, data });
});

export const remove = asyncHandler(async (request, response) => {
  const data = await timetableService.deleteTimetableEntry(request.params.id);
  response.json({ success: true, data });
});

export const clear = asyncHandler(async (_request, response) => {
  const data = await timetableService.clearTimetable();
  response.json({ success: true, data });
});

export const checkConflicts = asyncHandler(async (request, response) => {
  const result = await timetableService.checkTimetableConflicts(request.body);
  response.json({ success: true, ...result });
});

export const generate = asyncHandler(async (request, response) => {
  const result = await timetableService.generateAndSaveTimetable(request.body, request.user);
  response.status(201).json({ success: true, ...result });
});
