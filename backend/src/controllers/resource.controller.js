import * as resourceService from '../services/resource.service.js';

function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export const list = asyncHandler(async (request, response) => {
  const result = await resourceService.listResources(request.params.resource, request.user, request.validatedQuery);
  response.json({ success: true, ...result });
});

export const get = asyncHandler(async (request, response) => {
  const data = await resourceService.getResource(request.params.resource, request.params.id, request.user);
  response.json({ success: true, data });
});

export const create = asyncHandler(async (request, response) => {
  const data = await resourceService.createResource(request.params.resource, request.body);
  response.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (request, response) => {
  const data = await resourceService.updateResource(request.params.resource, request.params.id, request.body);
  response.json({ success: true, data });
});

export const remove = asyncHandler(async (request, response) => {
  const data = await resourceService.deleteResource(request.params.resource, request.params.id);
  response.json({ success: true, data });
});
