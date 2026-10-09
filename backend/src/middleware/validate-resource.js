import { getResourceQuerySchema, getResourceSchema } from '../services/resource-validation.service.js';

function validate(schema, source) {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      return response.status(400).json({
        success: false,
        message: `Invalid request ${source}`,
        errors: result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      });
    }
    if (source === 'query') request.validatedQuery = result.data;
    else request[source] = result.data;
    next();
  };
}

export const validateResourceCreate = (request, response, next) => {
  try { return validate(getResourceSchema(request.params.resource), 'body')(request, response, next); }
  catch (error) { return next(error); }
};

export const validateResourceUpdate = (request, response, next) => {
  try { return validate(getResourceSchema(request.params.resource, true), 'body')(request, response, next); }
  catch (error) { return next(error); }
};

export const validateResourceQuery = (request, response, next) => {
  try { return validate(getResourceQuerySchema(), 'query')(request, response, next); }
  catch (error) { return next(error); }
};
